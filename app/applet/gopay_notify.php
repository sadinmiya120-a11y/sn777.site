<?php
ob_start();
include("../serive/samparka.php");

function notifyLog($m){
    file_put_contents(
        __DIR__.'/gopay_notify_log.txt',
        date('Y-m-d H:i:s')." | ".$m.PHP_EOL,
        FILE_APPEND
    );
}

$rawData = $_POST;
notifyLog("CALLBACK RECEIVED FROM GOPAY: " . json_encode($rawData));

if (empty($rawData)) {
    notifyLog("ERROR: Empty POST data received.");
    die("fail");
}

/* ================= CONFIGURATION ================= */
$config = require 'gopayconfig.php';
$secret_key = trim($config['secret_key']); // 87a89555480aae027ad84daf666602d7

/* ================= SIGNATURE VERIFICATION ================= */
$sign_params = $rawData;
unset($sign_params['sign'], $sign_params['signType'], $sign_params['sign_type']);
ksort($sign_params);

$sign_parts = [];
foreach ($sign_params as $key => $value) {
    if ($value !== '' && $value !== null) { 
        $sign_parts[] = $key . '=' . $value;
    }
}
$signStr = implode('&', $sign_parts);
$signStr .= '&key=' . $secret_key;

$localSign = md5($signStr);
$gateSign = isset($rawData['sign']) ? strtolower($rawData['sign']) : '';

if ($localSign !== $gateSign) {
    notifyLog("SIGN MISMATCH | Local: $localSign | Gateway: $gateSign");
    die("fail"); 
}

notifyLog("SIGNATURE VERIFIED SUCCESSFULLY");

/* ================= ORDER PROCESSING ================= */
$mch_order_no = mysqli_real_escape_string($conn, $rawData['mchOrderNo']); 
$trade_amount = floatval($rawData['amount']); 
$tradeResult  = $rawData['tradeResult']; 

$orderQ = mysqli_query($conn, "SELECT balakedara, sthiti FROM thevani WHERE dharavahi='$mch_order_no'");
$order  = mysqli_fetch_assoc($orderQ);

if (!$order) {
    notifyLog("ERROR: Order No $mch_order_no not found in Database.");
    die("fail");
}

$uid = $order['balakedara'];
$current_status = $order['sthiti'];

if ($current_status == '1') {
    notifyLog("WARNING: Order No $mch_order_no already processed.");
    echo "success";
    exit;
}

if ($tradeResult === '1') {
    $updateOrder = mysqli_query($conn, "UPDATE thevani SET sthiti='1' WHERE dharavahi='$mch_order_no'");
    $updateWallet = mysqli_query($conn, "UPDATE shonu_kaichila SET motta = motta + $trade_amount WHERE balakedara = '$uid'");

    if ($updateOrder && $updateWallet) {
        notifyLog("SUCCESS: Balance updated for UID: $uid | Amount: $trade_amount | Order: $mch_order_no");
        echo "success"; 
        exit;
    } else {
        notifyLog("ERROR: Database update failed for Order: $mch_order_no");
        die("fail");
    }
} else {
    mysqli_query($conn, "UPDATE thevani SET sthiti='2' WHERE dharavahi='$mch_order_no'");
    notifyLog("FAILED: Gateway sent failure status for Order: $mch_order_no");
    echo "success"; 
    exit;
}
ob_end_flush();
?>
