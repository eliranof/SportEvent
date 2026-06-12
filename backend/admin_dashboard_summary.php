<?php
require_once __DIR__ . "/db.php";
require_once __DIR__ . "/admin_common.php";
require_once __DIR__ . "/order_helpers.php";

function admin_table_exists($conn, $tableName)
{
    $safeTable = $conn->real_escape_string((string)$tableName);
    $sql = "SHOW TABLES LIKE '{$safeTable}'";
    $result = $conn->query($sql);

    return $result && $result->num_rows > 0;
}

function admin_column_exists($conn, $tableName, $columnName)
{
    $safeTable = $conn->real_escape_string((string)$tableName);
    $safeColumn = $conn->real_escape_string((string)$columnName);

    $sql = "SHOW COLUMNS FROM `{$safeTable}` LIKE '{$safeColumn}'";
    $result = $conn->query($sql);

    return $result && $result->num_rows > 0;
}

function admin_fetch_all_assoc($conn, $sql)
{
    $result = $conn->query($sql);

    if (!$result) {
        throw new Exception("Query failed: " . $conn->error);
    }

    $rows = [];

    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }

    return $rows;
}

function admin_normalize_status_key($value)
{
    $text = trim((string)$value);

    return $text !== "" ? $text : "unknown";
}

function admin_get_filter_range()
{
    $year = isset($_GET["year"]) ? (int)$_GET["year"] : 0;
    $month = isset($_GET["month"]) ? (int)$_GET["month"] : 0;

    if ($year < 2000 || $year > 2100) {
        return [
            "active" => false,
            "year" => "",
            "month" => "",
            "start" => "",
            "end" => "",
            "label" => "כל הנתונים",
        ];
    }

    if ($month >= 1 && $month <= 12) {
        $start = sprintf("%04d-%02d-01 00:00:00", $year, $month);
        $endTimestamp = strtotime($start . " +1 month");
        $end = date("Y-m-d H:i:s", $endTimestamp);

        $monthNames = [
            1 => "ינואר",
            2 => "פברואר",
            3 => "מרץ",
            4 => "אפריל",
            5 => "מאי",
            6 => "יוני",
            7 => "יולי",
            8 => "אוגוסט",
            9 => "ספטמבר",
            10 => "אוקטובר",
            11 => "נובמבר",
            12 => "דצמבר",
        ];

        return [
            "active" => true,
            "year" => (string)$year,
            "month" => (string)$month,
            "start" => $start,
            "end" => $end,
            "label" => $monthNames[$month] . " " . $year,
        ];
    }

    $start = sprintf("%04d-01-01 00:00:00", $year);
    $end = sprintf("%04d-01-01 00:00:00", $year + 1);

    return [
        "active" => true,
        "year" => (string)$year,
        "month" => "all",
        "start" => $start,
        "end" => $end,
        "label" => "כל חודשי " . $year,
    ];
}

function admin_build_date_expr($conn, $tableName, $columns)
{
    $existingColumns = [];

    foreach ($columns as $columnName) {
        if (admin_column_exists($conn, $tableName, $columnName)) {
            $existingColumns[] = "NULLIF(`{$columnName}`, '')";
        }
    }

    if (empty($existingColumns)) {
        return "";
    }

    if (count($existingColumns) === 1) {
        return $existingColumns[0];
    }

    return "COALESCE(" . implode(", ", $existingColumns) . ")";
}

function admin_build_date_where($conn, $tableName, $columns, $filterRange)
{
    if (empty($filterRange["active"])) {
        return "";
    }

    $dateExpr = admin_build_date_expr($conn, $tableName, $columns);

    if ($dateExpr === "") {
        return "";
    }

    $start = $conn->real_escape_string($filterRange["start"]);
    $end = $conn->real_escape_string($filterRange["end"]);

    return " AND {$dateExpr} >= '{$start}' AND {$dateExpr} < '{$end}' ";
}

try {
    $conn = db_connect();
    ensure_orders_table($conn);
    expire_pending_orders($conn);

    $filterRange = admin_get_filter_range();

    $summary = [
        "filter" => [
            "year" => $filterRange["year"],
            "month" => $filterRange["month"],
            "start" => $filterRange["start"],
            "end" => $filterRange["end"],
            "label" => $filterRange["label"],
        ],
        "orders_total" => 0,
        "paid_orders" => 0,
        "pending_orders" => 0,
        "cancelled_orders" => 0,
        "expired_orders" => 0,
        "gross_revenue" => 0.0,
        "gross_revenue_label" => "0 ₪",
        "refund_total" => 0.0,
        "refund_total_label" => "0 ₪",
        "waitlist_total" => 0,
        "waitlist_status_counts" => [],
        "seat_inventory_total" => 0,
        "seat_status_counts" => [],
        "recent_orders" => [],
        "top_events" => [],
    ];

    $recentOrders = [];
    $topEventsMap = [];

    if (admin_table_exists($conn, "orders")) {
        $ordersWhere = " WHERE 1 = 1 ";
        $ordersWhere .= admin_build_date_where(
            $conn,
            "orders",
            ["purchase_date", "created_at"],
            $filterRange
        );

        $orders = admin_fetch_all_assoc($conn, "
            SELECT
                id,
                order_code,
                event_id,
                event_name,
                username,
                email,
                tickets_count,
                price,
                status,
                payment_method,
                purchase_source,
                purchase_date,
                created_at,
                refund_amount
            FROM orders
            {$ordersWhere}
            ORDER BY id DESC
        ");

        $summary["orders_total"] = count($orders);

        foreach ($orders as $index => $order) {
            $status = trim((string)($order["status"] ?? ""));
            $priceText = (string)($order["price"] ?? "");
            $refundText = (string)($order["refund_amount"] ?? "");

            if ($status === "paid" || $status === "הוזמן בהצלחה") {
                $summary["paid_orders"]++;
                $summary["gross_revenue"] += order_extract_numeric_amount($priceText);

                $eventKey = (string)($order["event_id"] ?: $order["event_name"]);

                if (!isset($topEventsMap[$eventKey])) {
                    $topEventsMap[$eventKey] = [
                        "event_id" => (string)($order["event_id"] ?? ""),
                        "event_name" => (string)($order["event_name"] ?? ""),
                        "tickets_sold" => 0,
                        "orders_count" => 0,
                        "revenue" => 0.0,
                        "revenue_label_source" => $priceText,
                    ];
                }

                $topEventsMap[$eventKey]["tickets_sold"] += (int)($order["tickets_count"] ?? 0);
                $topEventsMap[$eventKey]["orders_count"] += 1;
                $topEventsMap[$eventKey]["revenue"] += order_extract_numeric_amount($priceText);
            } elseif ($status === "pending_payment") {
                $summary["pending_orders"]++;
            } elseif ($status === "cancelled") {
                $summary["cancelled_orders"]++;
                $summary["refund_total"] += order_extract_numeric_amount($refundText);
            } elseif ($status === "expired") {
                $summary["expired_orders"]++;
            }

            if ($index < 10) {
                $recentOrders[] = [
                    "id" => (int)$order["id"],
                    "order_code" => (string)$order["order_code"],
                    "event_name" => (string)$order["event_name"],
                    "username" => (string)($order["username"] ?: $order["email"]),
                    "tickets_count" => (int)($order["tickets_count"] ?? 0),
                    "price" => (string)$order["price"],
                    "status" => (string)$status,
                    "status_label" => order_status_label($status),
                    "payment_method" => (string)$order["payment_method"],
                    "purchase_source" => (string)$order["purchase_source"],
                    "purchase_date" => (string)($order["purchase_date"] ?: $order["created_at"]),
                ];
            }
        }
    }

    if (admin_table_exists($conn, "waitlist_requests")) {
        $waitlistWhere = " WHERE 1 = 1 ";
        $waitlistWhere .= admin_build_date_where(
            $conn,
            "waitlist_requests",
            ["created_at", "updated_at"],
            $filterRange
        );

        $waitlistRows = admin_fetch_all_assoc($conn, "
            SELECT status, COUNT(*) AS total
            FROM waitlist_requests
            {$waitlistWhere}
            GROUP BY status
            ORDER BY total DESC, status ASC
        ");

        $waitlistTotal = 0;
        $waitlistStatusCounts = [];

        foreach ($waitlistRows as $row) {
            $statusKey = admin_normalize_status_key($row["status"] ?? "");
            $count = (int)($row["total"] ?? 0);

            $waitlistStatusCounts[$statusKey] = $count;
            $waitlistTotal += $count;
        }

        $summary["waitlist_total"] = $waitlistTotal;
        $summary["waitlist_status_counts"] = $waitlistStatusCounts;
    }

    if (admin_table_exists($conn, "event_seat_inventory")) {
        $seatWhere = " WHERE 1 = 1 ";
        $seatWhere .= admin_build_date_where(
            $conn,
            "event_seat_inventory",
            ["updated_at", "created_at"],
            $filterRange
        );

        $seatRows = admin_fetch_all_assoc($conn, "
            SELECT status, COUNT(*) AS total
            FROM event_seat_inventory
            {$seatWhere}
            GROUP BY status
            ORDER BY total DESC, status ASC
        ");

        $seatTotal = 0;
        $seatStatusCounts = [];

        foreach ($seatRows as $row) {
            $statusKey = admin_normalize_status_key($row["status"] ?? "");
            $count = (int)($row["total"] ?? 0);

            $seatStatusCounts[$statusKey] = $count;
            $seatTotal += $count;
        }

        $summary["seat_inventory_total"] = $seatTotal;
        $summary["seat_status_counts"] = $seatStatusCounts;
    }

    $topEvents = array_values($topEventsMap);

    usort($topEvents, function ($a, $b) {
        if ($a["tickets_sold"] === $b["tickets_sold"]) {
            return $b["revenue"] <=> $a["revenue"];
        }

        return $b["tickets_sold"] <=> $a["tickets_sold"];
    });

    $topEvents = array_slice($topEvents, 0, 8);

    foreach ($topEvents as &$eventRow) {
        $eventRow["revenue_label"] = order_format_amount_with_currency(
            $eventRow["revenue"],
            $eventRow["revenue_label_source"]
        );

        unset($eventRow["revenue_label_source"]);
    }

    unset($eventRow);

    $summary["gross_revenue_label"] = order_format_amount_with_currency(
        $summary["gross_revenue"],
        "₪"
    );

    $summary["refund_total_label"] = order_format_amount_with_currency(
        $summary["refund_total"],
        "₪"
    );

    $summary["recent_orders"] = $recentOrders;
    $summary["top_events"] = $topEvents;

    admin_send_json(200, [
        "success" => true,
        "summary" => $summary
    ]);
} catch (Throwable $error) {
    admin_send_json(500, [
        "success" => false,
        "message" => "טעינת דשבורד נכשלה",
        "details" => $error->getMessage()
    ]);
}