<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

register_shutdown_function(function () {
    $error = error_get_last();
    if ($error !== null) {
        if (!headers_sent()) {
            http_response_code(500);
            header("Content-Type: application/json; charset=UTF-8");
        }
        echo json_encode([
            "success" => false,
            "message" => "PHP FATAL ERROR",
            "details" => $error["message"],
            "file" => $error["file"],
            "line" => $error["line"]
        ], JSON_UNESCAPED_UNICODE);
    }
});

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    echo json_encode(["success" => true], JSON_UNESCAPED_UNICODE);
    exit();
}

try {
    $host = "localhost";
    $dbName = "sportevent";
    $dbUser = "root";
    $dbPass = "";

    $conn = new mysqli($host, $dbUser, $dbPass, $dbName);

    if ($conn->connect_error) {
        throw new Exception("DB CONNECT ERROR: " . $conn->connect_error);
    }

    $conn->set_charset("utf8mb4");

    $rawData = file_get_contents("php://input");
    $data = json_decode($rawData, true);

    if (!is_array($data)) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "לא התקבל JSON תקין"
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    $username = isset($data["username"]) ? trim($data["username"]) : "";
    $email = isset($data["email"]) ? trim($data["email"]) : "";

    if ($username === "" || $email === "") {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "יש לשלוח שם משתמש ואימייל"
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    $usernameExists = false;
    $emailExists = false;

    $sql = "SELECT username, email FROM users WHERE username = ? OR email = ?";
    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        throw new Exception("PREPARE ERROR: " . $conn->error);
    }

    if (!$stmt->bind_param("ss", $username, $email)) {
        throw new Exception("BIND ERROR: " . $stmt->error);
    }

    if (!$stmt->execute()) {
        throw new Exception("EXECUTE ERROR: " . $stmt->error);
    }

    if (!$stmt->bind_result($dbUsername, $dbEmail)) {
        throw new Exception("BIND RESULT ERROR: " . $stmt->error);
    }

    while ($stmt->fetch()) {
        if ($dbUsername === $username) {
            $usernameExists = true;
        }

        if (strtolower($dbEmail) === strtolower($email)) {
            $emailExists = true;
        }
    }

    $stmt->close();
    $conn->close();

    echo json_encode([
        "success" => true,
        "usernameExists" => $usernameExists,
        "emailExists" => $emailExists
    ], JSON_UNESCAPED_UNICODE);
    exit();

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "SERVER ERROR",
        "details" => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    exit();
}