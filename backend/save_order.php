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
    send_json(200, [
        "success" => true,
        "message" => "OPTIONS OK"
    ]);
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

try {
    $conn = db_connect();
    $result = create_temporary_order($conn, $input);
    $order = $result["order"];

    send_json(200, [
        "success" => true,
        "message" => $result["created"] ? "הזמנה זמנית נוצרה" : "נמצאה הזמנה זמנית קיימת",
        "created" => $result["created"],
        "order_id" => (int)$order["id"],
        "order_code" => (string)$order["order_code"],
        "status" => (string)$order["status"],
        "status_label" => order_status_label($order["status"] ?? ""),
        "hold_expires_at" => (string)($order["hold_expires_at"] ?? ""),
        "purchase_source" => (string)($order["purchase_source"] ?? "regular")
    ]);
} catch (Throwable $error) {
    send_json(500, [
        "success" => false,
        "message" => "שמירת הזמנה זמנית נכשלה",
        "details" => $error->getMessage()
    ]);
}