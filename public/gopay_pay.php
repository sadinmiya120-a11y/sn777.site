<?php
// gopay_pay.php - Universal GOPay Gateway Handler
error_reporting(0);

$uid = $_GET['uid'] ?? $_POST['uid'] ?? '';
$amount = $_GET['amount'] ?? $_POST['amount'] ?? '200';
$rawMethod = strtolower($_GET['method'] ?? $_POST['method'] ?? $_GET['goods_name'] ?? $_POST['goods_name'] ?? 'bkash');
$order_no = $_GET['order_no'] ?? $_POST['order_no'] ?? ('ORD' . time() . rand(1000, 9999));

$app_id = "GP_97386700";
$secretKey = "87a89555480aae027ad84daf666602d7";
$apiUrl = "https://mch.go-pay.cyou/pay.php";

$isBkash = (strpos($rawMethod, 'bkash') !== false);
$isNagad = (strpos($rawMethod, 'nagad') !== false);
$pay_type = $isBkash ? "2202" : ($isNagad ? "2201" : "2202");
$goods_name = $isBkash ? "BKASH" : ($isNagad ? "NAGAD" : strtoupper($rawMethod));

$host = $_SERVER['HTTP_HOST'] ?? 'sn777.site';
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "https://";

$notify_url = $protocol . $host . '/pay1/gopay_notify.php';
$jump_url = $protocol . $host . '/#/wallet/RechargeHistory';
if (!empty($_GET['return_url'])) {
    $jump_url = $_GET['return_url'];
}

$postData = [
    'version' => '1.0',
    'app_id' => $app_id,
    'notify_url' => $notify_url,
    'page_url' => $jump_url,
    'mch_order_no' => $order_no,
    'pay_type' => $pay_type,
    'trade_amount' => number_format((float)$amount, 2, '.', ''),
    'order_date' => date('Y-m-d H:i:s'),
    'goods_name' => $goods_name,
    'mch_return_msg' => 'OK'
];

ksort($postData);
$signStr = "";
foreach ($postData as $k => $v) {
    if ($v !== "" && $v !== null) {
        $signStr .= $k . "=" . $v . "&";
    }
}
$signStr .= "key=" . $secretKey;
$postData['sign'] = md5($signStr);
$postData['sign_type'] = "MD5";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $apiUrl);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
$response = curl_exec($ch);
curl_close($ch);

$resData = json_decode($response, true);
$payInfo = $resData['payInfo'] ?? $resData['pay_url'] ?? $resData['data']['pay_url'] ?? $resData['data']['payInfo'] ?? null;

if (!empty($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => !empty($payInfo),
        'redirect_url' => $payInfo ?? '',
        'data' => $resData
    ]);
    exit;
}

if (!empty($payInfo)) {
    header("Location: " . $payInfo);
    exit;
} else {
    header('Content-Type: text/html; charset=utf-8');
    echo "<h3>পেমেন্ট গেটওয়েতে সংযোগ করতে সমস্যা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।</h3>";
    if (!empty($resData['tradeMsg'])) {
        echo "<p>Error: " . htmlspecialchars($resData['tradeMsg']) . "</p>";
    }
}
?>
