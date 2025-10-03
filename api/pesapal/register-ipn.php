<?php
// api/pesapal/register-ipn.php
// Utility endpoint to register an IPN URL with Pesapal and obtain ipn_id.
// IMPORTANT: Protect or delete this endpoint after use.

header('Content-Type: application/json');

try {
  require_once __DIR__ . '/../../lib/pesapal.php';
  $cfg = pesapal_config();
  $endpoints = pesapal_endpoints();

  $url = isset($_GET['url']) ? trim($_GET['url']) : '';
  if ($url === '') {
    // Attempt to guess a public URL; best to pass ?url= explicitly
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $url = $scheme . '://' . $host . '/api/pesapal/ipn.php';
  }
  $notificationType = strtoupper($_GET['type'] ?? 'GET'); // GET or POST

  // Get token
  $token = pesapal_get_token();

  // Register IPN
  [$status, $resp] = pesapal_http_post_json($endpoints['register_ipn'], [
    'url' => $url,
    'ipn_notification_type' => $notificationType,
  ], [
    'Authorization: Bearer ' . $token,
  ]);

  if ($status !== 200 || empty($resp['ipn_id'])) {
    $msg = isset($resp['error']) && $resp['error'] ? json_encode($resp['error']) : (isset($resp['message']) ? $resp['message'] : 'RegisterIPN failed');
    throw new Exception($msg);
  }

  echo json_encode([
    'ok' => true,
    'ipn_id' => $resp['ipn_id'],
    'ipn_status' => $resp['ipn_status_description'] ?? null,
    'notification_type' => $resp['ipn_notification_type_description'] ?? null,
    'url' => $resp['url'] ?? $url,
    'created_date' => $resp['created_date'] ?? null,
  ]);
} catch (Throwable $e) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
