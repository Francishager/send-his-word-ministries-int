<?php
// Pesapal API v3 configuration
// IMPORTANT: Do NOT commit real credentials. Use environment variables in production.

// Load .env (if present) to populate environment variables locally
if (!function_exists('shwmi_load_env')) {
  function shwmi_load_env() {
    $envPath = __DIR__ . '/.env';
    if (is_file($envPath)) {
      $lines = @file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
      if ($lines !== false) {
        foreach ($lines as $line) {
          $line = trim($line);
          if ($line === '' || substr($line, 0, 1) === '#') continue;
          $parts = explode('=', $line, 2);
          if (count($parts) !== 2) continue;
          $name = trim($parts[0]);
          $value = trim($parts[1]);
          $value = trim($value, "\"' ");
          if ($name !== '') {
            putenv("$name=$value");
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
          }
        }
      }
    }
  }
}

shwmi_load_env();

$PESAPAL_ENV = getenv('PESAPAL_ENV') ?: 'sandbox'; // 'sandbox' or 'live'
$PESAPAL_CONSUMER_KEY = getenv('PESAPAL_CONSUMER_KEY') ?: 'YOUR_CONSUMER_KEY_HERE';
$PESAPAL_CONSUMER_SECRET = getenv('PESAPAL_CONSUMER_SECRET') ?: 'YOUR_CONSUMER_SECRET_HERE';
// Callback must be publicly accessible. Update to your deployed URL.
$PESAPAL_CALLBACK_URL = getenv('PESAPAL_CALLBACK_URL') ?: 'https://your-domain.com/api/pesapal/callback.php';
// IPN ID obtained after registering your IPN URL with Pesapal (RegisterIPNURL endpoint)
$PESAPAL_IPN_ID = getenv('PESAPAL_IPN_ID') ?: '';

// Load local credentials override if present (not committed)
// Create file at config/credentials.php to override the above variables securely.
if (file_exists(__DIR__ . '/credentials.php')) {
  require __DIR__ . '/credentials.php';
}

$PESAPAL_ENDPOINTS = [
  'sandbox' => [
    'token' => 'https://cybqa.pesapal.com/pesapalv3/api/Auth/RequestToken',
    'submit' => 'https://cybqa.pesapal.com/pesapalv3/api/Transactions/SubmitOrderRequest',
    'status' => 'https://cybqa.pesapal.com/pesapalv3/api/Transactions/GetTransactionStatus',
    'register_ipn' => 'https://cybqa.pesapal.com/pesapalv3/api/URLSetup/RegisterIPN',
  ],
  'live' => [
    'token' => 'https://pay.pesapal.com/v3/api/Auth/RequestToken',
    'submit' => 'https://pay.pesapal.com/v3/api/Transactions/SubmitOrderRequest',
    'status' => 'https://pay.pesapal.com/v3/api/Transactions/GetTransactionStatus',
    'register_ipn' => 'https://pay.pesapal.com/v3/api/URLSetup/RegisterIPN',
  ],
];

function pesapal_endpoints() {
  global $PESAPAL_ENV, $PESAPAL_ENDPOINTS;
  $env = strtolower($PESAPAL_ENV) === 'live' ? 'live' : 'sandbox';
  return $PESAPAL_ENDPOINTS[$env];
}

function pesapal_config() {
  global $PESAPAL_ENV, $PESAPAL_CONSUMER_KEY, $PESAPAL_CONSUMER_SECRET, $PESAPAL_CALLBACK_URL, $PESAPAL_IPN_ID;
  return [
    'env' => $PESAPAL_ENV,
    'consumer_key' => $PESAPAL_CONSUMER_KEY,
    'consumer_secret' => $PESAPAL_CONSUMER_SECRET,
    'callback_url' => $PESAPAL_CALLBACK_URL,
    'ipn_id' => $PESAPAL_IPN_ID,
  ];
}
