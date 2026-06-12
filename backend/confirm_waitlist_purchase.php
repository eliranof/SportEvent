<?php
ini_set("display_errors", 0);
error_reporting(E_ALL);
ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/db.php";
require_once __DIR__ . "/waitlist_engine.php";
require_once __DIR__ . "/order_helpers.php";
require_once __DIR__ . "/event_dynamic_pricing_helpers.php";

function send_json($statusCode, $data)
{
    if (ob_get_length()) {
        ob_clean();
    }

    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

register_shutdown_function(function () {
    $error = error_get_last();

    if ($error !== null) {
        if (ob_get_length()) {
            ob_clean();
        }

        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "שגיאת PHP בשרת",
            "details" => $error["message"]
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }
});

function parse_seat_list($value)
{
    if ($value === null || $value === "") {
        return [];
    }

    $decoded = json_decode((string)$value, true);
    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
        return array_values(array_unique(array_filter($decoded)));
    }

    $text = trim((string)$value);
    if ($text === "") {
        return [];
    }

    $text = str_replace(["\r\n", "\r", "\n", "|", ";"], ",", $text);
    $items = array_map("trim", explode(",", $text));
    return array_values(array_unique(array_filter($items)));
}


function waitlist_offer_extract_stand_from_seat($seatKey, $fallbackStand = "")
{
    $seatKey = trim((string)$seatKey);
    if ($seatKey !== "" && preg_match('/^([A-Za-zא-ת]+)-\d+-\d+$/u', $seatKey, $matches)) {
        return waitlist_normalize_stand($matches[1]);
    }

    return waitlist_normalize_stand($fallbackStand);
}

function waitlist_offer_default_price_for_stand($standCode)
{
    $standCode = waitlist_normalize_stand($standCode);

    $prices = [
        "VIP" => 520,
        "W" => 420,
        "E" => 340,
        "F" => 260,
        "N" => 300,
        "S" => 300,
    ];

    return isset($prices[$standCode]) ? (float)$prices[$standCode] : 300.0;
}

function waitlist_offer_get_pricing_map($conn, $eventId)
{
    $map = [];

    try {
        $rows = dynamic_pricing_get_rows($conn, $eventId);
        foreach ($rows as $row) {
            $standCode = waitlist_normalize_stand($row["stand_code"] ?? "");
            $amount = (float)($row["price_amount"] ?? 0);
            if ($standCode !== "" && $amount > 0) {
                $map[$standCode] = $amount;
            }
        }
    } catch (Throwable $ignored) {
        $map = [];
    }

    return $map;
}

function waitlist_offer_calculate_price($conn, $eventId, $stand, array $offeredSeats, $ticketsCount)
{
    $ticketsCount = max(1, (int)$ticketsCount);
    $pricingMap = waitlist_offer_get_pricing_map($conn, $eventId);
    $total = 0.0;
    $details = [];

    if (!empty($offeredSeats)) {
        foreach ($offeredSeats as $seatKey) {
            $standCode = waitlist_offer_extract_stand_from_seat($seatKey, $stand);
            $price = isset($pricingMap[$standCode]) ? (float)$pricingMap[$standCode] : waitlist_offer_default_price_for_stand($standCode);
            $total += $price;
            $details[] = [
                "seat" => (string)$seatKey,
                "stand" => $standCode,
                "price" => $price,
            ];
        }
    }

    if ($total <= 0) {
        $standCode = waitlist_normalize_stand($stand);
        $price = isset($pricingMap[$standCode]) ? (float)$pricingMap[$standCode] : waitlist_offer_default_price_for_stand($standCode);
        $total = $price * $ticketsCount;
        for ($i = 0; $i < $ticketsCount; $i++) {
            $details[] = [
                "seat" => "",
                "stand" => $standCode,
                "price" => $price,
            ];
        }
    }

    $singlePrice = $ticketsCount > 0 ? ($total / $ticketsCount) : $total;

    return [
        "price_per_ticket" => $singlePrice,
        "total_amount" => $total,
        "price_text" => number_format($total, 2, ".", "") . " ₪",
        "details" => $details,
    ];
}

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    send_json(200, ["success" => true]);
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    send_json(405, [
        "success" => false,
        "message" => "נדרשת בקשת POST"
    ]);
}

$rawInput = file_get_contents("php://input");
$input = json_decode($rawInput, true);
$requestId = isset($input["request_id"]) ? (int)$input["request_id"] : 0;

if ($requestId <= 0) {
    send_json(400, [
        "success" => false,
        "message" => "חסר request_id תקין"
    ]);
}

try {
    $conn = db_connect();
    ensure_orders_table($conn);
    expire_pending_orders($conn);
    waitlist_expire_and_promote($conn);

    $conn->begin_transaction();

    $select = $conn->prepare(
        "SELECT id, user_id, username, email, full_name, event_id, event_name,
                competition, location, date_time, tickets_count, selection_mode,
                stand, preferred_row, offered_seats, status, offer_expires_at
         FROM waitlist_requests
         WHERE id = ?
         LIMIT 1
         FOR UPDATE"
    );

    if (!$select) {
        throw new Exception("שגיאה בהכנת שאילתת טעינת ההצעה: " . $conn->error);
    }

    $select->bind_param("i", $requestId);
    $select->execute();
    $result = $select->get_result();
    $row = $result ? $result->fetch_assoc() : null;
    $select->close();

    if (!$row) {
        throw new Exception("ההצעה לא נמצאה");
    }

    if (($row["status"] ?? "") !== "offered") {
        throw new Exception("ההצעה אינה זמינה לתשלום כרגע");
    }

    $offerExpiresTimestamp = !empty($row["offer_expires_at"]) ? strtotime($row["offer_expires_at"]) : 0;
    if (!$offerExpiresTimestamp || $offerExpiresTimestamp <= time()) {
        $expireStmt = $conn->prepare(
            "UPDATE waitlist_requests
             SET status = 'expired',
                 email_status = 'expired',
                 result = 'פג תוקף להצעת הרכישה',
                 offer_expires_at = NULL,
                 updated_at = NOW()
             WHERE id = ?"
        );

        if ($expireStmt) {
            $expireStmt->bind_param("i", $requestId);
            $expireStmt->execute();
            $expireStmt->close();
        }

        throw new Exception("פג הזמן להצעת הרכישה. ההצעה עברה לממתין הבא");
    }

    $temporaryHoldTimestamp = min($offerExpiresTimestamp, strtotime("+15 minutes"));
    $holdExpiresAt = date("Y-m-d H:i:s", $temporaryHoldTimestamp);

    $offeredSeats = parse_seat_list($row["offered_seats"] ?? "");
    $selectedSeatsText = !empty($offeredSeats)
        ? implode(" | ", $offeredSeats)
        : "בחירה לפי אזור";

    $priceData = waitlist_offer_calculate_price(
        $conn,
        (string)$row["event_id"],
        (string)($row["stand"] ?? ""),
        $offeredSeats,
        (int)($row["tickets_count"] ?? 1)
    );
    $priceText = $priceData["price_text"];

    $payload = [
        "user_id" => (int)$row["user_id"],
        "username" => (string)$row["username"],
        "email" => (string)$row["email"],
        "full_name" => (string)($row["full_name"] ?? ""),
        "event_id" => (string)$row["event_id"],
        "event_name" => (string)$row["event_name"],
        "location" => (string)($row["location"] ?? ""),
        "date_time" => (string)($row["date_time"] ?? ""),
        "category" => "Sold out",
        "competition" => (string)($row["competition"] ?? ""),
        "tickets_count" => (int)($row["tickets_count"] ?? 1),
        "selected_seats" => $selectedSeatsText,
        "price" => $priceText,
        "status" => "pending_payment",
        "purchase_source" => "waitlist",
        "waitlist_request_id" => $requestId,
        "hold_key" => "WAITLIST-" . $requestId,
        "hold_expires_at" => $holdExpiresAt,
    ];

    $temporaryOrder = create_temporary_order($conn, $payload);
    $order = $temporaryOrder["order"];

    $note = $temporaryOrder["created"]
        ? "נוצרה הזמנה זמנית ויש לעבור לתשלום"
        : "נמצאה הזמנה זמנית קיימת ויש להשלים את התשלום";

    $updateRequest = $conn->prepare(
        "UPDATE waitlist_requests
         SET result = ?,
             updated_at = NOW()
         WHERE id = ?"
    );

    if ($updateRequest) {
        $updateRequest->bind_param("si", $note, $requestId);
        $updateRequest->execute();
        $updateRequest->close();
    }

    $conn->commit();

    send_json(200, [
        "success" => true,
        "message" => $note,
        "order_id" => (int)$order["id"],
        "order_code" => (string)$order["order_code"],
        "hold_expires_at" => (string)($order["hold_expires_at"] ?? ""),
        "purchase_source" => "waitlist",
        "waitlist_request_id" => $requestId,
        "payment_event" => [
            "id" => (string)$row["event_id"],
            "teams" => (string)$row["event_name"],
            "title" => (string)$row["event_name"],
            "location" => (string)($row["location"] ?? ""),
            "dateTime" => (string)($row["date_time"] ?? ""),
            "category" => "Sold out",
            "competition" => (string)($row["competition"] ?? ""),
            "ticketsCount" => (int)($row["tickets_count"] ?? 1),
            "selectedSeats" => $offeredSeats,
            "selectedSeatIds" => $offeredSeats,
            "price" => $priceText,
            "totalPrice" => $priceText,
            "pricePerTicket" => number_format((float)$priceData["price_per_ticket"], 2, ".", "") . " ₪",
            "priceDetails" => $priceData["details"],
            "purchaseSource" => "waitlist",
            "selectionMode" => (string)($row["selection_mode"] ?? "zone"),
            "stand" => (string)($row["stand"] ?? ""),
            "preferredRow" => (string)($row["preferred_row"] ?? "")
        ]
    ]);
} catch (Throwable $error) {
    if (isset($conn) && $conn instanceof mysqli) {
        try {
            $conn->rollback();
        } catch (Throwable $ignored) {
        }
    }

    send_json(500, [
        "success" => false,
        "message" => "מעבר להצעת הרכישה נכשל",
        "details" => $error->getMessage()
    ]);
}