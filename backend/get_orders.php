<?php
ini_set("display_errors", 0);
error_reporting(E_ALL);
ob_start();

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/db.php";
require_once __DIR__ . "/order_helpers.php";

function send_json($statusCode, $data)
{
    if (ob_get_length()) {
        ob_clean();
    }

    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

try {
    $conn = db_connect();
    ensure_orders_table($conn);
    expire_pending_orders($conn);
} catch (Throwable $error) {
    send_json(500, [
        "success" => false,
        "message" => "Database connection failed",
        "details" => $error->getMessage()
    ]);
}

$userId = isset($_GET["user_id"]) ? intval($_GET["user_id"]) : 0;
$email = isset($_GET["email"]) ? trim((string)$_GET["email"]) : "";

if ($userId <= 0 && $email === "") {
    send_json(400, [
        "success" => false,
        "message" => "Missing user_id or email"
    ]);
}

$sql = "
    SELECT
        id,
        order_code,
        user_id,
        email,
        event_id,
        event_name,
        location,
        date_time,
        category,
        competition,
        tickets_count,
        selected_seats,
        price,
        status,
        payment_method,
        hold_expires_at,
        ticket_code,
        qr_value,
        purchase_source,
        waitlist_request_id,
        purchase_date,
        cancelled_at,
        cancel_fee_amount,
        refund_amount,
        cancellation_window_label,
        package_title,
        hotel_name,
        hotel_stars,
        room_type,
        flight_label,
        airline,
        outbound_flight,
        return_flight,
        nights
    FROM orders
    WHERE user_id = ? OR email = ?
    ORDER BY id DESC
";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    send_json(500, [
        "success" => false,
        "message" => "Prepare failed: " . $conn->error
    ]);
}

$stmt->bind_param("is", $userId, $email);
$stmt->execute();
$result = $stmt->get_result();
$orders = [];

while ($row = $result->fetch_assoc()) {
    $policy = order_build_cancellation_policy($row);
    $row["status_label"] = order_status_label($row["status"] ?? "");
    $row["cancellation_policy"] = $policy;
    $orders[] = $row;
}

$stmt->close();
$conn->close();

send_json(200, [
    "success" => true,
    "orders" => $orders
]);
