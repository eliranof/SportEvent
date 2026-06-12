<?php
require_once __DIR__ . "/db.php";
require_once __DIR__ . "/admin_common.php";
require_once __DIR__ . "/event_catalog_helpers.php";

try {
    $conn = db_connect();
    event_catalog_ensure_table($conn);

    $sql = "
        SELECT
            id,
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
            payload_json,
            created_at,
            updated_at
        FROM events_catalog
        ORDER BY is_active DESC, bucket_key ASC, sort_order ASC, id ASC
    ";

    $result = $conn->query($sql);
    if (!$result) {
        throw new Exception("Query failed: " . $conn->error);
    }

    $items = [];

    while ($row = $result->fetch_assoc()) {
        $items[] = [
            "row_id" => (int)$row["id"],
            "event_id" => (string)$row["event_id"],
            "bucket_key" => (string)$row["bucket_key"],
            "section_title" => (string)$row["section_title"],
            "title" => (string)$row["title"],
            "competition" => (string)$row["competition"],
            "category" => (string)$row["category"],
            "location" => (string)$row["location"],
            "date_time" => (string)$row["date_time"],
            "price" => (string)$row["price"],
            "sort_order" => (int)$row["sort_order"],
            "is_active" => (int)$row["is_active"],
            "payload_json" => (string)$row["payload_json"],
            "created_at" => (string)$row["created_at"],
            "updated_at" => (string)$row["updated_at"]
        ];
    }

    admin_send_json(200, [
        "success" => true,
        "items" => $items
    ]);
} catch (Throwable $error) {
    admin_send_json(500, [
        "success" => false,
        "message" => "שליפת אירועים נכשלה",
        "details" => $error->getMessage()
    ]);
}