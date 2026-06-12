<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

$host = "127.0.0.1";
$dbname = "sportevent";
$dbuser = "root";
$dbpass = "";

$conn = new mysqli($host, $dbuser, $dbpass, $dbname);

if ($conn->connect_error) {
    echo json_encode([
        "success" => false,
        "message" => "שגיאה בחיבור למסד הנתונים."
    ]);
    exit;
}

$conn->set_charset("utf8mb4");

$raw = file_get_contents("php://input");
$data = json_decode($raw, true);

$id = isset($data["id"]) ? intval($data["id"]) : 0;
$fullName = isset($data["fullName"]) ? trim($data["fullName"]) : "";
$address = isset($data["address"]) ? trim($data["address"]) : "";
$username = isset($data["username"]) ? trim($data["username"]) : "";
$email = isset($data["email"]) ? trim($data["email"]) : "";
$phone = isset($data["phone"]) ? preg_replace('/\D/', '', $data["phone"]) : "";

if ($id <= 0) {
    echo json_encode([
        "success" => false,
        "message" => "מזהה המשתמש חסר."
    ]);
    $conn->close();
    exit;
}

if ($fullName === "" || mb_strlen($fullName) < 2) {
    echo json_encode([
        "success" => false,
        "message" => "יש להזין שם מלא תקין."
    ]);
    $conn->close();
    exit;
}

if ($address === "" || mb_strlen($address) < 5) {
    echo json_encode([
        "success" => false,
        "message" => "יש להזין כתובת מגורים תקינה."
    ]);
    $conn->close();
    exit;
}

if (!preg_match('/^[A-Za-z0-9]{8,12}$/', $username)) {
    echo json_encode([
        "success" => false,
        "message" => "שם המשתמש חייב להכיל 8 עד 12 תווים, אותיות באנגלית ומספרים בלבד."
    ]);
    $conn->close();
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode([
        "success" => false,
        "message" => "כתובת הדוא\"ל אינה תקינה."
    ]);
    $conn->close();
    exit;
}

if (!preg_match('/^05[0-9]{8}$/', $phone)) {
    echo json_encode([
        "success" => false,
        "message" => "מספר הטלפון חייב להיות ישראלי תקין."
    ]);
    $conn->close();
    exit;
}

$checkStmt = $conn->prepare("
    SELECT id
    FROM users
    WHERE (email = ? OR username = ?) AND id <> ?
    LIMIT 1
");

if (!$checkStmt) {
    echo json_encode([
        "success" => false,
        "message" => "שגיאה בבדיקת כפילות משתמש."
    ]);
    $conn->close();
    exit;
}

$checkStmt->bind_param("ssi", $email, $username, $id);
$checkStmt->execute();
$checkResult = $checkStmt->get_result();

if ($checkResult && $checkResult->num_rows > 0) {
    echo json_encode([
        "success" => false,
        "message" => "שם המשתמש או כתובת הדוא\"ל כבר קיימים במערכת."
    ]);
    $checkStmt->close();
    $conn->close();
    exit;
}

$checkStmt->close();

$updateStmt = $conn->prepare("
    UPDATE users
    SET full_name = ?, address = ?, username = ?, email = ?, phone = ?
    WHERE id = ?
");

if (!$updateStmt) {
    echo json_encode([
        "success" => false,
        "message" => "שגיאה בעדכון פרטי המשתמש."
    ]);
    $conn->close();
    exit;
}

$updateStmt->bind_param("sssssi", $fullName, $address, $username, $email, $phone, $id);

if (!$updateStmt->execute()) {
    echo json_encode([
        "success" => false,
        "message" => "העדכון נכשל."
    ]);
    $updateStmt->close();
    $conn->close();
    exit;
}

$getStmt = $conn->prepare("
    SELECT id, full_name, address, username, email, phone
    FROM users
    WHERE id = ?
    LIMIT 1
");

if (!$getStmt) {
    echo json_encode([
        "success" => false,
        "message" => "העדכון בוצע, אך לא ניתן היה לקרוא את המשתמש המעודכן."
    ]);
    $updateStmt->close();
    $conn->close();
    exit;
}

$getStmt->bind_param("i", $id);
$getStmt->execute();
$result = $getStmt->get_result();
$user = $result ? $result->fetch_assoc() : null;

echo json_encode([
    "success" => true,
    "message" => "הפרטים עודכנו בהצלחה.",
    "user" => [
        "id" => $user["id"],
        "fullName" => $user["full_name"],
        "full_name" => $user["full_name"],
        "address" => $user["address"],
        "username" => $user["username"],
        "email" => $user["email"],
        "phone" => $user["phone"]
    ]
]);

$getStmt->close();
$updateStmt->close();
$conn->close();
?>