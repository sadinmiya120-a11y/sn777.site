<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$uid = isset($_REQUEST['uid']) ? trim($_REQUEST['uid']) : '';
$amount = isset($_REQUEST['amount']) ? floatval($_REQUEST['amount']) : 0;
$method = isset($_REQUEST['method']) ? strtolower(trim($_REQUEST['method'])) : 'bkash';
$order_no = isset($_REQUEST['order_no']) ? trim($_REQUEST['order_no']) : '';

if (empty($order_no)) {
    $order_no = date('Ymd') . time() . rand(100000, 999999);
}

if (empty($uid) || $amount <= 0) {
    die("<h3>Illegal access: UID or Amount missing</h3>");
}

$app_id = "GP_97386700";
$secretKey = "87a89555480aae027ad84daf666602d7";
$apiUrl = "https://mch.go-pay.cyou/pay.php";

$proto = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
$host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'sn777.site';
$origin = $proto . '://' . $host;

$isBkash = (strpos($method, 'bkash') !== false);
$payName = $isBkash ? 'BKASH' : 'NAGAD';
$createdate = date('Y-m-d H:i:s');
$notifyURL = $origin . '/pay1/gopay_notify.php';
$jumpURL = $origin . '/#/wallet/RechargeHistory';

$candidatePayTypes = ["2201", "2202", "1001", "1002"];
$cashierUrl = "";
$lastErrorMsg = "Gateway Error";

foreach ($candidatePayTypes as $pType) {
    $postData = [
        'version' => '1.0',
        'app_id' => $app_id,
        'notify_url' => $notifyURL,
        'page_url' => $jumpURL,
        'mch_order_no' => $order_no,
        'pay_type' => $pType,
        'trade_amount' => number_format($amount, 2, '.', ''),
        'order_date' => $createdate,
        'goods_name' => $payName,
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
    $postData['sign_type'] = 'MD5';

    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $response = curl_exec($ch);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if ($response) {
        $resJson = json_decode($response, true);
        if (isset($resJson['respCode']) && $resJson['respCode'] === 'SUCCESS' && !empty($resJson['payInfo'])) {
            $cashierUrl = $resJson['payInfo'];
            break;
        } elseif (!empty($resJson['tradeMsg'])) {
            $lastErrorMsg = $resJson['tradeMsg'];
        }
    }
}

if (!empty($cashierUrl)) {
    if (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false) {
        header('Content-Type: application/json');
        echo json_encode(['success' => true, 'redirect_url' => $cashierUrl, 'payInfo' => $cashierUrl]);
        exit;
    }
    header("Location: " . $cashierUrl);
    exit;
} else {
    echo "<h3>GOPay API Error: " . htmlspecialchars($lastErrorMsg) . "</h3>";
    exit;
}
?>
