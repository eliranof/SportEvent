<?php
require_once __DIR__ . "/db.php";
require_once __DIR__ . "/admin_common.php";
require_once __DIR__ . "/seat_inventory_helpers.php";

function admin_build_single_seat_label($standCode, $rowNumber, $seatNumber)
{
    $standCode = seat_inventory_normalize_stand($standCode);
    return $standCode . "-" . (int)$rowNumber . "-" . (int)$seatNumber;
}

function admin_inventory_counts(array $rows)
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

try {
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        admin_send_json(405, [
            "success" => false,
            "message" => "יש להשתמש ב-POST בלבד"
        ]);
    }

    $input = admin_read_json_body();

    $eventId = trim((string)($input["event_id"] ?? ""));
    $standCode = trim((string)($input["stand_code"] ?? ""));
    $rowNumber = (int)($input["row_number"] ?? 0);
    $seatNumber = (int)($input["seat_number"] ?? 0);
    $status = trim((string)($input["status"] ?? ""));

    if ($eventId === "" || $standCode === "" || $rowNumber <= 0 || $seatNumber <= 0) {
        admin_send_json(422, [
            "success" => false,
            "message" => "יש למלא event_id, stand_code, row_number, seat_number"
        ]);
    }

    if (!in_array($status, ["available", "sold"], true)) {
        admin_send_json(422, [
            "success" => false,
            "message" => "status חייב להיות available או sold"
        ]);
    }

    $conn = db_connect();

    $seatReference = admin_build_single_seat_label($standCode, $rowNumber, $seatNumber);

    seat_inventory_set_status(
        $conn,
        $eventId,
        [$seatReference],
        $status,
        [
            "last_action" => "admin_manual_update"
        ]
    );

    $inventoryRows = seat_inventory_get_event_overrides($conn, $eventId);

    admin_send_json(200, [
        "success" => true,
        "message" => "מלאי המושב עודכן בהצלחה",
        "event_id" => $eventId,
        "inventory_counts" => admin_inventory_counts($inventoryRows),
        "inventory_rows" => $inventoryRows
    ]);
} catch (Throwable $error) {
    admin_send_json(500, [
        "success" => false,
        "message" => "עדכון מלאי מושב נכשל",
        "details" => $error->getMessage()
    ]);
}