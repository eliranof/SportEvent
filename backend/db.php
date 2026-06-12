<?php
date_default_timezone_set("Asia/Jerusalem");

function db_connect()
{
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

    $host = "127.0.0.1";
    $port = 3306;
    $dbName = "sportevent";
    $dbUser = "root";
    $dbPass = "";

    $conn = new mysqli($host, $dbUser, $dbPass, $dbName, $port);
    $conn->set_charset("utf8mb4");
    $conn->query("SET time_zone = '+03:00'");

    return $conn;
}

try {
    $conn = db_connect();
} catch (Throwable $error) {
    $conn = null;
}
?>