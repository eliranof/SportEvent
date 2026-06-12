<?php
ini_set("display_errors", 1);
error_reporting(E_ALL);
header("Content-Type: text/html; charset=UTF-8");

require_once __DIR__ . "/db.php";
require_once __DIR__ . "/event_catalog_helpers.php";

$updates = [
    "near|1" => "05/08/2026 | 20:30",
    "near|2" => "08/08/2026 | 19:45",
    "near|3" => "12/08/2026 | 21:00",
    "near|4" => "16/08/2026 | 22:00",
    "near|5" => "20/08/2026 | 22:00",
    "near|6" => "24/08/2026 | 22:00",
    "near|7" => "28/08/2026 | 21:05",
    "near|8" => "01/09/2026 | 21:30",
    "near|9" => "05/09/2026 | 21:45",
    "near|10" => "12/09/2026 | 18:30",
    "near|11" => "19/09/2026 | 19:00",
    "near|12" => "26/09/2026 | 18:00",

    "sold_out|so-1" => "07/08/2026 | 22:00",
    "sold_out|so-2" => "25/08/2026 | 21:15",
    "sold_out|so-3" => "18/09/2026 | 19:30",

    "israel|isr-1" => "08/08/2026 | 19:45",
    "israel|isr-2" => "28/08/2026 | 21:05",
    "world|world-1" => "16/08/2026 | 22:00",
    "world|world-2" => "12/09/2026 | 18:30",

    "featured|must-1" => "אוגוסט-ספטמבר 2026 | מועדים זמינים להזמנה",
    "featured|must-2" => "18/09/2026 | 19:30",
    "featured|must-3" => "05/09/2026 | 18:00",
    "tennis_must_see|must-tennis-1" => "18/09/2026 | 19:30",

    "final_four|ff-1" => "05/09/2026 | 18:00",
    "final_four|ff-2" => "05/09/2026 | 21:00",
    "final_four|ff-3" => "07/09/2026 | 18:00",
    "final_four|ff-4" => "07/09/2026 | 21:00",

    "world_cup|wc26-g1" => "15/08/2026 | 21:00",
    "world_cup|wc26-g2" => "16/08/2026 | 20:30",
];

try {
    $conn = db_connect();
    event_catalog_ensure_table($conn);

    $selectSql = "
        SELECT id, event_id, bucket_key, date_time, payload_json
        FROM events_catalog
        WHERE is_active = 1
    ";

    $result = $conn->query($selectSql);
    if (!$result) {
        throw new Exception("טעינת אירועים נכשלה: " . $conn->error);
    }

    $updateStmt = $conn->prepare("
        UPDATE events_catalog
        SET date_time = ?, payload_json = ?
        WHERE id = ?
    ");

    if (!$updateStmt) {
        throw new Exception("הכנת עדכון נכשלה: " . $conn->error);
    }

    $updated = 0;
    $skipped = 0;

    while ($row = $result->fetch_assoc()) {
        $key = (string)$row["bucket_key"] . "|" . (string)$row["event_id"];

        if (!isset($updates[$key])) {
            $skipped++;
            continue;
        }

        $newDate = $updates[$key];
        $payload = json_decode((string)$row["payload_json"], true);

        if (!is_array($payload)) {
            $payload = [];
        }

        $payload["dateTime"] = $newDate;

        if (isset($payload["date_time"])) {
            $payload["date_time"] = $newDate;
        }

        if (isset($payload["date"])) {
            $payload["date"] = $newDate;
        }

        $payloadJson = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $id = (int)$row["id"];

        $updateStmt->bind_param("ssi", $newDate, $payloadJson, $id);
        $updateStmt->execute();
        $updated++;
    }

    $updateStmt->close();
    $conn->close();

    echo "<h2>עדכון תאריכי SportEvent</h2>";
    echo "<p style='color:green;font-weight:bold;'>העדכון הסתיים בהצלחה.</p>";
    echo "<p>עודכנו {$updated} אירועים.</p>";
    echo "<p>דולגו {$skipped} אירועים שלא היו ברשימת העדכון.</p>";
    echo "<p>כעת בצע רענון חזק באתר: Ctrl + F5</p>";
} catch (Throwable $error) {
    echo "<h2>עדכון תאריכים נכשל</h2>";
    echo "<pre style='color:red;'>" . htmlspecialchars($error->getMessage(), ENT_QUOTES, "UTF-8") . "</pre>";
}
?>
