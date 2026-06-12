<?php
session_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

function send_json($statusCode, $data) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    send_json(200, ["success" => true]);
}

$rawData = file_get_contents("php://input");
$data = json_decode($rawData, true);

if (!is_array($data)) {
    send_json(400, [
        "success" => false,
        "message" => "לא התקבל JSON תקין."
    ]);
}

$method = isset($data["method"]) ? trim($data["method"]) : "";
$email = isset($data["email"]) ? trim($data["email"]) : "";
$phone = isset($data["phone"]) ? trim($data["phone"]) : "";

if ($method !== "email" && $method !== "sms") {
    send_json(400, [
        "success" => false,
        "message" => "יש לבחור שיטת אימות תקינה."
    ]);
}

if ($method === "email") {
    if ($email === "" || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        send_json(400, [
            "success" => false,
            "message" => "כתובת האימייל אינה תקינה."
        ]);
    }
}

if ($method === "sms") {
    $digits = preg_replace("/\D/", "", $phone);

    if ($digits === "" || strlen($digits) !== 10 || !preg_match("/^05[0-9]/", $digits)) {
        send_json(400, [
            "success" => false,
            "message" => "מספר הטלפון אינו תקין."
        ]);
    }

    $phone = $digits;
}

$code = str_pad((string) random_int(0, 999999), 6, "0", STR_PAD_LEFT);

$_SESSION["sportevent_verification"] = [
    "code" => $code,
    "method" => $method,
    "email" => $email,
    "phone" => $phone,
    "verified" => false,
    "createdAt" => time(),
    "expiresAt" => time() + 300
];

$message = $method === "email"
    ? "קוד אימות נשלח לאימייל שהוזן."
    : "קוד אימות נשלח ב-SMS למספר שהוזן.";

send_json(200, [
    "success" => true,
    "message" => $message,
    "demoCode" => $code,
    "expiresInSeconds" => 300
]);