<?php
ini_set("display_errors", 0);
error_reporting(E_ALL);
ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
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

function table_exists($conn, $tableName)
{
    $safeTable = $conn->real_escape_string($tableName);
    $result = $conn->query("SHOW TABLES LIKE '{$safeTable}'");
    return $result && $result->num_rows > 0;
}

function column_exists($conn, $tableName, $columnName)
{
    $safeTable = $conn->real_escape_string($tableName);
    $safeColumn = $conn->real_escape_string($columnName);
    $result = $conn->query("SHOW COLUMNS FROM `{$safeTable}` LIKE '{$safeColumn}'");
    return $result && $result->num_rows > 0;
}

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    send_json(200, ["success" => true]);
}

try {
    $conn = db_connect();
    $conn->begin_transaction();

    $deletedWaitlistRequests = 0;
    $deletedWaitlistOrders = 0;
    $releasedSeats = 0;

    if (table_exists($conn, "event_seat_inventory")) {
        $whereParts = [
            "status IN ('held_waitlist', 'waitlist_hold', 'offered_waitlist')"
        ];

        if (column_exists($conn, "event_seat_inventory", "source_waitlist_request_id")) {
            $whereParts[] = "source_waitlist_request_id IS NOT NULL";
        }

        $sql = "
            UPDATE event_seat_inventory
            SET status = 'available',
                source_waitlist_request_id = NULL,
                last_action = 'waitlist_reset',
                updated_at = NOW()
            WHERE " . implode(" OR ", $whereParts);

        $conn->query($sql);
        $releasedSeats = $conn->affected_rows;
    }

    if (table_exists($conn, "orders")) {
        $orderWhereParts = [];

        if (column_exists($conn, "orders", "purchase_source")) {
            $orderWhereParts[] = "purchase_source = 'waitlist'";
        }

        if (column_exists($conn, "orders", "waitlist_request_id")) {
            $orderWhereParts[] = "waitlist_request_id IS NOT NULL";
        }

        if (!empty($orderWhereParts)) {
            $sql = "DELETE FROM orders WHERE " . implode(" OR ", $orderWhereParts);
            $conn->query($sql);
            $deletedWaitlistOrders = $conn->affected_rows;
        }
    }

    if (table_exists($conn, "waitlist_requests")) {
        $conn->query("DELETE FROM waitlist_requests");
        $deletedWaitlistRequests = $conn->affected_rows;
        $conn->query("ALTER TABLE waitlist_requests AUTO_INCREMENT = 1");
    }

    $conn->commit();

    send_json(200, [
        "success" => true,
        "message" => "כל רשימות ההמתנה אופסו בהצלחה",
        "deleted_waitlist_requests" => $deletedWaitlistRequests,
        "deleted_waitlist_orders" => $deletedWaitlistOrders,
        "released_waitlist_seats" => $releasedSeats
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
        "message" => "איפוס רשימות ההמתנה נכשל",
        "details" => $error->getMessage()
    ]);
}
