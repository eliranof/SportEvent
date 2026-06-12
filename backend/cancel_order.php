<?php
ini_set("display_errors", 0);
error_reporting(E_ALL);
ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/db.php";
require_once __DIR__ . "/order_helpers.php";
require_once __DIR__ . "/waitlist_engine.php";
require_once __DIR__ . "/seat_inventory_helpers.php";

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

function parse_order_selected_seats_for_waitlist($selectedSeatsText)
{
    $text = trim((string)$selectedSeatsText);
    if ($text === "") {
        return [];
    }

    $normalized = [];

    if (preg_match_all('/(?:יציע\s*)?([A-Za-zא-ת]+)\s*\|\s*שורה\s*(\d+)\s*\|\s*(?:כסא|כיסא|מושב|seat)\s*(\d+)/u', $text, $matches, PREG_SET_ORDER)) {
        foreach ($matches as $match) {
            $normalized[] = waitlist_normalize_stand($match[1]) . '-' . $match[2] . '-' . $match[3];
        }
    }

    if (empty($normalized) && preg_match_all('/([A-Za-zא-ת]+-\d+-\d+)/u', $text, $matches, PREG_SET_ORDER)) {
        foreach ($matches as $match) {
            $seat = waitlist_normalize_single_seat($match[1]);
            if ($seat !== '') {
                $normalized[] = $seat;
            }
        }
    }

    if (empty($normalized)) {
        $parts = preg_split('/\s*(?:,|;)\s*/u', $text);
        foreach ($parts as $part) {
            $seatText = trim((string)$part);
            if ($seatText === '') {
                continue;
            }

            $seatText = preg_replace('/^יציע\s+/u', '', $seatText);
            $seatText = preg_replace('/^stand\s+/iu', '', $seatText);
            $seat = waitlist_normalize_single_seat($seatText);
            if ($seat !== '') {
                $normalized[] = $seat;
            }
        }
    }

    return array_values(array_unique(array_filter($normalized)));
}

function get_stand_from_compact_seat($compactSeat)
{
    $seatText = trim((string)$compactSeat);
    if ($seatText === '') {
        return '';
    }

    if (preg_match('/^([A-Za-zא-ת]+)-/u', $seatText, $matches)) {
        return waitlist_normalize_stand($matches[1]);
    }

    return '';
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

if (!is_array($input)) {
    send_json(400, [
        "success" => false,
        "message" => "לא התקבל JSON תקין"
    ]);
}

$orderId = isset($input["order_id"]) ? (int)$input["order_id"] : 0;
$userId = isset($input["user_id"]) ? (int)$input["user_id"] : 0;
$email = normalize_text_value($input["email"] ?? "");

if ($orderId <= 0) {
    send_json(400, [
        "success" => false,
        "message" => "חסר order_id תקין"
    ]);
}

try {
    $conn = db_connect();
    ensure_orders_table($conn);
    expire_pending_orders($conn);
    waitlist_expire_and_promote($conn);

    $conn->begin_transaction();

    $stmt = $conn->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1 FOR UPDATE");
    if (!$stmt) {
        throw new Exception("שגיאה בהכנת שאילתת טעינת ההזמנה: " . $conn->error);
    }

    $stmt->bind_param("i", $orderId);
    $stmt->execute();
    $result = $stmt->get_result();
    $order = $result ? $result->fetch_assoc() : null;
    $stmt->close();

    if (!$order) {
        throw new Exception("ההזמנה לא נמצאה");
    }

    $orderUserId = (int)($order["user_id"] ?? 0);
    $orderEmail = normalize_text_value($order["email"] ?? "");
    $hasIdentity = $userId > 0 || $email !== '';

    if ($hasIdentity) {
        $userMatches = ($userId > 0 && $userId === $orderUserId) || ($email !== '' && strcasecmp($email, $orderEmail) === 0);
        if (!$userMatches) {
            throw new Exception("אין הרשאה לבטל את ההזמנה הזו");
        }
    }

    if (($order["status"] ?? '') === 'cancelled') {
        $conn->commit();
        send_json(200, [
            "success" => true,
            "message" => "ההזמנה כבר בוטלה בעבר",
            "order_id" => (int)$order["id"],
            "status" => 'cancelled',
            "refund_amount" => (string)($order["refund_amount"] ?? ''),
            "cancel_fee_amount" => (string)($order["cancel_fee_amount"] ?? ''),
            "cancellation_policy" => order_build_cancellation_policy($order)
        ]);
    }

    if (($order["status"] ?? '') !== 'paid' && ($order["status"] ?? '') !== 'הוזמן בהצלחה') {
        throw new Exception("ניתן לבטל רק הזמנה ששולמה");
    }

    $policy = order_build_cancellation_policy($order);
    if (!$policy["can_cancel"]) {
        throw new Exception($policy["message"]);
    }

    $refundAmount = (string)$policy["refund_amount"];
    $feeAmount = (string)$policy["fee_amount"];
    $windowLabel = (string)$policy["stage_label"];

    $update = $conn->prepare(
        "UPDATE orders
         SET status = 'cancelled',
             cancelled_at = NOW(),
             refund_amount = ?,
             cancel_fee_amount = ?,
             cancellation_window_label = ?,
             updated_at = NOW()
         WHERE id = ?"
    );

    if (!$update) {
        throw new Exception("שגיאה בהכנת שאילתת ביטול ההזמנה: " . $conn->error);
    }

    $update->bind_param("sssi", $refundAmount, $feeAmount, $windowLabel, $orderId);
    if (!$update->execute()) {
        $error = $update->error;
        $update->close();
        throw new Exception("עדכון סטטוס הביטול נכשל: " . $error);
    }
    $update->close();

    $inventoryRelease = seat_inventory_release_for_order($conn, $order, 'order_cancelled');

    $promotionInfo = [
        "success" => false,
        "message" => "לא בוצע קידום רשימת המתנה",
    ];

    $eventId = normalize_text_value($order["event_id"] ?? '');
    $availableSeats = parse_order_selected_seats_for_waitlist($order["selected_seats"] ?? '');
    $availableCount = !empty($availableSeats)
        ? count($availableSeats)
        : max(1, (int)($order["tickets_count"] ?? 1));
    $availableStand = !empty($availableSeats) ? get_stand_from_compact_seat($availableSeats[0]) : '';

    if ($eventId !== '' && waitlist_table_exists($conn, 'waitlist_requests')) {
        $promotionInfo = waitlist_find_and_offer_next(
            $conn,
            $eventId,
            $availableCount,
            $availableStand,
            $availableSeats,
            "בוטלה הזמנה קיימת ונפתחה הצעת רכישה ל-90 דקות"
        );
    }

    $waitlistRequestId = isset($order['waitlist_request_id']) ? (int)$order['waitlist_request_id'] : 0;
    if (($order['purchase_source'] ?? '') === 'waitlist' && $waitlistRequestId > 0 && waitlist_table_exists($conn, 'waitlist_requests')) {
        $waitlistStatus = 'cancelled';
        $waitlistResult = 'רכישת ההמתנה בוטלה לאחר התשלום';

        $waitlistUpdate = $conn->prepare(
            "UPDATE waitlist_requests
             SET status = ?,
                 result = ?,
                 updated_at = NOW()
             WHERE id = ?"
        );

        if ($waitlistUpdate) {
            $waitlistUpdate->bind_param('ssi', $waitlistStatus, $waitlistResult, $waitlistRequestId);
            $waitlistUpdate->execute();
            $waitlistUpdate->close();
        }
    }

    $updatedOrder = get_order_by_id($conn, $orderId);
    $conn->commit();

    $message = "ההזמנה בוטלה בהצלחה. סכום הזיכוי: {$refundAmount}. דמי הביטול: {$feeAmount}.";
    if (!empty($promotionInfo["success"])) {
        $message .= " נמצאה התאמה ברשימת ההמתנה ונשלחה הצעת רכישה לממתין הבא.";
    }

    send_json(200, [
        "success" => true,
        "message" => $message,
        "order_id" => (int)$orderId,
        "status" => 'cancelled',
        "refund_amount" => $refundAmount,
        "cancel_fee_amount" => $feeAmount,
        "cancellation_window_label" => $windowLabel,
        "promotion" => [
            "success" => !empty($promotionInfo["success"]),
            "message" => (string)($promotionInfo["message"] ?? ''),
            "offered_seats" => $promotionInfo["offered_seats"] ?? [],
            "offer_expires_at" => (string)($promotionInfo["offer_expires_at"] ?? ''),
        ],
        "cancellation_policy" => order_build_cancellation_policy($updatedOrder ?: $order),
        "released_seat_keys" => $inventoryRelease["seat_keys"],
        "waitlist_promotion" => $promotionInfo
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
        "message" => "ביטול ההזמנה נכשל",
        "details" => $error->getMessage()
    ]);
}
