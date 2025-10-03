<?php
// api/pesapal/create-order.php
// Creates a Pesapal hosted checkout order and returns redirect_url

header('Content-Type: application/json');

try {
  require_once __DIR__ . '/../../lib/pesapal.php';

  // Accept JSON or form-encoded
  $raw = file_get_contents('php://input');
  $data = json_decode($raw, true);
  if (!is_array($data)) {
    $data = $_POST ?? [];
  }

  // Simple honeypot
  if (!empty($data['website'])) {
    echo json_encode(['ok' => false, 'error' => 'Bot detected']);
    exit;
  }

  $amount = isset($data['amount']) ? floatval($data['amount']) : 0;
  $currency = isset($data['currency']) ? strtoupper(trim($data['currency'])) : '';
  $designation = isset($data['designation']) ? trim($data['designation']) : '';
  $first = isset($data['first_name']) ? trim($data['first_name']) : '';
  $last = isset($data['last_name']) ? trim($data['last_name']) : '';
  $email = isset($data['email']) ? trim($data['email']) : '';
  $phone = isset($data['phone']) ? trim($data['phone']) : '';
  $note = isset($data['note']) ? trim($data['note']) : '';

  if ($amount <= 0) {
    throw new Exception('Amount must be greater than zero');
  }
  // Enforce required fields
  if ($first === '' || $last === '') {
    throw new Exception('First name and last name are required');
  }
  if ($designation === '') {
    throw new Exception('Designation is required');
  }
  if ($email === '' || $phone === '') {
    throw new Exception('Both email and phone are required');
  }
  $allowedCurrencies = ['KES','UGX','TZS','USD','EUR','GBP'];
  if (!in_array($currency, $allowedCurrencies, true)) {
    throw new Exception('Unsupported currency');
  }

  $cfg = pesapal_config();
  $endpoints = pesapal_endpoints();

  // Map currency -> default country code
  $country = 'KE';
  switch ($currency) {
    case 'UGX': $country = 'UG'; break;
    case 'TZS': $country = 'TZ'; break;
    case 'USD': $country = 'US'; break;
    case 'GBP': $country = 'GB'; break;
    case 'EUR': $country = 'IE'; break;
    case 'KES': default: $country = 'KE'; break;
  }

  $merchant_reference = 'SHWMI-' . date('YmdHis') . '-' . substr(uniqid('', true), -6);
  $descBase = $designation;
  if ($note !== '') { $descBase .= ' - ' . $note; }
  // Pesapal description max 100 chars
  $description = mb_substr($descBase, 0, 100);

  $order = [
    'id' => $merchant_reference,
    'currency' => $currency,
    'amount' => round($amount, 2),
    'description' => $description,
    'callback_url' => $cfg['callback_url'],
    'branch' => 'Online',
    'billing_address' => [
      'email_address' => $email,
      'phone_number' => $phone,
      'country_code' => $country,
      'first_name' => $first ?: 'Friend',
      'middle_name' => '',
      'last_name' => $last ?: 'Donor',
      'line_1' => '',
      'line_2' => '',
      'city' => '',
      'state' => '',
      'postal_code' => '',
      'zip_code' => ''
    ]
  ];
  if (!empty($cfg['ipn_id'])) {
    $order['notification_id'] = $cfg['ipn_id'];
  }

  $resp = pesapal_submit_order($order);
  echo json_encode([
    'ok' => true,
    'redirect_url' => $resp['redirect_url'] ?? null,
    'order_tracking_id' => $resp['order_tracking_id'] ?? null,
    'merchant_reference' => $resp['merchant_reference'] ?? $merchant_reference,
    'status' => $resp['status'] ?? null,
  ]);
} catch (Throwable $e) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
