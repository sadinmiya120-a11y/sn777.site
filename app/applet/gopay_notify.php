<?php
ob_start();

// অপশনাল ডাটাবেজ কানেকশন থাকলে লোড করবে, না থাকলে কোনো এরর হবে না
if (file_exists("../serive/samparka.php")) {
    @include_once("../serive/samparka.php");
}

function notifyLog($m){
    @file_put_contents(
        __DIR__.'/gopay_notify_log.txt',
        date('Y-m-d H:i:s')." | ".$m.PHP_EOL,
        FILE_APPEND
    );
}

$rawData = $_POST;
if (empty($rawData)) {
    // Check JSON payload if raw post is empty
    $rawInput = file_get_contents('php://input');
    if (!empty($rawInput)) {
        $jsonDecoded = json_decode($rawInput, true);
        if (is_array($jsonDecoded)) {
            $rawData = $jsonDecoded;
        }
    }
}

notifyLog("CALLBACK RECEIVED FROM GOPAY: " . json_encode($rawData));

if (empty($rawData)) {
    notifyLog("ERROR: Empty POST data received.");
    die("fail");
}

/* ================= CONFIGURATION ================= */
$config = file_exists(__DIR__.'/gopayconfig.php') ? require __DIR__.'/gopayconfig.php' : [
    'secret_key' => '87a89555480aae027ad84daf666602d7'
];
$secret_key = isset($config['secret_key']) ? trim($config['secret_key']) : '87a89555480aae027ad84daf666602d7';

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
    notifyLog("SIGN MISMATCH | Local: $localSign | Gateway: $gateSign | String: $signStr");
    die("fail"); 
}

notifyLog("SIGNATURE VERIFIED SUCCESSFULLY");

/* ================= ORDER PROCESSING ================= */
$mch_order_no = isset($rawData['mchOrderNo']) ? trim($rawData['mchOrderNo']) : (isset($rawData['mch_order_no']) ? trim($rawData['mch_order_no']) : '');
$trade_amount = isset($rawData['amount']) ? floatval($rawData['amount']) : (isset($rawData['trade_amount']) ? floatval($rawData['trade_amount']) : 0);
$tradeResult  = isset($rawData['tradeResult']) ? strval($rawData['tradeResult']) : (isset($rawData['trade_result']) ? strval($rawData['trade_result']) : '1');

// যদি MySQL ডাটাবেজ কানেক্টেড থাকে
if (isset($conn) && $conn) {
    $safe_order_no = mysqli_real_escape_string($conn, $mch_order_no);
    $orderQ = mysqli_query($conn, "SELECT balakedara, sthiti FROM thevani WHERE dharavahi='$safe_order_no'");
    $order  = $orderQ ? mysqli_fetch_assoc($orderQ) : null;

    if ($order) {
        $uid = $order['balakedara'];
        $current_status = $order['sthiti'];

        if ($current_status == '1') {
            notifyLog("WARNING: Order No $mch_order_no already processed.");
            echo "success";
            exit;
        }

        if ($tradeResult === '1' || $tradeResult === 'SUCCESS') {
            $updateOrder = mysqli_query($conn, "UPDATE thevani SET sthiti='1' WHERE dharavahi='$safe_order_no'");
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
            mysqli_query($conn, "UPDATE thevani SET sthiti='2' WHERE dharavahi='$safe_order_no'");
            notifyLog("FAILED: Gateway sent failure status for Order: $mch_order_no");
            echo "success"; 
            exit;
        }
    }
}

// লোকাল বা নোড ব্যাকএন্ডের জন্য সাকসেস মেসেজ রিটার্ন
notifyLog("PROCESSED: Order $mch_order_no verified successfully with result $tradeResult");
echo "success";
exit;
ob_end_flush();
?>
