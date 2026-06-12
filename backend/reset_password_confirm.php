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

function validateStrongPassword($password) {
    if (strlen($password) < 8) {
        return "הסיסמה חייבת להכיל לפחות 8 תווים.";
    }

    if (!preg_match("/[A-Z]/", $password)) {
        return "הסיסמה חייבת להכיל לפחות אות גדולה אחת באנגלית.";
    }

    if (!preg_match("/[0-9]/", $password)) {
        return "הסיסמה חייבת להכיל לפחות מספר אחד.";
    }

    if (!preg_match("/[!@#$%^&*]/", $password)) {
        return "הסיסמה חייבת להכיל לפחות תו מיוחד אחד: ! @ # $ % ^ & *";
    }

    return "";
}

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    jsonResponse(200, [
        "success" => true,
        "message" => "OPTIONS OK"
    ]);
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonResponse(405, [
        "success" => false,
        "message" => "נדרשת בקשת POST."
    ]);
}

try {
    $conn = db_connect();
} catch (Throwable $error) {
    jsonResponse(500, [
        "success" => false,
        "message" => "שגיאה בחיבור למסד הנתונים.",
        "details" => $error->getMessage()
    ]);
}

$rawData = file_get_contents("php://input");
$data = json_decode($rawData, true);

$email = isset($data["email"]) ? trim($data["email"]) : "";
$temporaryPassword = isset($data["temporaryPassword"]) ? trim($data["temporaryPassword"]) : "";
$newPassword = isset($data["newPassword"]) ? trim($data["newPassword"]) : "";

if ($email === "" || $temporaryPassword === "" || $newPassword === "") {
    jsonResponse(400, [
        "success" => false,
        "message" => "יש למלא אימייל, סיסמה זמנית וסיסמה חדשה."
    ]);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(400, [
        "success" => false,
        "message" => "כתובת האימייל אינה תקינה."
    ]);
}

$passwordError = validateStrongPassword($newPassword);

if ($passwordError !== "") {
    jsonResponse(400, [
        "success" => false,
        "message" => $passwordError
    ]);
}

$userStmt = $conn->prepare("
    SELECT id, email
    FROM users
    WHERE email = ?
    LIMIT 1
");

if (!$userStmt) {
    jsonResponse(500, [
        "success" => false,
        "message" => "שגיאה בבדיקת המשתמש.",
        "details" => $conn->error
    ]);
}

$userStmt->bind_param("s", $email);
$userStmt->execute();
$userResult = $userStmt->get_result();

if (!$userResult || $userResult->num_rows === 0) {
    $userStmt->close();
    $conn->close();

    jsonResponse(404, [
        "success" => false,
        "message" => "לא נמצא משתמש עם האימייל שהוזן."
    ]);
}

$user = $userResult->fetch_assoc();
$userId = (int)$user["id"];
$userStmt->close();

$resetStmt = $conn->prepare("
    SELECT id, temp_password_hash, expires_at
    FROM password_reset_requests
    WHERE email = ?
      AND user_id = ?
      AND used = 0
      AND expires_at >= NOW()
    ORDER BY id DESC
    LIMIT 1
");

if (!$resetStmt) {
    jsonResponse(500, [
        "success" => false,
        "message" => "שגיאה בבדיקת הסיסמה הזמנית.",
        "details" => $conn->error
    ]);
}

$resetStmt->bind_param("si", $email, $userId);
$resetStmt->execute();
$resetResult = $resetStmt->get_result();

if (!$resetResult || $resetResult->num_rows === 0) {
    $resetStmt->close();
    $conn->close();

    jsonResponse(400, [
        "success" => false,
        "message" => "לא נמצאה סיסמה זמנית פעילה או שהיא פגה."
    ]);
}

$resetRequest = $resetResult->fetch_assoc();
$resetStmt->close();

if (!password_verify($temporaryPassword, $resetRequest["temp_password_hash"])) {
    $conn->close();

    jsonResponse(400, [
        "success" => false,
        "message" => "הסיסמה הזמנית שגויה."
    ]);
}

$newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);
$resetRequestId = (int)$resetRequest["id"];

$conn->begin_transaction();

try {
    $updatePasswordStmt = $conn->prepare("
        UPDATE users
        SET password = ?
        WHERE id = ?
    ");

    if (!$updatePasswordStmt) {
        throw new Exception("שגיאה בהכנת עדכון הסיסמה: " . $conn->error);
    }

    $updatePasswordStmt->bind_param("si", $newPasswordHash, $userId);

    if (!$updatePasswordStmt->execute()) {
        throw new Exception("שגיאה בעדכון הסיסמה: " . $updatePasswordStmt->error);
    }

    $updatePasswordStmt->close();

    $markUsedStmt = $conn->prepare("
        UPDATE password_reset_requests
        SET used = 1, used_at = NOW()
        WHERE id = ?
    ");

    if (!$markUsedStmt) {
        throw new Exception("שגיאה בהכנת סימון הסיסמה הזמנית: " . $conn->error);
    }

    $markUsedStmt->bind_param("i", $resetRequestId);

    if (!$markUsedStmt->execute()) {
        throw new Exception("שגיאה בסימון הסיסמה הזמנית: " . $markUsedStmt->error);
    }

    $markUsedStmt->close();

    $conn->commit();
    $conn->close();

    jsonResponse(200, [
        "success" => true,
        "message" => "הסיסמה עודכנה בהצלחה."
    ]);
} catch (Throwable $error) {
    $conn->rollback();
    $conn->close();

    jsonResponse(500, [
        "success" => false,
        "message" => "שגיאה בעדכון הסיסמה.",
        "details" => $error->getMessage()
    ]);
}
?>