<?php

function ensure_verification_codes_table($conn)
{
    $sql = "
        CREATE TABLE IF NOT EXISTS verification_codes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            method VARCHAR(20) NOT NULL,
            email VARCHAR(255) DEFAULT '',
            phone VARCHAR(20) DEFAULT '',
            code_value VARCHAR(10) NOT NULL,
            is_used TINYINT(1) NOT NULL DEFAULT 0,
            expires_at DATETIME NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_verification_lookup (method, email, phone, is_used),
            INDEX idx_verification_expires (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ";

    if (!$conn->query($sql)) {
        throw new Exception("לא ניתן ליצור את טבלת verification_codes: " . $conn->error);
    }
}

function verification_normalize_method($value)
{
    $method = trim((string)$value);
    return in_array($method, ["email", "sms"], true) ? $method : "";
}

function verification_normalize_email($value)
{
    return strtolower(trim((string)$value));
}

function verification_normalize_phone($value)
{
    return preg_replace('/\D+/', '', (string)$value);
}

function cleanup_verification_codes($conn)
{
    $conn->query("DELETE FROM verification_codes WHERE expires_at < NOW() OR is_used = 1");
}

function store_verification_code($conn, $method, $email, $phone, $code, $expiresAt)
{
    ensure_verification_codes_table($conn);
    cleanup_verification_codes($conn);

    $normalizedMethod = verification_normalize_method($method);
    $normalizedEmail = verification_normalize_email($email);
    $normalizedPhone = verification_normalize_phone($phone);
    $normalizedCode = trim((string)$code);
    $normalizedExpiresAt = trim((string)$expiresAt);

    if ($normalizedMethod === "") {
        throw new Exception("שיטת האימות אינה תקינה");
    }

    $clearPrevious = $conn->prepare(
        "UPDATE verification_codes
         SET is_used = 1,
             updated_at = NOW()
         WHERE method = ? AND email = ? AND phone = ? AND is_used = 0"
    );

    if ($clearPrevious) {
        $clearPrevious->bind_param("sss", $normalizedMethod, $normalizedEmail, $normalizedPhone);
        $clearPrevious->execute();
        $clearPrevious->close();
    }

    $insert = $conn->prepare(
        "INSERT INTO verification_codes (method, email, phone, code_value, expires_at)
         VALUES (?, ?, ?, ?, ?)"
    );

    if (!$insert) {
        throw new Exception("שגיאה בהכנת שמירת קוד האימות: " . $conn->error);
    }

    $insert->bind_param(
        "sssss",
        $normalizedMethod,
        $normalizedEmail,
        $normalizedPhone,
        $normalizedCode,
        $normalizedExpiresAt
    );

    if (!$insert->execute()) {
        $message = $insert->error;
        $insert->close();
        throw new Exception("שמירת קוד האימות נכשלה: " . $message);
    }

    $insert->close();
}

function consume_verification_code($conn, $method, $email, $phone, $code)
{
    ensure_verification_codes_table($conn);
    cleanup_verification_codes($conn);

    $normalizedMethod = verification_normalize_method($method);
    $normalizedEmail = verification_normalize_email($email);
    $normalizedPhone = verification_normalize_phone($phone);
    $normalizedCode = trim((string)$code);

    if ($normalizedMethod === "") {
        return [
            "success" => false,
            "message" => "שיטת האימות אינה תקינה"
        ];
    }

    $select = $conn->prepare(
        "SELECT id, expires_at
         FROM verification_codes
         WHERE method = ?
           AND email = ?
           AND phone = ?
           AND code_value = ?
           AND is_used = 0
         ORDER BY id DESC
         LIMIT 1"
    );

    if (!$select) {
        throw new Exception("שגיאה בהכנת בדיקת קוד האימות: " . $conn->error);
    }

    $select->bind_param(
        "ssss",
        $normalizedMethod,
        $normalizedEmail,
        $normalizedPhone,
        $normalizedCode
    );
    $select->execute();
    $result = $select->get_result();
    $row = $result ? $result->fetch_assoc() : null;
    $select->close();

    if (!$row) {
        return [
            "success" => false,
            "message" => "קוד האימות שגוי או שפג תוקפו"
        ];
    }

    if (strtotime((string)$row["expires_at"]) < time()) {
        $expire = $conn->prepare("UPDATE verification_codes SET is_used = 1, updated_at = NOW() WHERE id = ?");
        if ($expire) {
            $verificationId = (int)$row["id"];
            $expire->bind_param("i", $verificationId);
            $expire->execute();
            $expire->close();
        }

        return [
            "success" => false,
            "message" => "קוד האימות שגוי או שפג תוקפו"
        ];
    }

    $update = $conn->prepare("UPDATE verification_codes SET is_used = 1, updated_at = NOW() WHERE id = ?");
    if (!$update) {
        throw new Exception("שגיאה בעדכון קוד האימות: " . $conn->error);
    }

    $verificationId = (int)$row["id"];
    $update->bind_param("i", $verificationId);
    $update->execute();
    $update->close();

    return [
        "success" => true,
        "verification_id" => $verificationId
    ];
}
