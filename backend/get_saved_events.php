<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
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
        "message" => "שגיאה בחיבור למסד הנתונים",
        "events" => []
    ]);
    exit;
}

$conn->set_charset("utf8mb4");

$userId = isset($_GET["user_id"]) ? intval($_GET["user_id"]) : 0;

if ($userId <= 0) {
    echo json_encode([
        "success" => false,
        "message" => "חסר מזהה משתמש",
        "events" => []
    ]);
    $conn->close();
    exit;
}

$sql = "SELECT id, user_id, event_id, created_at
        FROM saved_events
        WHERE user_id = ?
        ORDER BY created_at DESC";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode([
        "success" => false,
        "message" => "שגיאה בהכנת שאילתת שליפת האירועים השמורים",
        "events" => []
    ]);
    $conn->close();
    exit;
}

$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();

$events = [];

while ($row = $result->fetch_assoc()) {
    $events[] = [
        "id" => $row["id"],
        "user_id" => $row["user_id"],
        "event_id" => $row["event_id"],
        "created_at" => $row["created_at"]
    ];
}

echo json_encode([
    "success" => true,
    "events" => $events
]);

$stmt->close();
$conn->close();
?>