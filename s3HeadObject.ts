export async function s3HeadObject({
  bucketName,
  key,
  region,
  accessKeyId,
  secretAccessKey,
}: {
  bucketName: string;
  key: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}): Promise<Response> {
  const method = "HEAD";
  const service = "s3";
  const host = `${bucketName}.s3.${region}.amazonaws.com`;
  const url = `https://${host}/${key}`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalUri = `/${key}`;
  const canonicalQuerystring = "";
  const payloadHash = await hash("");
  const canonicalHeaders = `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await hash(canonicalRequest),
  ].join("\n");

  const signingKey = await getSignatureKey(
    secretAccessKey,
    dateStamp,
    region,
    service,
  );

  const signature = await hmac(signingKey, stringToSign);

  const authorizationHeader = [
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(", ");

  const headers = new Headers();
  headers.set("x-amz-date", amzDate);
  headers.set("Authorization", authorizationHeader);
  headers.set("x-amz-content-sha256", payloadHash);
  headers.set("Host", host);

  return await fetch(url, { method, headers });
}

async function hash(stringToHash: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(stringToHash);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmac(
  key: ArrayBuffer,
  data: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data);
  const signature = await crypto.subtle.sign(
    "HMAC",
    await crypto.subtle.importKey(
      "raw",
      key,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    ),
    dataBytes,
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getSignatureKey(
  key: string,
  dateStamp: string,
  regionName: string,
  serviceName: string,
): Promise<ArrayBuffer> {
  const kDate = await hmacDigest(`AWS4${key}`, dateStamp);
  const kRegion = await hmacDigest(kDate, regionName);
  const kService = await hmacDigest(kRegion, serviceName);
  return await hmacDigest(kService, "aws4_request");
}

async function hmacDigest(
  key: string | ArrayBuffer,
  data: string,
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyBytes = typeof key === "string" ? encoder.encode(key) : key;
  const dataBytes = encoder.encode(data);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return await crypto.subtle.sign("HMAC", cryptoKey, dataBytes);
}
