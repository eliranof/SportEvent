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
    $eventId = trim((string)($input["event_id"] ?? ""));
    $bucketKey = trim((string)($input["bucket_key"] ?? ""));
    $sectionTitle = trim((string)($input["section_title"] ?? ""));
    $title = trim((string)($input["title"] ?? ""));
    $competition = trim((string)($input["competition"] ?? ""));
    $category = trim((string)($input["category"] ?? ""));
    $location = trim((string)($input["location"] ?? ""));
    $dateTime = trim((string)($input["date_time"] ?? ""));
    $price = trim((string)($input["price"] ?? ""));
    $sortOrder = isset($input["sort_order"]) ? (int)$input["sort_order"] : 0;

    if ($eventId === "") {
        admin_send_json(422, [
            "success" => false,
            "message" => "חובה למלא event_id"
        ]);
    }

    if (!in_array($bucketKey, admin_allowed_buckets(), true)) {
        admin_send_json(422, [
            "success" => false,
            "message" => "bucket_key לא תקין"
        ]);
    }

    if ($title === "" && trim((string)($input["teams"] ?? "")) === "") {
        admin_send_json(422, [
            "success" => false,
            "message" => "חובה למלא title או teams"
        ]);
    }

    $conn = db_connect();
    event_catalog_ensure_table($conn);

    $existingPayload = [];
    $existingRow = null;

    if ($rowId > 0) {
        $stmt = $conn->prepare("SELECT * FROM events_catalog WHERE id = ? LIMIT 1");
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }

        $stmt->bind_param("i", $rowId);
        $stmt->execute();
        $result = $stmt->get_result();
        $existingRow = $result->fetch_assoc();
        $stmt->close();

        if (!$existingRow) {
            admin_send_json(404, [
                "success" => false,
                "message" => "האירוע לעריכה לא נמצא"
            ]);
        }

        $decoded = json_decode((string)$existingRow["payload_json"], true);
        $existingPayload = is_array($decoded) ? $decoded : [];
    }

    $payload = admin_build_payload($input, $existingPayload);
    $payloadJson = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    if ($rowId > 0) {
        $sql = "
            UPDATE events_catalog
            SET
                event_id = ?,
                bucket_key = ?,
                section_title = ?,
                title = ?,
                competition = ?,
                category = ?,
                location = ?,
                date_time = ?,
                price = ?,
                sort_order = ?,
                payload_json = ?,
                is_active = 1
            WHERE id = ?
            LIMIT 1
        ";

        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }

        $stmt->bind_param(
            "sssssssssisi",
            $eventId,
            $bucketKey,
            $sectionTitle,
            $title,
            $competition,
            $category,
            $location,
            $dateTime,
            $price,
            $sortOrder,
            $payloadJson,
            $rowId
        );

        $stmt->execute();
        $stmt->close();

        admin_send_json(200, [
            "success" => true,
            "message" => "האירוע עודכן בהצלחה"
        ]);
    }

    $checkStmt = $conn->prepare("
        SELECT id
        FROM events_catalog
        WHERE event_id = ? AND bucket_key = ?
        LIMIT 1
    ");
    if (!$checkStmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    $checkStmt->bind_param("ss", $eventId, $bucketKey);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    $duplicateRow = $checkResult->fetch_assoc();
    $checkStmt->close();

    if ($duplicateRow) {
        admin_send_json(409, [
            "success" => false,
            "message" => "כבר קיים אירוע עם event_id זהה באותה קטגוריה"
        ]);
    }

    $sql = "
        INSERT INTO events_catalog (
            event_id,
            bucket_key,
            section_title,
            title,
            competition,
            category,
            location,
            date_time,
            price,
            sort_order,
            is_active,
            payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    $stmt->bind_param(
        "sssssssssis",
        $eventId,
        $bucketKey,
        $sectionTitle,
        $title,
        $competition,
        $category,
        $location,
        $dateTime,
        $price,
        $sortOrder,
        $payloadJson
    );

    $stmt->execute();
    $newId = $stmt->insert_id;
    $stmt->close();

    admin_send_json(200, [
        "success" => true,
        "message" => "האירוע נוצר בהצלחה",
        "row_id" => $newId
    ]);
} catch (Throwable $error) {
    admin_send_json(500, [
        "success" => false,
        "message" => "שמירת אירוע נכשלה",
        "details" => $error->getMessage()
    ]);
}