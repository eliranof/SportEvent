<?php
require_once __DIR__ . "/seat_inventory_helpers.php";

if (!function_exists("ensure_event_dynamic_pricing_table")) {
    function ensure_event_dynamic_pricing_table($conn)
    {
        $sql = "
            CREATE TABLE IF NOT EXISTS event_dynamic_pricing (
                id INT AUTO_INCREMENT PRIMARY KEY,
                event_id VARCHAR(100) NOT NULL,
                stand_code VARCHAR(30) NOT NULL,
                display_name VARCHAR(100) DEFAULT '',
                price_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_label VARCHAR(100) DEFAULT '',
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_event_stand (event_id, stand_code),
                KEY idx_event_active (event_id, is_active)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ";

        if (!$conn->query($sql)) {
            throw new Exception("לא ניתן ליצור או לאמת את טבלת event_dynamic_pricing: " . $conn->error);
        }
    }
}

if (!function_exists("dynamic_pricing_normalize_stand")) {
    function dynamic_pricing_normalize_stand($standCode)
    {
        return seat_inventory_normalize_stand($standCode);
    }
}

if (!function_exists("dynamic_pricing_upsert")) {
    function dynamic_pricing_upsert($conn, $eventId, $standCode, $displayName, $priceAmount, $priceLabel = '')
    {
        ensure_event_dynamic_pricing_table($conn);

        $eventId = trim((string)$eventId);
        $standCode = dynamic_pricing_normalize_stand($standCode);
        $displayName = trim((string)$displayName);
        $priceAmount = (float)$priceAmount;
        $priceLabel = trim((string)$priceLabel);

        if ($eventId === '' || $standCode === '' || $priceAmount <= 0) {
            throw new Exception("נתוני תמחור אינם תקינים");
        }

        if ($priceLabel === '') {
            $priceLabel = number_format($priceAmount, 0, ".", "") . " ₪";
        }

        $stmt = $conn->prepare("
            INSERT INTO event_dynamic_pricing (
                event_id, stand_code, display_name, price_amount, price_label, is_active
            ) VALUES (?, ?, ?, ?, ?, 1)
            ON DUPLICATE KEY UPDATE
                display_name = VALUES(display_name),
                price_amount = VALUES(price_amount),
                price_label = VALUES(price_label),
                is_active = 1,
                updated_at = CURRENT_TIMESTAMP
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }

        $stmt->bind_param(
            "sssds",
            $eventId,
            $standCode,
            $displayName,
            $priceAmount,
            $priceLabel
        );

        if (!$stmt->execute()) {
            $error = $stmt->error;
            $stmt->close();
            throw new Exception("שמירת תמחור נכשלה: " . $error);
        }

        $stmt->close();
    }
}

if (!function_exists("dynamic_pricing_get_rows")) {
    function dynamic_pricing_get_rows($conn, $eventId)
    {
        ensure_event_dynamic_pricing_table($conn);

        $eventId = trim((string)$eventId);
        if ($eventId === '') {
            return [];
        }

        $stmt = $conn->prepare("
            SELECT
                id,
                event_id,
                stand_code,
                display_name,
                price_amount,
                price_label,
                is_active,
                updated_at
            FROM event_dynamic_pricing
            WHERE event_id = ?
              AND is_active = 1
            ORDER BY stand_code ASC
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }

        $stmt->bind_param("s", $eventId);
        $stmt->execute();
        $result = $stmt->get_result();

        $rows = [];
        while ($row = $result->fetch_assoc()) {
            $rows[] = [
                "id" => (int)$row["id"],
                "event_id" => (string)$row["event_id"],
                "stand_code" => (string)$row["stand_code"],
                "display_name" => (string)$row["display_name"],
                "price_amount" => (float)$row["price_amount"],
                "price_label" => (string)$row["price_label"],
                "is_active" => (int)$row["is_active"],
                "updated_at" => (string)$row["updated_at"],
            ];
        }

        $stmt->close();
        return $rows;
    }
}