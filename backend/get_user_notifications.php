<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

function send_json($statusCode, $data)
{
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

$host = "127.0.0.1";
$dbname = "sportevent";
$username = "root";
$password = "";

$conn = new mysqli($host, $username, $password, $dbname);

if ($conn->connect_error) {
    send_json(500, [
        "success" => false,
        "message" => "שגיאה בחיבור למסד הנתונים",
        "notifications" => []
    ]);
}

$conn->set_charset("utf8mb4");

$conn->query(
    "CREATE TABLE IF NOT EXISTS user_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL DEFAULT 0,
        email VARCHAR(255) NOT NULL DEFAULT '',
        type VARCHAR(100) NOT NULL DEFAULT 'info',
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        related_id INT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
);

$userId = isset($_GET["user_id"]) ? intval($_GET["user_id"]) : 0;
$email = isset($_GET["email"]) ? trim((string)$_GET["email"]) : "";
$limit = isset($_GET["limit"]) ? intval($_GET["limit"]) : 10;

if ($limit < 1 || $limit > 50) {
    $limit = 10;
}

if ($userId <= 0 && $email === "") {
    send_json(400, [
        "success" => false,
        "message" => "חסר מזהה משתמש או אימייל",
        "notifications" => []
    ]);
}

$sql = "SELECT id, user_id, email, type, title, message, related_id, created_at
        FROM user_notifications
        WHERE user_id = ? OR LOWER(email) = LOWER(?)
        ORDER BY created_at DESC, id DESC
        LIMIT {$limit}";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    send_json(500, [
        "success" => false,
        "message" => "שגיאה בהכנת שאילתת ההתראות",
        "notifications" => []
    ]);
}

$stmt->bind_param("is", $userId, $email);

if (!$stmt->execute()) {
    send_json(500, [
        "success" => false,
        "message" => "שגיאה בהרצת שאילתת ההתראות",
        "notifications" => []
    ]);
}

$result = $stmt->get_result();
$notifications = [];

while ($row = $result->fetch_assoc()) {
    $notifications[] = [
        "id" => (int)$row["id"],
        "user_id" => (int)$row["user_id"],
        "email" => $row["email"],
        "type" => $row["type"],
        "title" => $row["title"],
        "message" => $row["message"],
        "related_id" => $row["related_id"] !== null ? (int)$row["related_id"] : null,
        "created_at" => $row["created_at"]
    ];
}

$stmt->close();
$conn->close();

send_json(200, [
    "success" => true,
    "notifications" => $notifications
]);