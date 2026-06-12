<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/db.php";

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    echo json_encode([
        "success" => true,
        "message" => "OPTIONS OK"
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "נדרשת בקשת POST"
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $conn = db_connect();
    $conn->set_charset("utf8mb4");

    $raw = file_get_contents("php://input");
    $data = json_decode($raw, true);

    $identifier = isset($data["email"]) ? trim($data["email"]) : "";
    $password = isset($data["password"]) ? trim($data["password"]) : "";

    if ($identifier === "" || $password === "") {
        echo json_encode([
            "success" => false,
            "message" => "יש להזין אימייל או שם משתמש וסיסמה."
        ], JSON_UNESCAPED_UNICODE);
        $conn->close();
        exit;
    }

    $stmt = $conn->prepare("
        SELECT id, full_name, address, username, email, phone, password
        FROM users
        WHERE email = ? OR username = ?
        LIMIT 1
    ");

    if (!$stmt) {
        echo json_encode([
            "success" => false,
            "message" => "שגיאה בבדיקת פרטי ההתחברות."
        ], JSON_UNESCAPED_UNICODE);
        $conn->close();
        exit;
    }

    $stmt->bind_param("ss", $identifier, $identifier);
    $stmt->execute();
    $result = $stmt->get_result();

    if (!$result || $result->num_rows === 0) {
        echo json_encode([
            "success" => false,
            "message" => "האימייל, שם המשתמש או הסיסמה שגויים."
        ], JSON_UNESCAPED_UNICODE);
        $stmt->close();
        $conn->close();
        exit;
    }

    $user = $result->fetch_assoc();

    if (!password_verify($password, $user["password"])) {
        echo json_encode([
            "success" => false,
            "message" => "האימייל, שם המשתמש או הסיסמה שגויים."
        ], JSON_UNESCAPED_UNICODE);
        $stmt->close();
        $conn->close();
        exit;
    }

    echo json_encode([
        "success" => true,
        "message" => "התחברת בהצלחה.",
        "user" => [
            "id" => $user["id"],
            "fullName" => $user["full_name"],
            "full_name" => $user["full_name"],
            "address" => $user["address"],
            "username" => $user["username"],
            "email" => $user["email"],
            "phone" => $user["phone"]
        ]
    ], JSON_UNESCAPED_UNICODE);

    $stmt->close();
    $conn->close();
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "שגיאה בחיבור לשרת",
        "details" => $error->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>