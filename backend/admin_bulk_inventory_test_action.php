<?php
require_once __DIR__ . "/db.php";
require_once __DIR__ . "/admin_common.php";
require_once __DIR__ . "/seat_inventory_helpers.php";

function admin_bulk_inventory_counts(array $rows)
{
    $counts = [];

    foreach ($rows as $row) {
        $status = trim((string)($row["status"] ?? ""));
        if ($status === "") {
            $status = "unknown";
        }

        if (!isset($counts[$status])) {
            $counts[$status] = 0;
        }

        $counts[$status]++;
    }

    return $counts;
}

function admin_normalize_bulk_stand_codes($standCodes)
{
    $default = ["VIP", "W", "E", "F"];

    if (!is_array($standCodes) || count($standCodes) === 0) {
        return $default;
    }

    $normalized = [];

    foreach ($standCodes as $standCode) {
        $value = seat_inventory_normalize_stand($standCode);
        if ($value !== "") {
            $normalized[$value] = $value;
        }
    }

    if (count($normalized) === 0) {
        return $default;
    }

    return array_values($normalized);
}

function admin_build_bulk_test_seats(array $standCodes, $rowsPerStand = 2, $seatsPerRow = 6)
{
    $seatRefs = [];

    foreach ($standCodes as $standCode) {
        for ($row = 1; $row <= $rowsPerStand; $row++) {
            for ($seat = 1; $seat <= $seatsPerRow; $seat++) {
                $seatRefs[] = [
                    "section" => $standCode,
                    "row" => $row,
                    "seat" => $seat,
                    "label" => "יציע {$standCode} | שורה {$row} | כיסא {$seat}",
                ];
            }
        }
    }

    return $seatRefs;
}

try {
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        admin_send_json(405, [
            "success" => false,
            "message" => "יש להשתמש ב-POST בלבד"
        ]);
    }

    $input = admin_read_json_body();

    $eventId = trim((string)($input["event_id"] ?? ""));
    $action = trim((string)($input["action"] ?? ""));
    $standCodes = admin_normalize_bulk_stand_codes($input["stand_codes"] ?? []);

    if ($eventId === "") {
        admin_send_json(422, [
            "success" => false,
            "message" => "חסר event_id"
        ]);
    }

    if (!in_array($action, ["mark_all_sold", "mark_all_available"], true)) {
        admin_send_json(422, [
            "success" => false,
            "message" => "action חייב להיות mark_all_sold או mark_all_available"
        ]);
    }

    $conn = db_connect();
    ensure_event_seat_inventory_table($conn);

    $seatRefs = admin_build_bulk_test_seats($standCodes, 2, 6);
    $status = $action === "mark_all_sold" ? "sold" : "available";
    $lastAction = $action === "mark_all_sold"
        ? "admin_test_mark_all_sold"
        : "admin_test_mark_all_available";

    seat_inventory_set_status(
        $conn,
        $eventId,
        $seatRefs,
        $status,
        [
            "last_action" => $lastAction
        ]
    );

    $inventoryRows = seat_inventory_get_event_overrides($conn, $eventId);

    admin_send_json(200, [
        "success" => true,
        "message" => $action === "mark_all_sold"
            ? "כל מושבי הבדיקה של האירוע סומנו כמכורים"
            : "כל מושבי הבדיקה של האירוע סומנו כזמינים",
        "event_id" => $eventId,
        "applied_action" => $action,
        "stand_codes" => $standCodes,
        "inventory_counts" => admin_bulk_inventory_counts($inventoryRows),
        "inventory_rows" => $inventoryRows
    ]);
} catch (Throwable $error) {
    admin_send_json(500, [
        "success" => false,
        "message" => "פעולת בדיקת מלאי נכשלה",
        "details" => $error->getMessage()
    ]);
}