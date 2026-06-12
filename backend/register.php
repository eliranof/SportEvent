<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}

$host = "localhost";
$dbName = "sportevent";
$dbUser = "root";
$dbPass = "";

$conn = new mysqli($host, $dbUser, $dbPass, $dbName);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "שגיאה בחיבור למסד הנתונים."
    ]);
    exit();
}

$conn->set_charset("utf8mb4");

$rawData = file_get_contents("php://input");
$data = json_decode($rawData, true);

$fullName = isset($data["fullName"]) ? trim($data["fullName"]) : "";
$address  = isset($data["address"]) ? trim($data["address"]) : "";
$username = isset($data["username"]) ? trim($data["username"]) : "";
$email    = isset($data["email"]) ? trim($data["email"]) : "";
$phone    = isset($data["phone"]) ? trim($data["phone"]) : "";
$password = isset($data["password"]) ? trim($data["password"]) : "";

if (
    $fullName === "" ||
    $address === "" ||
    $username === "" ||
    $email === "" ||
    $phone === "" ||
    $password === ""
) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "יש למלא את כל השדות הנדרשים."
    ]);
    exit();
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "כתובת האימייל אינה תקינה."
    ]);
    exit();
}

$usernameExists = false;
$emailExists = false;

/*
  בדיקת כפילויות לפני insert
*/
$checkStmt = $conn->prepare("SELECT username, email FROM users WHERE username = ? OR email = ?");
if (!$checkStmt) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "שגיאה בהכנת בדיקת כפילויות."
    ]);
    exit();
}

$checkStmt->bind_param("ss", $username, $email);
$checkStmt->execute();
$result = $checkStmt->get_result();

while ($row = $result->fetch_assoc()) {
    if (isset($row["username"]) && $row["username"] === $username) {
        $usernameExists = true;
    }

    if (isset($row["email"]) && strtolower($row["email"]) === strtolower($email)) {
        $emailExists = true;
    }
}

$checkStmt->close();

if ($usernameExists || $emailExists) {
    http_response_code(409);
    echo json_encode([
        "success" => false,
        "message" => "קיים כבר משתמש עם שם המשתמש או האימייל שהוזנו.",
        "usernameExists" => $usernameExists,
        "emailExists" => $emailExists
    ]);
    $conn->close();
    exit();
}

/*
  הצפנת סיסמה
*/
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

/*
  הכנסת המשתמש החדש
  שים לב: שמות העמודות כאן צריכים להתאים למסד שלך
*/
$insertStmt = $conn->prepare("
    INSERT INTO users (full_name, address, username, email, phone, password)
    VALUES (?, ?, ?, ?, ?, ?)
");

if (!$insertStmt) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "שגיאה בהכנת שמירת המשתמש."
    ]);
    $conn->close();
    exit();
}

$insertStmt->bind_param(
    "ssssss",
    $fullName,
    $address,
    $username,
    $email,
    $phone,
    $hashedPassword
);

if ($insertStmt->execute()) {
    echo json_encode([
        "success" => true,
        "message" => "ההרשמה בוצעה בהצלחה."
    ]);
} else {
    /*
      גיבוי נוסף למקרה שיש UNIQUE במסד ונוצרה כפילות בכל זאת
    */
    if ($conn->errno == 1062) {
        http_response_code(409);
        echo json_encode([
            "success" => false,
            "message" => "שם המשתמש או האימייל כבר קיימים במערכת."
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "שגיאה בשמירת המשתמש."
        ]);
    }
}

$insertStmt->close();
$conn->close();
?>