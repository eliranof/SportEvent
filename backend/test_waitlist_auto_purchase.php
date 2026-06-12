<?php
header("Content-Type: text/html; charset=UTF-8");

require_once __DIR__ . "/db.php";
require_once __DIR__ . "/waitlist_engine.php";
require_once __DIR__ . "/seat_inventory_helpers.php";

if (file_exists(__DIR__ . "/event_catalog_helpers.php")) {
    require_once __DIR__ . "/event_catalog_helpers.php";
}

date_default_timezone_set("Asia/Jerusalem");

function h($value)
{
    return htmlspecialchars((string)$value, ENT_QUOTES, "UTF-8");
}

function clean_text($value)
{
    return trim((string)$value);
}

function table_exists_local($conn, $tableName)
{
    $safeTable = $conn->real_escape_string((string)$tableName);
    $result = $conn->query("SHOW TABLES LIKE '{$safeTable}'");
    return $result && $result->num_rows > 0;
}

function normalize_stand_local($stand)
{
    if (function_exists("waitlist_normalize_stand")) {
        return waitlist_normalize_stand($stand);
    }

    $stand = trim((string)$stand);

    if ($stand === "") {
        return "";
    }

    $lower = function_exists("mb_strtolower")
        ? mb_strtolower($stand, "UTF-8")
        : strtolower($stand);

    $map = [
        "יציע מערבי" => "W",
        "מערבי" => "W",
        "מערב" => "W",
        "west" => "W",
        "w" => "W",

        "יציע מזרחי" => "E",
        "מזרחי" => "E",
        "מזרח" => "E",
        "east" => "E",
        "e" => "E",

        "יציע צפוני" => "N",
        "צפוני" => "N",
        "צפון" => "N",
        "north" => "N",
        "n" => "N",

        "יציע דרומי" => "S",
        "דרומי" => "S",
        "דרום" => "S",
        "south" => "S",
        "s" => "S",

        "vip" => "VIP",
        "יציע vip" => "VIP",
    ];

    return $map[$lower] ?? strtoupper($stand);
}

function get_stand_label_local($stand)
{
    $stand = normalize_stand_local($stand);

    $map = [
        "W" => "יציע מערבי",
        "E" => "יציע מזרחי",
        "N" => "יציע צפוני",
        "S" => "יציע דרומי",
        "VIP" => "יציע VIP",
        "F" => "יציע משפחות",
        "C" => "יציע מרכזי",
    ];

    return $map[$stand] ?? ("יציע " . $stand);
}

function normalize_seat_list_local($value)
{
    if (function_exists("waitlist_normalize_seat_list")) {
        return waitlist_normalize_seat_list($value);
    }

    if (is_array($value)) {
        return array_values(array_filter(array_map("trim", $value)));
    }

    $text = trim((string)$value);

    if ($text === "") {
        return [];
    }

    $decoded = json_decode($text, true);

    if (is_array($decoded)) {
        return array_values(array_filter(array_map("trim", $decoded)));
    }

    $text = str_replace(["\r\n", "\r", "\n", ";"], ",", $text);
    return array_values(array_filter(array_map("trim", explode(",", $text))));
}

function parse_seat_key_local($seatKey)
{
    $seatKey = trim((string)$seatKey);

    if (preg_match('/^([A-Za-zא-ת]+)-(\d+)-(\d+)$/u', $seatKey, $matches)) {
        return [
            "stand_code" => normalize_stand_local($matches[1]),
            "row_number" => (int)$matches[2],
            "seat_number" => (int)$matches[3],
        ];
    }

    return null;
}

function build_seat_label_local($seatKey)
{
    $parsed = parse_seat_key_local($seatKey);

    if (!$parsed) {
        return $seatKey;
    }

    return get_stand_label_local($parsed["stand_code"]) .
        " | שורה " . $parsed["row_number"] .
        " | כיסא " . $parsed["seat_number"];
}

function count_active_waitlist_for_event($conn, $eventId)
{
    if (!table_exists_local($conn, "waitlist_requests")) {
        return 0;
    }

    $stmt = $conn->prepare("
        SELECT COUNT(*) AS total
        FROM waitlist_requests
        WHERE event_id = ?
          AND status IN ('waiting', 'offered')
    ");

    if (!$stmt) {
        return 0;
    }

    $stmt->bind_param("s", $eventId);
    $stmt->execute();

    $result = $stmt->get_result();
    $row = $result ? $result->fetch_assoc() : null;

    $stmt->close();

    return (int)($row["total"] ?? 0);
}

function get_sold_out_events($conn)
{
    $events = [];

    if (table_exists_local($conn, "events_catalog")) {
        $sql = "
            SELECT event_id, title, competition, category, location, date_time, payload_json
            FROM events_catalog
            WHERE bucket_key = 'sold_out'
              AND is_active = 1
            ORDER BY sort_order ASC, id ASC
        ";

        $result = $conn->query($sql);

        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $payload = [];

                if (!empty($row["payload_json"])) {
                    $decoded = json_decode($row["payload_json"], true);

                    if (is_array($decoded)) {
                        $payload = $decoded;
                    }
                }

                $eventId = clean_text($row["event_id"] ?? "");

                if ($eventId === "") {
                    continue;
                }

                $name = clean_text($payload["teams"] ?? $payload["title"] ?? $row["title"] ?? "");
                $competition = clean_text($payload["competition"] ?? $row["competition"] ?? "");

                $events[] = [
                    "id" => $eventId,
                    "name" => $name,
                    "competition" => $competition,
                    "label" => $eventId . " | " . $name . " | ממתינים: " . count_active_waitlist_for_event($conn, $eventId),
                ];
            }
        }
    }

    if (!empty($events)) {
        return $events;
    }

    $seedPath = __DIR__ . "/events_seed.json";

    if (file_exists($seedPath)) {
        $data = json_decode(file_get_contents($seedPath), true);

        if (is_array($data) && !empty($data["soldOutEventsData"])) {
            foreach ($data["soldOutEventsData"] as $item) {
                $eventId = clean_text($item["id"] ?? "");

                if ($eventId === "") {
                    continue;
                }

                $name = clean_text($item["teams"] ?? $item["title"] ?? "");
                $competition = clean_text($item["competition"] ?? "");

                $events[] = [
                    "id" => $eventId,
                    "name" => $name,
                    "competition" => $competition,
                    "label" => $eventId . " | " . $name . " | ממתינים: " . count_active_waitlist_for_event($conn, $eventId),
                ];
            }
        }
    }

    if (!empty($events)) {
        return $events;
    }

    return [
        [
            "id" => "so-1",
            "name" => "ברצלונה נגד ריאל מדריד",
            "competition" => "לה ליגה",
            "label" => "so-1 | ברצלונה נגד ריאל מדריד | ממתינים: " . count_active_waitlist_for_event($conn, "so-1"),
        ],
    ];
}

function find_event_by_id($events, $eventId)
{
    foreach ($events as $event) {
        if ((string)$event["id"] === (string)$eventId) {
            return $event;
        }
    }

    return $events[0] ?? null;
}

function get_waitlist_rows($conn, $eventId)
{
    if (!table_exists_local($conn, "waitlist_requests")) {
        return [];
    }

    $stmt = $conn->prepare("
        SELECT
            id,
            user_id,
            username,
            email,
            event_id,
            event_name,
            tickets_count,
            selection_mode,
            stand,
            selected_seats,
            selected_seats_short,
            queue_position,
            status,
            offered_seats,
            offered_seats_count,
            offer_expires_at,
            email_status,
            result,
            created_at,
            updated_at
        FROM waitlist_requests
        WHERE event_id = ?
        ORDER BY queue_position ASC, id ASC
    ");

    if (!$stmt) {
        throw new Exception("שגיאה בשליפת רשימת ההמתנה: " . $conn->error);
    }

    $stmt->bind_param("s", $eventId);
    $stmt->execute();

    $result = $stmt->get_result();
    $rows = [];

    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }

    $stmt->close();

    return $rows;
}

function get_active_offer($conn, $eventId)
{
    if (!table_exists_local($conn, "waitlist_requests")) {
        return null;
    }

    $stmt = $conn->prepare("
        SELECT *
        FROM waitlist_requests
        WHERE event_id = ?
          AND status = 'offered'
          AND (offer_expires_at IS NULL OR offer_expires_at >= NOW())
        ORDER BY queue_position ASC, id ASC
        LIMIT 1
    ");

    if (!$stmt) {
        throw new Exception("שגיאה בשליפת הצעה פעילה: " . $conn->error);
    }

    $stmt->bind_param("s", $eventId);
    $stmt->execute();

    $result = $stmt->get_result();
    $row = $result ? $result->fetch_assoc() : null;

    $stmt->close();

    return $row ?: null;
}

function get_stand_options($conn, $eventId)
{
    $stands = [];

    if (table_exists_local($conn, "waitlist_requests")) {
        $stmt = $conn->prepare("
            SELECT stand, selected_seats_short, selected_seats
            FROM waitlist_requests
            WHERE event_id = ?
            ORDER BY id ASC
        ");

        if ($stmt) {
            $stmt->bind_param("s", $eventId);
            $stmt->execute();

            $result = $stmt->get_result();

            while ($row = $result->fetch_assoc()) {
                $stand = normalize_stand_local($row["stand"] ?? "");

                if ($stand !== "") {
                    $stands[$stand] = $stand;
                }

                $seats = normalize_seat_list_local(
                    !empty($row["selected_seats_short"])
                        ? $row["selected_seats_short"]
                        : ($row["selected_seats"] ?? "")
                );

                foreach ($seats as $seatKey) {
                    $parsed = parse_seat_key_local($seatKey);

                    if ($parsed) {
                        $stands[$parsed["stand_code"]] = $parsed["stand_code"];
                    }
                }
            }

            $stmt->close();
        }
    }

    ensure_event_seat_inventory_table($conn);

    $stmt = $conn->prepare("
        SELECT DISTINCT stand_code
        FROM event_seat_inventory
        WHERE event_id = ?
          AND stand_code <> ''
        ORDER BY stand_code ASC
    ");

    if ($stmt) {
        $stmt->bind_param("s", $eventId);
        $stmt->execute();

        $result = $stmt->get_result();

        while ($row = $result->fetch_assoc()) {
            $stand = normalize_stand_local($row["stand_code"] ?? "");

            if ($stand !== "") {
                $stands[$stand] = $stand;
            }
        }

        $stmt->close();
    }

    if (empty($stands)) {
        $stands = [
            "W" => "W",
            "E" => "E",
            "VIP" => "VIP",
        ];
    }

    return array_values($stands);
}

function get_seat_options($conn, $eventId, $standCode)
{
    $standCode = normalize_stand_local($standCode);
    $seats = [];

    if (table_exists_local($conn, "waitlist_requests")) {
        $stmt = $conn->prepare("
            SELECT selected_seats, selected_seats_short
            FROM waitlist_requests
            WHERE event_id = ?
            ORDER BY queue_position ASC, id ASC
        ");

        if ($stmt) {
            $stmt->bind_param("s", $eventId);
            $stmt->execute();

            $result = $stmt->get_result();

            while ($row = $result->fetch_assoc()) {
                $requestedSeats = normalize_seat_list_local(
                    !empty($row["selected_seats_short"])
                        ? $row["selected_seats_short"]
                        : ($row["selected_seats"] ?? "")
                );

                foreach ($requestedSeats as $seatKey) {
                    $parsed = parse_seat_key_local($seatKey);

                    if (!$parsed) {
                        continue;
                    }

                    if ($standCode !== "" && $parsed["stand_code"] !== $standCode) {
                        continue;
                    }

                    $seats[$seatKey] = [
                        "seat_key" => $seatKey,
                        "seat_label" => build_seat_label_local($seatKey),
                        "stand_code" => $parsed["stand_code"],
                        "row_number" => $parsed["row_number"],
                        "seat_number" => $parsed["seat_number"],
                        "status" => "מתוך בקשת המתנה",
                    ];
                }
            }

            $stmt->close();
        }
    }

    ensure_event_seat_inventory_table($conn);

    $stmt = $conn->prepare("
        SELECT seat_key, seat_label, stand_code, row_number, seat_number, status
        FROM event_seat_inventory
        WHERE event_id = ?
        ORDER BY stand_code ASC, row_number ASC, seat_number ASC
    ");

    if ($stmt) {
        $stmt->bind_param("s", $eventId);
        $stmt->execute();

        $result = $stmt->get_result();

        while ($row = $result->fetch_assoc()) {
            $seatKey = clean_text($row["seat_key"] ?? "");

            if ($seatKey === "") {
                continue;
            }

            $parsed = parse_seat_key_local($seatKey);

            if (!$parsed) {
                continue;
            }

            if ($standCode !== "" && $parsed["stand_code"] !== $standCode) {
                continue;
            }

            $seats[$seatKey] = [
                "seat_key" => $seatKey,
                "seat_label" => clean_text($row["seat_label"] ?? "") ?: build_seat_label_local($seatKey),
                "stand_code" => $parsed["stand_code"],
                "row_number" => (int)($row["row_number"] ?? $parsed["row_number"]),
                "seat_number" => (int)($row["seat_number"] ?? $parsed["seat_number"]),
                "status" => clean_text($row["status"] ?? ""),
            ];
        }

        $stmt->close();
    }

    uasort($seats, function ($a, $b) {
        if ((int)$a["row_number"] !== (int)$b["row_number"]) {
            return (int)$a["row_number"] <=> (int)$b["row_number"];
        }

        return (int)$a["seat_number"] <=> (int)$b["seat_number"];
    });

    return array_values($seats);
}

function get_inventory_rows($conn, $eventId)
{
    ensure_event_seat_inventory_table($conn);

    $stmt = $conn->prepare("
        SELECT
            id,
            event_id,
            seat_key,
            seat_label,
            stand_code,
            row_number,
            seat_number,
            status,
            source_order_id,
            source_waitlist_request_id,
            last_action,
            updated_at
        FROM event_seat_inventory
        WHERE event_id = ?
        ORDER BY stand_code ASC, row_number ASC, seat_number ASC
    ");

    if (!$stmt) {
        throw new Exception("שגיאה בשליפת מלאי מושבים: " . $conn->error);
    }

    $stmt->bind_param("s", $eventId);
    $stmt->execute();

    $result = $stmt->get_result();
    $rows = [];

    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }

    $stmt->close();

    return $rows;
}

function get_post_seat_keys()
{
    if (!isset($_POST["seat_keys"]) || !is_array($_POST["seat_keys"])) {
        return [];
    }

    return array_values(array_filter(array_map("trim", $_POST["seat_keys"])));
}

function release_seats_to_available($conn, $eventId, array $seatKeys, $lastAction)
{
    $seatKeys = normalize_seat_list_local($seatKeys);

    if (empty($seatKeys)) {
        return [
            "seat_keys" => [],
            "affected_count" => 0,
        ];
    }

    return seat_inventory_set_status(
        $conn,
        $eventId,
        $seatKeys,
        "available",
        [
            "order_id" => null,
            "waitlist_request_id" => null,
            "last_action" => $lastAction,
        ]
    );
}

function cancel_active_offer($conn, $eventId)
{
    $activeOffer = get_active_offer($conn, $eventId);

    if (!$activeOffer) {
        return [
            "success" => false,
            "message" => "אין הצעה פעילה שאפשר לבטל.",
        ];
    }

    $requestId = (int)$activeOffer["id"];
    $offeredSeats = normalize_seat_list_local($activeOffer["offered_seats"] ?? "");

    $conn->begin_transaction();

    try {
        $stmt = $conn->prepare("
            UPDATE waitlist_requests
            SET status = 'waiting',
                email_status = 'cancelled_by_admin',
                offered_seats = NULL,
                offered_seats_count = 0,
                offer_expires_at = NULL,
                result = 'הצעת הרכישה בוטלה על ידי מנהל. הבקשה חזרה לרשימת ההמתנה.',
                updated_at = NOW()
            WHERE id = ?
              AND status = 'offered'
        ");

        if (!$stmt) {
            throw new Exception("שגיאה בהכנת ביטול הצעה: " . $conn->error);
        }

        $stmt->bind_param("i", $requestId);
        $stmt->execute();
        $stmt->close();

        if (!empty($offeredSeats)) {
            release_seats_to_available($conn, $eventId, $offeredSeats, "admin_cancel_offer");
        }

        $conn->commit();

        return [
            "success" => true,
            "message" => "ההצעה הפעילה בוטלה. הבקשה חזרה לסטטוס waiting והמושבים שוחררו.",
        ];
    } catch (Throwable $error) {
        $conn->rollback();

        return [
            "success" => false,
            "message" => "ביטול ההצעה נכשל: " . $error->getMessage(),
        ];
    }
}

function cancel_waitlist_request_admin($conn, $eventId, $requestId)
{
    $requestId = (int)$requestId;

    if ($requestId <= 0) {
        return [
            "success" => false,
            "message" => "לא נבחרה בקשת המתנה תקינה.",
        ];
    }

    $stmt = $conn->prepare("
        SELECT *
        FROM waitlist_requests
        WHERE id = ?
          AND event_id = ?
        LIMIT 1
    ");

    if (!$stmt) {
        return [
            "success" => false,
            "message" => "שגיאה בשליפת בקשה: " . $conn->error,
        ];
    }

    $stmt->bind_param("is", $requestId, $eventId);
    $stmt->execute();

    $result = $stmt->get_result();
    $row = $result ? $result->fetch_assoc() : null;

    $stmt->close();

    if (!$row) {
        return [
            "success" => false,
            "message" => "בקשת ההמתנה לא נמצאה.",
        ];
    }

    $status = clean_text($row["status"] ?? "");

    if ($status === "completed" || $status === "purchased") {
        return [
            "success" => false,
            "message" => "לא ניתן לבטל בקשה שכבר הושלמה ברכישה.",
        ];
    }

    $offeredSeats = normalize_seat_list_local($row["offered_seats"] ?? "");

    $conn->begin_transaction();

    try {
        $stmt = $conn->prepare("
            UPDATE waitlist_requests
            SET status = 'cancelled',
                email_status = 'cancelled_by_admin',
                offered_seats = NULL,
                offered_seats_count = 0,
                offer_expires_at = NULL,
                result = 'בקשת ההמתנה בוטלה על ידי מנהל.',
                updated_at = NOW()
            WHERE id = ?
              AND event_id = ?
        ");

        if (!$stmt) {
            throw new Exception("שגיאה בהכנת ביטול בקשה: " . $conn->error);
        }

        $stmt->bind_param("is", $requestId, $eventId);
        $stmt->execute();
        $stmt->close();

        if (!empty($offeredSeats)) {
            release_seats_to_available($conn, $eventId, $offeredSeats, "admin_cancel_waitlist_request");
        }

        $conn->commit();

        return [
            "success" => true,
            "message" => "בקשת ההמתנה בוטלה בהצלחה.",
        ];
    } catch (Throwable $error) {
        $conn->rollback();

        return [
            "success" => false,
            "message" => "ביטול הבקשה נכשל: " . $error->getMessage(),
        ];
    }
}

$message = "";
$messageType = "info";
$matchResult = null;

try {
    $conn = db_connect();
    $conn->set_charset("utf8mb4");

    ensure_event_seat_inventory_table($conn);

    $eventOptions = get_sold_out_events($conn);

    $selectedEventId = clean_text($_REQUEST["event_id"] ?? "");
    $selectedEvent = find_event_by_id($eventOptions, $selectedEventId);

    if (!$selectedEvent) {
        throw new Exception("לא נמצאו אירועי Sold Out.");
    }

    $selectedEventId = $selectedEvent["id"];

    $standOptions = get_stand_options($conn, $selectedEventId);

    $selectedStand = normalize_stand_local($_REQUEST["stand_code"] ?? "");

    if ($selectedStand === "") {
        $selectedStand = $standOptions[0] ?? "W";
    }

    $selectedSeatKeys = [];

    if ($_SERVER["REQUEST_METHOD"] === "POST") {
        $action = clean_text($_POST["action"] ?? "");
        $selectedEventId = clean_text($_POST["event_id"] ?? $selectedEventId);
        $selectedStand = normalize_stand_local($_POST["stand_code"] ?? $selectedStand);
        $selectedSeatKeys = get_post_seat_keys();

        if ($action === "select_seats") {
            $message = empty($selectedSeatKeys)
                ? "לא נבחרו מושבים."
                : "סומנו " . count($selectedSeatKeys) . " מושבים לבחירה: " . implode(", ", $selectedSeatKeys);
            $messageType = empty($selectedSeatKeys) ? "error" : "success";
        }

        if ($action === "release_and_match") {
            if (empty($selectedSeatKeys)) {
                $message = "יש לבחור לפחות מושב אחד לפני הרצת התאמה.";
                $messageType = "error";
            } else {
                $releaseResult = release_seats_to_available(
                    $conn,
                    $selectedEventId,
                    $selectedSeatKeys,
                    "admin_release_for_waitlist_match"
                );

                $releasedSeats = !empty($releaseResult["seat_keys"])
                    ? $releaseResult["seat_keys"]
                    : $selectedSeatKeys;

                $matchResult = waitlist_find_and_offer_next(
                    $conn,
                    $selectedEventId,
                    count($releasedSeats),
                    $selectedStand,
                    $releasedSeats,
                    "המושבים שוחררו דרך דף ניהול רשימת ההמתנה. נשלחה הצעת רכישה ל-90 דקות."
                );

                if (!empty($matchResult["success"])) {
                    $matchedUser = $matchResult["matched_request"]["username"] ?? "";
                    $offeredSeats = !empty($matchResult["offered_seats"])
                        ? implode(", ", $matchResult["offered_seats"])
                        : "ללא פירוט";

                    $message = "נמצאה התאמה ונשלחה הצעה למשתמש {$matchedUser}. מושבים שהוצעו: {$offeredSeats}";
                    $messageType = "success";
                } else {
                    $message = "המושבים שוחררו, אבל לא נמצאה התאמה. " .
                        ($matchResult["message"] ?? "");
                    $messageType = "error";
                }
            }
        }

        if ($action === "cancel_active_offer") {
            $result = cancel_active_offer($conn, $selectedEventId);
            $message = $result["message"];
            $messageType = !empty($result["success"]) ? "success" : "error";
        }

        if ($action === "cancel_request") {
            $requestId = (int)($_POST["request_id"] ?? 0);
            $result = cancel_waitlist_request_admin($conn, $selectedEventId, $requestId);
            $message = $result["message"];
            $messageType = !empty($result["success"]) ? "success" : "error";
        }
    } else {
        $seatOptionsInitial = get_seat_options($conn, $selectedEventId, $selectedStand);

        if (!empty($seatOptionsInitial)) {
            $selectedSeatKeys = array_map(
                function ($seat) {
                    return $seat["seat_key"];
                },
                array_slice($seatOptionsInitial, 0, min(2, count($seatOptionsInitial)))
            );
        }
    }

    $eventOptions = get_sold_out_events($conn);
    $selectedEvent = find_event_by_id($eventOptions, $selectedEventId);
    $standOptions = get_stand_options($conn, $selectedEventId);
    $seatOptions = get_seat_options($conn, $selectedEventId, $selectedStand);
    $waitlistRows = get_waitlist_rows($conn, $selectedEventId);
    $inventoryRows = get_inventory_rows($conn, $selectedEventId);
    $activeOffer = get_active_offer($conn, $selectedEventId);
} catch (Throwable $error) {
    $message = "שגיאה: " . $error->getMessage();
    $messageType = "error";

    $eventOptions = [];
    $standOptions = [];
    $seatOptions = [];
    $waitlistRows = [];
    $inventoryRows = [];
    $activeOffer = null;

    $selectedEventId = "so-1";
    $selectedStand = "W";
    $selectedSeatKeys = [];
    $selectedEvent = null;
}
?>
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>דף בדיקת ניהול רשימת המתנה</title>

    <style>
        body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            background: #f3f6fb;
            color: #162033;
        }

        .page {
            max-width: 1450px;
            margin: 0 auto;
            padding: 24px;
        }

        .card {
            background: #ffffff;
            border-radius: 18px;
            padding: 22px;
            margin-bottom: 22px;
            box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
        }

        h1, h2, h3 {
            margin-top: 0;
        }

        .subtitle {
            font-size: 18px;
            line-height: 1.8;
            color: #42516e;
        }

        .event-summary {
            display: grid;
            grid-template-columns: repeat(4, minmax(180px, 1fr));
            gap: 12px;
            margin-top: 16px;
        }

        .summary-box {
            background: #f7f9fc;
            border: 1px solid #d9e2f1;
            border-radius: 14px;
            padding: 12px;
            line-height: 1.6;
        }

        .summary-title {
            font-size: 13px;
            color: #56657f;
            font-weight: 700;
        }

        .summary-value {
            font-size: 16px;
            color: #162033;
            font-weight: 700;
        }

        .form-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(220px, 1fr));
            gap: 16px;
            margin-top: 20px;
        }

        label {
            display: block;
            font-weight: 700;
            margin-bottom: 8px;
        }

        select {
            width: 100%;
            box-sizing: border-box;
            height: 48px;
            border-radius: 12px;
            border: 1px solid #ccd7ea;
            padding: 0 14px;
            font-size: 16px;
            background: #fff;
        }

        .seat-box {
            margin-top: 12px;
            border: 1px solid #d9e2f1;
            border-radius: 12px;
            padding: 14px;
            background: #f9fbff;
            max-height: 260px;
            overflow-y: auto;
        }

        .seat-item {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
            font-size: 15px;
        }

        .seat-status {
            font-size: 12px;
            color: #56657f;
            background: #eef3fb;
            padding: 4px 8px;
            border-radius: 999px;
        }

        .actions {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 18px;
        }

        button {
            border: none;
            border-radius: 12px;
            padding: 14px 18px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
        }

        .btn-select {
            background: #e8f3ff;
            color: #1357b8;
        }

        .btn-match {
            background: #152c5b;
            color: #ffffff;
        }

        .btn-cancel {
            background: #fdeaea;
            color: #b42318;
        }

        .btn-small {
            padding: 8px 12px;
            font-size: 13px;
            border-radius: 10px;
        }

        .msg {
            margin-top: 18px;
            padding: 14px 16px;
            border-radius: 12px;
            font-weight: 700;
            line-height: 1.7;
        }

        .msg.success {
            background: #e9f9ec;
            color: #17753a;
        }

        .msg.error {
            background: #fdeaea;
            color: #b42318;
        }

        .active-offer {
            margin-top: 18px;
            background: #fff4e5;
            border: 1px solid #ffd59c;
            border-radius: 14px;
            padding: 14px;
            line-height: 1.8;
            color: #6f4200;
            font-weight: 700;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 14px;
            background: #fff;
        }

        th, td {
            border: 1px solid #d9e2f1;
            padding: 10px 12px;
            text-align: right;
            vertical-align: top;
            font-size: 14px;
        }

        th {
            background: #eef3fb;
        }

        .status-waiting {
            color: #b26a00;
            font-weight: 700;
        }

        .status-offered {
            color: #1357b8;
            font-weight: 700;
        }

        .status-completed {
            color: #17753a;
            font-weight: 700;
        }

        .status-cancelled {
            color: #b42318;
            font-weight: 700;
        }

        .small {
            font-size: 13px;
            color: #56657f;
            line-height: 1.8;
        }

        @media (max-width: 900px) {
            .form-grid, .event-summary {
                grid-template-columns: 1fr;
            }

            .actions {
                flex-direction: column;
            }

            button {
                width: 100%;
            }
        }
    </style>
</head>

<body>
<div class="page">
    <div class="card">
        <h1>דף בדיקת ניהול רשימת המתנה</h1>

        <div class="subtitle">
            בדף זה בוחרים מושבים שהתפנו, מסמנים אותם, ואז מריצים התאמה אוטומטית.
            לאחר ההרצה המערכת תשלח הצעת רכישה למשתמש הראשון שמתאים לפי תור, כמות כרטיסים ומושבים.
        </div>

        <?php if ($selectedEvent): ?>
            <div class="event-summary">
                <div class="summary-box">
                    <div class="summary-title">Event ID</div>
                    <div class="summary-value"><?php echo h($selectedEvent["id"]); ?></div>
                </div>

                <div class="summary-box">
                    <div class="summary-title">שם אירוע</div>
                    <div class="summary-value"><?php echo h($selectedEvent["name"]); ?></div>
                </div>

                <div class="summary-box">
                    <div class="summary-title">תחרות</div>
                    <div class="summary-value"><?php echo h($selectedEvent["competition"]); ?></div>
                </div>

                <div class="summary-box">
                    <div class="summary-title">ממתינים פעילים</div>
                    <div class="summary-value"><?php echo h(count_active_waitlist_for_event($conn, $selectedEventId)); ?></div>
                </div>
            </div>
        <?php endif; ?>

        <?php if ($activeOffer): ?>
            <div class="active-offer">
                קיימת הצעה פעילה למשתמש:
                <?php echo h($activeOffer["username"] ?? ""); ?>.
                מושבים שהוצעו:
                <?php echo h(implode(", ", normalize_seat_list_local($activeOffer["offered_seats"] ?? ""))); ?>.
                תוקף:
                <?php echo h($activeOffer["offer_expires_at"] ?? ""); ?>.

                <form method="post" style="margin-top: 12px;">
                    <input type="hidden" name="event_id" value="<?php echo h($selectedEventId); ?>">
                    <input type="hidden" name="stand_code" value="<?php echo h($selectedStand); ?>">

                    <button
                        type="submit"
                        name="action"
                        value="cancel_active_offer"
                        class="btn-cancel"
                        onclick="return confirm('לבטל את ההצעה הפעילה ולהחזיר את הבקשה לרשימת ההמתנה?');"
                    >
                        בטל הצעה פעילה
                    </button>
                </form>
            </div>
        <?php endif; ?>

        <form method="get">
            <div class="form-grid">
                <div>
                    <label for="event_id">אירוע Sold Out</label>
                    <select id="event_id" name="event_id" onchange="this.form.submit()">
                        <?php foreach ($eventOptions as $eventOption): ?>
                            <option
                                value="<?php echo h($eventOption["id"]); ?>"
                                <?php echo $selectedEventId === $eventOption["id"] ? "selected" : ""; ?>
                            >
                                <?php echo h($eventOption["label"]); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div>
                    <label for="stand_code">יציע</label>
                    <select id="stand_code" name="stand_code" onchange="this.form.submit()">
                        <?php foreach ($standOptions as $standOption): ?>
                            <?php $standCode = normalize_stand_local($standOption); ?>
                            <option
                                value="<?php echo h($standCode); ?>"
                                <?php echo $selectedStand === $standCode ? "selected" : ""; ?>
                            >
                                <?php echo h($standCode . " | " . get_stand_label_local($standCode)); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div>
                    <label>מושבים שהתפנו</label>
                    <div class="seat-box">
                        <?php if (empty($seatOptions)): ?>
                            <div class="small">
                                אין מושבים להצגה עבור האירוע והיציע שנבחרו.
                            </div>
                        <?php else: ?>
                            <?php foreach ($seatOptions as $seat): ?>
                                <?php $checked = in_array($seat["seat_key"], $selectedSeatKeys, true); ?>

                                <label class="seat-item">
                                    <input
                                        type="checkbox"
                                        form="mainActionForm"
                                        name="seat_keys[]"
                                        value="<?php echo h($seat["seat_key"]); ?>"
                                        <?php echo $checked ? "checked" : ""; ?>
                                    >

                                    <span><?php echo h($seat["seat_key"]); ?></span>
                                    <span><?php echo h($seat["seat_label"]); ?></span>
                                    <span class="seat-status"><?php echo h($seat["status"] ?: "לא ידוע"); ?></span>
                                </label>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </form>

        <form method="post" id="mainActionForm">
            <input type="hidden" name="event_id" value="<?php echo h($selectedEventId); ?>">
            <input type="hidden" name="stand_code" value="<?php echo h($selectedStand); ?>">

            <div class="actions">
                <button
                    type="submit"
                    name="action"
                    value="select_seats"
                    class="btn-select"
                >
                    סמן מושבים לבחירה
                </button>

                <button
                    type="submit"
                    name="action"
                    value="release_and_match"
                    class="btn-match"
                    onclick="return confirm('להריץ התאמה אוטומטית ולשלוח הצעת רכישה למשתמש המתאים הראשון בתור?');"
                >
                    הרץ התאמה אוטומטית
                </button>
            </div>
        </form>

        <?php if ($message !== ""): ?>
            <div class="msg <?php echo h($messageType); ?>">
                <?php echo h($message); ?>
            </div>
        <?php endif; ?>
    </div>

    <div class="card">
        <h2>רשימת ההמתנה של <?php echo h($selectedEventId); ?></h2>

        <div class="small">
            כאן רואים את דניאל, גלעד, המקום בתור, הסטטוס והמושבים שהוצעו.
        </div>

        <table>
            <thead>
            <tr>
                <th>ID</th>
                <th>שם משתמש</th>
                <th>אימייל</th>
                <th>כמות</th>
                <th>יציע</th>
                <th>מושבים שביקש</th>
                <th>מקום בתור</th>
                <th>סטטוס</th>
                <th>מושבים שהוצעו</th>
                <th>תוקף הצעה</th>
                <th>תוצאה</th>
                <th>פעולה</th>
            </tr>
            </thead>

            <tbody>
            <?php if (empty($waitlistRows)): ?>
                <tr>
                    <td colspan="12">אין בקשות רשימת המתנה לאירוע זה.</td>
                </tr>
            <?php else: ?>
                <?php foreach ($waitlistRows as $row): ?>
                    <?php
                    $status = clean_text($row["status"] ?? "");

                    $statusClass = "status-waiting";

                    if ($status === "offered") {
                        $statusClass = "status-offered";
                    }

                    if ($status === "completed" || $status === "purchased") {
                        $statusClass = "status-completed";
                    }

                    if ($status === "cancelled") {
                        $statusClass = "status-cancelled";
                    }

                    $requestedSeats = normalize_seat_list_local(
                        !empty($row["selected_seats_short"])
                            ? $row["selected_seats_short"]
                            : ($row["selected_seats"] ?? "")
                    );

                    $offeredSeats = normalize_seat_list_local($row["offered_seats"] ?? "");

                    $canCancelRequest = !in_array($status, ["completed", "purchased", "cancelled"], true);
                    ?>

                    <tr>
                        <td><?php echo h($row["id"] ?? ""); ?></td>
                        <td><?php echo h($row["username"] ?? ""); ?></td>
                        <td><?php echo h($row["email"] ?? ""); ?></td>
                        <td><?php echo h($row["tickets_count"] ?? ""); ?></td>
                        <td><?php echo h(normalize_stand_local($row["stand"] ?? "") . " | " . get_stand_label_local($row["stand"] ?? "")); ?></td>
                        <td><?php echo h(implode(", ", $requestedSeats)); ?></td>
                        <td><?php echo h($row["queue_position"] ?? ""); ?></td>
                        <td class="<?php echo h($statusClass); ?>"><?php echo h($status); ?></td>
                        <td><?php echo h(implode(", ", $offeredSeats)); ?></td>
                        <td><?php echo h($row["offer_expires_at"] ?? ""); ?></td>
                        <td><?php echo h($row["result"] ?? ""); ?></td>
                        <td>
                            <?php if ($canCancelRequest): ?>
                                <form method="post">
                                    <input type="hidden" name="event_id" value="<?php echo h($selectedEventId); ?>">
                                    <input type="hidden" name="stand_code" value="<?php echo h($selectedStand); ?>">
                                    <input type="hidden" name="request_id" value="<?php echo h($row["id"] ?? ""); ?>">

                                    <button
                                        type="submit"
                                        name="action"
                                        value="cancel_request"
                                        class="btn-cancel btn-small"
                                        onclick="return confirm('לבטל את בקשת ההמתנה של <?php echo h($row["username"] ?? ""); ?>?');"
                                    >
                                        בטל בקשה
                                    </button>
                                </form>
                            <?php else: ?>
                                <span class="small">אין פעולה</span>
                            <?php endif; ?>
                        </td>
                    </tr>
                <?php endforeach; ?>
            <?php endif; ?>
            </tbody>
        </table>
    </div>

    <div class="card">
        <h2>מלאי מושבים של <?php echo h($selectedEventId); ?></h2>

        <table>
            <thead>
            <tr>
                <th>ID</th>
                <th>Seat Key</th>
                <th>Seat Label</th>
                <th>Stand</th>
                <th>Row</th>
                <th>Seat</th>
                <th>Status</th>
                <th>Source Order</th>
                <th>Source Waitlist</th>
                <th>Last Action</th>
                <th>Updated At</th>
            </tr>
            </thead>

            <tbody>
            <?php if (empty($inventoryRows)): ?>
                <tr>
                    <td colspan="11">אין עדיין נתוני מלאי מושבים לאירוע הזה.</td>
                </tr>
            <?php else: ?>
                <?php foreach ($inventoryRows as $row): ?>
                    <tr>
                        <td><?php echo h($row["id"] ?? ""); ?></td>
                        <td><?php echo h($row["seat_key"] ?? ""); ?></td>
                        <td><?php echo h($row["seat_label"] ?? ""); ?></td>
                        <td><?php echo h($row["stand_code"] ?? ""); ?></td>
                        <td><?php echo h($row["row_number"] ?? ""); ?></td>
                        <td><?php echo h($row["seat_number"] ?? ""); ?></td>
                        <td><?php echo h($row["status"] ?? ""); ?></td>
                        <td><?php echo h($row["source_order_id"] ?? ""); ?></td>
                        <td><?php echo h($row["source_waitlist_request_id"] ?? ""); ?></td>
                        <td><?php echo h($row["last_action"] ?? ""); ?></td>
                        <td><?php echo h($row["updated_at"] ?? ""); ?></td>
                    </tr>
                <?php endforeach; ?>
            <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>
</body>
</html>