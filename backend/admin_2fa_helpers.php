<?php
require_once __DIR__ . "/admin_common.php";

function ensure_admin_2fa_table($conn)
{
    $sql = "
        CREATE TABLE IF NOT EXISTS admin_2fa_codes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            admin_id INT NOT NULL,
            code VARCHAR(10) NOT NULL,
            expires_at DATETIME NOT NULL,
            is_used TINYINT(1) NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            KEY idx_admin_id (admin_id),
            KEY idx_expires_at (expires_at)
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    ";

    if (!$conn->query($sql)) {
        throw new Exception("יצירת טבלת admin_2fa_codes נכשלה: " . $conn->error);
    }
}

function generate_admin_2fa_code()
{
    return (string)random_int(100000, 999999);
}

function create_admin_2fa_challenge($conn, $adminId)
{
    $adminId = (int)$adminId;
    $code = generate_admin_2fa_code();
    $expiresAt = date("Y-m-d H:i:s", time() + (10 * 60));

    $resetStmt = $conn->prepare("
        UPDATE admin_2fa_codes
        SET is_used = 1
        WHERE admin_id = ? AND is_used = 0
    ");
    if (!$resetStmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    $resetStmt->bind_param("i", $adminId);
    $resetStmt->execute();
    $resetStmt->close();

    $insertStmt = $conn->prepare("
        INSERT INTO admin_2fa_codes (admin_id, code, expires_at, is_used)
        VALUES (?, ?, ?, 0)
    ");
    if (!$insertStmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    $insertStmt->bind_param("iss", $adminId, $code, $expiresAt);
    $insertStmt->execute();
    $challengeId = (int)$insertStmt->insert_id;
    $insertStmt->close();

    return [
        "challenge_id" => $challengeId,
        "code" => $code,
        "expires_at" => $expiresAt,
        "expires_in_minutes" => 10
    ];
}