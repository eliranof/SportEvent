<?php
ini_set("display_errors", 0);
error_reporting(E_ALL);
ob_start();

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/db.php";
require_once __DIR__ . "/event_catalog_helpers.php";

function send_json($statusCode, $data)
{
    if (ob_get_length()) {
        ob_clean();
    }

    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

try {
    $conn = db_connect();
    event_catalog_ensure_table($conn);

    $sql = "
        SELECT
            id,
            event_id,
            bucket_key,
            section_title,
            title,
            competition,
            category,
            location,
            date_time,
            price,
            sort_order,
            payload_json
        FROM events_catalog
        WHERE is_active = 1
        ORDER BY bucket_key ASC, sort_order ASC, id ASC
    ";

    $result = $conn->query($sql);
    if (!$result) {
        throw new Exception("Query failed: " . $conn->error);
    }

    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }

    $buckets = event_catalog_build_buckets_from_rows($rows);

    send_json(200, [
        "success" => true,
        "count" => count($rows),
        "buckets" => $buckets
    ]);
} catch (Throwable $error) {
    send_json(500, [
        "success" => false,
        "message" => "טעינת אירועים נכשלה",
        "details" => $error->getMessage()
    ]);
}