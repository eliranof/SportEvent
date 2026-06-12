<?php
ini_set("display_errors", 0);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}

function admin_send_json($statusCode, $data)
{
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

function admin_read_json_body()
{
    $raw = file_get_contents("php://input");
    if (!$raw) {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function admin_allowed_buckets()
{
    return [
        "near",
        "sold_out",
        "israel",
        "world",
        "featured",
        "tennis_must_see",
        "final_four",
        "world_cup"
    ];
}

function admin_build_payload(array $input, array $existingPayload = [])
{
    $payload = $existingPayload;

    $payload["id"] = trim((string)($input["event_id"] ?? ($payload["id"] ?? "")));
    $payload["sectionTitle"] = trim((string)($input["section_title"] ?? ($payload["sectionTitle"] ?? "")));
    $payload["title"] = trim((string)($input["title"] ?? ($payload["title"] ?? "")));
    $payload["teams"] = trim((string)($input["teams"] ?? ($payload["teams"] ?? "")));
    $payload["competition"] = trim((string)($input["competition"] ?? ($payload["competition"] ?? "")));
    $payload["category"] = trim((string)($input["category"] ?? ($payload["category"] ?? "")));
    $payload["location"] = trim((string)($input["location"] ?? ($payload["location"] ?? "")));
    $payload["dateTime"] = trim((string)($input["date_time"] ?? ($payload["dateTime"] ?? "")));
    $payload["price"] = trim((string)($input["price"] ?? ($payload["price"] ?? "")));

    if (isset($input["badge"])) {
        $payload["badge"] = trim((string)$input["badge"]);
    }

    if (isset($input["subtitle"])) {
        $payload["subtitle"] = trim((string)$input["subtitle"]);
    }

    if (isset($input["round"])) {
        $payload["round"] = trim((string)$input["round"]);
    }

    if (isset($input["homeTeam"])) {
        $payload["homeTeam"] = trim((string)$input["homeTeam"]);
    }

    if (isset($input["awayTeam"])) {
        $payload["awayTeam"] = trim((string)$input["awayTeam"]);
    }

    if (isset($input["homeImage"])) {
        $payload["homeImage"] = trim((string)$input["homeImage"]);
    }

    if (isset($input["awayImage"])) {
        $payload["awayImage"] = trim((string)$input["awayImage"]);
    }

    if (isset($input["homeLogoText"])) {
        $payload["homeLogoText"] = trim((string)$input["homeLogoText"]);
    }

    if (isset($input["awayLogoText"])) {
        $payload["awayLogoText"] = trim((string)$input["awayLogoText"]);
    }

    if (isset($input["homeLogoBg"])) {
        $payload["homeLogoBg"] = trim((string)$input["homeLogoBg"]);
    }

    if (isset($input["awayLogoBg"])) {
        $payload["awayLogoBg"] = trim((string)$input["awayLogoBg"]);
    }

    if (isset($input["homeLogoColor"])) {
        $payload["homeLogoColor"] = trim((string)$input["homeLogoColor"]);
    }

    if (isset($input["awayLogoColor"])) {
        $payload["awayLogoColor"] = trim((string)$input["awayLogoColor"]);
    }

    if (!empty($input["payload_json"]) && is_string($input["payload_json"])) {
        $manualPayload = json_decode($input["payload_json"], true);
        if (is_array($manualPayload)) {
            $payload = array_merge($payload, $manualPayload);
            $payload["id"] = trim((string)($input["event_id"] ?? ($payload["id"] ?? "")));
        }
    }

    return $payload;
}