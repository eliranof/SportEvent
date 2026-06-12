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

    $challengeId = isset($input["challenge_id"]) ? (int)$input["challenge_id"] : 0;
    $code = trim((string)($input["code"] ?? ""));

    if ($challengeId <= 0 || $code === "") {
        admin_send_json(422, [
            "success" => false,
            "message" => "יש למלא challenge_id וקוד אימות"
        ]);
    }

    $conn = db_connect();
    ensure_admin_2fa_table($conn);

    $stmt = $conn->prepare("
        SELECT
            c.id AS challenge_id,
            c.admin_id,
            c.code,
            c.expires_at,
            c.is_used,
            a.username,
            a.full_name,
            a.is_active
        FROM admin_2fa_codes c
        INNER JOIN admins a ON a.id = c.admin_id
        WHERE c.id = ?
        LIMIT 1
    ");
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    $stmt->bind_param("i", $challengeId);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    $stmt->close();

    if (!$row) {
        admin_send_json(404, [
            "success" => false,
            "message" => "אתגר האימות לא נמצא"
        ]);
    }

    if ((int)$row["is_active"] !== 1) {
        admin_send_json(403, [
            "success" => false,
            "message" => "חשבון המנהל אינו פעיל"
        ]);
    }

    if ((int)$row["is_used"] === 1) {
        admin_send_json(410, [
            "success" => false,
            "message" => "קוד האימות כבר נוצל"
        ]);
    }

    if (strtotime((string)$row["expires_at"]) < time()) {
        admin_send_json(410, [
            "success" => false,
            "message" => "קוד האימות פג תוקף"
        ]);
    }

    if ((string)$row["code"] !== $code) {
        admin_send_json(401, [
            "success" => false,
            "message" => "קוד האימות שגוי"
        ]);
    }

    $markStmt = $conn->prepare("
        UPDATE admin_2fa_codes
        SET is_used = 1
        WHERE id = ?
        LIMIT 1
    ");
    if (!$markStmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    $markStmt->bind_param("i", $challengeId);
    $markStmt->execute();
    $markStmt->close();

    admin_send_json(200, [
        "success" => true,
        "message" => "אימות דו-שלבי הושלם בהצלחה",
        "admin" => [
            "id" => (int)$row["admin_id"],
            "username" => (string)$row["username"],
            "full_name" => (string)$row["full_name"],
            "role" => "admin",
            "two_factor_verified" => true
        ]
    ]);
} catch (Throwable $error) {
    admin_send_json(500, [
        "success" => false,
        "message" => "אימות דו-שלבי נכשל",
        "details" => $error->getMessage()
    ]);
}