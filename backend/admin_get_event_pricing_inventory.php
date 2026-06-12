<?php
require_once __DIR__ . "/db.php";
require_once __DIR__ . "/admin_common.php";
require_once __DIR__ . "/seat_inventory_helpers.php";
require_once __DIR__ . "/event_dynamic_pricing_helpers.php";

function build_inventory_counts(array $rows)
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
    if ($_SERVER["REQUEST_METHOD"] !== "GET") {
        admin_send_json(405, [
            "success" => false,
            "message" => "יש להשתמש ב-GET בלבד"
        ]);
    }

    $eventId = trim((string)($_GET["event_id"] ?? ""));

    if ($eventId === "") {
        admin_send_json(422, [
            "success" => false,
            "message" => "חובה לשלוח event_id"
        ]);
    }

    $conn = db_connect();

    $pricingRows = dynamic_pricing_get_rows($conn, $eventId);
    $inventoryRows = seat_inventory_get_event_overrides($conn, $eventId);

    admin_send_json(200, [
        "success" => true,
        "event_id" => $eventId,
        "pricing_rows" => $pricingRows,
        "inventory_rows" => $inventoryRows,
        "inventory_counts" => build_inventory_counts($inventoryRows)
    ]);
} catch (Throwable $error) {
    admin_send_json(500, [
        "success" => false,
        "message" => "טעינת נתוני תמחור ומלאי נכשלה",
        "details" => $error->getMessage()
    ]);
}