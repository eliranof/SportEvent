<?php
ini_set("display_errors", 0);
error_reporting(E_ALL);
ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/db.php";
require_once __DIR__ . "/waitlist_engine.php";

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

$requestId = isset($_GET["request_id"]) ? (int)$_GET["request_id"] : 0;

if ($requestId <= 0) {
    send_json(400, [
        "success" => false,
        "message" => "חסר request_id תקין"
    ]);
}

try {
    $conn = db_connect();

    $eventStmt = $conn->prepare(
        "SELECT event_id FROM waitlist_requests WHERE id = ? LIMIT 1"
    );

    if ($eventStmt) {
        $eventStmt->bind_param("i", $requestId);
        $eventStmt->execute();
        $eventResult = $eventStmt->get_result();
        $eventRow = $eventResult ? $eventResult->fetch_assoc() : null;
        $eventStmt->close();

        if ($eventRow && !empty($eventRow["event_id"])) {
            waitlist_expire_and_promote($conn, (string)$eventRow["event_id"]);
        } else {
            waitlist_expire_and_promote($conn);
        }
    } else {
        waitlist_expire_and_promote($conn);
    }
} catch (Throwable $error) {
    send_json(500, [
        "success" => false,
        "message" => "Database connection failed",
        "details" => $error->getMessage()
    ]);
}

$stmt = $conn->prepare(
    "SELECT id, username, email, event_id, event_name, competition, location, date_time,
            tickets_count, selection_mode, stand, preferred_row, selected_seats,
            selected_seats_short, offered_seats, status, offer_expires_at
     FROM waitlist_requests
     WHERE id = ?
     LIMIT 1"
);

if (!$stmt) {
    $conn->close();
    send_json(500, [
        "success" => false,
        "message" => "שגיאה בהכנת שאילתת ההצעה",
        "details" => $conn->error
    ]);
}

$stmt->bind_param("i", $requestId);
$stmt->execute();
$result = $stmt->get_result();
$row = $result ? $result->fetch_assoc() : null;
$stmt->close();
$conn->close();

if (!$row) {
    send_json(404, [
        "success" => false,
        "message" => "ההצעה לא נמצאה"
    ]);
}

$status = (string)($row["status"] ?? "");

if ($status === "completed") {
    send_json(200, [
        "success" => false,
        "message" => "ההצעה כבר נוצלה וההזמנה הושלמה"
    ]);
}

if ($status === "expired") {
    send_json(200, [
        "success" => false,
        "message" => "ההצעה פגה ועברה לממתין הבא"
    ]);
}

if ($status !== "offered") {
    send_json(200, [
        "success" => false,
        "message" => "ההצעה אינה זמינה כעת"
    ]);
}

$expiresTimestamp = !empty($row["offer_expires_at"]) ? strtotime($row["offer_expires_at"]) : 0;
$remainingSeconds = $expiresTimestamp ? max(0, $expiresTimestamp - time()) : 0;

if ($remainingSeconds <= 0) {
    send_json(200, [
        "success" => false,
        "message" => "ההצעה פגה ועברה לממתין הבא"
    ]);
}

send_json(200, [
    "success" => true,
    "remaining_seconds" => $remainingSeconds,
    "offer" => [
        "id" => (int)$row["id"],
        "username" => (string)$row["username"],
        "email" => (string)$row["email"],
        "event_id" => (string)$row["event_id"],
        "event_name" => (string)$row["event_name"],
        "competition" => (string)($row["competition"] ?? ""),
        "location" => (string)($row["location"] ?? ""),
        "date_time" => (string)($row["date_time"] ?? ""),
        "tickets_count" => (int)($row["tickets_count"] ?? 0),
        "selection_mode" => (string)($row["selection_mode"] ?? "zone"),
        "stand" => (string)($row["stand"] ?? ""),
        "preferred_row" => (string)($row["preferred_row"] ?? ""),
        "selected_seats" => waitlist_normalize_seat_list($row["selected_seats"] ?? ""),
        "selected_seats_short" => waitlist_normalize_seat_list($row["selected_seats_short"] ?? ""),
        "offered_seats" => waitlist_normalize_seat_list($row["offered_seats"] ?? ""),
        "offer_expires_at" => (string)$row["offer_expires_at"]
    ]
]);
?>