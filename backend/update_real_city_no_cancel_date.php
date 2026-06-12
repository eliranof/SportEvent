<?php
ini_set("display_errors", 1);
error_reporting(E_ALL);

header("Content-Type: text/html; charset=UTF-8");

require_once __DIR__ . "/db.php";
require_once __DIR__ . "/event_catalog_helpers.php";

$newDateTime = "12/06/2026 | 22:00";
$eventTitle = "ריאל מדריד נגד מנצ'סטר סיטי";
$homeTeam = "ריאל מדריד";
$awayTeam = "מנצ'סטר סיטי";
$eventIds = ["4", "world-1"];

function table_exists($conn, $tableName) {
    $table = $conn->real_escape_string($tableName);
    $result = $conn->query("SHOW TABLES LIKE '{$table}'");
    return $result && $result->num_rows > 0;
}

function payload_is_target_event($payload, $homeTeam, $awayTeam, $eventTitle, $eventIds) {
    if (!is_array($payload)) {
        return false;
    }

    $payloadId = trim((string)($payload["id"] ?? ""));
    $teams = trim((string)($payload["teams"] ?? $payload["title"] ?? ""));
    $home = trim((string)($payload["homeTeam"] ?? ""));
    $away = trim((string)($payload["awayTeam"] ?? ""));

    if (in_array($payloadId, $eventIds, true) && $teams === $eventTitle) {
        return true;
    }

    if ($teams === $eventTitle) {
        return true;
    }

    if ($home === $homeTeam && $away === $awayTeam) {
        return true;
    }

    return false;
}

try {
    $conn = db_connect();
    $conn->set_charset("utf8mb4");

    event_catalog_ensure_table($conn);

    $updatedCatalog = 0;
    $updatedOrders = 0;

    if (table_exists($conn, "events_catalog")) {
        $select = $conn->prepare(
            "SELECT id, event_id, title, payload_json
             FROM events_catalog
             WHERE is_active = 1
               AND (
                    title = ?
                    OR event_id = ?
                    OR event_id = ?
                    OR payload_json LIKE ?
                    OR payload_json LIKE ?
               )"
        );

        if (!$select) {
            throw new Exception("Prepare select events_catalog failed: " . $conn->error);
        }

        $eventId1 = $eventIds[0];
        $eventId2 = $eventIds[1];
        $likeHome = "%" . $homeTeam . "%";
        $likeAway = "%" . $awayTeam . "%";
        $select->bind_param("sssss", $eventTitle, $eventId1, $eventId2, $likeHome, $likeAway);
        $select->execute();
        $result = $select->get_result();

        while ($row = $result->fetch_assoc()) {
            $payload = json_decode((string)$row["payload_json"], true);

            if (!payload_is_target_event($payload, $homeTeam, $awayTeam, $eventTitle, $eventIds)) {
                continue;
            }

            $payload["dateTime"] = $newDateTime;
            $payloadJson = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $rowId = (int)$row["id"];

            $update = $conn->prepare(
                "UPDATE events_catalog
                 SET date_time = ?, payload_json = ?, updated_at = NOW()
                 WHERE id = ?"
            );

            if (!$update) {
                throw new Exception("Prepare update events_catalog failed: " . $conn->error);
            }

            $update->bind_param("ssi", $newDateTime, $payloadJson, $rowId);

            if (!$update->execute()) {
                throw new Exception("Update events_catalog failed: " . $update->error);
            }

            $update->close();
            $updatedCatalog++;
        }

        $select->close();
    }

    if (table_exists($conn, "orders")) {
        $updateOrders = $conn->prepare(
            "UPDATE orders
             SET date_time = ?, updated_at = NOW()
             WHERE event_name = ?
                OR event_id = ?
                OR event_id = ?
                OR (event_name LIKE ? AND event_name LIKE ?)"
        );

        if (!$updateOrders) {
            throw new Exception("Prepare update orders failed: " . $conn->error);
        }

        $eventId1 = $eventIds[0];
        $eventId2 = $eventIds[1];
        $likeHome = "%" . $homeTeam . "%";
        $likeAway = "%" . $awayTeam . "%";
        $updateOrders->bind_param("ssssss", $newDateTime, $eventTitle, $eventId1, $eventId2, $likeHome, $likeAway);

        if (!$updateOrders->execute()) {
            throw new Exception("Update orders failed: " . $updateOrders->error);
        }

        $updatedOrders = $updateOrders->affected_rows;
        $updateOrders->close();
    }

    echo "<h2>עדכון תאריך משחק לצורך בדיקת חסימת ביטול</h2>";
    echo "<p><strong>משחק:</strong> " . htmlspecialchars($eventTitle, ENT_QUOTES, "UTF-8") . "</p>";
    echo "<p><strong>תאריך חדש:</strong> " . htmlspecialchars($newDateTime, ENT_QUOTES, "UTF-8") . "</p>";
    echo "<p style='color:green;font-weight:bold;'>העדכון הסתיים בהצלחה.</p>";
    echo "<p>רשומות שעודכנו ב-events_catalog: {$updatedCatalog}</p>";
    echo "<p>הזמנות קיימות שעודכנו ב-orders: {$updatedOrders}</p>";
    echo "<p><strong>תוצאה צפויה בביטול:</strong> לא ניתן לבטל הזמנה כי האירוע בטווח של פחות מ-3 ימים.</p>";
    echo "<p>כעת בצע רענון חזק לאתר: Ctrl + F5.</p>";
    echo "<p>אם עדיין מופיע תאריך ישן, נקה Cache של אירועים דרך Console בדפדפן.</p>";
} catch (Throwable $error) {
    http_response_code(500);
    echo "<h2 style='color:red;'>העדכון נכשל</h2>";
    echo "<pre>" . htmlspecialchars($error->getMessage(), ENT_QUOTES, "UTF-8") . "</pre>";
}
?>
