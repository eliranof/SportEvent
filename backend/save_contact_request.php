<?php
ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

ini_set("display_errors", 0);
error_reporting(E_ALL);
mysqli_report(MYSQLI_REPORT_OFF);

require_once __DIR__ . "/db.php";

function jsonResponse($statusCode, $payload) {
    while (ob_get_level() > 0) {
        ob_end_clean();
    }

    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit();
}

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    jsonResponse(200, [
        "success" => true,
        "message" => "Preflight OK"
    ]);
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonResponse(405, [
        "success" => false,
        "message" => "Only POST method is allowed"
    ]);
}

try {
    $conn = db_connect();
} catch (Throwable $error) {
    jsonResponse(500, [
        "success" => false,
        "message" => "Database connection failed",
        "details" => $error->getMessage()
    ]);
}

$rawData = file_get_contents("php://input");

if ($rawData === false || trim($rawData) === "") {
    jsonResponse(400, [
        "success" => false,
        "message" => "Empty request body"
    ]);
}

$data = json_decode($rawData, true);

if (!is_array($data)) {
    jsonResponse(400, [
        "success" => false,
        "message" => "Invalid JSON data"
    ]);
}

$senderType = trim((string)($data["senderType"] ?? ""));
$userId = trim((string)($data["userId"] ?? ""));
$username = trim((string)($data["username"] ?? ""));
$fullName = trim((string)($data["fullName"] ?? ""));
$email = trim((string)($data["email"] ?? ""));
$phone = trim((string)($data["phone"] ?? ""));
$subject = trim((string)($data["subject"] ?? ""));
$reason = trim((string)($data["reason"] ?? ""));
$status = "new";

if ($senderType === "" || $email === "" || $subject === "" || $reason === "") {
    jsonResponse(400, [
        "success" => false,
        "message" => "Missing required fields"
    ]);
}

$sql = "
    INSERT INTO contact_requests
    (sender_type, user_id, username, full_name, email, phone, subject, reason, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    jsonResponse(500, [
        "success" => false,
        "message" => "Prepare failed: " . $conn->error
    ]);
}

$bindOk = $stmt->bind_param(
    "sssssssss",
    $senderType,
    $userId,
    $username,
    $fullName,
    $email,
    $phone,
    $subject,
    $reason,
    $status
);

if (!$bindOk) {
    jsonResponse(500, [
        "success" => false,
        "message" => "Bind failed: " . $stmt->error
    ]);
}

$executeOk = $stmt->execute();

if (!$executeOk) {
    jsonResponse(500, [
        "success" => false,
        "message" => "Execute failed: " . $stmt->error
    ]);
}

$stmt->close();
$conn->close();

jsonResponse(200, [
    "success" => true,
    "message" => "Request saved successfully"
]);
?>