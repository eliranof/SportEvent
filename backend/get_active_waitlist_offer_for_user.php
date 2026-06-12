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

$userId = isset($_GET["user_id"]) ? (int)$_GET["user_id"] : 0;
$email = isset($_GET["email"]) ? trim((string)$_GET["email"]) : "";
$username = isset($_GET["username"]) ? trim((string)$_GET["username"]) : "";

if ($userId <= 0 && $email === "" && $username === "") {
    send_json(400, [
        "success" => false,
        "message" => "יש לשלוח user_id, email או username"
    ]);
}

try {
    $conn = db_connect();
    waitlist_expire_and_promote($conn);
} catch (Throwable $error) {
    send_json(500, [
        "success" => false,
        "message" => "Database connection failed",
        "details" => $error->getMessage()
    ]);
}

$whereParts = [];
$types = "";
$params = [];

if ($userId > 0) {
    $whereParts[] = "user_id = ?";
    $types .= "i";
    $params[] = $userId;
}

if ($email !== "") {
    $whereParts[] = "email = ?";
    $types .= "s";
    $params[] = $email;
}

if ($username !== "") {
    $whereParts[] = "username = ?";
    $types .= "s";
    $params[] = $username;
}

$userClause = implode(" OR ", $whereParts);

$sql = "SELECT id, event_id, event_name, competition, location, date_time,
               tickets_count, offered_seats, offer_sent_at, offer_expires_at
        FROM waitlist_requests
        WHERE status = 'offered'
          AND offer_expires_at IS NOT NULL
          AND offer_expires_at > NOW()
          AND ({$userClause})
        ORDER BY offer_sent_at DESC, id DESC
        LIMIT 1";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    $conn->close();
    send_json(500, [
        "success" => false,
        "message" => "שגיאה בהכנת שאילתת ההצעה",
        "details" => $conn->error
    ]);
}

if ($types !== "") {
    $stmt->bind_param($types, ...$params);
}

$stmt->execute();
$result = $stmt->get_result();
$row = $result ? $result->fetch_assoc() : null;
$stmt->close();
$conn->close();

if (!$row) {
    send_json(200, [
        "success" => true,
        "has_offer" => false
    ]);
}

$offeredSeats = waitlist_normalize_seat_list($row["offered_seats"] ?? "");
$expiresTimestamp = !empty($row["offer_expires_at"]) ? strtotime($row["offer_expires_at"]) : 0;
$remainingSeconds = $expiresTimestamp ? max(0, $expiresTimestamp - time()) : 0;

if ($remainingSeconds <= 0) {
    send_json(200, [
        "success" => true,
        "has_offer" => false
    ]);
}

$notificationKey = implode("|", [
    (int)$row["id"],
    (string)($row["offer_sent_at"] ?? ""),
    (string)($row["offer_expires_at"] ?? "")
]);

send_json(200, [
    "success" => true,
    "has_offer" => true,
    "offer" => [
        "request_id" => (int)$row["id"],
        "event_id" => (string)$row["event_id"],
        "event_name" => (string)$row["event_name"],
        "competition" => (string)($row["competition"] ?? ""),
        "location" => (string)($row["location"] ?? ""),
        "date_time" => (string)($row["date_time"] ?? ""),
        "tickets_count" => (int)($row["tickets_count"] ?? 0),
        "offered_seats" => $offeredSeats,
        "offer_expires_at" => (string)$row["offer_expires_at"],
        "remaining_seconds" => $remainingSeconds,
        "notification_key" => $notificationKey
    ]
]);
?>