import { md5 } from "./md5.js";

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  let rawData = {};
  if (request.method === "POST") {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        rawData = await request.json();
      } catch (e) {}
    } else {
      try {
        const formData = await request.formData();
        for (const [key, value] of formData.entries()) {
          rawData[key] = value;
        }
      } catch (e) {}
    }
  }

  const queryObj = Object.fromEntries(url.searchParams.entries());
  const data = { ...queryObj, ...rawData };

  const amount = data.amount || "200";
  const rawMethod = (data.method || data.goods_name || "bkash").toLowerCase();
  const isBkash = rawMethod.includes("bkash");
  const isNagad = rawMethod.includes("nagad");
  const payType = isBkash ? "2202" : (isNagad ? "2201" : "2202");
  const goodsName = isBkash ? "BKASH" : (isNagad ? "NAGAD" : rawMethod.toUpperCase());

  const origin = url.origin;
  const notifyURL = `${origin}/pay1/gopay_notify.php`;
  let jumpURL = `${origin}/#/wallet/RechargeHistory`;
  if (data.return_url || data.page_url || data.redirect_url) {
    jumpURL = String(data.return_url || data.page_url || data.redirect_url);
  }

  const app_id = "GP_97386700";
  const secretKey = "87a89555480aae027ad84daf666602d7";
  const apiUrl = "https://mch.go-pay.cyou/pay.php";

  const serial = data.order_no || ("ORD" + Math.floor(Date.now() + Math.random() * 100000));
  const createdate = new Date().toISOString().replace("T", " ").slice(0, 19);

  const postData = {
    version: "1.0",
    app_id: app_id,
    notify_url: notifyURL,
    page_url: jumpURL,
    mch_order_no: serial,
    pay_type: payType,
    trade_amount: Number(amount).toFixed(2),
    order_date: createdate,
    goods_name: goodsName,
    mch_return_msg: "OK"
  };

  const sortedKeys = Object.keys(postData).sort();
  let signStr = "";
  for (const k of sortedKeys) {
    const v = postData[k];
    if (v !== "" && v !== null && v !== undefined) {
      signStr += `${k}=${v}&`;
    }
  }
  signStr += `key=${secretKey}`;
  postData.sign = md5(signStr);
  postData.sign_type = "MD5";

  const formParams = new URLSearchParams();
  for (const k of Object.keys(postData)) {
    formParams.append(k, postData[k]);
  }

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: formParams.toString()
    });

    const responseData = await res.json();
    const payInfo = responseData.payInfo || responseData.pay_url || responseData.data?.pay_url || responseData.data?.payInfo;

    const wantsJson = request.headers.get("accept")?.includes("application/json") || url.searchParams.get("format") === "json";

    if (wantsJson) {
      return new Response(JSON.stringify({
        success: !!payInfo,
        redirect_url: payInfo || "",
        data: responseData
      }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    if (payInfo) {
      return Response.redirect(payInfo, 302);
    } else {
      return new Response(`<h3>পেমেন্ট গেটওয়েতে সংযোগ করতে সমস্যা হয়েছে: ${responseData.tradeMsg || "অজ্ঞাত কারণ"}</h3>`, {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }
  } catch (err) {
    return new Response(`<h3>সার্ভার ত্রুটি: ${err.message}</h3>`, {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }
}
