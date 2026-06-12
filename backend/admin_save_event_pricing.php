<?php
require_once __DIR__ . "/db.php";
require_once __DIR__ . "/admin_common.php";
require_once __DIR__ . "/event_dynamic_pricing_helpers.php";

try {
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        admin_send_json(405, [
            "success" => false,
            "message" => "יש להשתמש ב-POST בלבד"
        ]);
    }

    $input = admin_read_json_body();

    $eventId = trim((string)($input["event_id"] ?? ""));
    $pricingRows = isset($input["pricing_rows"]) && is_array($input["pricing_rows"])
        ? $input["pricing_rows"]
        : [];

    if ($eventId === "") {
        admin_send_json(422, [
            "success" => false,
            "message" => "חובה למלא event_id"
        ]);
    }

    if (empty($pricingRows)) {
        admin_send_json(422, [
            "success" => false,
            "message" => "חובה לשלוח pricing_rows"
        ]);
    }

    $conn = db_connect();
    ensure_event_dynamic_pricing_table($conn);

    foreach ($pricingRows as $row) {
        $standCode = trim((string)($row["stand_code"] ?? ""));
        $displayName = trim((string)($row["display_name"] ?? ""));
        $priceAmount = (float)($row["price_amount"] ?? 0);

        if ($standCode === "" || $priceAmount <= 0) {
            continue;
        }

        dynamic_pricing_upsert(
            $conn,
            $eventId,
            $standCode,
            $displayName,
            $priceAmount,
            trim((string)($row["price_label"] ?? ""))
        );
    }

    admin_send_json(200, [
        "success" => true,
        "message" => "התמחור נשמר בהצלחה",
        "pricing_rows" => dynamic_pricing_get_rows($conn, $eventId)
    ]);
} catch (Throwable $error) {
    admin_send_json(500, [
        "success" => false,
        "message" => "שמירת תמחור נכשלה",
        "details" => $error->getMessage()
    ]);
}