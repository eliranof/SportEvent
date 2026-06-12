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

function send_json($statusCode, $data)
{
    if (ob_get_length()) {
        ob_clean();
    }

    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
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
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
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
    $input = [];
}

$eventId = isset($input["event_id"]) ? trim((string)$input["event_id"]) : "";
$availableCount = isset($input["available_count"]) ? (int)$input["available_count"] : 0;
$availableStand = isset($input["available_stand"]) ? trim((string)$input["available_stand"]) : "";
$availableSeats = isset($input["available_seats"]) ? $input["available_seats"] : [];

if ($eventId === "") {
    send_json(400, [
        "success" => false,
        "message" => "יש לשלוח event_id"
    ]);
}

if ($availableCount <= 0 && is_array($availableSeats)) {
    $availableCount = count($availableSeats);
}

if ($availableCount <= 0) {
    send_json(400, [
        "success" => false,
        "message" => "יש לשלוח available_count או available_seats"
    ]);
}

try {
    $conn = db_connect();
} catch (Throwable $error) {
    send_json(500, [
        "success" => false,
        "message" => "Database connection failed",
        "details" => $error->getMessage()
    ]);
}

if (!waitlist_table_exists($conn, "waitlist_requests")) {
    $conn->close();
    send_json(500, [
        "success" => false,
        "message" => "לא נמצאה טבלת waitlist_requests"
    ]);
}

try {
    $expiredPromotions = waitlist_expire_and_promote($conn, $eventId);

    $conn->begin_transaction();

    $result = waitlist_find_and_offer_next(
        $conn,
        $eventId,
        $availableCount,
        $availableStand,
        $availableSeats,
        "נמצאה התאמה ונפתחה הצעת רכישה ל-90 דקות"
    );

    if (!$result["success"]) {
        $conn->commit();
        $conn->close();

        send_json(200, [
            "success" => true,
            "message" => $result["message"],
            "expired_promotions" => $expiredPromotions,
            "debug_rows" => $result["debug_rows"]
        ]);
    }

    $conn->commit();
    $conn->close();

    send_json(200, [
        "success" => true,
        "message" => $result["message"],
        "expired_promotions" => $expiredPromotions,
        "matched_request" => $result["matched_request"],
        "offered_seats" => $result["offered_seats"],
        "offered_seats_count" => $result["offered_seats_count"],
        "offer_expires_at" => $result["offer_expires_at"],
        "match_reason" => $result["match_reason"],
        "debug_rows" => $result["debug_rows"]
    ]);
} catch (Throwable $error) {
    if (isset($conn) && $conn instanceof mysqli) {
        try {
            $conn->rollback();
        } catch (Throwable $ignored) {
        }
        $conn->close();
    }

    send_json(500, [
        "success" => false,
        "message" => "עיבוד רשימת ההמתנה נכשל",
        "details" => $error->getMessage()
    ]);
}
?>