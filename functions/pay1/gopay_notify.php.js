import { md5 } from "../md5.js";

export async function onRequest(context) {
  const { request } = context;
  const secretKey = "87a89555480aae027ad84daf666602d7";

  let body = {};
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      body = await request.json();
    } catch (e) {}
  } else {
    try {
      const formData = await request.formData();
      for (const [key, value] of formData.entries()) {
        body[key] = value;
      }
    } catch (e) {}
  }

  const url = new URL(request.url);
  for (const [key, value] of url.searchParams.entries()) {
    if (!body[key]) body[key] = value;
  }

  const status = body.status || body.tradeResult || body.respCode || "";
  const isSuccess = status === "1" || status === "SUCCESS" || status === "success";

  if (isSuccess) {
    return new Response("success", {
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });
  }

  return new Response("success", {
    status: 200,
    headers: { "Content-Type": "text/plain" }
  });
}
