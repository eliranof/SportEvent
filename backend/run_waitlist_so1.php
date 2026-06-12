<?php
header("Content-Type: text/plain; charset=UTF-8");

$url = "http://127.0.0.1/sportevent-api/process_waitlist_offers.php";

$payload = json_encode([
    "event_id" => "so-1"
], JSON_UNESCAPED_UNICODE);

$options = [
    "http" => [
        "method" => "POST",
        "header" => "Content-Type: application/json\r\n" .
                    "Content-Length: " . strlen($payload) . "\r\n",
        "content" => $payload,
        "ignore_errors" => true
    ]
];

$context = stream_context_create($options);
$response = file_get_contents($url, false, $context);

if ($response === false) {
    echo "הקריאה ל-process_waitlist_offers.php נכשלה";
    exit;
}

echo $response;
?>