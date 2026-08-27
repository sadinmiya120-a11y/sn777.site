<?php
header("Content-Type: text/plain; charset=utf-8");
header("Access-Control-Allow-Origin: *");

$rawData = $_POST ? $_POST : $_GET;
if (empty($rawData)) {
    $rawInput = file_get_contents('php://input');
    if ($rawInput) {
        $decoded = json_decode($rawInput, true);
        if ($decoded) $rawData = $decoded;
    }
}

// Log notification
$logLine = date('Y-m-d H:i:s') . ' ' . json_encode($rawData) . PHP_EOL;
@file_put_contents(__DIR__ . '/gopay_callback.log', $logLine, FILE_APPEND);

echo "success";
?>
