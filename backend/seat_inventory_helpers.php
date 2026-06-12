<?php

require_once __DIR__ . "/waitlist_engine.php";
require_once __DIR__ . "/order_helpers.php";

if (!function_exists("seat_inventory_table_exists")) {
    function seat_inventory_table_exists($conn, $tableName)
    {
        $safeTable = $conn->real_escape_string((string)$tableName);
        $sql = "SHOW TABLES LIKE '{$safeTable}'";
        $result = $conn->query($sql);
        return $result && $result->num_rows > 0;
    }
}

if (!function_exists("seat_inventory_column_exists")) {
    function seat_inventory_column_exists($conn, $tableName, $columnName)
    {
        $safeTable = $conn->real_escape_string((string)$tableName);
        $safeColumn = $conn->real_escape_string((string)$columnName);
        $sql = "SHOW COLUMNS FROM `{$safeTable}` LIKE '{$safeColumn}'";
        $result = $conn->query($sql);
        return $result && $result->num_rows > 0;
    }
}

if (!function_exists("ensure_event_seat_inventory_table")) {
    function ensure_event_seat_inventory_table($conn)
    {
        $createSql = "
            CREATE TABLE IF NOT EXISTS event_seat_inventory (
                id INT AUTO_INCREMENT PRIMARY KEY,
                event_id VARCHAR(100) NOT NULL,
                seat_key VARCHAR(100) NOT NULL,
                seat_label VARCHAR(255) DEFAULT '',
                stand_code VARCHAR(30) DEFAULT '',
                row_number INT NULL,
                seat_number INT NULL,
                status VARCHAR(30) NOT NULL DEFAULT 'available',
                source_order_id INT NULL,
                source_waitlist_request_id INT NULL,
                last_action VARCHAR(100) DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_event_seat (event_id, seat_key),
                INDEX idx_event_status (event_id, status),
                INDEX idx_event_order (source_order_id),
                INDEX idx_event_waitlist (source_waitlist_request_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ";

        if (!$conn->query($createSql)) {
            throw new Exception("לא ניתן ליצור או לאמת את טבלת event_seat_inventory: " . $conn->error);
        }

        $columnsToAdd = [
            "seat_label" => "ALTER TABLE event_seat_inventory ADD COLUMN seat_label VARCHAR(255) DEFAULT '' AFTER seat_key",
            "stand_code" => "ALTER TABLE event_seat_inventory ADD COLUMN stand_code VARCHAR(30) DEFAULT '' AFTER seat_label",
            "row_number" => "ALTER TABLE event_seat_inventory ADD COLUMN row_number INT NULL AFTER stand_code",
            "seat_number" => "ALTER TABLE event_seat_inventory ADD COLUMN seat_number INT NULL AFTER row_number",
            "status" => "ALTER TABLE event_seat_inventory ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'available' AFTER seat_number",
            "source_order_id" => "ALTER TABLE event_seat_inventory ADD COLUMN source_order_id INT NULL AFTER status",
            "source_waitlist_request_id" => "ALTER TABLE event_seat_inventory ADD COLUMN source_waitlist_request_id INT NULL AFTER source_order_id",
            "last_action" => "ALTER TABLE event_seat_inventory ADD COLUMN last_action VARCHAR(100) DEFAULT '' AFTER source_waitlist_request_id",
        ];

        foreach ($columnsToAdd as $columnName => $sql) {
            if (!seat_inventory_column_exists($conn, "event_seat_inventory", $columnName)) {
                $conn->query($sql);
            }
        }
    }
}

if (!function_exists("seat_inventory_normalize_stand")) {
    function seat_inventory_normalize_stand($stand)
    {
        if (function_exists("waitlist_normalize_stand")) {
            return waitlist_normalize_stand($stand);
        }

        $text = trim((string)$stand);
        return $text !== '' ? strtoupper($text) : '';
    }
}

if (!function_exists("seat_inventory_build_key")) {
    function seat_inventory_build_key($standCode, $rowNumber, $seatNumber)
    {
        $standCode = seat_inventory_normalize_stand($standCode);
        $rowNumber = (int)$rowNumber;
        $seatNumber = (int)$seatNumber;

        if ($standCode === '' || $rowNumber <= 0 || $seatNumber <= 0) {
            return '';
        }

        return $standCode . '-' . $rowNumber . '-' . $seatNumber;
    }
}

if (!function_exists("seat_inventory_extract_single_reference")) {
    function seat_inventory_extract_single_reference($value)
    {
        if (is_array($value)) {
            $label = trim((string)($value['label'] ?? ''));
            if ($label !== '') {
                return seat_inventory_extract_single_reference($label);
            }

            $section = trim((string)($value['section'] ?? ($value['stand'] ?? '')));
            $row = (int)($value['row'] ?? 0);
            $seat = (int)($value['seat'] ?? 0);
            $key = seat_inventory_build_key($section, $row, $seat);
            if ($key !== '') {
                return [
                    'seat_key' => $key,
                    'seat_label' => trim((string)($value['seat_label'] ?? '')),
                    'stand_code' => seat_inventory_normalize_stand($section),
                    'row_number' => $row,
                    'seat_number' => $seat,
                ];
            }
            return null;
        }

        $text = trim((string)$value);
        if ($text === '') {
            return null;
        }

        if (
            preg_match(
                '/(?:יציע\s*)?([A-Za-zא-ת]+)\s*\|\s*שורה\s*(\d+)\s*\|\s*(?:כסא|כיסא|מושב|seat)\s*(\d+)/u',
                $text,
                $matches
            )
        ) {
            return [
                'seat_key' => seat_inventory_build_key($matches[1], $matches[2], $matches[3]),
                'seat_label' => trim($text),
                'stand_code' => seat_inventory_normalize_stand($matches[1]),
                'row_number' => (int)$matches[2],
                'seat_number' => (int)$matches[3],
            ];
        }

        if (preg_match('/^([A-Za-zא-ת]+)-(\d+)-(\d+)$/u', $text, $matches)) {
            return [
                'seat_key' => seat_inventory_build_key($matches[1], $matches[2], $matches[3]),
                'seat_label' => '',
                'stand_code' => seat_inventory_normalize_stand($matches[1]),
                'row_number' => (int)$matches[2],
                'seat_number' => (int)$matches[3],
            ];
        }

        if (preg_match('/^(?:.+-)?([A-Za-z]+)-R(\d+)-S(\d+)$/u', $text, $matches)) {
            return [
                'seat_key' => seat_inventory_build_key($matches[1], $matches[2], $matches[3]),
                'seat_label' => '',
                'stand_code' => seat_inventory_normalize_stand($matches[1]),
                'row_number' => (int)$matches[2],
                'seat_number' => (int)$matches[3],
            ];
        }

        return null;
    }
}

if (!function_exists("seat_inventory_extract_references")) {
    function seat_inventory_extract_references($value)
    {
        $results = [];

        if (is_array($value)) {
            foreach ($value as $item) {
                $ref = seat_inventory_extract_single_reference($item);
                if ($ref && !empty($ref['seat_key'])) {
                    $results[$ref['seat_key']] = $ref;
                }
            }
            return array_values($results);
        }

        $text = trim((string)$value);
        if ($text === '') {
            return [];
        }

        if (preg_match_all('/(?:יציע\s*)?[A-Za-zא-ת]+\s*\|\s*שורה\s*\d+\s*\|\s*(?:כסא|כיסא|מושב|seat)\s*\d+/u', $text, $fullMatches)) {
            foreach ($fullMatches[0] as $item) {
                $ref = seat_inventory_extract_single_reference($item);
                if ($ref && !empty($ref['seat_key'])) {
                    $results[$ref['seat_key']] = $ref;
                }
            }
        }

        if (preg_match_all('/\b(?:[A-Za-zא-ת]+-\d+-\d+|(?:[^\s|,;]+-)?[A-Za-z]+-R\d+-S\d+)\b/u', $text, $compactMatches)) {
            foreach ($compactMatches[0] as $item) {
                $ref = seat_inventory_extract_single_reference($item);
                if ($ref && !empty($ref['seat_key'])) {
                    if (isset($results[$ref['seat_key']]) && $results[$ref['seat_key']]['seat_label'] !== '') {
                        continue;
                    }
                    $results[$ref['seat_key']] = $ref;
                }
            }
        }

        return array_values($results);
    }
}

if (!function_exists("seat_inventory_are_all_available")) {
    function seat_inventory_are_all_available($conn, $eventId, $seatReferences, $currentOrderId = null)
    {
        ensure_event_seat_inventory_table($conn);

        $eventId = trim((string)$eventId);
        if ($eventId === '') {
            return false;
        }

        $references = seat_inventory_extract_references($seatReferences);
        if (empty($references)) {
            return true;
        }

        $stmt = $conn->prepare(
            "SELECT status, source_order_id
             FROM event_seat_inventory
             WHERE event_id = ? AND seat_key = ?
             LIMIT 1"
        );

        if (!$stmt) {
            throw new Exception("שגיאה בהכנת בדיקת זמינות מושב: " . $conn->error);
        }

        foreach ($references as $ref) {
            $seatKey = (string)($ref['seat_key'] ?? '');
            if ($seatKey === '') {
                continue;
            }

            $stmt->bind_param("ss", $eventId, $seatKey);
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result ? $result->fetch_assoc() : null;

            if (!$row) {
                continue;
            }

            $status = trim((string)($row['status'] ?? 'available'));
            $sourceOrderId = isset($row['source_order_id']) ? (int)$row['source_order_id'] : null;

            if ($status === 'sold' && ($currentOrderId === null || $sourceOrderId !== (int)$currentOrderId)) {
                $stmt->close();
                return false;
            }
        }

        $stmt->close();
        return true;
    }
}

if (!function_exists("seat_inventory_set_status")) {
    function seat_inventory_set_status($conn, $eventId, $seatReferences, $status, array $options = [])
    {
        ensure_event_seat_inventory_table($conn);

        $eventId = trim((string)$eventId);
        if ($eventId === '') {
            return [
                'seat_keys' => [],
                'affected_count' => 0,
            ];
        }

        $references = seat_inventory_extract_references($seatReferences);
        if (empty($references)) {
            return [
                'seat_keys' => [],
                'affected_count' => 0,
            ];
        }

        $orderId = isset($options['order_id']) ? (int)$options['order_id'] : null;
        $waitlistRequestId = isset($options['waitlist_request_id']) ? (int)$options['waitlist_request_id'] : null;
        $lastAction = trim((string)($options['last_action'] ?? ''));
        $affectedCount = 0;
        $seatKeys = [];

        foreach ($references as $ref) {
            $seatKey = (string)$ref['seat_key'];
            $seatLabel = trim((string)($ref['seat_label'] ?? ''));
            $standCode = trim((string)($ref['stand_code'] ?? ''));
            $rowNumber = isset($ref['row_number']) ? (int)$ref['row_number'] : null;
            $seatNumber = isset($ref['seat_number']) ? (int)$ref['seat_number'] : null;

            $stmt = $conn->prepare(
                "INSERT INTO event_seat_inventory (
                    event_id, seat_key, seat_label, stand_code, row_number, seat_number,
                    status, source_order_id, source_waitlist_request_id, last_action
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    seat_label = IF(VALUES(seat_label) <> '', VALUES(seat_label), seat_label),
                    stand_code = IF(VALUES(stand_code) <> '', VALUES(stand_code), stand_code),
                    row_number = IFNULL(VALUES(row_number), row_number),
                    seat_number = IFNULL(VALUES(seat_number), seat_number),
                    status = VALUES(status),
                    source_order_id = VALUES(source_order_id),
                    source_waitlist_request_id = VALUES(source_waitlist_request_id),
                    last_action = VALUES(last_action),
                    updated_at = CURRENT_TIMESTAMP"
            );

            if (!$stmt) {
                throw new Exception("שגיאה בהכנת עדכון מלאי מושבים: " . $conn->error);
            }

            $stmt->bind_param(
                "ssssiisiis",
                $eventId,
                $seatKey,
                $seatLabel,
                $standCode,
                $rowNumber,
                $seatNumber,
                $status,
                $orderId,
                $waitlistRequestId,
                $lastAction
            );

            if (!$stmt->execute()) {
                $error = $stmt->error;
                $stmt->close();
                throw new Exception("עדכון מלאי מושבים נכשל: " . $error);
            }

            $affectedCount += max(0, $stmt->affected_rows);
            $stmt->close();
            $seatKeys[] = $seatKey;
        }

        return [
            'seat_keys' => array_values(array_unique($seatKeys)),
            'affected_count' => $affectedCount,
        ];
    }
}

if (!function_exists("seat_inventory_mark_sold_for_order")) {
    function seat_inventory_mark_sold_for_order($conn, array $order, $lastAction = 'payment_completed')
    {
        return seat_inventory_set_status(
            $conn,
            (string)($order['event_id'] ?? ''),
            $order['selected_seats'] ?? '',
            'sold',
            [
                'order_id' => (int)($order['id'] ?? 0),
                'waitlist_request_id' => isset($order['waitlist_request_id']) ? (int)$order['waitlist_request_id'] : null,
                'last_action' => $lastAction,
            ]
        );
    }
}

if (!function_exists("seat_inventory_release_for_order")) {
    function seat_inventory_release_for_order($conn, array $order, $lastAction = 'order_cancelled')
    {
        return seat_inventory_set_status(
            $conn,
            (string)($order['event_id'] ?? ''),
            $order['selected_seats'] ?? '',
            'available',
            [
                'order_id' => (int)($order['id'] ?? 0),
                'waitlist_request_id' => isset($order['waitlist_request_id']) ? (int)$order['waitlist_request_id'] : null,
                'last_action' => $lastAction,
            ]
        );
    }
}

if (!function_exists("seat_inventory_rebuild_event_from_orders")) {
    function seat_inventory_rebuild_event_from_orders($conn, $eventId)
    {
        ensure_event_seat_inventory_table($conn);
        ensure_orders_table($conn);

        $eventId = trim((string)$eventId);
        if ($eventId === '') {
            return [
                'event_id' => '',
                'sold_seat_keys' => [],
                'sold_count' => 0,
            ];
        }

        $delete = $conn->prepare("DELETE FROM event_seat_inventory WHERE event_id = ?");
        if (!$delete) {
            throw new Exception("שגיאה באיפוס מלאי אירוע: " . $conn->error);
        }
        $delete->bind_param("s", $eventId);
        $delete->execute();
        $delete->close();

        $select = $conn->prepare(
            "SELECT id, event_id, selected_seats, waitlist_request_id
             FROM orders
             WHERE event_id = ?
               AND (status = 'paid' OR status = 'הוזמן בהצלחה')"
        );

        if (!$select) {
            throw new Exception("שגיאה בשליפת הזמנות לבניית מלאי: " . $conn->error);
        }

        $select->bind_param("s", $eventId);
        $select->execute();
        $result = $select->get_result();

        $soldSeatKeys = [];

        while ($row = $result->fetch_assoc()) {
            $updated = seat_inventory_mark_sold_for_order($conn, $row, 'inventory_rebuild');
            foreach ($updated['seat_keys'] as $seatKey) {
                $soldSeatKeys[] = $seatKey;
            }
        }

        $select->close();

        $soldSeatKeys = array_values(array_unique($soldSeatKeys));

        return [
            'event_id' => $eventId,
            'sold_seat_keys' => $soldSeatKeys,
            'sold_count' => count($soldSeatKeys),
        ];
    }
}

if (!function_exists("seat_inventory_get_event_overrides")) {
    function seat_inventory_get_event_overrides($conn, $eventId)
    {
        ensure_event_seat_inventory_table($conn);
        $eventId = trim((string)$eventId);
        if ($eventId === '') {
            return [];
        }

        $stmt = $conn->prepare(
            "SELECT seat_key, status, seat_label, stand_code, row_number, seat_number, source_order_id, source_waitlist_request_id, last_action
             FROM event_seat_inventory
             WHERE event_id = ?
             ORDER BY stand_code ASC, row_number ASC, seat_number ASC, seat_key ASC"
        );

        if (!$stmt) {
            throw new Exception("שגיאה בשליפת דריסות מלאי האירוע: " . $conn->error);
        }

        $stmt->bind_param("s", $eventId);
        $stmt->execute();
        $result = $stmt->get_result();

        $rows = [];
        while ($row = $result->fetch_assoc()) {
            $rows[] = [
                'seat_key' => (string)($row['seat_key'] ?? ''),
                'status' => (string)($row['status'] ?? 'available'),
                'seat_label' => (string)($row['seat_label'] ?? ''),
                'stand_code' => (string)($row['stand_code'] ?? ''),
                'row_number' => isset($row['row_number']) ? (int)$row['row_number'] : null,
                'seat_number' => isset($row['seat_number']) ? (int)$row['seat_number'] : null,
                'source_order_id' => isset($row['source_order_id']) ? (int)$row['source_order_id'] : null,
                'source_waitlist_request_id' => isset($row['source_waitlist_request_id']) ? (int)$row['source_waitlist_request_id'] : null,
                'last_action' => (string)($row['last_action'] ?? ''),
            ];
        }

        $stmt->close();
        return $rows;
    }
}

if (!function_exists("seat_inventory_get_sold_seat_keys")) {
    function seat_inventory_get_sold_seat_keys($conn, $eventId)
    {
        ensure_event_seat_inventory_table($conn);
        $eventId = trim((string)$eventId);
        if ($eventId === '') {
            return [];
        }

        $stmt = $conn->prepare(
            "SELECT seat_key
             FROM event_seat_inventory
             WHERE event_id = ?
               AND status = 'sold'
             ORDER BY stand_code ASC, row_number ASC, seat_number ASC, seat_key ASC"
        );

        if (!$stmt) {
            throw new Exception("שגיאה בשליפת מלאי מושבים: " . $conn->error);
        }

        $stmt->bind_param("s", $eventId);
        $stmt->execute();
        $result = $stmt->get_result();

        $keys = [];
        while ($row = $result->fetch_assoc()) {
            $keys[] = (string)$row['seat_key'];
        }

        $stmt->close();
        return $keys;
    }
}