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
$paymentMethod = normalize_text_value($input["payment_method"] ?? "");
$walletProvider = normalize_text_value($input["wallet_provider"] ?? "");
$walletEmail = normalize_text_value($input["wallet_email"] ?? "");
$walletPassword = normalize_text_value($input["wallet_password"] ?? "");

$cardNumber = preg_replace("/\D+/", "", (string)($input["card_number"] ?? ""));
$ownerId = preg_replace("/\D+/", "", (string)($input["owner_id"] ?? ""));
$expiryDate = normalize_text_value($input["expiry_date"] ?? "");
$cvv = preg_replace("/\D+/", "", (string)($input["cvv"] ?? ""));
$installmentsCount = max(1, min(12, (int)($input["installments_count"] ?? 1)));

if ($orderId <= 0) {
    send_json(400, [
        "success" => false,
        "message" => "חסר order_id תקין"
    ]);
}

if ($paymentMethod !== "credit_card" && $paymentMethod !== "digital_wallet") {
    send_json(400, [
        "success" => false,
        "message" => "יש לבחור אמצעי תשלום תקין"
    ]);
}

if ($paymentMethod === "credit_card") {
    if (
        strlen($cardNumber) < 8 ||
        strlen($cardNumber) > 16 ||
        strlen($ownerId) !== 9 ||
        strlen($expiryDate) !== 5 ||
        strlen($cvv) !== 3
    ) {
        send_json(400, [
            "success" => false,
            "message" => "פרטי כרטיס האשראי אינם תקינים"
        ]);
    }
}

if ($paymentMethod === "digital_wallet") {
    if ($walletProvider === "") {
        send_json(400, [
            "success" => false,
            "message" => "יש לבחור סוג ארנק דיגיטלי"
        ]);
    }

    if ($walletEmail === "") {
        send_json(400, [
            "success" => false,
            "message" => "יש להזין אימייל של הארנק הדיגיטלי"
        ]);
    }

    if (!filter_var($walletEmail, FILTER_VALIDATE_EMAIL)) {
        send_json(400, [
            "success" => false,
            "message" => "אימייל הארנק הדיגיטלי אינו תקין"
        ]);
    }

    if ($walletPassword === "") {
        send_json(400, [
            "success" => false,
            "message" => "יש להזין סיסמת ארנק דיגיטלי"
        ]);
    }

    if (strlen($walletPassword) < 6) {
        send_json(400, [
            "success" => false,
            "message" => "סיסמת הארנק הדיגיטלי חייבת להכיל לפחות 6 תווים"
        ]);
    }
}

try {
    $conn = db_connect();
    ensure_orders_table($conn);
    expire_pending_orders($conn);

    $conn->begin_transaction();

    $select = $conn->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1 FOR UPDATE");

    if (!$select) {
        throw new Exception("שגיאה בהכנת שאילתת טעינת ההזמנה: " . $conn->error);
    }

    $select->bind_param("i", $orderId);
    $select->execute();
    $result = $select->get_result();
    $order = $result ? $result->fetch_assoc() : null;
    $select->close();

    if (!$order) {
        throw new Exception("ההזמנה לא נמצאה");
    }

    if (($order["status"] ?? "") === "paid") {
        $conn->commit();

        send_json(200, [
            "success" => true,
            "message" => "התשלום כבר הושלם בעבר",
            "order_id" => (int)$order["id"],
            "order_code" => (string)$order["order_code"],
            "ticket_code" => (string)($order["ticket_code"] ?? ""),
            "qr_value" => (string)($order["qr_value"] ?? ""),
            "payment_method" => (string)($order["payment_method"] ?? ""),
            "wallet_provider" => "",
            "status" => "paid"
        ]);
    }

    $expiresAt = !empty($order["hold_expires_at"]) ? strtotime($order["hold_expires_at"]) : 0;

    if ($expiresAt && $expiresAt <= time()) {
        $expire = $conn->prepare("UPDATE orders SET status = 'expired', updated_at = NOW() WHERE id = ?");

        if ($expire) {
            $expire->bind_param("i", $orderId);
            $expire->execute();
            $expire->close();
        }

        throw new Exception("פג הזמן המוקצב להזמנה הזמנית. יש להתחיל רכישה מחדש");
    }

    $selectedSeats = normalize_text_value($order["selected_seats"] ?? "");

    if ($selectedSeats !== "") {
        $seatsAreAvailable = seat_inventory_are_all_available(
            $conn,
            (string)($order["event_id"] ?? ""),
            $selectedSeats,
            $orderId
        );

        if (!$seatsAreAvailable) {
            $expire = $conn->prepare("UPDATE orders SET status = 'expired', updated_at = NOW() WHERE id = ?");

            if ($expire) {
                $expire->bind_param("i", $orderId);
                $expire->execute();
                $expire->close();
            }

            throw new Exception("המושבים שבחרת כבר אינם פנויים. יש לבחור מושבים מחדש");
        }
    }

    $ticketCode = !empty($order["ticket_code"])
        ? (string)$order["ticket_code"]
        : create_ticket_code($orderId);

    $qrValue = !empty($order["qr_value"])
        ? (string)$order["qr_value"]
        : "SportEvent|ticket=" . $ticketCode .
          "|order=" . (string)$order["order_code"] .
          "|event=" . (string)$order["event_id"] .
          "|user=" . (string)$order["user_id"];

    $finalPaymentMethod = $paymentMethod === "credit_card"
        ? "credit_card"
        : "digital_wallet";

    $update = $conn->prepare(
        "UPDATE orders
         SET status = 'paid',
             payment_method = ?,
             installments_count = ?,
             ticket_code = ?,
             qr_value = ?,
             purchase_date = NOW(),
             updated_at = NOW()
         WHERE id = ?"
    );

    if (!$update) {
        throw new Exception("שגיאה בהכנת שאילתת עדכון תשלום: " . $conn->error);
    }

    $update->bind_param("sissi", $finalPaymentMethod, $installmentsCount, $ticketCode, $qrValue, $orderId);

    if (!$update->execute()) {
        $message = $update->error;
        $update->close();

        throw new Exception("עדכון התשלום נכשל: " . $message);
    }

    $update->close();

    $updatedOrder = get_order_by_id($conn, $orderId);
    $inventoryUpdate = seat_inventory_mark_sold_for_order(
        $conn,
        $updatedOrder ?: $order,
        "payment_completed"
    );

    $waitlistRequestId = isset($order["waitlist_request_id"]) ? (int)$order["waitlist_request_id"] : 0;

    if (
        ($order["purchase_source"] ?? "") === "waitlist" &&
        $waitlistRequestId > 0 &&
        waitlist_table_exists($conn, "waitlist_requests")
    ) {
        $waitlistStatus = "completed";
        $waitlistResult = "הזמנת ההמתנה הושלמה בהצלחה. מספר הזמנה: " . (string)$order["order_code"];
        $clearValue = null;

        $waitlistUpdate = $conn->prepare(
            "UPDATE waitlist_requests
             SET status = ?,
                 email_status = 'completed',
                 result = ?,
                 offer_expires_at = ?,
                 updated_at = NOW()
             WHERE id = ?"
        );

        if ($waitlistUpdate) {
            $waitlistUpdate->bind_param(
                "sssi",
                $waitlistStatus,
                $waitlistResult,
                $clearValue,
                $waitlistRequestId
            );

            $waitlistUpdate->execute();
            $waitlistUpdate->close();
        }
    }

    $conn->commit();

    send_json(200, [
        "success" => true,
        "message" => "התשלום הושלם בהצלחה",
        "order_id" => $orderId,
        "order_code" => (string)$order["order_code"],
        "ticket_code" => $ticketCode,
        "qr_value" => $qrValue,
        "payment_method" => $finalPaymentMethod,
        "wallet_provider" => $walletProvider,
        "status" => "paid",
        "inventory_updated" => true,
        "sold_seat_keys" => $inventoryUpdate["seat_keys"]
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
        "message" => "השלמת התשלום נכשלה",
        "details" => $error->getMessage()
    ]);
}
?>