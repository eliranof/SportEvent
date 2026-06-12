<?php

date_default_timezone_set("Asia/Jerusalem");

if (!function_exists("waitlist_table_exists")) {
    function waitlist_table_exists($conn, $tableName)
    {
        $safeTable = $conn->real_escape_string((string)$tableName);
        $sql = "SHOW TABLES LIKE '{$safeTable}'";
        $result = $conn->query($sql);
        return $result && $result->num_rows > 0;
    }
}

if (!function_exists("waitlist_column_exists")) {
    function waitlist_column_exists($conn, $tableName, $columnName)
    {
        $safeTable = $conn->real_escape_string((string)$tableName);
        $safeColumn = $conn->real_escape_string((string)$columnName);
        $sql = "SHOW COLUMNS FROM `{$safeTable}` LIKE '{$safeColumn}'";
        $result = $conn->query($sql);
        return $result && $result->num_rows > 0;
    }
}

if (!function_exists("waitlist_mb_lower")) {
    function waitlist_mb_lower($value)
    {
        $value = trim((string)$value);
        return function_exists("mb_strtolower") ? mb_strtolower($value, "UTF-8") : strtolower($value);
    }
}

if (!function_exists("waitlist_normalize_stand")) {
    function waitlist_normalize_stand($stand)
    {
        $stand = trim((string)$stand);
        if ($stand === "") {
            return "";
        }

        $lower = waitlist_mb_lower($stand);
        $lowerWithoutPrefix = preg_replace('/^יציע\s+/u', '', $lower);

        $map = [
            "יציע מערבי" => "W",
            "מערבי" => "W",
            "מערב" => "W",
            "יציע מזרחי" => "E",
            "מזרחי" => "E",
            "מזרח" => "E",
            "יציע צפוני" => "N",
            "צפוני" => "N",
            "צפון" => "N",
            "יציע דרומי" => "S",
            "דרומי" => "S",
            "דרום" => "S",
            "יציע מרכזי" => "C",
            "מרכזי" => "C",
            "מרכז" => "C",
            "יציע משפחות" => "F",
            "משפחות" => "F",
            "משפחה" => "F",
            "family" => "F",
            "familystand" => "F",
            "west" => "W",
            "weststand" => "W",
            "east" => "E",
            "eaststand" => "E",
            "north" => "N",
            "south" => "S",
            "center" => "C",
            "central" => "C",
            "vip" => "VIP",
            "w" => "W",
            "e" => "E",
            "n" => "N",
            "s" => "S",
            "c" => "C",
            "f" => "F",
        ];

        if (isset($map[$lower])) {
            return $map[$lower];
        }

        if ($lowerWithoutPrefix !== $lower && isset($map[$lowerWithoutPrefix])) {
            return $map[$lowerWithoutPrefix];
        }

        return strtoupper($stand);
    }
}

if (!function_exists("waitlist_clean_seat_token")) {
    function waitlist_clean_seat_token($value)
    {
        $value = trim((string)$value);

        if ($value === "") {
            return "";
        }

        $value = html_entity_decode($value, ENT_QUOTES | ENT_HTML5, "UTF-8");

        // הסרה של תווי RTL/LTR ותווים בלתי נראים שגורמים להשוואה להיכשל למרות שהתצוגה נראית זהה.
        $value = preg_replace('/[\x{200E}\x{200F}\x{202A}-\x{202E}\x{2066}-\x{2069}\x{FEFF}]/u', '', $value);

        // איחוד כל סוגי המקפים למקף רגיל. לפעמים React/HTML שומרים מקף דומה שאינו אותו תו.
        $value = str_replace(["‐", "‑", "‒", "–", "\xE2\x80\x94", "―", "−", "﹣", "－", "־"], "-", $value);

        // רווחים לא רגילים ורווחים סביב מקפים.
        $value = preg_replace('/[\x{00A0}\x{2000}-\x{200B}\x{202F}\x{205F}\x{3000}]/u', ' ', $value);
        $value = preg_replace('/\s*-\s*/u', '-', $value);
        $value = trim($value);

        // ניקוי מצב שבו הגיע פריט בודד מתוך JSON, למשל: ["W-1-1 או "W-1-2"]
        $value = trim($value, " \t\n\r\0\x0B[]{}");
        $value = trim($value);
        $value = stripslashes($value);
        $value = trim($value, " \t\n\r\0\x0B\"'");

        return trim($value);
    }
}

if (!function_exists("waitlist_seat_compare_key")) {
    function waitlist_seat_compare_key($seat)
    {
        $seat = waitlist_clean_seat_token($seat);

        if ($seat === "") {
            return "";
        }

        // אם הגיע מושב כטקסט מלא כגון: יציע מערבי | שורה 1 | כיסא 2
        if (
            preg_match(
                '/([A-Za-zא-ת]+)\s*(?:\||,)?\s*שורה\s*0*(\d+)\s*(?:\||,)?\s*(?:כסא|כיסא|מושב|seat)\s*0*(\d+)/u',
                $seat,
                $matches
            )
        ) {
            return waitlist_normalize_stand($matches[1]) . "-" . (int)$matches[2] . "-" . (int)$matches[3];
        }

        // אם הגיע מושב כקוד כגון W-1-2, כולל מקפים מסוגים שונים שכבר אוחדו.
        if (preg_match('/([A-Za-zא-ת]+)-0*(\d+)-0*(\d+)/u', $seat, $matches)) {
            return waitlist_normalize_stand($matches[1]) . "-" . (int)$matches[2] . "-" . (int)$matches[3];
        }

        // ניסיון אחרון: חילוץ אות/מילה + שני מספרים גם אם יש סימנים ביניהם.
        if (preg_match('/([A-Za-zא-ת]+)\D+0*(\d+)\D+0*(\d+)/u', $seat, $matches)) {
            return waitlist_normalize_stand($matches[1]) . "-" . (int)$matches[2] . "-" . (int)$matches[3];
        }

        return strtoupper($seat);
    }
}

if (!function_exists("waitlist_compare_seat_lists")) {
    function waitlist_compare_seat_lists(array $requestedSeats, array $availableSeats)
    {
        $requestedCompare = [];
        foreach ($requestedSeats as $seat) {
            $key = waitlist_seat_compare_key($seat);
            if ($key !== "") {
                $requestedCompare[$key] = true;
            }
        }

        $availableCompare = [];
        foreach ($availableSeats as $seat) {
            $key = waitlist_seat_compare_key($seat);
            if ($key !== "") {
                $availableCompare[$key] = true;
            }
        }

        if (empty($requestedCompare)) {
            return [
                "matched" => false,
                "requested_compare" => array_keys($requestedCompare),
                "available_compare" => array_keys($availableCompare),
            ];
        }

        foreach ($requestedCompare as $key => $_) {
            if (!isset($availableCompare[$key])) {
                return [
                    "matched" => false,
                    "requested_compare" => array_keys($requestedCompare),
                    "available_compare" => array_keys($availableCompare),
                ];
            }
        }

        return [
            "matched" => true,
            "requested_compare" => array_keys($requestedCompare),
            "available_compare" => array_keys($availableCompare),
        ];
    }
}

if (!function_exists("waitlist_normalize_single_seat")) {
    function waitlist_normalize_single_seat($item)
    {
        if (is_array($item)) {
            $label = isset($item["label"]) ? trim((string)$item["label"]) : "";
            if ($label !== "") {
                return waitlist_normalize_single_seat($label);
            }

            $seatKey = isset($item["seat_key"]) ? trim((string)$item["seat_key"]) : "";
            if ($seatKey !== "") {
                return waitlist_normalize_single_seat($seatKey);
            }

            $id = isset($item["id"]) ? trim((string)$item["id"]) : "";
            if ($id !== "" && preg_match('/^[A-Za-zא-ת]+-\d+-\d+$/u', $id)) {
                return waitlist_normalize_single_seat($id);
            }

            $section = isset($item["section"]) ? trim((string)$item["section"]) : "";
            if ($section === "" && isset($item["stand"])) {
                $section = trim((string)$item["stand"]);
            }
            if ($section === "" && isset($item["stand_code"])) {
                $section = trim((string)$item["stand_code"]);
            }

            $row = isset($item["row"]) ? trim((string)$item["row"]) : "";
            if ($row === "" && isset($item["row_number"])) {
                $row = trim((string)$item["row_number"]);
            }

            $seat = isset($item["seat"]) ? trim((string)$item["seat"]) : "";
            if ($seat === "" && isset($item["seat_number"])) {
                $seat = trim((string)$item["seat_number"]);
            }

            if ($section !== "" && $row !== "" && $seat !== "") {
                return waitlist_normalize_stand($section) . "-" . preg_replace('/\D+/u', '', $row) . "-" . preg_replace('/\D+/u', '', $seat);
            }

            return "";
        }

        $seatText = waitlist_clean_seat_token($item);
        if ($seatText === "") {
            return "";
        }

        // תומך גם במחרוזת שבתוכה יש JSON מלא של מושב אחד.
        $decoded = json_decode($seatText, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            if (is_array($decoded)) {
                return waitlist_normalize_single_seat($decoded);
            }
            if (is_string($decoded)) {
                $decodedSeat = waitlist_normalize_single_seat($decoded);
                if ($decodedSeat !== "") {
                    return $decodedSeat;
                }
            }
        }

        if (preg_match('/^([A-Za-zא-ת]+)-\s*(\d+)-\s*(\d+)$/u', $seatText, $matches)) {
            return waitlist_normalize_stand($matches[1]) . "-" . $matches[2] . "-" . $matches[3];
        }

        if (
            preg_match(
                '/([A-Za-zא-ת]+)\s*(?:\||,)?\s*שורה\s*(\d+)\s*(?:\||,)?\s*(?:כסא|כיסא|מושב|seat)\s*(\d+)/u',
                $seatText,
                $matches
            )
        ) {
            return waitlist_normalize_stand($matches[1]) . "-" . $matches[2] . "-" . $matches[3];
        }

        // חילוץ מתוך טקסט ארוך, למשל: ["W-1-1","W-1-2"] או W-1-1,W-1-2
        if (preg_match('/([A-Za-zא-ת]+)-\s*(\d+)-\s*(\d+)/u', $seatText, $matches)) {
            return waitlist_normalize_stand($matches[1]) . "-" . $matches[2] . "-" . $matches[3];
        }

        return $seatText;
    }
}

if (!function_exists("waitlist_flatten_seat_items")) {
    function waitlist_flatten_seat_items($value)
    {
        if ($value === null || $value === "") {
            return [];
        }

        if (is_array($value)) {
            $items = [];
            foreach ($value as $item) {
                if (is_array($item)) {
                    $items[] = $item;
                } else {
                    $items = array_merge($items, waitlist_flatten_seat_items($item));
                }
            }
            return $items;
        }

        $text = trim((string)$value);
        if ($text === "") {
            return [];
        }

        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, "UTF-8");
        $text = str_replace(["\xEF\xBB\xBF", "\u{200E}", "\u{200F}", "\u{202A}", "\u{202B}", "\u{202C}", "\u{202D}", "\u{202E}"], "", $text);
        $text = trim($text);

        // ניסיון פענוח JSON כמה פעמים כדי לטפל גם ב-JSON שנשמר כמחרוזת בתוך JSON.
        $current = $text;
        for ($i = 0; $i < 3; $i++) {
            $decoded = json_decode($current, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                break;
            }

            if (is_array($decoded)) {
                return waitlist_flatten_seat_items($decoded);
            }

            if (is_string($decoded)) {
                $current = trim($decoded);
                continue;
            }

            break;
        }

        // אם יש במחרוזת כמה מושבים, נחלץ אותם ישירות בלי להסתמך על פסיקים/סוגריים.
        if (preg_match_all('/[A-Za-zא-ת]+-\s*\d+-\s*\d+/u', $text, $matches) && !empty($matches[0])) {
            return $matches[0];
        }

        if (
            preg_match_all(
                '/[A-Za-zא-ת]+\s*(?:\||,)?\s*שורה\s*\d+\s*(?:\||,)?\s*(?:כסא|כיסא|מושב|seat)\s*\d+/u',
                $text,
                $matches
            ) && !empty($matches[0])
        ) {
            return $matches[0];
        }

        $text = str_replace(["\r\n", "\r", "\n", "|", ";"], ",", $text);
        return array_map("trim", explode(",", $text));
    }
}

if (!function_exists("waitlist_normalize_seat_list")) {
    function waitlist_normalize_seat_list($value)
    {
        $items = waitlist_flatten_seat_items($value);

        $normalized = [];
        foreach ($items as $item) {
            $seat = waitlist_normalize_single_seat($item);
            if ($seat !== "") {
                $normalized[] = $seat;
            }
        }

        sort($normalized, SORT_NATURAL);
        return array_values(array_unique(array_filter($normalized)));
    }
}

if (!function_exists("waitlist_take_first_n_seats")) {
    function waitlist_take_first_n_seats(array $availableSeats, $count)
    {
        $count = max(0, (int)$count);
        if ($count <= 0) {
            return [];
        }

        return array_slice(array_values($availableSeats), 0, $count);
    }
}

if (!function_exists("waitlist_is_subset")) {
    function waitlist_is_subset(array $requestedSeats, array $availableSeats)
    {
        $compare = waitlist_compare_seat_lists($requestedSeats, $availableSeats);
        return !empty($compare["matched"]);
    }
}

if (!function_exists("waitlist_fetch_waiting_candidates")) {
    function waitlist_fetch_waiting_candidates($conn, $eventId, $afterQueuePosition = null)
    {
        $sql = "SELECT id, user_id, username, email, full_name, event_id, event_name,
                       competition, location, date_time, tickets_count, selection_mode,
                       stand, preferred_row, selected_seats, selected_seats_short,
                       queue_position, status
                FROM waitlist_requests
                WHERE event_id = ?
                  AND (status = 'waiting' OR status IS NULL OR TRIM(status) = '')";

        $types = "s";
        $params = [(string)$eventId];

        if ($afterQueuePosition !== null) {
            $sql .= " AND queue_position > ?";
            $types .= "i";
            $params[] = (int)$afterQueuePosition;
        }

        $sql .= " ORDER BY queue_position ASC, id ASC";

        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("שגיאה בהכנת שאילתת מועמדים: " . $conn->error);
        }

        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $result = $stmt->get_result();

        $rows = [];
        while ($row = $result->fetch_assoc()) {
            $rows[] = $row;
        }

        $stmt->close();
        return $rows;
    }
}

if (!function_exists("waitlist_build_candidate_debug")) {
    function waitlist_build_candidate_debug($row, $reason, array $extra = [])
    {
        $base = [
            "request_id" => (int)($row["id"] ?? 0),
            "username" => (string)($row["username"] ?? ""),
            "event_id" => (string)($row["event_id"] ?? ""),
            "tickets_count" => (int)($row["tickets_count"] ?? 0),
            "selection_mode" => (string)($row["selection_mode"] ?? "zone"),
            "stand" => (string)($row["stand"] ?? ""),
            "queue_position" => isset($row["queue_position"]) ? (int)$row["queue_position"] : null,
            "reason" => (string)$reason,
        ];

        return array_merge($base, $extra);
    }
}


if (!function_exists("waitlist_find_active_offer_for_event_seats")) {
    function waitlist_find_active_offer_for_event_seats($conn, $eventId, array $availableSeats = [])
    {
        if (!waitlist_table_exists($conn, "waitlist_requests")) {
            return null;
        }

        $eventId = trim((string)$eventId);
        if ($eventId === "") {
            return null;
        }

        $sql = "SELECT id, username, email, event_id, stand, queue_position, offered_seats, offered_seats_count, offer_expires_at
                FROM waitlist_requests
                WHERE event_id = ?
                  AND status = 'offered'
                  AND (offer_expires_at IS NULL OR offer_expires_at >= NOW())
                ORDER BY queue_position ASC, id ASC";

        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("שגיאה בבדיקת הצעות פעילות: " . $conn->error);
        }

        $stmt->bind_param("s", $eventId);
        $stmt->execute();
        $result = $stmt->get_result();

        $availableCompare = [];
        foreach ($availableSeats as $seat) {
            $key = waitlist_seat_compare_key($seat);
            if ($key !== "") {
                $availableCompare[$key] = true;
            }
        }

        while ($row = $result->fetch_assoc()) {
            $offeredSeats = waitlist_normalize_seat_list($row["offered_seats"] ?? "");

            // אם אין פירוט מושבים, הצעה פעילה לאירוע כולו חוסמת התאמה נוספת עד שתיסגר.
            if (empty($offeredSeats) || empty($availableCompare)) {
                $stmt->close();
                return $row;
            }

            foreach ($offeredSeats as $seat) {
                $key = waitlist_seat_compare_key($seat);
                if ($key !== "" && isset($availableCompare[$key])) {
                    $stmt->close();
                    return $row;
                }
            }
        }

        $stmt->close();
        return null;
    }
}

if (!function_exists("waitlist_hold_inventory_for_offer")) {
    function waitlist_hold_inventory_for_offer($conn, $eventId, array $offeredSeats, $requestId)
    {
        if (!waitlist_table_exists($conn, "event_seat_inventory")) {
            return 0;
        }

        $eventId = trim((string)$eventId);
        $requestId = (int)$requestId;
        if ($eventId === "" || $requestId <= 0 || empty($offeredSeats)) {
            return 0;
        }

        $updated = 0;
        foreach ($offeredSeats as $seat) {
            $seatKey = waitlist_seat_compare_key($seat);
            if ($seatKey === "") {
                continue;
            }

            $stmt = $conn->prepare(
                "UPDATE event_seat_inventory
                 SET status = 'held_waitlist',
                     source_waitlist_request_id = ?,
                     last_action = 'waitlist_offer',
                     updated_at = NOW()
                 WHERE event_id = ?
                   AND seat_key = ?"
            );

            if (!$stmt) {
                continue;
            }

            $stmt->bind_param("iss", $requestId, $eventId, $seatKey);
            $stmt->execute();
            $updated += max(0, (int)$stmt->affected_rows);
            $stmt->close();
        }

        return $updated;
    }
}

if (!function_exists("waitlist_mark_as_offered")) {
    function waitlist_mark_as_offered($conn, array $row, array $offeredSeats, $resultText)
    {
        $requestId = (int)($row["id"] ?? 0);
        if ($requestId <= 0) {
            throw new Exception("בקשת ההמתנה אינה תקינה");
        }

        $offerExpiresAt = date("Y-m-d H:i:s", time() + (90 * 60));
        $offeredSeatsJson = !empty($offeredSeats)
            ? json_encode(array_values($offeredSeats), JSON_UNESCAPED_UNICODE)
            : null;
        $offeredSeatsCount = count($offeredSeats);
        $status = "offered";
        $emailStatus = "offered";

        $update = $conn->prepare(
            "UPDATE waitlist_requests
             SET status = ?,
                 offered_seats = ?,
                 offered_seats_count = ?,
                 offered_at = NOW(),
                 offer_sent_at = NOW(),
                 offer_expires_at = ?,
                 email_status = ?,
                 result = ?,
                 updated_at = NOW()
             WHERE id = ?
               AND (status = 'waiting' OR status IS NULL OR TRIM(status) = '')"
        );

        if (!$update) {
            throw new Exception("שגיאה בהכנת עדכון ההצעה: " . $conn->error);
        }

        $update->bind_param(
            "ssisssi",
            $status,
            $offeredSeatsJson,
            $offeredSeatsCount,
            $offerExpiresAt,
            $emailStatus,
            $resultText,
            $requestId
        );

        $update->execute();
        $affected = $update->affected_rows;
        $update->close();

        if ($affected <= 0) {
            return [
                "success" => false,
                "message" => "לא ניתן לעדכן את הבקשה להצעת רכישה",
            ];
        }

        waitlist_hold_inventory_for_offer(
            $conn,
            (string)($row["event_id"] ?? ""),
            $offeredSeats,
            $requestId
        );

        return [
            "success" => true,
            "message" => "נפתחה הצעת רכישה לבקשה המתאימה",
            "matched_request" => [
                "id" => $requestId,
                "user_id" => (int)($row["user_id"] ?? 0),
                "username" => (string)($row["username"] ?? ""),
                "email" => (string)($row["email"] ?? ""),
                "full_name" => (string)($row["full_name"] ?? ""),
                "event_id" => (string)($row["event_id"] ?? ""),
                "event_name" => (string)($row["event_name"] ?? ""),
                "competition" => (string)($row["competition"] ?? ""),
                "location" => (string)($row["location"] ?? ""),
                "date_time" => (string)($row["date_time"] ?? ""),
                "tickets_count" => (int)($row["tickets_count"] ?? 0),
                "selection_mode" => (string)($row["selection_mode"] ?? "zone"),
                "stand" => (string)($row["stand"] ?? ""),
                "preferred_row" => (string)($row["preferred_row"] ?? ""),
                "queue_position" => isset($row["queue_position"]) ? (int)$row["queue_position"] : null,
            ],
            "offered_seats" => array_values($offeredSeats),
            "offered_seats_count" => $offeredSeatsCount,
            "offer_expires_at" => $offerExpiresAt,
        ];
    }
}

if (!function_exists("waitlist_find_and_offer_next")) {
    function waitlist_find_and_offer_next(
        $conn,
        $eventId,
        $availableCount,
        $availableStand,
        $availableSeats,
        $resultText,
        $afterQueuePosition = null
    ) {
        if (!waitlist_table_exists($conn, "waitlist_requests")) {
            return [
                "success" => false,
                "message" => "טבלת waitlist_requests לא קיימת",
                "debug_rows" => [],
            ];
        }

        $eventId = trim((string)$eventId);
        $availableCount = (int)$availableCount;
        $availableStandNormalized = waitlist_normalize_stand($availableStand);
        $availableSeatsNormalized = waitlist_normalize_seat_list($availableSeats);

        if ($availableCount <= 0) {
            $availableCount = count($availableSeatsNormalized);
        }

        $debugRows = [];

        $activeOffer = waitlist_find_active_offer_for_event_seats($conn, $eventId, $availableSeatsNormalized);
        if ($activeOffer !== null) {
            return [
                "success" => false,
                "message" => "כבר קיימת הצעה פעילה לממתין קודם באירוע זה. יש להמתין לסיום 90 הדקות, לרכישה או לסירוב לפני מעבר לממתין הבא.",
                "active_offer" => [
                    "id" => (int)($activeOffer["id"] ?? 0),
                    "username" => (string)($activeOffer["username"] ?? ""),
                    "queue_position" => isset($activeOffer["queue_position"]) ? (int)$activeOffer["queue_position"] : null,
                    "offered_seats" => waitlist_normalize_seat_list($activeOffer["offered_seats"] ?? ""),
                    "offer_expires_at" => (string)($activeOffer["offer_expires_at"] ?? ""),
                ],
                "debug_rows" => [],
            ];
        }

        $candidates = waitlist_fetch_waiting_candidates($conn, $eventId, $afterQueuePosition);

        foreach ($candidates as $row) {
            $rowStandNormalized = waitlist_normalize_stand($row["stand"] ?? "");
            $rowSelectionMode = trim((string)($row["selection_mode"] ?? "zone"));
            $rowTicketsCount = (int)($row["tickets_count"] ?? 0);
            $requestedSeats = waitlist_normalize_seat_list(
                !empty($row["selected_seats_short"])
                    ? $row["selected_seats_short"]
                    : ($row["selected_seats"] ?? "")
            );

            if ($rowTicketsCount <= 0) {
                $debugRows[] = waitlist_build_candidate_debug($row, "כמות כרטיסים לא תקינה בבקשה");
                continue;
            }

            if ($availableStandNormalized !== "" && $rowStandNormalized !== "" && $rowStandNormalized !== $availableStandNormalized) {
                $debugRows[] = waitlist_build_candidate_debug($row, "יציע לא תואם");
                continue;
            }

            if ($rowTicketsCount > $availableCount) {
                $debugRows[] = waitlist_build_candidate_debug($row, "אין מספיק כרטיסים פנויים עבור הבקשה");
                continue;
            }

            if ($rowSelectionMode === "seats") {
                if (count($requestedSeats) !== $rowTicketsCount) {
                    $debugRows[] = waitlist_build_candidate_debug($row, "מספר המושבים שסומנו בבקשה אינו תקין", [
                    "requested_seats" => $requestedSeats,
                    "available_seats" => $availableSeatsNormalized,
                ]);
                    continue;
                }

                if (empty($availableSeatsNormalized)) {
                    $debugRows[] = waitlist_build_candidate_debug($row, "הבקשה דורשת מושבים מדויקים אך לא נשלחו מושבים שהתפנו", [
                    "requested_seats" => $requestedSeats,
                    "available_seats" => $availableSeatsNormalized,
                ]);
                    continue;
                }

                $seatCompare = waitlist_compare_seat_lists($requestedSeats, $availableSeatsNormalized);
                if (empty($seatCompare["matched"])) {
                    $debugRows[] = waitlist_build_candidate_debug($row, "המושבים שהתפנו אינם תואמים למושבים שביקש המשתמש", [
                    "requested_seats" => $requestedSeats,
                    "available_seats" => $availableSeatsNormalized,
                    "requested_compare" => $seatCompare["requested_compare"],
                    "available_compare" => $seatCompare["available_compare"],
                ]);
                    continue;
                }

                $offeredSeats = array_values(array_map("waitlist_seat_compare_key", $requestedSeats));
                $markResult = waitlist_mark_as_offered($conn, $row, $offeredSeats, $resultText);

                if (!empty($markResult["success"])) {
                    $markResult["match_reason"] = "התאמה מלאה למושבים שסומנו מראש";
                    $markResult["debug_rows"] = $debugRows;
                    return $markResult;
                }

                $debugRows[] = waitlist_build_candidate_debug($row, "נמצא מועמד אך עדכון ההצעה נכשל");
                continue;
            }

            $offeredSeats = !empty($availableSeatsNormalized)
                ? waitlist_take_first_n_seats($availableSeatsNormalized, $rowTicketsCount)
                : [];

            $markResult = waitlist_mark_as_offered($conn, $row, $offeredSeats, $resultText);
            if (!empty($markResult["success"])) {
                $markResult["match_reason"] = !empty($offeredSeats)
                    ? "התאמה לפי יציע וכמות כרטיסים"
                    : "התאמה לפי יציע וכמות כרטיסים ללא פירוט מושבים";
                $markResult["debug_rows"] = $debugRows;
                return $markResult;
            }

            $debugRows[] = waitlist_build_candidate_debug($row, "נמצא מועמד אך עדכון ההצעה נכשל");
        }

        return [
            "success" => false,
            "message" => "לא נמצאה בקשת המתנה מתאימה",
            "debug_rows" => $debugRows,
        ];
    }
}


if (!function_exists("waitlist_decline_active_offer_and_promote")) {
    function waitlist_decline_active_offer_and_promote($conn, $eventId)
    {
        if (!waitlist_table_exists($conn, "waitlist_requests")) {
            return [
                "success" => false,
                "message" => "טבלת waitlist_requests לא קיימת",
            ];
        }

        $eventId = trim((string)$eventId);
        if ($eventId === "") {
            return [
                "success" => false,
                "message" => "לא נבחר אירוע",
            ];
        }

        $stmt = $conn->prepare(
            "SELECT id, event_id, stand, tickets_count, offered_seats, offered_seats_count, queue_position
             FROM waitlist_requests
             WHERE event_id = ?
               AND status = 'offered'
               AND (offer_expires_at IS NULL OR offer_expires_at >= NOW())
             ORDER BY queue_position ASC, id ASC
             LIMIT 1"
        );

        if (!$stmt) {
            throw new Exception("שגיאה בשליפת הצעה פעילה: " . $conn->error);
        }

        $stmt->bind_param("s", $eventId);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result ? $result->fetch_assoc() : null;
        $stmt->close();

        if (!$row) {
            return [
                "success" => false,
                "message" => "אין הצעה פעילה שאפשר להעביר לממתין הבא",
            ];
        }

        $requestId = (int)($row["id"] ?? 0);
        $status = "declined";
        $emailStatus = "declined";
        $resultText = "המשתמש סירב או לא השלים רכישה, ההצעה הועברה לממתין הבא";
        $clearDate = null;

        $update = $conn->prepare(
            "UPDATE waitlist_requests
             SET status = ?,
                 email_status = ?,
                 result = ?,
                 offer_expires_at = ?,
                 updated_at = NOW()
             WHERE id = ?
               AND status = 'offered'"
        );

        if (!$update) {
            throw new Exception("שגיאה בעדכון סירוב להצעה: " . $conn->error);
        }

        $update->bind_param("ssssi", $status, $emailStatus, $resultText, $clearDate, $requestId);
        $update->execute();
        $update->close();

        $availableSeats = waitlist_normalize_seat_list($row["offered_seats"] ?? "");
        $availableCount = !empty($availableSeats)
            ? count($availableSeats)
            : max((int)($row["offered_seats_count"] ?? 0), (int)($row["tickets_count"] ?? 0));

        $promotion = waitlist_find_and_offer_next(
            $conn,
            (string)($row["event_id"] ?? ""),
            $availableCount,
            (string)($row["stand"] ?? ""),
            $availableSeats,
            "ההצעה הקודמת נסגרה והועברה לממתין הבא ל-90 דקות",
            isset($row["queue_position"]) ? (int)$row["queue_position"] : null
        );

        return [
            "success" => !empty($promotion["success"]),
            "message" => !empty($promotion["success"])
                ? "ההצעה הפעילה נסגרה והועברה לממתין הבא"
                : "ההצעה הפעילה נסגרה, אבל לא נמצא ממתין הבא מתאים",
            "declined_request_id" => $requestId,
            "promotion_result" => $promotion,
        ];
    }
}

if (!function_exists("waitlist_expire_and_promote")) {
    function waitlist_expire_and_promote($conn, $eventId = null)
    {
        if (!waitlist_table_exists($conn, "waitlist_requests")) {
            return [];
        }

        $sql = "SELECT id, event_id, stand, tickets_count, offered_seats, offered_seats_count, queue_position
                FROM waitlist_requests
                WHERE status = 'offered'
                  AND offer_expires_at IS NOT NULL
                  AND offer_expires_at < NOW()";

        $types = "";
        $params = [];

        if ($eventId !== null && trim((string)$eventId) !== "") {
            $sql .= " AND event_id = ?";
            $types = "s";
            $params[] = trim((string)$eventId);
        }

        $sql .= " ORDER BY event_id ASC, queue_position ASC, id ASC";

        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("שגיאה בהכנת שאילתת פגי תוקף: " . $conn->error);
        }

        if ($types !== "") {
            $stmt->bind_param($types, ...$params);
        }

        $stmt->execute();
        $result = $stmt->get_result();
        $expiredRows = [];
        while ($row = $result->fetch_assoc()) {
            $expiredRows[] = $row;
        }
        $stmt->close();

        $promotions = [];

        foreach ($expiredRows as $row) {
            $requestId = (int)($row["id"] ?? 0);
            if ($requestId <= 0) {
                continue;
            }

            $expireText = "פג תוקף להצעת הרכישה";
            $expireStatus = "expired";
            $expireEmailStatus = "expired";
            $clearValue = null;

            $update = $conn->prepare(
                "UPDATE waitlist_requests
                 SET status = ?,
                     email_status = ?,
                     result = ?,
                     offer_expires_at = ?,
                     updated_at = NOW()
                 WHERE id = ?
                   AND status = 'offered'"
            );

            if (!$update) {
                throw new Exception("שגיאה בעדכון סטטוס פג תוקף: " . $conn->error);
            }

            $update->bind_param(
                "ssssi",
                $expireStatus,
                $expireEmailStatus,
                $expireText,
                $clearValue,
                $requestId
            );
            $update->execute();
            $update->close();

            $availableSeats = waitlist_normalize_seat_list($row["offered_seats"] ?? "");
            $availableCount = !empty($availableSeats)
                ? count($availableSeats)
                : max((int)($row["offered_seats_count"] ?? 0), (int)($row["tickets_count"] ?? 0));

            if ($availableCount <= 0) {
                continue;
            }

            $promotion = waitlist_find_and_offer_next(
                $conn,
                (string)($row["event_id"] ?? ""),
                $availableCount,
                (string)($row["stand"] ?? ""),
                $availableSeats,
                "פג תוקף להצעת הרכישה וההצעה הועברה לממתין הבא ל-90 דקות",
                isset($row["queue_position"]) ? (int)$row["queue_position"] : null
            );

            $promotions[] = [
                "expired_request_id" => $requestId,
                "event_id" => (string)($row["event_id"] ?? ""),
                "promotion_result" => $promotion,
            ];
        }

        return $promotions;
    }
}

?>
