<?php
ob_start();

// অপশনাল ডাটাবেজ ফাইল
if (file_exists("../serive/samparka.php")) {
    @include_once("../serive/samparka.php");
}

if (!isset($_GET['uid']) || !isset($_GET['amount'])) { 
    die("Illegal access: UID or Amount missing"); 
}

$uid        = htmlspecialchars($_GET['uid']);
$ramt       = (int)$_GET['amount']; 
$payName    = 'BKASH';
$serial     = isset($_GET['order_no']) && !empty($_GET['order_no']) ? htmlspecialchars($_GET['order_no']) : (date("Ymd").time().rand(100000,999999));
$createdate = date("Y-m-d H:i:s");

// ১. ডাটাবেজ থেকে মোবাইল নম্বর রিড করা (যদি থাকে)
$mobile = '01700000000';
if (isset($conn) && $conn) {
    $q = mysqli_query($conn, "SELECT mobile FROM shonu_subjects WHERE id='$uid'");
    if ($q && $u = mysqli_fetch_array($q)) {
        $mobile = isset($u['mobile']) && !empty($u['mobile']) ? $u['mobile'] : '01700000000';
    }
    // ২. পেন্ডিং রেকর্ড ইনসার্ট (যদি টেবিল থাকে)
    @mysqli_query($conn, "INSERT INTO thevani (payid, balakedara, motta, dharavahi, mula, ullekha, duravani, ekikrtapavati, dinankavannuracisi, madari, pavatiaidi, sthiti) VALUES ('2', '$uid', '$ramt', '$serial', '$payName', 'N/A', '$mobile', 'BKASH', '$createdate', '1005', '2', '0')");
}

/* ================= GOPAY API CONFIG ================= */
$config = file_exists(__DIR__.'/gopayconfig.php') ? require __DIR__.'/gopayconfig.php' : [
    'app_id'     => 'GP_97386700',
    'secret_key' => '87a89555480aae027ad84daf666602d7',
    'api_url'    => 'https://mch.go-pay.cyou/pay.php'
];

$app_id     = trim($config['app_id']);
$secretKey  = trim($config['secret_key']);
$apiUrl     = trim($config['api_url']);

$notifyURL = "https://sn777.site/pay1/gopay_notify.php";
$jumpURL   = "https://sn777.site/#/wallet/RechargeHistory"; 

$postData = [
    'version'        => '1.0',
    'app_id'         => $app_id,
    'notify_url'     => $notifyURL,
    'page_url'       => $jumpURL,
    'mch_order_no'   => $serial,
    'pay_type'       => "2202", // বিকাশ কোড
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

$sign = md5($signStr);
$postData['sign'] = $sign;
$postData['sign_type'] = 'MD5';

/* ================= SEND TO GOPAY API ================= */
$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
$response = curl_exec($ch);
curl_close($ch);

$res = json_decode($response, true);

if(!$res || !isset($res['respCode']) || $res['respCode'] !== 'SUCCESS' || !isset($res['payInfo'])){
    echo "<h3>GOPAY API ERROR: " . (isset($res['tradeMsg']) ? $res['tradeMsg'] : 'FAIL') . "</h3>";
    exit;
}

header("Location: " . $res['payInfo']);
exit;
ob_end_flush();
?>
