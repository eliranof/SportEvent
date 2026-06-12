<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

$host = "127.0.0.1";
$dbname = "sportevent";
$username = "root";
$password = "";

$conn = new mysqli($host, $username, $password, $dbname);

if ($conn->connect_error) {
    echo json_encode([
        "success" => false,
        "message" => "שגיאה בחיבור למסד הנתונים"
    ]);
    exit;
}

$conn->set_charset("utf8mb4");

$data = json_decode(file_get_contents("php://input"), true);

$userId = isset($data["user_id"]) ? intval($data["user_id"]) : 0;
$eventId = isset($data["event_id"]) ? trim($data["event_id"]) : "";

if ($userId <= 0 || $eventId === "") {
    echo json_encode([
        "success" => false,
        "message" => "חסרים נתונים לשמירת האירוע"
    ]);
    $conn->close();
    exit;
}

$checkSql = "SELECT id FROM saved_events WHERE user_id = ? AND event_id = ?";
$checkStmt = $conn->prepare($checkSql);
$checkStmt->bind_param("is", $userId, $eventId);
$checkStmt->execute();
$checkResult = $checkStmt->get_result();

if ($checkResult->num_rows > 0) {
    echo json_encode([
        "success" => false,
        "message" => "האירוע כבר שמור אצל המשתמש"
    ]);
    $checkStmt->close();
    $conn->close();
    exit;
}

$checkStmt->close();

$insertSql = "INSERT INTO saved_events (user_id, event_id) VALUES (?, ?)";
$insertStmt = $conn->prepare($insertSql);
$insertStmt->bind_param("is", $userId, $eventId);

if ($insertStmt->execute()) {
    echo json_encode([
        "success" => true,
        "message" => "האירוע נשמר בהצלחה"
    ]);
} else {
    echo json_encode([
        "success" => false,
        "message" => "שמירת האירוע נכשלה"
    ]);
}

$insertStmt->close();
$conn->close();
?>