<?php
ini_set("display_errors", 1);
error_reporting(E_ALL);

require_once __DIR__ . "/db.php";

header("Content-Type: text/html; charset=UTF-8");

try {
    $conn = db_connect();

    $createTableSql = "
        CREATE TABLE IF NOT EXISTS admins (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(100) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            full_name VARCHAR(150) DEFAULT '',
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    ";

    if (!$conn->query($createTableSql)) {
        throw new Exception("יצירת טבלת admins נכשלה: " . $conn->error);
    }

    $username = "admin";
    $password = "123456";
    $fullName = "מנהל מערכת";

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    $checkStmt = $conn->prepare("SELECT id FROM admins WHERE username = ? LIMIT 1");
    if (!$checkStmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    $checkStmt->bind_param("s", $username);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    $existing = $checkResult->fetch_assoc();
    $checkStmt->close();

    if ($existing) {
        echo "<h2>המשתמש admin כבר קיים</h2>";
        echo "<p>שם משתמש: admin</p>";
        echo "<p>סיסמה לבדיקה: 123456</p>";
        exit;
    }

    $insertStmt = $conn->prepare("
        INSERT INTO admins (username, password_hash, full_name, is_active)
        VALUES (?, ?, ?, 1)
    ");
    if (!$insertStmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    $insertStmt->bind_param("sss", $username, $passwordHash, $fullName);
    $insertStmt->execute();
    $insertStmt->close();

    echo "<h2>מנהל נוצר בהצלחה</h2>";
    echo "<p>שם משתמש: admin</p>";
    echo "<p>סיסמה: 123456</p>";
} catch (Throwable $error) {
    echo "<h2 style='color:red;'>שגיאה</h2>";
    echo "<pre>" . htmlspecialchars($error->getMessage(), ENT_QUOTES, "UTF-8") . "</pre>";
}