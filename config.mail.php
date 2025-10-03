<?php
// SMTP configuration for PHPMailer
// Fill these with your real SMTP credentials and addresses.
return [
  'host' => 'smtp.example.com', // e.g., smtp.gmail.com or your SMTP host
  'port' => 587,                // 587 (TLS) or 465 (SMTPS)
  'secure' => 'tls',            // 'tls' or 'ssl'
  'user' => 'smtp-username',    // SMTP username
  'pass' => 'smtp-password',    // SMTP password

  // Addresses
  'from_email' => 'no-reply@yourdomain.tld',
  'from_name'  => 'SHWMI Website',
  'to_email'   => 'info@shwmi.org',
  'to_name'    => 'SHWMI',
];
