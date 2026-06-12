<?php
ini_set("display_errors", 0);
error_reporting(E_ALL);
ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/db.php";
require_once __DIR__ . "/seat_inventory_helpers.php";
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

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    send_json(200, ["success" => true]);
}

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    send_json(405, [
        "success" => false,
        "message" => "נדרשת בקשת GET"
    ]);
}

$eventId = trim((string)($_GET["event_id"] ?? ""));

if ($eventId === '') {
    send_json(400, [
        "success" => false,
        "message" => "חסר event_id"
    ]);
}

try {
    $conn = db_connect();

    $overrides = seat_inventory_get_event_overrides($conn, $eventId);
    $pricingRows = dynamic_pricing_get_rows($conn, $eventId);

    $soldSeatKeys = [];
    $availableSeatKeys = [];

    foreach ($overrides as $row) {
        if (($row["status"] ?? "") === "sold") {
            $soldSeatKeys[] = (string)$row["seat_key"];
        }

        if (($row["status"] ?? "") === "available") {
            $availableSeatKeys[] = (string)$row["seat_key"];
        }
    }

    send_json(200, [
        "success" => true,
        "event_id" => $eventId,
        "sold_seat_keys" => array_values(array_unique($soldSeatKeys)),
        "available_seat_keys" => array_values(array_unique($availableSeatKeys)),
        "overrides" => $overrides,
        "pricing_overrides" => $pricingRows,
        "source" => "database_overrides"
    ]);
} catch (Throwable $error) {
    send_json(500, [
        "success" => false,
        "message" => "טעינת מלאי האירוע נכשלה",
        "details" => $error->getMessage()
    ]);
}