<?php
ob_start();
include("../serive/samparka.php"); 

if (!isset($_GET['uid']) || !isset($_GET['amount'])) { die("Illegal access: UID or Amount missing"); }

$uid   = mysqli_real_escape_string($conn, $_GET['uid']);
$ramt  = (int)$_GET['amount']; 
$reqMethod = isset($_GET['method']) ? strtolower(trim($_GET['method'])) : (isset($_GET['goods_name']) ? strtolower(trim($_GET['goods_name'])) : 'nagad');
$isBkash = (strpos($reqMethod, 'bkash') !== false);

$payName = $isBkash ? 'BKASH' : 'NAGAD';
$baseSerial = isset($_GET['order_no']) && !empty($_GET['order_no']) ? mysqli_real_escape_string($conn, $_GET['order_no']) : (date("Ymd").time().rand(100000,999999));
$createdate = date("Y-m-d H:i:s");

// ১. ডাটাবেজ থেকে মোবাইল নম্বর রিড করা
$mobile = '01700000000';
if (isset($conn) && $conn) {
    $q = mysqli_query($conn, "SELECT mobile FROM shonu_subjects WHERE id='$uid'");
    if ($q && $u = mysqli_fetch_array($q)) {
        $mobile = isset($u['mobile']) && !empty($u['mobile']) ? $u['mobile'] : '01700000000';
    }
}

/* ================= GOPAY API CONFIG ================= */
$config = require 'gopayconfig.php';
$app_id     = trim($config['app_id']);
$secretKey  = trim($config['secret_key']);
$apiUrl     = trim($config['api_url']);

$notifyURL = "https://sn777.site/pay1/gopay_notify.php";
$jumpURL   = "https://sn777.site/#/wallet/RechargeHistory"; 

$candidatePayTypes = $isBkash ? ["2202", "2201", "1002", "1001"] : ["2201", "2202", "1001", "1002"];
$cashierUrl = null;
$lastError = "FAIL";
$successfulSerial = $baseSerial;

for ($i = 0; $i < count($candidatePayTypes); $i++) {
    $pType = $candidatePayTypes[$i];
    $attemptSerial = ($i === 0) ? $baseSerial : ($baseSerial . "R" . $i);

    $postData = [
        'version'        => '1.0',
        'app_id'         => $app_id,
        'notify_url'     => $notifyURL,
        'page_url'       => $jumpURL,
        'mch_order_no'   => $attemptSerial,
        'pay_type'       => $pType,
        'trade_amount'   => (string)$ramt,
        'order_date'     => $createdate,
        'goods_name'     => $payName,
        'mch_return_msg' => 'OK'
    ];

    /* ================= SIGNATURE GENERATION ================= */
    $signParams = $postData;
    ksort($signParams);

    $signStr = "";
    foreach ($signParams as $k => $v) {
        if ($v !== '' && $v !== null) {
            $signStr .= $k . "=" . $v . "&";
        }
    }
    $signStr .= "key=" . $secretKey;
    $postData['sign'] = md5($signStr);
    $postData['sign_type'] = 'MD5';

    /* ================= SEND TO GOPAY API ================= */
    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
    $response = curl_exec($ch);
    curl_close($ch);

    $res = json_decode($response, true);
    if ($res && isset($res['respCode']) && $res['respCode'] === 'SUCCESS' && isset($res['payInfo']) && !empty($res['payInfo'])) {
        $cashierUrl = $res['payInfo'];
        $successfulSerial = $attemptSerial;
        break;
    } else if (isset($res['tradeMsg'])) {
        $lastError = $res['tradeMsg'];
    }
}

if (!$cashierUrl) {
    echo "<h3>gopay API ERROR: " . $lastError . "</h3>";
    exit;
}

// ইউজারের সিস্টেমে পেন্ডিং রেকর্ড ইনসার্ট
if (isset($conn) && $conn) {
    mysqli_query($conn, "INSERT INTO thevani (payid, balakedara, motta, dharavahi, mula, ullekha, duravani, ekikrtapavati, dinankavannuracisi, madari, pavatiaidi, sthiti) VALUES ('2', '$uid', '$ramt', '$successfulSerial', '$payName', 'N/A', '$mobile', '$payName', '$createdate', '1005', '2', '0')");
}

header("Location: " . $cashierUrl);
exit;
ob_end_flush();
?>
