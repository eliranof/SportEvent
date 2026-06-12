<?php
ini_set("display_errors", 1);
error_reporting(E_ALL);

header("Content-Type: text/html; charset=UTF-8");

require_once __DIR__ . "/db.php";
require_once __DIR__ . "/event_catalog_helpers.php";

function import_plain_items($conn, $bucketKey, array $items, &$inserted)
{
    $index = 0;

    foreach ($items as $item) {
        if (!is_array($item)) {
            continue;
        }

        $index++;
        event_catalog_upsert_item($conn, $bucketKey, $item, $index);
        $inserted++;
    }
}

function import_section_items($conn, $bucketKey, array $sections, &$inserted)
{
    $sectionIndex = 0;

    foreach ($sections as $section) {
        if (!is_array($section)) {
            continue;
        }

        $sectionIndex++;
        $sectionTitle = trim((string)($section["title"] ?? $section["sectionTitle"] ?? ""));
        $items = isset($section["items"]) && is_array($section["items"]) ? $section["items"] : [];

        $itemIndex = 0;
        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }

            $itemIndex++;

            if ($sectionTitle !== "" && empty($item["sectionTitle"])) {
                $item["sectionTitle"] = $sectionTitle;
            }

            $sortOrder = ($sectionIndex * 1000) + $itemIndex;
            event_catalog_upsert_item($conn, $bucketKey, $item, $sortOrder);
            $inserted++;
        }
    }
}

$jsonPath = __DIR__ . "/events_seed.json";

echo "<h2>ייבוא אירועים ל events_catalog</h2>";

if (!file_exists($jsonPath)) {
    echo "<p style='color:red;'>לא נמצא events_seed.json בתוך sportevent-api</p>";
    exit;
}

$raw = file_get_contents($jsonPath);
$seed = json_decode($raw, true);

if (!is_array($seed)) {
    echo "<p style='color:red;'>events_seed.json אינו JSON תקין</p>";
    exit;
}

try {
    $conn = db_connect();
    event_catalog_ensure_table($conn);

    $conn->begin_transaction();

    $conn->query("DELETE FROM events_catalog");

    $inserted = 0;

    import_plain_items($conn, "near", $seed["nearEventsData"] ?? [], $inserted);
    import_plain_items($conn, "sold_out", $seed["soldOutEventsData"] ?? [], $inserted);
    import_section_items($conn, "israel", $seed["israelSectionsData"] ?? [], $inserted);
    import_section_items($conn, "world", $seed["worldSectionsData"] ?? [], $inserted);
    import_plain_items($conn, "featured", $seed["featuredEventsData"] ?? [], $inserted);

    if (isset($seed["tennisMustSeeEventData"]) && is_array($seed["tennisMustSeeEventData"])) {
        event_catalog_upsert_item($conn, "tennis_must_see", $seed["tennisMustSeeEventData"], 1);
        $inserted++;
    }

    import_plain_items($conn, "final_four", $seed["finalFourMatchesData"] ?? [], $inserted);
    import_plain_items($conn, "world_cup", $seed["worldCupMatchesData"] ?? [], $inserted);

    $conn->commit();

    echo "<p style='color:green;font-weight:bold;'>הייבוא הסתיים בהצלחה</p>";
    echo "<p>נרשמו {$inserted} רשומות</p>";
    echo "<p>כעת אפשר לבדוק את get_events.php</p>";
} catch (Throwable $error) {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->rollback();
    }

    echo "<p style='color:red;font-weight:bold;'>הייבוא נכשל</p>";
    echo "<pre>" . htmlspecialchars($error->getMessage(), ENT_QUOTES, "UTF-8") . "</pre>";
}