<?php
ini_set("display_errors", 0);
error_reporting(E_ALL);
ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/db.php";

function send_json($statusCode, $data)
{
    if (ob_get_length()) {
        ob_clean();
    }

    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

register_shutdown_function(function () {
    $error = error_get_last();

    if ($error !== null) {
        if (ob_get_length()) {
            ob_clean();
        }

        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "שגיאת PHP בשרת",
            "details" => $error["message"]
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }
});

function column_exists($conn, $tableName, $columnName)
{
    $safeTable = $conn->real_escape_string($tableName);
    $safeColumn = $conn->real_escape_string($columnName);
    $sql = "SHOW COLUMNS FROM `{$safeTable}` LIKE '{$safeColumn}'";
    $result = $conn->query($sql);
    return $result && $result->num_rows > 0;
}

function normalize_stand_name($stand)
{
    $stand = trim((string)$stand);
    if ($stand === "") {
        return "";
    }

    $lower = function_exists("mb_strtolower") ? mb_strtolower($stand, "UTF-8") : strtolower($stand);
    $lowerWithoutPrefix = preg_replace('/^יציע\s+/u', '', $lower);

    $map = [
        "יציע מערבי" => "W",
        "מערבי" => "W",
        "מערב" => "W",
        "יציע מזרחי" => "E",
        "מזרחי" => "E",
        "מזרח" => "E",
        "יציע צפוני" => "N",
        "צפוני" => "N",
        "צפון" => "N",
        "יציע דרומי" => "S",
        "דרומי" => "S",
        "דרום" => "S",
        "יציע מרכזי" => "C",
        "מרכזי" => "C",
        "מרכז" => "C",
        "יציע משפחות" => "F",
        "משפחות" => "F",
        "משפחה" => "F",
        "vip" => "VIP",
        "west" => "W",
        "weststand" => "W",
        "east" => "E",
        "eaststand" => "E",
        "north" => "N",
        "south" => "S",
        "center" => "C",
        "central" => "C",
        "family" => "F",
        "familystand" => "F",
        "w" => "W",
        "e" => "E",
        "n" => "N",
        "s" => "S",
        "c" => "C",
        "f" => "F"
    ];

    if (isset($map[$lower])) {
        return $map[$lower];
    }

    if ($lowerWithoutPrefix !== $lower && isset($map[$lowerWithoutPrefix])) {
        return $map[$lowerWithoutPrefix];
    }

    return strtoupper($stand);
}

function compact_seat_label($seatText)
{
    $seatText = trim((string)$seatText);

    if ($seatText === "") {
        return "";
    }

    if (preg_match('/^([A-Za-z]+)-(\d+)-(\d+)$/u', $seatText, $matches)) {
        return normalize_stand_name($matches[1]) . "-" . $matches[2] . "-" . $matches[3];
    }

    if (
        preg_match(
            '/([A-Za-zא-ת]+)\s*(?:\||,)?\s*שורה\s*(\d+)\s*(?:\||,)?\s*(?:כסא|כיסא|מושב|seat)\s*(\d+)/u',
            $seatText,
            $matches
        )
    ) {
        return normalize_stand_name($matches[1]) . "-" . $matches[2] . "-" . $matches[3];
    }

    return $seatText;
}

function normalize_selected_seats($input)
{
    $shortSeats = [];

    foreach (["selected_seats_short", "selected_seat_ids", "selected_seats"] as $key) {
        if (!isset($input[$key]) || !is_array($input[$key])) {
            continue;
        }

        foreach ($input[$key] as $seatText) {
            $short = compact_seat_label($seatText);
            if ($short !== "") {
                $shortSeats[] = $short;
            }
        }

        if (!empty($shortSeats)) {
            break;
        }
    }

    return array_values(array_unique(array_filter($shortSeats)));
}

function ensure_waitlist_table($conn)
{
    $createSql = "
        CREATE TABLE IF NOT EXISTS waitlist_requests (
            id INT NOT NULL AUTO_INCREMENT,
            user_id INT NOT NULL,
            username VARCHAR(100) NOT NULL,
            email VARCHAR(191) NOT NULL,
            full_name VARCHAR(191) NULL,
            event_id VARCHAR(100) NOT NULL,
            event_name VARCHAR(255) NOT NULL,
            competition VARCHAR(255) NULL,
            location VARCHAR(255) NULL,
            date_time VARCHAR(255) NULL,
            tickets_count INT NOT NULL DEFAULT 1,
            selection_mode VARCHAR(30) NOT NULL DEFAULT 'zone',
            stand VARCHAR(100) NOT NULL,
            preferred_row VARCHAR(100) NULL,
            selected_seats TEXT NULL,
            selected_seats_short TEXT NULL,
            selected_seats_count INT NOT NULL DEFAULT 0,
            bundle_purchase_approved TINYINT(1) NOT NULL DEFAULT 0,
            queue_position INT NOT NULL DEFAULT 1,
            status VARCHAR(50) NOT NULL DEFAULT 'waiting',
            payment_method VARCHAR(50) NULL,
            wallet_provider VARCHAR(50) NULL,
            card_number VARCHAR(30) NULL,
            owner_id VARCHAR(30) NULL,
            expiry_date VARCHAR(10) NULL,
            cvv VARCHAR(10) NULL,
            offered_seats TEXT NULL,
            offered_seats_count INT NOT NULL DEFAULT 0,
            offered_at DATETIME NULL,
            offer_sent_at DATETIME NULL,
            offer_expires_at DATETIME NULL,
            email_status VARCHAR(50) NULL,
            result TEXT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            INDEX idx_waitlist_event (event_id),
            INDEX idx_waitlist_status (status),
            INDEX idx_waitlist_user (user_id),
            INDEX idx_waitlist_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ";

    if (!$conn->query($createSql)) {
        throw new Exception("יצירת טבלת waitlist_requests נכשלה: " . $conn->error);
    }

    $columnsToAdd = [
        "full_name" => "ALTER TABLE waitlist_requests ADD COLUMN full_name VARCHAR(191) NULL AFTER email",
        "competition" => "ALTER TABLE waitlist_requests ADD COLUMN competition VARCHAR(255) NULL AFTER event_name",
        "location" => "ALTER TABLE waitlist_requests ADD COLUMN location VARCHAR(255) NULL AFTER competition",
        "date_time" => "ALTER TABLE waitlist_requests ADD COLUMN date_time VARCHAR(255) NULL AFTER location",
        "selection_mode" => "ALTER TABLE waitlist_requests ADD COLUMN selection_mode VARCHAR(30) NOT NULL DEFAULT 'zone' AFTER tickets_count",
        "preferred_row" => "ALTER TABLE waitlist_requests ADD COLUMN preferred_row VARCHAR(100) NULL AFTER stand",
        "selected_seats" => "ALTER TABLE waitlist_requests ADD COLUMN selected_seats TEXT NULL AFTER preferred_row",
        "selected_seats_short" => "ALTER TABLE waitlist_requests ADD COLUMN selected_seats_short TEXT NULL AFTER selected_seats",
        "selected_seats_count" => "ALTER TABLE waitlist_requests ADD COLUMN selected_seats_count INT NOT NULL DEFAULT 0 AFTER selected_seats_short",
        "bundle_purchase_approved" => "ALTER TABLE waitlist_requests ADD COLUMN bundle_purchase_approved TINYINT(1) NOT NULL DEFAULT 0 AFTER selected_seats_count",
        "queue_position" => "ALTER TABLE waitlist_requests ADD COLUMN queue_position INT NOT NULL DEFAULT 1 AFTER bundle_purchase_approved",
        "status" => "ALTER TABLE waitlist_requests ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'waiting' AFTER queue_position",
        "payment_method" => "ALTER TABLE waitlist_requests ADD COLUMN payment_method VARCHAR(50) NULL AFTER status",
        "wallet_provider" => "ALTER TABLE waitlist_requests ADD COLUMN wallet_provider VARCHAR(50) NULL AFTER payment_method",
        "card_number" => "ALTER TABLE waitlist_requests ADD COLUMN card_number VARCHAR(30) NULL AFTER wallet_provider",
        "owner_id" => "ALTER TABLE waitlist_requests ADD COLUMN owner_id VARCHAR(30) NULL AFTER card_number",
        "expiry_date" => "ALTER TABLE waitlist_requests ADD COLUMN expiry_date VARCHAR(10) NULL AFTER owner_id",
        "cvv" => "ALTER TABLE waitlist_requests ADD COLUMN cvv VARCHAR(10) NULL AFTER expiry_date",
        "offered_seats" => "ALTER TABLE waitlist_requests ADD COLUMN offered_seats TEXT NULL AFTER cvv",
        "offered_seats_count" => "ALTER TABLE waitlist_requests ADD COLUMN offered_seats_count INT NOT NULL DEFAULT 0 AFTER offered_seats",
        "offered_at" => "ALTER TABLE waitlist_requests ADD COLUMN offered_at DATETIME NULL AFTER offered_seats_count",
        "offer_sent_at" => "ALTER TABLE waitlist_requests ADD COLUMN offer_sent_at DATETIME NULL AFTER offered_at",
        "offer_expires_at" => "ALTER TABLE waitlist_requests ADD COLUMN offer_expires_at DATETIME NULL AFTER offer_sent_at",
        "email_status" => "ALTER TABLE waitlist_requests ADD COLUMN email_status VARCHAR(50) NULL AFTER offer_expires_at",
        "result" => "ALTER TABLE waitlist_requests ADD COLUMN result TEXT NULL AFTER email_status",
        "created_at" => "ALTER TABLE waitlist_requests ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER result",
        "updated_at" => "ALTER TABLE waitlist_requests ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at"
    ];

    foreach ($columnsToAdd as $columnName => $sql) {
        if (!column_exists($conn, "waitlist_requests", $columnName)) {
            if (!$conn->query($sql)) {
                throw new Exception("הוספת עמודה {$columnName} נכשלה: " . $conn->error);
            }
        }
    }
}

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    send_json(200, [
        "success" => true,
        "message" => "OPTIONS OK"
    ]);
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    send_json(405, [
        "success" => false,
        "message" => "נדרשת בקשת POST"
    ]);
}

try {
    $conn = db_connect();
    ensure_waitlist_table($conn);
} catch (Throwable $error) {
    send_json(500, [
        "success" => false,
        "message" => "Database connection failed",
        "details" => $error->getMessage()
    ]);
}

$rawInput = file_get_contents("php://input");
$input = json_decode($rawInput, true);

if (!$input || !is_array($input)) {
    send_json(400, [
        "success" => false,
        "message" => "לא התקבלו נתוני JSON תקינים",
        "raw" => $rawInput
    ]);
}

$requiredFields = [
    "user_id",
    "username",
    "email",
    "event_id",
    "event_name",
    "tickets_count",
    "selection_mode",
    "stand",
    "bundle_purchase_approved"
];

foreach ($requiredFields as $field) {
    if (!isset($input[$field]) || $input[$field] === "") {
        send_json(400, [
            "success" => false,
            "message" => "חסר שדה חובה",
            "field" => $field
        ]);
    }
}

$userId = (int)$input["user_id"];
$username = trim((string)$input["username"]);
$email = trim((string)$input["email"]);
$fullName = isset($input["full_name"]) ? trim((string)$input["full_name"]) : "";
$eventId = trim((string)$input["event_id"]);
$eventName = trim((string)$input["event_name"]);
$competition = isset($input["competition"]) ? trim((string)$input["competition"]) : "";
$location = isset($input["location"]) ? trim((string)$input["location"]) : "";
$dateTime = isset($input["date_time"]) ? trim((string)$input["date_time"]) : "";
$ticketsCount = (int)$input["tickets_count"];
$selectionMode = trim((string)$input["selection_mode"]);
$stand = trim((string)$input["stand"]);
$preferredRow = isset($input["preferred_row"]) ? trim((string)$input["preferred_row"]) : "";
$selectedSeatsArray = isset($input["selected_seats"]) && is_array($input["selected_seats"]) ? array_values($input["selected_seats"]) : [];
$selectedSeatsShortArray = normalize_selected_seats($input);
$bundlePurchaseApproved = (int)$input["bundle_purchase_approved"] === 1 ? 1 : 0;

$paymentMethod = trim((string)($input["payment_method"] ?? "waitlist_later"));
$walletProvider = trim((string)($input["wallet_provider"] ?? ""));

$cardNumber = preg_replace("/\D+/", "", (string)($input["card_number"] ?? ""));
$ownerId = preg_replace("/\D+/", "", (string)($input["owner_id"] ?? ""));
$expiryDate = trim((string)($input["expiry_date"] ?? ""));
$cvv = preg_replace("/\D+/", "", (string)($input["cvv"] ?? ""));

if ($userId <= 0) {
    send_json(400, [
        "success" => false,
        "message" => "מזהה משתמש לא תקין"
    ]);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    send_json(400, [
        "success" => false,
        "message" => "כתובת האימייל אינה תקינה"
    ]);
}

if ($ticketsCount < 1 || $ticketsCount > 3) {
    send_json(400, [
        "success" => false,
        "message" => "מספר הכרטיסים ברשימת המתנה חייב להיות בין 1 ל-3"
    ]);
}

if (!in_array($selectionMode, ["zone", "seats"], true)) {
    send_json(400, [
        "success" => false,
        "message" => "סוג הבחירה אינו תקין"
    ]);
}

if ($selectionMode === "seats" && count($selectedSeatsShortArray) !== $ticketsCount) {
    send_json(400, [
        "success" => false,
        "message" => "מספר המושבים שסומנו אינו תואם למספר הכרטיסים",
        "selected_seats_short" => $selectedSeatsShortArray,
        "tickets_count" => $ticketsCount
    ]);
}

if ($bundlePurchaseApproved !== 1) {
    send_json(400, [
        "success" => false,
        "message" => "יש לאשר התחייבות לרכישה כמקשה אחת"
    ]);
}

if (!in_array($paymentMethod, ["waitlist_later", "credit_card", "digital_wallet"], true)) {
    send_json(400, [
        "success" => false,
        "message" => "אמצעי התשלום שנבחר אינו תקין"
    ]);
}

$maskedCard = null;
$maskedOwnerId = null;
$storedExpiryDate = null;
$storedCvv = null;
$resultText = "ממתין להתאמה";

if ($paymentMethod === "waitlist_later") {
    $paymentMethod = "waitlist_later";
    $walletProvider = "";
    $maskedCard = null;
    $maskedOwnerId = null;
    $storedExpiryDate = null;
    $storedCvv = null;
    $resultText = "ממתין להתאמה. לא נדרש אשראי בעת הצטרפות לרשימת המתנה";
} elseif ($paymentMethod === "credit_card") {
    if (
        strlen($cardNumber) < 8 ||
        strlen($cardNumber) > 16 ||
        strlen($ownerId) !== 9 ||
        strlen($expiryDate) !== 5 ||
        strlen($cvv) < 3 ||
        strlen($cvv) > 4
    ) {
        send_json(400, [
            "success" => false,
            "message" => "פרטי האשראי ששימשו לאישור ההתחייבות אינם תקינים"
        ]);
    }

    $maskedCard = "****" . substr($cardNumber, -4);
    $maskedOwnerId = "*****" . substr($ownerId, -4);
    $storedExpiryDate = $expiryDate;
    $storedCvv = null;
    $resultText = "ממתין להתאמה. נשמר אישור התחייבות עם כרטיס אשראי ללא CVV";
} else {
    if ($walletProvider === "") {
        send_json(400, [
            "success" => false,
            "message" => "יש לבחור ארנק דיגיטלי"
        ]);
    }

    $resultText = "ממתין להתאמה. נשמר אישור התחייבות באמצעות ארנק דיגיטלי";
}

$expireSql = "
    UPDATE waitlist_requests
    SET status = 'expired',
        email_status = 'expired',
        result = 'פג תוקף להצעת הרכישה'
    WHERE status = 'offered'
      AND offer_expires_at IS NOT NULL
      AND offer_expires_at < NOW()
";
$conn->query($expireSql);

$conn->begin_transaction();

try {
    $duplicateCheck = $conn->prepare(
        "SELECT id, queue_position, status
         FROM waitlist_requests
         WHERE user_id = ?
           AND event_id = ?
           AND status IN ('waiting', 'offered')
         ORDER BY id DESC
         LIMIT 1
         FOR UPDATE"
    );

    if (!$duplicateCheck) {
        throw new Exception("שגיאה בבדיקת כפילות בקשת המתנה: " . $conn->error);
    }

    $duplicateCheck->bind_param("is", $userId, $eventId);
    $duplicateCheck->execute();
    $duplicateResult = $duplicateCheck->get_result();
    $existingRequest = $duplicateResult ? $duplicateResult->fetch_assoc() : null;
    $duplicateCheck->close();

    if ($existingRequest) {
      $conn->rollback();
      send_json(409, [
          "success" => false,
          "message" => "כבר קיימת עבורך בקשת המתנה פעילה לאירוע זה",
          "existing_request_id" => (int)($existingRequest["id"] ?? 0),
          "queue_position" => isset($existingRequest["queue_position"]) ? (int)$existingRequest["queue_position"] : null,
          "status" => (string)($existingRequest["status"] ?? "waiting")
      ]);
    }

    $queueQuery = $conn->prepare("
        SELECT COALESCE(MAX(queue_position), 0) + 1 AS next_position
        FROM waitlist_requests
        WHERE event_id = ?
          AND status IN ('waiting', 'offered')
        FOR UPDATE
    ");

    if (!$queueQuery) {
        throw new Exception("שגיאה בהכנת שאילתת התור: " . $conn->error);
    }

    $queueQuery->bind_param("s", $eventId);
    $queueQuery->execute();
    $queueResult = $queueQuery->get_result();
    $queueRow = $queueResult ? $queueResult->fetch_assoc() : null;
    $queuePosition = isset($queueRow["next_position"]) ? (int)$queueRow["next_position"] : 1;
    $queueQuery->close();

    $selectedSeats = !empty($selectedSeatsArray) ? json_encode($selectedSeatsArray, JSON_UNESCAPED_UNICODE) : null;
    $selectedSeatsShort = !empty($selectedSeatsShortArray) ? json_encode($selectedSeatsShortArray, JSON_UNESCAPED_UNICODE) : null;
    $selectedSeatsCount = count($selectedSeatsShortArray);
    $emailStatus = "pending";
    $status = "waiting";

    $stmt = $conn->prepare("
        INSERT INTO waitlist_requests (
            user_id,
            username,
            email,
            full_name,
            event_id,
            event_name,
            competition,
            location,
            date_time,
            tickets_count,
            selection_mode,
            stand,
            preferred_row,
            selected_seats,
            selected_seats_short,
            selected_seats_count,
            bundle_purchase_approved,
            queue_position,
            status,
            payment_method,
            wallet_provider,
            card_number,
            owner_id,
            expiry_date,
            cvv,
            email_status,
            result,
            created_at,
            updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ");

    if (!$stmt) {
        throw new Exception("שגיאה בהכנת שאילתת השמירה: " . $conn->error);
    }

    $stmt->bind_param(
        "issssssssisssssiiisssssssss",
        $userId,
        $username,
        $email,
        $fullName,
        $eventId,
        $eventName,
        $competition,
        $location,
        $dateTime,
        $ticketsCount,
        $selectionMode,
        $stand,
        $preferredRow,
        $selectedSeats,
        $selectedSeatsShort,
        $selectedSeatsCount,
        $bundlePurchaseApproved,
        $queuePosition,
        $status,
        $paymentMethod,
        $walletProvider,
        $maskedCard,
        $maskedOwnerId,
        $storedExpiryDate,
        $storedCvv,
        $emailStatus,
        $resultText
    );

    if (!$stmt->execute()) {
        throw new Exception("שמירת הבקשה נכשלה: " . $stmt->error);
    }

    $newId = (int)$stmt->insert_id;
    $stmt->close();

    $conn->commit();

    send_json(200, [
        "success" => true,
        "message" => "הבקשה נשמרה בהצלחה",
        "request_id" => $newId,
        "queue_position" => $queuePosition,
        "selected_seats_short" => $selectedSeatsShortArray,
        "status" => $status,
        "payment_method" => $paymentMethod,
        "wallet_provider" => $walletProvider
    ]);
} catch (Throwable $error) {
    $conn->rollback();

    send_json(500, [
        "success" => false,
        "message" => "שמירת הבקשה נכשלה",
        "details" => $error->getMessage()
    ]);
}