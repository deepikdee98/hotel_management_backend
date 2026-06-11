const crypto = require("crypto");
const https = require("https");
const path = require("path");

const { env } = require("../config/env");

const DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// Supported HMS file types
const ALLOWED_FILE_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/webp",

  // PDF
  "application/pdf",

  // Excel
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

  // Word
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  // CSV
  "text/csv",
]);

const hmac = (key, value, encoding) =>
  crypto.createHmac("sha256", key).update(value, "utf8").digest(encoding);

const sha256 = (value) =>
  crypto.createHash("sha256").update(value, "utf8").digest("hex");

const sha256Buffer = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const encodePath = (value) =>
  String(value)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const toAmzDate = (date) =>
  date.toISOString().replace(/[:-]|\.\d{3}/g, "");

const sanitizeName = (value) =>
  String(value || "upload")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "upload";

const extensionFor = (fileName, contentType) => {
  const ext = path.extname(String(fileName || "")).toLowerCase();

  if (ext) return ext;

  const map = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",

    "application/pdf": ".pdf",

    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      ".xlsx",

    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      ".docx",

    "text/csv": ".csv",
  };

  return map[contentType] || "";
};

const validateFile = ({ contentType, fileSize }) => {
  if (!ALLOWED_FILE_TYPES.has(contentType)) {
    const error = new Error("Unsupported file type.");
    error.statusCode = 400;
    throw error;
  }

  if (fileSize !== undefined && fileSize !== null) {
    const size = Number(fileSize);
    const maxSize = Number(env.s3MaxFileSizeBytes || DEFAULT_MAX_FILE_SIZE_BYTES);
    if (!Number.isFinite(size) || size <= 0 || size > maxSize) {
      const error = new Error(`File size must be between 1 byte and ${maxSize} bytes.`);
      error.statusCode = 400;
      throw error;
    }
  }
};

const assertS3Configured = () => {
  if (
    !env.awsAccessKeyId ||
    !env.awsSecretAccessKey ||
    !env.s3Bucket ||
    !env.awsRegion
  ) {
    const error = new Error(
      "S3 is not configured. Add AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and AWS_S3_BUCKET."
    );
    error.statusCode = 503;
    throw error;
  }
};

const getSigningKey = (dateStamp) => {
  const kDate = hmac(`AWS4${env.awsSecretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, env.awsRegion);
  const kService = hmac(kRegion, "s3");
  return hmac(kService, "aws4_request");
};

const buildPublicUrl = (key) => {
  if (env.s3PublicUrl) {
    return `${env.s3PublicUrl.replace(/\/$/, "")}/${encodePath(key)}`;
  }

  return `https://${env.s3Bucket}.s3.${env.awsRegion}.amazonaws.com/${encodePath(
    key
  )}`;
};

const CUSTOMER_UPLOAD_TYPES = new Set([
  "guest-photo",
  "id-proof",
  "id-proof-front",
  "id-proof-back",
  "invoice",
]);

const fileCategoryFor = (contentType, uploadType) => {
  const normalizedUploadType = sanitizeName(uploadType || "");

  if (normalizedUploadType === "invoice") return "invoice";
  if (contentType && contentType.startsWith("image/")) return "image";
  if (contentType === "application/pdf") return "pdf";
  if (contentType === "text/csv") return "csv";
  if (contentType && contentType.includes("spreadsheet")) return "excel";
  if (contentType === "application/vnd.ms-excel") return "excel";
  if (contentType && contentType.includes("wordprocessingml")) return "word";
  if (contentType === "application/msword") return "word";

  return normalizedUploadType || "file";
};

const inferStorageScope = (uploadType, storageScope) => {
  const normalizedScope = sanitizeName(storageScope || "");
  if (normalizedScope === "hotel" || normalizedScope === "customer") {
    return normalizedScope;
  }

  return CUSTOMER_UPLOAD_TYPES.has(sanitizeName(uploadType || ""))
    ? "customer"
    : "hotel";
};

const rootNameFor = (hotelId, hotelName) =>
  sanitizeName(hotelName || `hotel-${String(hotelId || "unknown")}`);

const normalizeHotelKey = (hotelId, key, hotelName) => {
  const normalizedKey = String(key || "").replace(/^\/+/, "");
  const legacyHotelPrefix = `hotels/${String(hotelId)}/`;
  const currentHotelPrefix = `${rootNameFor(hotelId, hotelName)}/`;

  if (
    !normalizedKey ||
    (!normalizedKey.startsWith(legacyHotelPrefix) &&
      !normalizedKey.startsWith(currentHotelPrefix))
  ) {
    const error = new Error("Invalid file key.");
    error.statusCode = 400;
    throw error;
  }
  return normalizedKey;
};

const generateUniqueFileName = ({ fileName, contentType, prefix, userId, ownerName }) => {
  const safeFileName = sanitizeName(fileName || prefix || "upload");
  const safeOwnerName = ownerName ? sanitizeName(ownerName) : "";
  const safePrefix = sanitizeName(
    [safeOwnerName, prefix || safeFileName].filter(Boolean).join("-")
  );
  const userPart = userId ? `-${sanitizeName(userId)}` : "";
  return `${safePrefix}-${Date.now()}${userPart}-${crypto
    .randomBytes(6)
    .toString("hex")}${extensionFor(fileName, contentType)}`;
};

const generateHotelLogoFileName = ({ fileName, contentType, uploadType }) => {
  const baseName = sanitizeName(String(fileName || "logo").replace(/\.[^.]+$/, ""));
  // const typePart = sanitizeName(uploadType || "hotel-logo");
  return `${baseName}-${Date.now()}${extensionFor(fileName, contentType)}`;
};

const generateS3Key = ({
  hotelId,
  hotelName,
  uploadType,
  fileName,
  contentType,
  userId,
  prefix,
  storageScope,
  customerName,
}) => {
  const scope = inferStorageScope(uploadType, storageScope);
  const ownerName = scope === "customer" ? sanitizeName(customerName || "customer-NA") : "";
  const category = fileCategoryFor(contentType, uploadType);

  if (sanitizeName(uploadType || "") === "hotel-logo") {
    return [
      rootNameFor(hotelId, hotelName),
      "logo",
      generateHotelLogoFileName({ fileName, contentType, uploadType }),
    ].join("/");
  }

  return [
    rootNameFor(hotelId, hotelName),
    scope,
    ...(scope === "customer" ? [ownerName] : []),
    category,
    generateUniqueFileName({
      fileName,
      contentType,
      prefix,
      userId,
      ownerName,
    }),
  ].join("/");
};

const createS3UploadTarget = ({
  hotelId,
  hotelName,
  userId,
  fileName,
  contentType,
  uploadType,
  fileSize,
  storageScope,
  customerName,
}) => {
  assertS3Configured();
  validateFile({ contentType, fileSize });

  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);

  const key = generateS3Key({
    hotelId,
    hotelName,
    uploadType,
    fileName,
    contentType,
    userId,
    storageScope,
    customerName,
  });

  const host = `${env.s3Bucket}.s3.${env.awsRegion}.amazonaws.com`;
  const credentialScope = `${dateStamp}/${env.awsRegion}/s3/aws4_request`;
  const signedHeaders = "content-type;host";

  const credential = `${env.awsAccessKeyId}/${credentialScope}`;

  const expires = Math.min(
    Math.max(Number(env.s3UploadUrlExpiresSeconds || 300), 60),
    900
  );

  const queryParams = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expires),
    "X-Amz-SignedHeaders": signedHeaders,
    ...(env.awsSessionToken
      ? { "X-Amz-Security-Token": env.awsSessionToken }
      : {}),
  };

  const canonicalQuery = Object.keys(queryParams)
    .sort()
    .map(
      (name) =>
        `${encodeURIComponent(name)}=${encodeURIComponent(queryParams[name])}`
    )
    .join("&");

  const canonicalRequest = [
    "PUT",
    `/${encodePath(key)}`,
    canonicalQuery,
    `content-type:${contentType}\nhost:${host}\n`,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");

  const signature = hmac(
    getSigningKey(dateStamp),
    stringToSign,
    "hex"
  );

  const uploadUrl = `https://${host}/${encodePath(
    key
  )}?${canonicalQuery}&X-Amz-Signature=${signature}`;

  return {
    key,
    uploadUrl,
    fileUrl: buildPublicUrl(key),
    contentType,
    expiresIn: expires,
  };
};

const createS3ReadTarget = ({ hotelId, hotelName, key }) => {
  assertS3Configured();
  const normalizedKey = normalizeHotelKey(hotelId, key, hotelName);

  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const host = `${env.s3Bucket}.s3.${env.awsRegion}.amazonaws.com`;
  const credentialScope = `${dateStamp}/${env.awsRegion}/s3/aws4_request`;
  const signedHeaders = "host";
  const credential = `${env.awsAccessKeyId}/${credentialScope}`;
  const expires = Math.min(
    Math.max(Number(env.s3UploadUrlExpiresSeconds || 300), 60),
    900
  );

  const queryParams = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expires),
    "X-Amz-SignedHeaders": signedHeaders,
    ...(env.awsSessionToken
      ? { "X-Amz-Security-Token": env.awsSessionToken }
      : {}),
  };

  const canonicalQuery = Object.keys(queryParams)
    .sort()
    .map(
      (name) =>
        `${encodeURIComponent(name)}=${encodeURIComponent(queryParams[name])}`
    )
    .join("&");

  const canonicalRequest = [
    "GET",
    `/${encodePath(normalizedKey)}`,
    canonicalQuery,
    `host:${host}\n`,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");

  const signature = hmac(getSigningKey(dateStamp), stringToSign, "hex");
  const readUrl = `https://${host}/${encodePath(
    normalizedKey
  )}?${canonicalQuery}&X-Amz-Signature=${signature}`;

  return {
    key: normalizedKey,
    readUrl,
    expiresIn: expires,
  };
};

const signHeaderRequest = ({ method, key, contentType = "", bodyHash }) => {
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const host = `${env.s3Bucket}.s3.${env.awsRegion}.amazonaws.com`;
  const credentialScope = `${dateStamp}/${env.awsRegion}/s3/aws4_request`;
  const canonicalHeaderEntries = [
    ...(contentType ? [["content-type", contentType]] : []),
    ["host", host],
    ["x-amz-content-sha256", bodyHash],
    ["x-amz-date", amzDate],
    ...(env.awsSessionToken ? [["x-amz-security-token", env.awsSessionToken]] : []),
  ];
  const signedHeaders = canonicalHeaderEntries.map(([name]) => name).join(";");
  const canonicalHeaders = canonicalHeaderEntries
    .map(([name, value]) => `${name}:${value}\n`)
    .join("");

  const canonicalRequest = [
    method,
    `/${encodePath(key)}`,
    "",
    canonicalHeaders,
    signedHeaders,
    bodyHash,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");

  const signature = hmac(getSigningKey(dateStamp), stringToSign, "hex");
  const authorization = [
    `AWS4-HMAC-SHA256 Credential=${env.awsAccessKeyId}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(", ");

  return { host, amzDate, authorization, bodyHash };
};

const requestS3 = ({ method, key, contentType, body = Buffer.alloc(0) }) =>
  new Promise((resolve, reject) => {
    assertS3Configured();
    const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
    const bodyHash = sha256Buffer(buffer);
    const signed = signHeaderRequest({ method, key, contentType, bodyHash });

    const headers = {
      Host: signed.host,
      "X-Amz-Date": signed.amzDate,
      "X-Amz-Content-Sha256": signed.bodyHash,
      Authorization: signed.authorization,
      "Content-Length": buffer.length,
    };
    if (contentType) headers["Content-Type"] = contentType;
    if (env.awsSessionToken) headers["X-Amz-Security-Token"] = env.awsSessionToken;

    const req = https.request(
      {
        method,
        hostname: signed.host,
        path: `/${encodePath(key)}`,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const responseBody = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode >= 200 && res.statusCode < 300) {
            return resolve({ statusCode: res.statusCode, body: responseBody });
          }
          const error = new Error(responseBody || `S3 request failed with status ${res.statusCode}`);
          error.statusCode = res.statusCode;
          reject(error);
        });
      }
    );

    req.on("error", reject);
    if (buffer.length) req.write(buffer);
    req.end();
  });

const uploadBufferToS3 = async ({
  buffer,
  hotelId,
  hotelName,
  uploadType = "attachment",
  fileName,
  contentType,
  userId,
  prefix,
  storageScope,
  customerName,
}) => {
  assertS3Configured();
  const body = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || "");
  validateFile({ contentType, fileSize: body.length });

  const key = generateS3Key({
    hotelId,
    hotelName,
    uploadType,
    fileName,
    contentType,
    userId,
    prefix,
    storageScope,
    customerName,
  });

  await requestS3({ method: "PUT", key, contentType, body });

  return {
    key,
    fileUrl: buildPublicUrl(key),
    fileName: path.basename(key),
    fileType: contentType,
    fileSize: body.length,
    uploadedAt: new Date(),
  };
};

const uploadInvoiceToS3 = async (pdfBuffer, hotelId, invoiceNumber, userId, options = {}) => {
  const safeInvoiceNumber = sanitizeName(String(invoiceNumber || "invoice").replace(/^INV-/, ""));
  return uploadBufferToS3({
    buffer: pdfBuffer,
    hotelId,
    hotelName: options.hotelName,
    uploadType: "invoice",
    fileName: `INV-${safeInvoiceNumber}.pdf`,
    contentType: "application/pdf",
    userId,
    prefix: `INV-${safeInvoiceNumber}`,
    storageScope: "customer",
    customerName: options.customerName,
  });
};

const deleteS3Object = async ({ hotelId, hotelName, key }) => {
  assertS3Configured();
  const normalizedKey = normalizeHotelKey(hotelId, key, hotelName);
  await requestS3({ method: "DELETE", key: normalizedKey });
  return { key: normalizedKey, deleted: true };
};

const replaceS3Object = async ({ oldKey, hotelId, ...uploadOptions }) => {
  const uploaded = await uploadBufferToS3({ hotelId, ...uploadOptions });
  if (oldKey) {
    try {
      await deleteS3Object({ hotelId, hotelName: uploadOptions.hotelName, key: oldKey });
    } catch (error) {
      // Replacement should not fail if cleanup of the previous object is transient.
      uploaded.deleteWarning = error.message;
    }
  }
  return uploaded;
};

module.exports = {
  ALLOWED_FILE_TYPES,
  buildPublicUrl,
  createS3UploadTarget,
  createS3ReadTarget,
  deleteS3Object,
  generateS3Key,
  generateUniqueFileName,
  fileCategoryFor,
  uploadBufferToS3,
  uploadInvoiceToS3,
  replaceS3Object,
  validateFile,
};
