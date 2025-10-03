<?php
// Simple contact form handler
// Returns JSON, handles honeypot, validates, and attempts to send mail.

header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

function respond($ok, $message, $code = 200) {
  http_response_code($ok ? 200 : $code);
  if ($ok) {
    echo json_encode(['ok' => true, 'message' => $message]);
  } else {
    echo json_encode(['ok' => false, 'error' => $message]);
  }
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  respond(false, 'Invalid request method.', 405);
}

// Read inputs
$name = trim($_POST['name'] ?? '');
$email = trim($_POST['email'] ?? '');
$subject = trim($_POST['subject'] ?? '');
$message = trim($_POST['message'] ?? '');
$website = trim($_POST['website'] ?? ''); // honeypot

// Honeypot check
if ($website !== '') {
  respond(false, 'Spam detected.', 400);
}

// Basic validation
if ($name === '' || $email === '' || $message === '') {
  respond(false, 'Please fill in your name, email and message.', 422);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  respond(false, 'Please provide a valid email address.', 422);
}

// Build email
$to = 'info@shwmi.org'; // TODO: replace with your receiving address
$subjectLine = 'Website Contact: ' . ($subject !== '' ? $subject : 'New Message');
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$ua = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
$body = "Name: {$name}\nEmail: {$email}\nSubject: {$subject}\nIP: {$ip}\nUser-Agent: {$ua}\n\nMessage:\n{$message}\n";

$headers = [];
$headers[] = 'Content-Type: text/plain; charset=UTF-8';
$headers[] = 'From: SHWMI Website <no-reply@example.com>'; // Adjust domain for DMARC alignment
$headers[] = 'Reply-To: ' . $email;
$headersStr = implode("\r\n", $headers);

$mailed = false;
try {
  // @ to suppress warnings if mail() not configured
  $mailed = @mail($to, $subjectLine, $body, $headersStr);
} catch (Throwable $e) {
  $mailed = false;
}

// Fallback: log to storage if mail fails (so UX still succeeds)
if (!$mailed) {
  $storageDir = __DIR__ . '/storage';
  if (!is_dir($storageDir)) {
    @mkdir($storageDir, 0777, true);
  }
  $logFile = $storageDir . '/contact-messages.log';
  $stamp = date('c');
  @file_put_contents($logFile, "[{$stamp}]\n{$body}\n---\n", FILE_APPEND);
  respond(true, 'Message received. Thank you!');
}

respond(true, 'Message sent. Thank you!');
