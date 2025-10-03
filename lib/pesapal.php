<?php
// lib/pesapal.php - Helper functions for Pesapal v3
// Requires: config/pesapal.php

if (!function_exists('json_response')) {
  function json_response($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
  }
}

require_once __DIR__ . '/../config/pesapal.php';

function pesapal_http_post_json($url, $body, $headers = []) {
  $ch = curl_init($url);
  $defaultHeaders = [
    'Accept: application/json',
    'Content-Type: application/json'
  ];
  $headers = array_merge($defaultHeaders, $headers);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_TIMEOUT => 30,
  ]);
  $respBody = curl_exec($ch);
  $err = curl_error($ch);
  $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($err) {
    throw new Exception('HTTP POST failed: ' . $err);
  }
  $decoded = json_decode($respBody, true);
  if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
    throw new Exception('Invalid JSON response from Pesapal: ' . $respBody);
  }
  return [$status, $decoded];
}

function pesapal_http_get($url, $headers = []) {
  $ch = curl_init($url);
  $defaultHeaders = [
    'Accept: application/json',
  ];
  $headers = array_merge($defaultHeaders, $headers);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_TIMEOUT => 30,
  ]);
  $respBody = curl_exec($ch);
  $err = curl_error($ch);
  $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($err) {
    throw new Exception('HTTP GET failed: ' . $err);
  }
  $decoded = json_decode($respBody, true);
  if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
    throw new Exception('Invalid JSON response from Pesapal: ' . $respBody);
  }
  return [$status, $decoded];
}

function pesapal_get_token() {
  $cfg = pesapal_config();
  $endpoints = pesapal_endpoints();
  if (empty($cfg['consumer_key']) || empty($cfg['consumer_secret'])) {
    throw new Exception('Pesapal consumer key/secret not set. Configure environment variables.');
  }
  [$status, $resp] = pesapal_http_post_json($endpoints['token'], [
    'consumer_key' => $cfg['consumer_key'],
    'consumer_secret' => $cfg['consumer_secret'],
  ]);
  if ($status !== 200 || empty($resp['token'])) {
    $msg = isset($resp['message']) ? $resp['message'] : 'Failed to obtain token';
    throw new Exception('Pesapal token error: ' . $msg);
  }
  return $resp['token'];
}

function pesapal_submit_order($order) {
  $endpoints = pesapal_endpoints();
  $token = pesapal_get_token();
  [$status, $resp] = pesapal_http_post_json($endpoints['submit'], $order, [
    'Authorization: Bearer ' . $token,
  ]);
  if ($status !== 200 || empty($resp['redirect_url'])) {
    $msg = isset($resp['error']) && $resp['error'] ? json_encode($resp['error']) : (isset($resp['message']) ? $resp['message'] : 'SubmitOrderRequest failed');
    throw new Exception('Pesapal submit error: ' . $msg);
  }
  return $resp; // contains order_tracking_id, merchant_reference, redirect_url, status, error
}

function pesapal_get_status($orderTrackingId) {
  $endpoints = pesapal_endpoints();
  $token = pesapal_get_token();
  $url = $endpoints['status'] . '?orderTrackingId=' . urlencode($orderTrackingId);
  [$status, $resp] = pesapal_http_get($url, [
    'Authorization: Bearer ' . $token,
  ]);
  if ($status !== 200) {
    $msg = isset($resp['message']) ? $resp['message'] : 'GetTransactionStatus failed';
    throw new Exception('Pesapal status error: ' . $msg);
  }
  return $resp;
}
