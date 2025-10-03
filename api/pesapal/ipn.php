<?php
// api/pesapal/ipn.php
// Pesapal IPN endpoint. Pesapal will call this URL when a transaction status changes.
// We acknowledge the notification and (optionally) fetch latest status for logging.

require_once __DIR__ . '/../../lib/pesapal.php';

function h($s){ return htmlspecialchars($s ?? '', ENT_QUOTES, 'UTF-8'); }

// Basic logging (optional). Ensure directory is writable on your server.
$logDir = __DIR__ . '/../../storage/logs';
if (!is_dir($logDir)) {
  @mkdir($logDir, 0777, true);
}
$logFile = $logDir . '/pesapal_ipn.log';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$query = $_SERVER['QUERY_STRING'] ?? '';
$raw = file_get_contents('php://input');

$entry = [
  'time' => date('c'),
  'method' => $method,
  'query_string' => $query,
  'raw' => $raw,
];

$orderTrackingId = $_GET['OrderTrackingId']
  ?? $_GET['orderTrackingId']
  ?? null;

if (!$orderTrackingId && !empty($raw)) {
  $body = json_decode($raw, true);
  if (is_array($body)) {
    $orderTrackingId = $body['OrderTrackingId']
      ?? $body['orderTrackingId']
      ?? $body['order_tracking_id']
      ?? null;
  }
}

$statusData = null;
try {
  if ($orderTrackingId) {
    $statusData = pesapal_get_status($orderTrackingId);
    $entry['status'] = $statusData;
  }
} catch (Throwable $e) {
  $entry['status_error'] = $e->getMessage();
}

// write log
@file_put_contents($logFile, json_encode($entry, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL, FILE_APPEND);

// Respond 200 OK so Pesapal knows we received it
header('Content-Type: application/json');
echo json_encode([
  'ok' => true,
  'orderTrackingId' => $orderTrackingId,
  'status' => $statusData,
]);
