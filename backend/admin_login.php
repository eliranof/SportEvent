<?php
require_once __DIR__ . "/db.php";
require_once __DIR__ . "/admin_common.php";
require_once __DIR__ . "/admin_2fa_helpers.php";

try {
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        admin_send_json(405, [
            "success" => false,
            "message" => "יש להשתמש ב-POST בלבד"
        ]);
    }

    $input = admin_read_json_body();

    $username = trim((string)($input["username"] ?? ""));
    $password = trim((string)($input["password"] ?? ""));

    if ($username === "" || $password === "") {
        admin_send_json(422, [
            "success" => false,
            "message" => "יש למלא שם משתמש וסיסמה"
        ]);
    }

    $conn = db_connect();

    $createAdminsSql = "
        CREATE TABLE IF NOT EXISTS admins (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(100) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            full_name VARCHAR(150) DEFAULT '',
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    ";

    if (!$conn->query($createAdminsSql)) {
        throw new Exception("יצירת טבלת admins נכשלה: " . $conn->error);
    }

    ensure_admin_2fa_table($conn);

    $stmt = $conn->prepare("
        SELECT id, username, password_hash, full_name, is_active
        FROM admins
        WHERE username = ?
        LIMIT 1
    ");
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();
    $admin = $result->fetch_assoc();
    $stmt->close();

    if (!$admin) {
        admin_send_json(401, [
            "success" => false,
            "message" => "שם משתמש או סיסמה שגויים"
        ]);
    }

    if ((int)$admin["is_active"] !== 1) {
        admin_send_json(403, [
            "success" => false,
            "message" => "חשבון המנהל אינו פעיל"
        ]);
    }

    if (!password_verify($password, $admin["password_hash"])) {
        admin_send_json(401, [
            "success" => false,
            "message" => "שם משתמש או סיסמה שגויים"
        ]);
    }

    $challenge = create_admin_2fa_challenge($conn, (int)$admin["id"]);

    admin_send_json(200, [
        "success" => true,
        "requires_2fa" => true,
        "message" => "נדרש אימות דו-שלבי",
        "challenge_id" => $challenge["challenge_id"],
        "expires_in_minutes" => $challenge["expires_in_minutes"],
        "dev_code" => $challenge["code"],
        "admin_preview" => [
            "id" => (int)$admin["id"],
            "username" => (string)$admin["username"],
            "full_name" => (string)$admin["full_name"]
        ]
    ]);
} catch (Throwable $error) {
    admin_send_json(500, [
        "success" => false,
        "message" => "התחברות מנהל נכשלה",
        "details" => $error->getMessage()
    ]);
}