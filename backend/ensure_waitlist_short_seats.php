<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: text/html; charset=UTF-8');

$host = '127.0.0.1';
$dbName = 'sportevent';
$dbUser = 'root';
$dbPass = '';

$conn = new mysqli($host, $dbUser, $dbPass, $dbName);

if ($conn->connect_error) {
    die('שגיאה בחיבור למסד: ' . htmlspecialchars($conn->connect_error, ENT_QUOTES, 'UTF-8'));
}

$conn->set_charset('utf8mb4');

function h($value)
{
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}

function column_exists($conn, $tableName, $columnName)
{
    $safeTable = $conn->real_escape_string($tableName);
    $safeColumn = $conn->real_escape_string($columnName);
    $sql = "SHOW COLUMNS FROM `{$safeTable}` LIKE '{$safeColumn}'";
    $result = $conn->query($sql);
    return $result && $result->num_rows > 0;
}

function short_section_name($section)
{
    $section = trim((string)$section);
    if ($section === '') {
        return '';
    }

    $map = [
        'מערבי' => 'M',
        'מזרחי' => 'E',
        'צפוני' => 'N',
        'דרומי' => 'S',
        'מרכזי' => 'C',
        'משפחות' => 'F',
        'VIP' => 'VIP',
        'WEST' => 'W',
        'EAST' => 'E',
        'NORTH' => 'N',
        'SOUTH' => 'S',
        'CENTER' => 'C',
        'FAMILY' => 'F'
    ];

    if (isset($map[$section])) {
        return $map[$section];
    }

    $upper = strtoupper($section);
    if (isset($map[$upper])) {
        return $map[$upper];
    }

    if (function_exists('mb_substr')) {
        return strtoupper(mb_substr($section, 0, 1, 'UTF-8'));
    }

    return strtoupper(substr($section, 0, 1));
}

function compact_seat_label($seatText)
{
    $seatText = trim((string)$seatText);

    if ($seatText === '') {
        return '';
    }

    if (preg_match('/^[A-Z]+-\d+-\d+$/u', $seatText)) {
        return $seatText;
    }

    if (preg_match('/([A-Za-z]+)-R(\d+)-S(\d+)$/u', $seatText, $matches)) {
        return short_section_name($matches[1]) . '-' . $matches[2] . '-' . $matches[3];
    }

    if (preg_match('/^([A-Za-zא-ת]+)-(\d+)-(\d+)$/u', $seatText, $matches)) {
        return short_section_name($matches[1]) . '-' . $matches[2] . '-' . $matches[3];
    }

    if (
        preg_match(
            '/(?:יציע|section)?\s*([A-Za-zא-ת]+)\s*(?:\||,)?\s*שורה\s*(\d+)\s*(?:\||,)?\s*(?:כסא|כיסא|מושב|seat)\s*(\d+)/u',
            $seatText,
            $matches
        )
    ) {
        return short_section_name($matches[1]) . '-' . $matches[2] . '-' . $matches[3];
    }

    return $seatText;
}

function normalize_seat_list($value)
{
    if (is_string($value)) {
        $decoded = json_decode($value, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $value = $decoded;
        }
    }

    if (!is_array($value)) {
        return [];
    }

    $result = [];
    foreach ($value as $seat) {
        $short = compact_seat_label($seat);
        if ($short !== '') {
            $result[] = $short;
        }
    }

    return array_values(array_unique(array_filter($result)));
}

if (!column_exists($conn, 'waitlist_requests', 'selected_seats_short')) {
    $conn->query("ALTER TABLE `waitlist_requests` ADD COLUMN `selected_seats_short` TEXT NULL AFTER `selected_seats`");
}

if (!column_exists($conn, 'waitlist_requests', 'selected_seats_count')) {
    $conn->query("ALTER TABLE `waitlist_requests` ADD COLUMN `selected_seats_count` INT NOT NULL DEFAULT 0 AFTER `selected_seats_short`");
}

if (!column_exists($conn, 'waitlist_requests', 'offered_seats_count')) {
    $conn->query("ALTER TABLE `waitlist_requests` ADD COLUMN `offered_seats_count` INT NOT NULL DEFAULT 0 AFTER `offered_seats`");
}

$result = $conn->query("SELECT id, selected_seats, offered_seats FROM waitlist_requests ORDER BY id ASC");

$updated = [];
$updatedCount = 0;

while ($row = $result->fetch_assoc()) {
    $selectedSeatsShort = normalize_seat_list($row['selected_seats']);
    $offeredSeatsShort = normalize_seat_list($row['offered_seats']);

    $selectedSeatsShortJson = json_encode($selectedSeatsShort, JSON_UNESCAPED_UNICODE);
    $selectedSeatsCount = count($selectedSeatsShort);
    $offeredSeatsCount = count($offeredSeatsShort);

    $stmt = $conn->prepare("
        UPDATE waitlist_requests
        SET selected_seats_short = ?, selected_seats_count = ?, offered_seats_count = ?
        WHERE id = ?
    ");
    $stmt->bind_param('siii', $selectedSeatsShortJson, $selectedSeatsCount, $offeredSeatsCount, $row['id']);
    $stmt->execute();
    $stmt->close();

    $updated[] = [
        'id' => $row['id'],
        'selected_seats_short' => implode(', ', $selectedSeatsShort),
        'selected_seats_count' => $selectedSeatsCount,
        'offered_seats_count' => $offeredSeatsCount
    ];
    $updatedCount++;
}

$conn->close();
?>
<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>עדכון selected_seats_short</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f5f7fb; padding: 24px; }
    .box { background: #fff; padding: 20px; border-radius: 14px; box-shadow: 0 4px 18px rgba(0,0,0,0.08); }
    table { width: 100%; border-collapse: collapse; margin-top: 18px; }
    th, td { border: 1px solid #d9e2ef; padding: 10px; text-align: right; vertical-align: top; }
    th { background: #eef4ff; }
    .ok { color: #126c2f; font-weight: bold; }
  </style>
</head>
<body>
  <div class="box">
    <h1>העדכון הושלם</h1>
    <p class="ok">עודכנו <?php echo h($updatedCount); ?> רשומות בטבלת waitlist_requests.</p>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>selected_seats_short</th>
          <th>selected_seats_count</th>
          <th>offered_seats_count</th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($updated as $row): ?>
          <tr>
            <td><?php echo h($row['id']); ?></td>
            <td><?php echo h($row['selected_seats_short']); ?></td>
            <td><?php echo h($row['selected_seats_count']); ?></td>
            <td><?php echo h($row['offered_seats_count']); ?></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</body>
</html>