<?php
require_once __DIR__ . "/db.php";
require_once __DIR__ . "/admin_common.php";
require_once __DIR__ . "/event_catalog_helpers.php";

try {
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        admin_send_json(405, [
            "success" => false,
            "message" => "יש להשתמש ב-POST בלבד"
        ]);
    }

    $input = admin_read_json_body();
    $rowId = isset($input["row_id"]) ? (int)$input["row_id"] : 0;

    if ($rowId <= 0) {
        admin_send_json(422, [
            "success" => false,
            "message" => "חובה לשלוח row_id"
        ]);
    }

    $conn = db_connect();
    event_catalog_ensure_table($conn);

    $stmt = $conn->prepare("UPDATE events_catalog SET is_active = 0 WHERE id = ? LIMIT 1");
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    $stmt->bind_param("i", $rowId);
    $stmt->execute();
    $affected = $stmt->affected_rows;
    $stmt->close();

    if ($affected < 1) {
        admin_send_json(404, [
            "success" => false,
            "message" => "האירוע לא נמצא למחיקה"
        ]);
    }

    admin_send_json(200, [
        "success" => true,
        "message" => "האירוע הוסר בהצלחה"
    ]);
} catch (Throwable $error) {
    admin_send_json(500, [
        "success" => false,
        "message" => "מחיקת אירוע נכשלה",
        "details" => $error->getMessage()
    ]);
}