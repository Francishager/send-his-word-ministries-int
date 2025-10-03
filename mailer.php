<?php
// PHPMailer-based contact handler returning JSON
// Requires: composer install (phpmailer/phpmailer) and config.mail.php

header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

function respond($ok, $message, $code = 200) {
  http_response_code($ok ? 200 : $code);
  echo json_encode($ok ? ['ok' => true, 'message' => $message] : ['ok' => false, 'error' => $message]);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  respond(false, 'Invalid request method.', 405);
}

// Inputs
$name = trim($_POST['name'] ?? '');
$email = trim($_POST['email'] ?? '');
$subject = trim($_POST['subject'] ?? '');
$message = trim($_POST['message'] ?? '');
$website = trim($_POST['website'] ?? ''); // honeypot

if ($website !== '') {
  respond(false, 'Spam detected.', 400);
}
if ($name === '' || $email === '' || $message === '') {
  respond(false, 'Please fill in your name, email and message.', 422);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  respond(false, 'Please provide a valid email address.', 422);
}

$subjectLine = 'Website Contact: ' . ($subject !== '' ? $subject : 'New Message');
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$ua = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
$body = "Name: {$name}\nEmail: {$email}\nSubject: {$subject}\nIP: {$ip}\nUser-Agent: {$ua}\n\nMessage:\n{$message}\n";

// Try PHPMailer
$PHPMailerAvailable = false;
try {
  require_once __DIR__ . '/vendor/autoload.php';
  $PHPMailerAvailable = class_exists('PHPMailer\\PHPMailer\\PHPMailer');
} catch (Throwable $e) {
  $PHPMailerAvailable = false;
}

$config = [];
$cfgFile = __DIR__ . '/config.mail.php';
if (is_readable($cfgFile)) {
  $config = include $cfgFile;
  if (!is_array($config)) { $config = []; }
}

$sent = false;

if ($PHPMailerAvailable && !empty($config['host']) && !empty($config['from_email']) && !empty($config['to_email'])) {
  try {
    $mail = new PHPMailer\PHPMailer\PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = (string)$config['host'];
    $mail->Port = (int)($config['port'] ?? 587);
    $mail->SMTPAuth = true;
    $mail->Username = (string)($config['user'] ?? '');
    $mail->Password = (string)($config['pass'] ?? '');

    $secure = strtolower((string)($config['secure'] ?? 'tls'));
    if ($secure === 'ssl' || $secure === 'smtps') {
      $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
    } else {
      $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
    }

    $mail->CharSet = 'UTF-8';
    $mail->setFrom((string)$config['from_email'], (string)($config['from_name'] ?? 'SHWMI Website'));
    $mail->addAddress((string)$config['to_email'], (string)($config['to_name'] ?? 'SHWMI'));
    $mail->addReplyTo($email, ($name !== '' ? $name : $email));

    $mail->isHTML(false);
    $mail->Subject = $subjectLine;
    $mail->Body = $body;
    $mail->AltBody = $body;

    $mail->send();
    $sent = true;
  } catch (Throwable $e) {
    $sent = false;
  }
}

// Fallback: native mail()
if (!$sent) {
  $to = (string)($config['to_email'] ?? 'info@shwmi.org');
  $headers = [];
  $headers[] = 'Content-Type: text/plain; charset=UTF-8';
  $fromEmail = (string)($config['from_email'] ?? 'no-reply@example.com');
  $headers[] = 'From: SHWMI Website <' . $fromEmail . '>';
  $headers[] = 'Reply-To: ' . $email;
  $headersStr = implode("\r\n", $headers);
  try {
    $sent = @mail($to, $subjectLine, $body, $headersStr);
  } catch (Throwable $e) {
    $sent = false;
  }
}

if (!$sent) {
  $storageDir = __DIR__ . '/storage';
  if (!is_dir($storageDir)) { @mkdir($storageDir, 0777, true); }
  $logFile = $storageDir . '/contact-messages.log';
  $stamp = date('c');
  @file_put_contents($logFile, "[{$stamp}]\n{$body}\n---\n", FILE_APPEND);
  respond(true, 'Message received. Thank you!');
}

respond(true, 'Message sent. Thank you!');
