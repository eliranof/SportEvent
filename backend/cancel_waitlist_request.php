<?php
ini_set("display_errors", 0);
error_reporting(E_ALL);
ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/db.php";
require_once __DIR__ . "/waitlist_engine.php";

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

function release_waitlist_held_seats($conn, $eventId, array $seats, $requestId)
{
    if (!waitlist_table_exists($conn, "event_seat_inventory")) {
        return 0;
    }

    $eventId = trim((string)$eventId);
    $requestId = (int)$requestId;

    if ($eventId === "" || $requestId <= 0 || empty($seats)) {
        return 0;
    }

    $released = 0;

    foreach ($seats as $seat) {
        $seatKey = waitlist_seat_compare_key($seat);

        if ($seatKey === "") {
            continue;
        }

        $stmt = $conn->prepare(
            "UPDATE event_seat_inventory
             SET status = 'available',
                 source_waitlist_request_id = NULL,
                 last_action = 'waitlist_offer_cancelled',
                 updated_at = NOW()
             WHERE event_id = ?
               AND seat_key = ?
               AND status = 'held_waitlist'
               AND (source_waitlist_request_id = ? OR source_waitlist_request_id IS NULL)"
        );

        if (!$stmt) {
            continue;
        }

        $stmt->bind_param("ssi", $eventId, $seatKey, $requestId);
        $stmt->execute();
        $released += max(0, (int)$stmt->affected_rows);
        $stmt->close();
    }

    return $released;
}

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    send_json(200, ["success" => true]);
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    send_json(405, [
        "success" => false,
        "message" => "נדרשת בקשת POST"
    ]);
}

$rawInput = file_get_contents("php://input");
$input = json_decode($rawInput, true);

if (!is_array($input)) {
    send_json(400, [
        "success" => false,
        "message" => "לא התקבל JSON תקין"
    ]);
}

$requestId = isset($input["request_id"]) ? (int)$input["request_id"] : 0;
$userId = isset($input["user_id"]) ? (int)$input["user_id"] : 0;
$email = trim((string)($input["email"] ?? ""));
$username = trim((string)($input["username"] ?? ""));

if ($requestId <= 0) {
    send_json(400, [
        "success" => false,
        "message" => "חסר request_id תקין"
    ]);
}

if ($userId <= 0 && $email === "" && $username === "") {
    send_json(400, [
        "success" => false,
        "message" => "חסר user_id, email או username"
    ]);
}

try {
    $conn = db_connect();

    if (!waitlist_table_exists($conn, "waitlist_requests")) {
        throw new Exception("טבלת waitlist_requests לא קיימת");
    }

    waitlist_expire_and_promote($conn);

    $conn->begin_transaction();

    $stmt = $conn->prepare(
        "SELECT
            id,
            user_id,
            email,
            username,
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
            offered_seats,
            offered_seats_count,
            queue_position,
            status,
            offer_expires_at
         FROM waitlist_requests
         WHERE id = ?
         LIMIT 1
         FOR UPDATE"
    );

    if (!$stmt) {
        throw new Exception("שגיאה בהכנת שאילתת טעינת בקשת ההמתנה: " . $conn->error);
    }

    $stmt->bind_param("i", $requestId);
    $stmt->execute();
    $result = $stmt->get_result();
    $requestRow = $result ? $result->fetch_assoc() : null;
    $stmt->close();

    if (!$requestRow) {
        throw new Exception("בקשת ההמתנה לא נמצאה");
    }

    $requestUserId = (int)($requestRow["user_id"] ?? 0);
    $requestEmail = trim((string)($requestRow["email"] ?? ""));
    $requestUsername = trim((string)($requestRow["username"] ?? ""));
    $status = trim((string)($requestRow["status"] ?? "waiting"));

    $userMatches =
        ($userId > 0 && $requestUserId > 0 && $userId === $requestUserId) ||
        ($email !== "" && $requestEmail !== "" && strcasecmp($email, $requestEmail) === 0) ||
        ($username !== "" && $requestUsername !== "" && strcasecmp($username, $requestUsername) === 0);

    if (!$userMatches) {
        throw new Exception("אין הרשאה לבטל את ההצעה הזו");
    }

    if (in_array($status, ["cancelled", "declined", "completed", "auto_purchased"], true)) {
        $conn->commit();

        send_json(200, [
            "success" => true,
            "message" => "הבקשה כבר אינה פעילה",
            "request_id" => $requestId,
            "status" => $status
        ]);
    }

    $promotionInfo = [
        "success" => false,
        "message" => "לא בוצע קידום לממתין הבא"
    ];

    $availableSeats = waitlist_normalize_seat_list($requestRow["offered_seats"] ?? "");
    $availableCount = !empty($availableSeats)
        ? count($availableSeats)
        : max(
            (int)($requestRow["offered_seats_count"] ?? 0),
            (int)($requestRow["tickets_count"] ?? 0)
        );

    if ($status === "offered") {
        $newStatus = "declined";
        $emailStatus = "declined";
        $resultText = "המשתמש ביטל את הצעת הרכישה באתר, ההצעה תועבר לממתין הבא אם קיימת התאמה";
        $clearDate = null;

        $update = $conn->prepare(
            "UPDATE waitlist_requests
             SET status = ?,
                 email_status = ?,
                 result = ?,
                 offer_expires_at = ?,
                 updated_at = NOW()
             WHERE id = ?
               AND status = 'offered'"
        );

        if (!$update) {
            throw new Exception("שגיאה בהכנת עדכון ביטול ההצעה: " . $conn->error);
        }

        $update->bind_param("ssssi", $newStatus, $emailStatus, $resultText, $clearDate, $requestId);

        if (!$update->execute()) {
            $error = $update->error;
            $update->close();
            throw new Exception("עדכון ביטול ההצעה נכשל: " . $error);
        }

        $update->close();

        if ($availableCount > 0) {
            $promotionInfo = waitlist_find_and_offer_next(
                $conn,
                (string)($requestRow["event_id"] ?? ""),
                $availableCount,
                (string)($requestRow["stand"] ?? ""),
                $availableSeats,
                "ההצעה הקודמת בוטלה באתר והועברה לממתין הבא ל-90 דקות",
                isset($requestRow["queue_position"]) ? (int)$requestRow["queue_position"] : null
            );
        }

        if (empty($promotionInfo["success"])) {
            release_waitlist_held_seats(
                $conn,
                (string)($requestRow["event_id"] ?? ""),
                $availableSeats,
                $requestId
            );
        }
    } else {
        $newStatus = "cancelled";
        $emailStatus = "cancelled";
        $resultText = "בקשת ההמתנה בוטלה על ידי המשתמש";

        $update = $conn->prepare(
            "UPDATE waitlist_requests
             SET status = ?,
                 email_status = ?,
                 result = ?,
                 updated_at = NOW()
             WHERE id = ?
               AND status <> 'completed'"
        );

        if (!$update) {
            throw new Exception("שגיאה בהכנת עדכון ביטול בקשת ההמתנה: " . $conn->error);
        }

        $update->bind_param("sssi", $newStatus, $emailStatus, $resultText, $requestId);

        if (!$update->execute()) {
            $error = $update->error;
            $update->close();
            throw new Exception("עדכון הביטול נכשל: " . $error);
        }

        $update->close();
    }

    $conn->commit();

    $message = $status === "offered"
        ? "הצעת הרכישה בוטלה בהצלחה."
        : "בקשת ההמתנה בוטלה בהצלחה.";

    if (!empty($promotionInfo["success"])) {
        $message .= " ההצעה עברה לממתין הבא בתור.";
    }

    send_json(200, [
        "success" => true,
        "message" => $message,
        "request_id" => $requestId,
        "status" => $status === "offered" ? "declined" : "cancelled",
        "promotion" => [
            "success" => !empty($promotionInfo["success"]),
            "message" => (string)($promotionInfo["message"] ?? ""),
            "offered_seats" => $promotionInfo["offered_seats"] ?? [],
            "offer_expires_at" => (string)($promotionInfo["offer_expires_at"] ?? "")
        ]
    ]);
} catch (Throwable $error) {
    if (isset($conn) && $conn instanceof mysqli) {
        try {
            $conn->rollback();
        } catch (Throwable $ignored) {
        }
    }

    send_json(500, [
        "success" => false,
        "message" => "ביטול ההצעה נכשל",
        "details" => $error->getMessage()
    ]);
}
