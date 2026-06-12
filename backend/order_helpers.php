<?php

function order_column_exists($conn, $tableName, $columnName)
{
    $table = $conn->real_escape_string($tableName);
    $column = $conn->real_escape_string($columnName);
    $sql = "SHOW COLUMNS FROM `{$table}` LIKE '{$column}'";
    $result = $conn->query($sql);
    return $result && $result->num_rows > 0;
}

function ensure_orders_table($conn)
{
    $createSql = "
        CREATE TABLE IF NOT EXISTS orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_code VARCHAR(50) NOT NULL,
            user_id INT NOT NULL,
            username VARCHAR(100) NOT NULL,
            email VARCHAR(255) NOT NULL,
            full_name VARCHAR(255) DEFAULT '',
            event_id VARCHAR(100) NOT NULL,
            event_name VARCHAR(255) NOT NULL,
            location VARCHAR(255) DEFAULT '',
            date_time VARCHAR(255) DEFAULT '',
            category VARCHAR(100) DEFAULT '',
            competition VARCHAR(255) DEFAULT '',
            tickets_count INT NOT NULL DEFAULT 1,
            selected_seats TEXT,
            price VARCHAR(100) DEFAULT '',
            package_title VARCHAR(255) DEFAULT '',
            hotel_name VARCHAR(255) DEFAULT '',
            hotel_stars VARCHAR(50) DEFAULT '',
            room_type VARCHAR(255) DEFAULT '',
            flight_label VARCHAR(255) DEFAULT '',
            airline VARCHAR(255) DEFAULT '',
            outbound_flight VARCHAR(255) DEFAULT '',
            return_flight VARCHAR(255) DEFAULT '',
            nights VARCHAR(50) DEFAULT '',
            status VARCHAR(50) NOT NULL DEFAULT 'pending_payment',
            payment_method VARCHAR(50) DEFAULT '',
            installments_count INT NOT NULL DEFAULT 1,
            hold_expires_at DATETIME NULL,
            ticket_code VARCHAR(100) DEFAULT '',
            qr_value TEXT,
            purchase_source VARCHAR(50) DEFAULT 'regular',
            waitlist_request_id INT NULL,
            hold_key VARCHAR(191) DEFAULT NULL,
            purchase_date DATETIME NULL,
            cancelled_at DATETIME NULL,
            cancel_fee_amount VARCHAR(100) DEFAULT '',
            refund_amount VARCHAR(100) DEFAULT '',
            cancellation_window_label VARCHAR(255) DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_orders_user (user_id),
            INDEX idx_orders_event (event_id),
            INDEX idx_orders_code (order_code),
            INDEX idx_orders_status (status),
            INDEX idx_orders_hold_key (hold_key),
            INDEX idx_orders_waitlist_request (waitlist_request_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ";

    if (!$conn->query($createSql)) {
        throw new Exception("לא ניתן ליצור או לאמת את טבלת orders: " . $conn->error);
    }

    $columnsToAdd = [
        "payment_method" => "ALTER TABLE orders ADD COLUMN payment_method VARCHAR(50) DEFAULT '' AFTER status",
        "installments_count" => "ALTER TABLE orders ADD COLUMN installments_count INT NOT NULL DEFAULT 1 AFTER payment_method",
        "hold_expires_at" => "ALTER TABLE orders ADD COLUMN hold_expires_at DATETIME NULL AFTER installments_count",
        "ticket_code" => "ALTER TABLE orders ADD COLUMN ticket_code VARCHAR(100) DEFAULT '' AFTER hold_expires_at",
        "qr_value" => "ALTER TABLE orders ADD COLUMN qr_value TEXT NULL AFTER ticket_code",
        "purchase_source" => "ALTER TABLE orders ADD COLUMN purchase_source VARCHAR(50) DEFAULT 'regular' AFTER qr_value",
        "waitlist_request_id" => "ALTER TABLE orders ADD COLUMN waitlist_request_id INT NULL AFTER purchase_source",
        "hold_key" => "ALTER TABLE orders ADD COLUMN hold_key VARCHAR(191) DEFAULT NULL AFTER waitlist_request_id",
        "purchase_date" => "ALTER TABLE orders MODIFY COLUMN purchase_date DATETIME NULL",
        "cancelled_at" => "ALTER TABLE orders ADD COLUMN cancelled_at DATETIME NULL AFTER purchase_date",
        "cancel_fee_amount" => "ALTER TABLE orders ADD COLUMN cancel_fee_amount VARCHAR(100) DEFAULT '' AFTER cancelled_at",
        "refund_amount" => "ALTER TABLE orders ADD COLUMN refund_amount VARCHAR(100) DEFAULT '' AFTER cancel_fee_amount",
        "cancellation_window_label" => "ALTER TABLE orders ADD COLUMN cancellation_window_label VARCHAR(255) DEFAULT '' AFTER refund_amount",
    ];

    foreach ($columnsToAdd as $columnName => $sql) {
        if ($columnName === "purchase_date") {
            $conn->query($sql);
            continue;
        }

        if (!order_column_exists($conn, "orders", $columnName)) {
            $conn->query($sql);
        }
    }
}

function expire_pending_orders($conn)
{
    $sql = "
        UPDATE orders
        SET status = 'expired',
            updated_at = NOW()
        WHERE status = 'pending_payment'
          AND hold_expires_at IS NOT NULL
          AND hold_expires_at <= NOW()
    ";

    $conn->query($sql);
}

function order_random_suffix()
{
    return (string)random_int(1000, 9999);
}

function create_order_code()
{
    return "ORD-" . date("Ymd-His") . "-" . order_random_suffix();
}

function create_ticket_code($orderId)
{
    return "SE-" . date("Ymd") . "-" . (int)$orderId . "-" . order_random_suffix();
}

function normalize_text_value($value)
{
    if ($value === null) {
        return "";
    }

    return trim((string)$value);
}

function normalize_selected_seats_text($value)
{
    if (is_array($value)) {
        $items = array_map("normalize_text_value", $value);
        $items = array_values(array_filter($items, function ($item) {
            return $item !== "";
        }));
        return implode(" | ", $items);
    }

    return normalize_text_value($value);
}

function build_default_hold_key($payload)
{
    $base = implode("|", [
        normalize_text_value($payload["purchase_source"] ?? "regular"),
        normalize_text_value($payload["user_id"] ?? "0"),
        normalize_text_value($payload["event_id"] ?? ""),
        normalize_text_value($payload["selected_seats"] ?? ""),
        normalize_text_value($payload["package_title"] ?? ""),
        normalize_text_value($payload["waitlist_request_id"] ?? ""),
    ]);

    return sha1($base);
}

function find_active_order_by_hold_key($conn, $holdKey)
{
    $sql = "
        SELECT *
        FROM orders
        WHERE hold_key = ?
          AND status = 'pending_payment'
          AND (hold_expires_at IS NULL OR hold_expires_at > NOW())
        ORDER BY id DESC
        LIMIT 1
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("שגיאה בהכנת שאילתת חיפוש hold_key: " . $conn->error);
    }

    $stmt->bind_param("s", $holdKey);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result ? $result->fetch_assoc() : null;
    $stmt->close();

    return $row;
}

function get_order_by_id($conn, $orderId)
{
    $sql = "SELECT * FROM orders WHERE id = ? LIMIT 1";
    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        throw new Exception("שגיאה בהכנת שאילתת טעינת הזמנה: " . $conn->error);
    }

    $stmt->bind_param("i", $orderId);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result ? $result->fetch_assoc() : null;
    $stmt->close();

    return $row;
}

function create_temporary_order($conn, $payload)
{
    ensure_orders_table($conn);
    expire_pending_orders($conn);

    $userId = (int)($payload["user_id"] ?? 0);
    $username = normalize_text_value($payload["username"] ?? "");
    $email = normalize_text_value($payload["email"] ?? "");
    $fullName = normalize_text_value($payload["full_name"] ?? "");
    $eventId = normalize_text_value($payload["event_id"] ?? "");
    $eventName = normalize_text_value($payload["event_name"] ?? "");
    $location = normalize_text_value($payload["location"] ?? "");
    $dateTime = normalize_text_value($payload["date_time"] ?? "");
    $category = normalize_text_value($payload["category"] ?? "");
    $competition = normalize_text_value($payload["competition"] ?? "");
    $ticketsCount = (int)($payload["tickets_count"] ?? 1);
    $selectedSeats = normalize_selected_seats_text($payload["selected_seats"] ?? "");
    $price = normalize_text_value($payload["price"] ?? "");
    $packageTitle = normalize_text_value($payload["package_title"] ?? "");
    $hotelName = normalize_text_value($payload["hotel_name"] ?? "");
    $hotelStars = normalize_text_value($payload["hotel_stars"] ?? "");
    $roomType = normalize_text_value($payload["room_type"] ?? "");
    $flightLabel = normalize_text_value($payload["flight_label"] ?? "");
    $airline = normalize_text_value($payload["airline"] ?? "");
    $outboundFlight = normalize_text_value($payload["outbound_flight"] ?? "");
    $returnFlight = normalize_text_value($payload["return_flight"] ?? "");
    $nights = normalize_text_value($payload["nights"] ?? "");
    $purchaseSource = normalize_text_value($payload["purchase_source"] ?? "regular");
    $waitlistRequestId = isset($payload["waitlist_request_id"]) ? (int)$payload["waitlist_request_id"] : null;
    $holdKey = normalize_text_value($payload["hold_key"] ?? "");
    $holdExpiresAt = normalize_text_value($payload["hold_expires_at"] ?? "");

    if ($userId <= 0) {
        throw new Exception("מזהה משתמש לא תקין");
    }

    if ($eventId === "" || $eventName === "") {
        throw new Exception("חסרים פרטי אירוע חובה");
    }

    if ($ticketsCount <= 0) {
        $ticketsCount = 1;
    }

    if ($holdKey === "") {
        $holdKey = build_default_hold_key([
            "purchase_source" => $purchaseSource,
            "user_id" => $userId,
            "event_id" => $eventId,
            "selected_seats" => $selectedSeats,
            "package_title" => $packageTitle,
            "waitlist_request_id" => $waitlistRequestId,
        ]);
    }

    if ($holdExpiresAt === "") {
        $holdExpiresAt = date("Y-m-d H:i:s", strtotime("+15 minutes"));
    }

    $existing = find_active_order_by_hold_key($conn, $holdKey);
    if ($existing) {
        return [
            "success" => true,
            "created" => false,
            "order" => $existing,
        ];
    }

    $orderCode = create_order_code();
    $status = "pending_payment";

    $sql = "
        INSERT INTO orders (
            order_code,
            user_id,
            username,
            email,
            full_name,
            event_id,
            event_name,
            location,
            date_time,
            category,
            competition,
            tickets_count,
            selected_seats,
            price,
            package_title,
            hotel_name,
            hotel_stars,
            room_type,
            flight_label,
            airline,
            outbound_flight,
            return_flight,
            nights,
            status,
            payment_method,
            hold_expires_at,
            ticket_code,
            qr_value,
            purchase_source,
            waitlist_request_id,
            hold_key,
            purchase_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, '', '', ?, ?, ?, NULL)
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("שגיאה בהכנת שאילתת יצירת הזמנה זמנית: " . $conn->error);
    }

    $stmt->bind_param(
        "sisssssssssissssssssssssssis",
        $orderCode,
        $userId,
        $username,
        $email,
        $fullName,
        $eventId,
        $eventName,
        $location,
        $dateTime,
        $category,
        $competition,
        $ticketsCount,
        $selectedSeats,
        $price,
        $packageTitle,
        $hotelName,
        $hotelStars,
        $roomType,
        $flightLabel,
        $airline,
        $outboundFlight,
        $returnFlight,
        $nights,
        $status,
        $holdExpiresAt,
        $purchaseSource,
        $waitlistRequestId,
        $holdKey
    );

    if (!$stmt->execute()) {
        $error = $stmt->error;
        $stmt->close();
        throw new Exception("יצירת ההזמנה הזמנית נכשלה: " . $error);
    }

    $orderId = (int)$stmt->insert_id;
    $stmt->close();

    $createdOrder = get_order_by_id($conn, $orderId);

    return [
        "success" => true,
        "created" => true,
        "order" => $createdOrder,
    ];
}

function order_status_label($status)
{
    $normalized = normalize_text_value($status);

    if ($normalized === "paid" || $normalized === "הוזמן בהצלחה") {
        return "שולם";
    }

    if ($normalized === "pending_payment") {
        return "ממתין לתשלום";
    }

    if ($normalized === "expired") {
        return "פג תוקף";
    }

    if ($normalized === "cancelled") {
        return "בוטל";
    }

    return $normalized !== "" ? $normalized : "לא ידוע";
}

function order_parse_event_datetime($value)
{
    $text = normalize_text_value($value);
    if ($text === "") {
        return null;
    }

    $normalized = str_replace([" | ", "|"], " ", $text);
    $formats = [
        "d/m/Y H:i",
        "d/m/y H:i",
        "Y-m-d H:i:s",
        "Y-m-d H:i",
        DateTimeInterface::ATOM,
    ];

    foreach ($formats as $format) {
        $date = DateTime::createFromFormat($format, $normalized, new DateTimeZone("Asia/Jerusalem"));
        if ($date instanceof DateTime) {
            return $date;
        }
    }

    $timestamp = strtotime($normalized);
    if ($timestamp !== false) {
        $date = new DateTime("@" . $timestamp);
        $date->setTimezone(new DateTimeZone("Asia/Jerusalem"));
        return $date;
    }

    return null;
}

function order_extract_numeric_amount($value)
{
    $text = normalize_text_value($value);
    if ($text === "") {
        return 0.0;
    }

    if (preg_match('/([0-9]+(?:\.[0-9]+)?)/u', str_replace(',', '.', $text), $matches)) {
        return (float)$matches[1];
    }

    $digits = preg_replace('/[^0-9.]/', '', str_replace(',', '.', $text));
    return $digits !== '' ? (float)$digits : 0.0;
}

function order_detect_currency_label($value)
{
    $text = normalize_text_value($value);

    if ($text === '') {
        return '';
    }

    if (mb_strpos($text, '₪') !== false) {
        return '₪';
    }

    if (mb_strpos($text, 'דולר') !== false) {
        return 'דולר';
    }

    if (stripos($text, 'usd') !== false) {
        return 'USD';
    }

    return '';
}

function order_format_amount_with_currency($amount, $sourceValue)
{
    $numeric = round((float)$amount, 2);
    $currency = order_detect_currency_label($sourceValue);

    if (abs($numeric - round($numeric)) < 0.009) {
        $numberText = (string)(int)round($numeric);
    } else {
        $numberText = number_format($numeric, 2, '.', '');
    }

    if ($currency === '₪') {
        return $numberText . ' ₪';
    }

    if ($currency !== '') {
        return $numberText . ' ' . $currency;
    }

    return $numberText;
}

function order_build_cancellation_policy($order)
{
    $status = normalize_text_value($order['status'] ?? '');
    $priceText = normalize_text_value($order['price'] ?? '');
    $priceNumber = order_extract_numeric_amount($priceText);
    $eventDate = order_parse_event_datetime($order['date_time'] ?? '');
    $now = new DateTime('now', new DateTimeZone('Asia/Jerusalem'));

    $base = [
        'can_cancel' => false,
        'stage_key' => 'unknown',
        'stage_label' => 'מדיניות ביטול',
        'refund_percent' => 0,
        'fee_percent' => 0,
        'refund_amount' => order_format_amount_with_currency(0, $priceText),
        'fee_amount' => order_format_amount_with_currency(0, $priceText),
        'event_datetime_iso' => $eventDate ? $eventDate->format(DateTimeInterface::ATOM) : '',
        'hours_until_event' => null,
        'time_until_event_label' => 'לא זמין',
        'message' => 'לא ניתן לחשב מדיניות ביטול עבור הזמנה זו כרגע',
    ];

    if ($status === 'cancelled') {
        $base['stage_key'] = 'cancelled';
        $base['stage_label'] = 'ההזמנה כבר בוטלה';
        $base['message'] = 'ההזמנה כבר בוטלה בעבר';
        $base['refund_amount'] = normalize_text_value($order['refund_amount'] ?? '') !== ''
            ? normalize_text_value($order['refund_amount'])
            : $base['refund_amount'];
        $base['fee_amount'] = normalize_text_value($order['cancel_fee_amount'] ?? '') !== ''
            ? normalize_text_value($order['cancel_fee_amount'])
            : $base['fee_amount'];
        return $base;
    }

    if ($status !== 'paid' && $status !== 'הוזמן בהצלחה') {
        $base['stage_key'] = 'not_paid';
        $base['stage_label'] = 'ביטול זמין רק לאחר תשלום';
        $base['message'] = 'ניתן לבטל רק הזמנה ששולמה';
        return $base;
    }

    if (!$eventDate) {
        $base['stage_key'] = 'date_unknown';
        $base['stage_label'] = 'תאריך האירוע אינו תקין';
        $base['message'] = 'לא ניתן לחשב מדיניות ביטול כי תאריך האירוע אינו תקין';
        return $base;
    }

    $secondsUntilEvent = $eventDate->getTimestamp() - $now->getTimestamp();
    $hoursUntilEvent = (int)floor($secondsUntilEvent / 3600);
    $daysUntilEvent = $secondsUntilEvent / 86400;
    $base['hours_until_event'] = $hoursUntilEvent;

    if ($secondsUntilEvent <= 0) {
        $base['stage_key'] = 'past';
        $base['stage_label'] = 'האירוע כבר התחיל או הסתיים';
        $base['time_until_event_label'] = 'האירוע כבר התקיים';
        $base['message'] = 'לא ניתן לבטל לאחר תחילת האירוע';
        return $base;
    }

    if ($daysUntilEvent >= 14) {
        $refundPercent = 100;
        $feePercent = 0;
        $stageKey = 'free';
        $stageLabel = 'עד שבועיים לפני האירוע - ללא חיוב';
        $message = 'ניתן לבטל כעת ללא דמי ביטול';
    } elseif ($daysUntilEvent >= 3) {
        $refundPercent = 50;
        $feePercent = 50;
        $stageKey = 'partial';
        $stageLabel = 'בין שבועיים ל-3 ימים - דמי ביטול 50%';
        $message = 'ניתן לבטל כעת עם דמי ביטול של 50%';
    } else {
        $refundPercent = 0;
        $feePercent = 100;
        $stageKey = 'locked';
        $stageLabel = 'פחות מ-3 ימים לפני האירוע - ללא אפשרות ביטול';
        $message = 'כבר לא ניתן לבטל הזמנה זו לפי המדיניות';
    }

    $refundAmount = ($priceNumber * $refundPercent) / 100;
    $feeAmount = ($priceNumber * $feePercent) / 100;

    if ($daysUntilEvent >= 1) {
        $timeUntilEventLabel = (string)floor($daysUntilEvent) . ' ימים';
    } else {
        $timeUntilEventLabel = max(1, $hoursUntilEvent) . ' שעות';
    }

    return [
        'can_cancel' => $stageKey !== 'locked',
        'stage_key' => $stageKey,
        'stage_label' => $stageLabel,
        'refund_percent' => $refundPercent,
        'fee_percent' => $feePercent,
        'refund_amount' => order_format_amount_with_currency($refundAmount, $priceText),
        'fee_amount' => order_format_amount_with_currency($feeAmount, $priceText),
        'event_datetime_iso' => $eventDate->format(DateTimeInterface::ATOM),
        'hours_until_event' => $hoursUntilEvent,
        'time_until_event_label' => $timeUntilEventLabel,
        'message' => $message,
    ];
}