import { onRequest as gopayHandler } from "./gopay_pay.php.js";

export async function onRequest(context) {
  return gopayHandler(context);
}
