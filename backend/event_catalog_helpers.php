<?php

function event_catalog_ensure_table($conn)
{
    $sql = "
        CREATE TABLE IF NOT EXISTS events_catalog (
            id INT AUTO_INCREMENT PRIMARY KEY,
            event_id VARCHAR(100) NOT NULL,
            bucket_key VARCHAR(50) NOT NULL,
            section_title VARCHAR(255) DEFAULT '',
            title VARCHAR(255) DEFAULT '',
            competition VARCHAR(255) DEFAULT '',
            category VARCHAR(255) DEFAULT '',
            location VARCHAR(255) DEFAULT '',
            date_time VARCHAR(100) DEFAULT '',
            price VARCHAR(100) DEFAULT '',
            sort_order INT NOT NULL DEFAULT 0,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            payload_json LONGTEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_event_bucket (event_id, bucket_key),
            KEY idx_bucket_active_order (bucket_key, is_active, sort_order)
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    ";

    if (!$conn->query($sql)) {
        throw new Exception("לא ניתן ליצור את events_catalog: " . $conn->error);
    }
}

function event_catalog_decode_payload(array $row)
{
    $payload = json_decode((string)($row["payload_json"] ?? ""), true);

    if (!is_array($payload)) {
        $payload = [];
    }

    if (empty($payload["id"])) {
        $payload["id"] = (string)($row["event_id"] ?? "");
    }

    if (empty($payload["sectionTitle"]) && !empty($row["section_title"])) {
        $payload["sectionTitle"] = (string)$row["section_title"];
    }

    if (empty($payload["teams"]) && !empty($row["title"])) {
        $payload["teams"] = (string)$row["title"];
    }

    if (empty($payload["competition"]) && !empty($row["competition"])) {
        $payload["competition"] = (string)$row["competition"];
    }

    if (empty($payload["category"]) && !empty($row["category"])) {
        $payload["category"] = (string)$row["category"];
    }

    if (empty($payload["location"]) && !empty($row["location"])) {
        $payload["location"] = (string)$row["location"];
    }

    if (empty($payload["dateTime"]) && !empty($row["date_time"])) {
        $payload["dateTime"] = (string)$row["date_time"];
    }

    if (empty($payload["price"]) && !empty($row["price"])) {
        $payload["price"] = (string)$row["price"];
    }

    return $payload;
}

function event_catalog_build_sections_from_items(array $items, $fallbackTitle)
{
    $sectionsByTitle = [];
    $orderedTitles = [];

    foreach ($items as $item) {
        $title = trim((string)($item["sectionTitle"] ?? ""));
        if ($title === "") {
            $title = $fallbackTitle;
        }

        if (!isset($sectionsByTitle[$title])) {
            $sectionsByTitle[$title] = [
                "title" => $title,
                "items" => []
            ];
            $orderedTitles[] = $title;
        }

        $sectionsByTitle[$title]["items"][] = $item;
    }

    $sections = [];
    foreach ($orderedTitles as $title) {
        $sections[] = $sectionsByTitle[$title];
    }

    return $sections;
}

function event_catalog_empty_buckets()
{
    return [
        "nearEventsData" => [],
        "soldOutEventsData" => [],
        "israelSectionsData" => [],
        "worldSectionsData" => [],
        "featuredEventsData" => [],
        "tennisMustSeeEventData" => new stdClass(),
        "finalFourMatchesData" => [],
        "worldCupMatchesData" => []
    ];
}

function event_catalog_build_buckets_from_rows(array $rows)
{
    $buckets = event_catalog_empty_buckets();

    $israelItems = [];
    $worldItems = [];

    foreach ($rows as $row) {
        $bucketKey = (string)($row["bucket_key"] ?? "");
        $payload = event_catalog_decode_payload($row);

        switch ($bucketKey) {
            case "near":
                $buckets["nearEventsData"][] = $payload;
                break;

            case "sold_out":
                $buckets["soldOutEventsData"][] = $payload;
                break;

            case "israel":
                $israelItems[] = $payload;
                break;

            case "world":
                $worldItems[] = $payload;
                break;

            case "featured":
                $buckets["featuredEventsData"][] = $payload;
                break;

            case "tennis_must_see":
                $buckets["tennisMustSeeEventData"] = $payload;
                break;

            case "final_four":
                $buckets["finalFourMatchesData"][] = $payload;
                break;

            case "world_cup":
                $buckets["worldCupMatchesData"][] = $payload;
                break;
        }
    }

    $buckets["israelSectionsData"] = event_catalog_build_sections_from_items($israelItems, "אירועים בארץ");
    $buckets["worldSectionsData"] = event_catalog_build_sections_from_items($worldItems, "אירועים בעולם");

    return $buckets;
}

function event_catalog_upsert_item($conn, $bucketKey, array $item, $sortOrder = 0)
{
    $eventId = trim((string)($item["id"] ?? ""));
    if ($eventId === "") {
        throw new Exception("נמצא פריט אירוע ללא id בקטגוריה: " . $bucketKey);
    }

    $sectionTitle = trim((string)($item["sectionTitle"] ?? ""));
    $title = trim((string)($item["title"] ?? $item["teams"] ?? ""));
    $competition = trim((string)($item["competition"] ?? ""));
    $category = trim((string)($item["category"] ?? $item["tag"] ?? ""));
    $location = trim((string)($item["location"] ?? ""));
    $dateTime = trim((string)($item["dateTime"] ?? ""));
    $price = trim((string)($item["price"] ?? ""));
    $payloadJson = json_encode($item, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

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
            payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            section_title = VALUES(section_title),
            title = VALUES(title),
            competition = VALUES(competition),
            category = VALUES(category),
            location = VALUES(location),
            date_time = VALUES(date_time),
            price = VALUES(price),
            sort_order = VALUES(sort_order),
            payload_json = VALUES(payload_json),
            is_active = 1
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
    $stmt->close();
}