<?php
// api/pesapal/callback.php
// This is the return URL configured in SubmitOrderRequest.callback_url
// It receives the user back from Pesapal after payment. We fetch status and show a simple receipt.

require_once __DIR__ . '/../../lib/pesapal.php';

$orderTrackingId = isset($_GET['OrderTrackingId']) ? $_GET['OrderTrackingId'] : (isset($_GET['orderTrackingId']) ? $_GET['orderTrackingId'] : null);

function h($s){ return htmlspecialchars($s ?? '', ENT_QUOTES, 'UTF-8'); }

?><!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Status - SHWMI</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/site.css">
</head>
<body>
  <div class="container py-5">
    <h1 class="h3 mb-4">Payment Status</h1>
<?php
if (!$orderTrackingId) {
  echo '<div class="alert alert-danger">Missing OrderTrackingId.</div>';
  echo '<a href="/give.html" class="btn btn-primary">Back to Giving</a>';
  echo '</div></body></html>';
  exit;
}

try {
  $status = pesapal_get_status($orderTrackingId);
  // Common fields include: payment_method, amount, created_date, confirmation_code,
  // payment_account, description, message, status_code, status, merchant_reference
  $state = $status['status'] ?? 'UNKNOWN';
  $msg = $status['message'] ?? '';
  $amount = $status['amount'] ?? '';
  $method = $status['payment_method'] ?? '';
  $ref = $status['merchant_reference'] ?? '';
  $conf = $status['confirmation_code'] ?? '';

  $isSuccess = (strtoupper($state) === 'COMPLETED' || ($status['status_code'] ?? '') === 1);
  $alert = $isSuccess ? 'success' : (strtoupper($state) === 'PENDING' ? 'warning' : 'danger');
  echo '<div class="alert alert-' . $alert . '">Status: ' . h($state) . (!empty($msg) ? ' - ' . h($msg) : '') . '</div>';
  echo '<div class="card"><div class="card-body">';
  echo '<div class="row g-3">';
  echo '<div class="col-md-6"><strong>Amount:</strong> ' . h($amount) . '</div>';
  echo '<div class="col-md-6"><strong>Method:</strong> ' . h($method) . '</div>';
  echo '<div class="col-md-6"><strong>Reference:</strong> ' . h($ref) . '</div>';
  echo '<div class="col-md-6"><strong>Confirmation Code:</strong> ' . h($conf) . '</div>';
  echo '<div class="col-12"><strong>Order Tracking ID:</strong> ' . h($orderTrackingId) . '</div>';
  echo '</div></div></div>';

} catch (Throwable $e) {
  echo '<div class="alert alert-danger">Failed to fetch status: ' . h($e->getMessage()) . '</div>';
}
?>
    <a href="/give.html" class="btn btn-outline-primary mt-3">Back to Giving</a>
  </div>
</body>
</html>
