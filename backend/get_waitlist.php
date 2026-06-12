<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

require_once __DIR__ . "/db.php";

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

function send_json($statusCode, $data)
{
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function table_exists($conn, $tableName)
{
    $safeTable = $conn->real_escape_string($tableName);
    $sql = "SHOW TABLES LIKE '{$safeTable}'";
    $result = $conn->query($sql);
    return $result && $result->num_rows > 0;
}

function column_exists($conn, $tableName, $columnName)
{
    $safeTable = $conn->real_escape_string($tableName);
    $safeColumn = $conn->real_escape_string($columnName);
    $sql = "SHOW COLUMNS FROM `{$safeTable}` LIKE '{$safeColumn}'";
    $result = $conn->query($sql);
    return $result && $result->num_rows > 0;
}

function parse_seat_list($value)
{
    if ($value === null || $value === "") {
        return [];
    }

    if (is_array($value)) {
        $items = $value;
    } else {
        $decoded = json_decode((string)$value, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            $items = $decoded;
        } else {
            $text = trim((string)$value);
            if ($text === "") {
                return [];
            }

            $text = str_replace(["\r\n", "\r", "\n", "|", ";"], ",", $text);
            $items = array_map("trim", explode(",", $text));
        }
    }

    $result = [];

    foreach ($items as $item) {
        if (is_string($item) && trim($item) !== "") {
            $result[] = trim($item);
        }
    }

    return array_values(array_unique(array_filter($result)));
}

function extract_order_code($value)
{
    $text = trim((string)$value);

    if ($text === "") {
        return "";
    }

    if (preg_match('/((?:ORD|WL)-[A-Za-z0-9-]+)/u', $text, $matches)) {
        return $matches[1];
    }

    return "";
}

try {
    $conn = db_connect();
} catch (Throwable $error) {
    send_json(500, [
        "success" => false,
        "message" => "שגיאה בחיבור למסד הנתונים",
        "waitlist" => []
    ]);
}

$userId = isset($_GET["user_id"]) ? intval($_GET["user_id"]) : 0;
$email = isset($_GET["email"]) ? trim((string)$_GET["email"]) : "";

if ($userId <= 0 && $email === "") {
    send_json(400, [
        "success" => false,
        "message" => "חסר מזהה משתמש או אימייל",
        "waitlist" => []
    ]);
}

if (!table_exists($conn, "waitlist_requests")) {
    send_json(200, [
        "success" => true,
        "waitlist" => []
    ]);
}

$conn->query(
    "UPDATE waitlist_requests
     SET status = 'expired',
         email_status = 'expired',
         result = 'פג תוקף להצעת הרכישה',
         offer_expires_at = NULL,
         updated_at = NOW()
     WHERE status = 'offered'
       AND offer_expires_at IS NOT NULL
       AND offer_expires_at < NOW()"
);

$columns = [
    "id",
    "user_id",
    "username",
    "email",
    "full_name",
    "event_id",
    "event_name",
    "competition",
    "location",
    "date_time",
    "tickets_count",
    "selection_mode",
    "stand",
    "preferred_row",
    "selected_seats",
    "selected_seats_short",
    "selected_seats_count",
    "offered_seats",
    "offered_seats_count",
    "status",
    "queue_position",
    "created_at",
    "offered_at",
    "offer_expires_at",
    "result"
];

$existingColumns = [];
foreach ($columns as $column) {
    if (column_exists($conn, "waitlist_requests", $column)) {
        $existingColumns[] = $column;
    }
}

if (empty($existingColumns)) {
    send_json(500, [
        "success" => false,
        "message" => "לא נמצאו עמודות תקינות בטבלת רשימת ההמתנה",
        "waitlist" => []
    ]);
}

$sql = "SELECT " . implode(", ", $existingColumns) . "
        FROM waitlist_requests
        WHERE user_id = ? OR LOWER(email) = LOWER(?)
        ORDER BY id DESC";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    send_json(500, [
        "success" => false,
        "message" => "שגיאה בהכנת שאילתת שליפת רשימת ההמתנה",
        "waitlist" => []
    ]);
}

$stmt->bind_param("is", $userId, $email);
$stmt->execute();
$result = $stmt->get_result();

$waitlist = [];

while ($row = $result->fetch_assoc()) {
    $selectedSeatsShort = parse_seat_list($row["selected_seats_short"] ?? "");
    $selectedSeats = parse_seat_list($row["selected_seats"] ?? "");
    $offeredSeats = parse_seat_list($row["offered_seats"] ?? "");
    $selectedSeatsForDisplay = !empty($selectedSeatsShort) ? $selectedSeatsShort : $selectedSeats;

    $waitlist[] = [
        "id" => $row["id"] ?? null,
        "user_id" => $row["user_id"] ?? null,
        "username" => $row["username"] ?? "",
        "email" => $row["email"] ?? "",
        "full_name" => $row["full_name"] ?? "",
        "event_id" => $row["event_id"] ?? "",
        "event_name" => $row["event_name"] ?? "",
        "competition" => $row["competition"] ?? "",
        "location" => $row["location"] ?? "",
        "date_time" => $row["date_time"] ?? "",
        "tickets_count" => (int)($row["tickets_count"] ?? 0),
        "selection_mode" => $row["selection_mode"] ?? "zone",
        "stand" => $row["stand"] ?? "",
        "preferred_row" => $row["preferred_row"] ?? "",
        "selected_seats" => $selectedSeats,
        "selected_seats_short" => $selectedSeatsShort,
        "selected_seats_for_display" => $selectedSeatsForDisplay,
        "selected_seats_count" => (int)($row["selected_seats_count"] ?? count($selectedSeatsForDisplay)),
        "selected_seats_text" => empty($selectedSeats) ? "" : implode(", ", $selectedSeats),
        "selected_seats_short_text" => empty($selectedSeatsForDisplay) ? "" : implode(", ", $selectedSeatsForDisplay),
        "display_seats" => empty($selectedSeatsForDisplay) ? "בחירה לפי אזור" : implode(", ", $selectedSeatsForDisplay),
        "offered_seats" => $offeredSeats,
        "offered_seats_count" => (int)($row["offered_seats_count"] ?? count($offeredSeats)),
        "offered_seats_text" => empty($offeredSeats) ? "" : implode(", ", $offeredSeats),
        "status" => $row["status"] ?? "waiting",
        "queue_position" => $row["queue_position"] ?? null,
        "created_at" => $row["created_at"] ?? "",
        "offered_at" => $row["offered_at"] ?? "",
        "offer_expires_at" => $row["offer_expires_at"] ?? "",
        "result" => $row["result"] ?? "",
        "order_code" => extract_order_code($row["result"] ?? "")
    ];
}

$stmt->close();
$conn->close();

send_json(200, [
    "success" => true,
    "waitlist" => $waitlist
]);
?>