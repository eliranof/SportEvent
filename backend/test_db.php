<?php
header("Content-Type: application/json; charset=UTF-8");
require_once __DIR__ . "/db.php";

try {
    $conn = db_connect();
    echo json_encode([
        "success" => true,
        "message" => "Database connection OK"
    ], JSON_UNESCAPED_UNICODE);
    $conn->close();
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Database connection failed",
        "details" => $error->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>