# S3 File Management

HMS stores uploaded and generated files in AWS S3. MongoDB stores metadata and S3 references only.

## Storage Contract

Store file metadata in module records using this shape where applicable:

```json
{
  "hotelId": "hotel id",
  "entityType": "invoice",
  "entityId": "entity id",
  "fileName": "INV-1001.pdf",
  "fileType": "application/pdf",
  "fileSize": 12345,
  "s3Key": "Grand-Hotel/customer/Rahul-Sharma/invoice/Rahul-Sharma-INV-1001-1712345678.pdf",
  "fileUrl": "https://hotel-staging-assets.s3.ap-south-2.amazonaws.com/Grand-Hotel/customer/Rahul-Sharma/invoice/Rahul-Sharma-INV-1001-1712345678.pdf",
  "uploadedBy": "user id",
  "uploadedAt": "2026-06-09T00:00:00.000Z"
}
```

Do not store buffers, base64 strings, or local filesystem paths for new files.

## Folder Structure

All keys start with the sanitized hotel name. If the hotel name is unavailable, HMS falls back to `hotel-{hotelId}`.

Hotel-owned files:

- `{hotelName}/hotel/image/{filename}`
- `{hotelName}/hotel/pdf/{filename}`
- `{hotelName}/hotel/excel/{filename}`
- `{hotelName}/hotel/csv/{filename}`
- `{hotelName}/hotel/word/{filename}`

Customer-owned files:

- `{hotelName}/customer/{customerName}/image/{customerName}-{filename}`
- `{hotelName}/customer/{customerName}/pdf/{customerName}-{filename}`
- `{hotelName}/customer/{customerName}/invoice/{customerName}-INV-{invoiceNumber}-{timestamp}.pdf`
- `{hotelName}/logo/{filename}`
- `{hotelName}/QRCode/{filename}`

If the customer name is unavailable, HMS uses `customer-NA`.

Examples:

- `Grand-Hotel/hotel/image/deluxe-room-1778124948214.jpg`
- `Grand-Hotel/hotel/pdf/contract-1778124948214.pdf`
- `Grand-Hotel/customer/Rahul-Sharma/image/Rahul-Sharma-photo-1778124948214.jpg`
- `Grand-Hotel/customer/Rahul-Sharma/pdf/Rahul-Sharma-passport-1778124948214.pdf`
- `Grand-Hotel/customer/Rahul-Sharma/invoice/Rahul-Sharma-INV-1001-1778124948214.pdf`
- `Grand-Hotel/logo/logo-1778124948214.png`
- `Grand-Hotel/QRCode/QRCode-1778124948214.png`

## Supported MIME Types

- `image/jpeg`
- `image/png`
- `image/webp`
- `application/pdf`
- `application/msword`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `application/vnd.ms-excel`
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `text/csv`

## Environment

```env
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-south-2
AWS_S3_BUCKET=hotel-staging-assets
AWS_S3_PUBLIC_URL=https://hotel-staging-assets.s3.ap-south-2.amazonaws.com
AWS_S3_UPLOAD_URL_EXPIRES_SECONDS=300
AWS_S3_MAX_FILE_SIZE_BYTES=10485760
```

## APIs

Create a direct-upload URL:

`POST /uploads/presign`

Legacy check-in alias:

`POST /admin/reception/check-in/uploads/presign`

```json
{
  "fileName": "passport.pdf",
  "contentType": "application/pdf",
  "fileSize": 12345,
  "uploadType": "id-proof-front",
  "storageScope": "customer",
  "customerName": "Rahul Sharma"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "uploadUrl": "signed PUT url",
    "fileUrl": "public or canonical S3 url",
    "key": "{hotelName}/customer/Rahul-Sharma/pdf/Rahul-Sharma-passport-...",
    "contentType": "application/pdf",
    "expiresIn": 300
  }
}
```

Download an invoice:

`GET /invoices/:id/download`

Response returns `downloadUrl`, `invoiceUrl`, `invoiceKey`, and expiry metadata. Existing checkout download links under `/front-office/check-out/invoices/:invoiceId/download` use the same S3-backed behavior.

## Reusable Backend Service

Use `services/s3UploadService.js` for all modules:

- `createS3UploadTarget()`
- `uploadBufferToS3()`
- `uploadInvoiceToS3()`
- `deleteS3Object()`
- `replaceS3Object()`
- `createS3ReadTarget()`

## Migration Plan

1. Inventory legacy files and records that contain `pdfPath`, local file paths, base64 content, or binary buffers.
2. For each legacy file, resolve the owning `hotelId`, entity type, entity id, file name, MIME type, and uploaded/generated timestamp.
3. Upload the binary to the matching S3 folder using `uploadBufferToS3()`.
4. Update MongoDB records with URL/key metadata such as `invoiceUrl` and `invoiceKey`.
5. Keep legacy path fields temporarily for rollback, but stop reading them after migration validation.
6. Verify random samples from each module with signed read URLs.
7. Remove local storage directories from deployment images after all records have S3 keys.

## Security Notes

Use an IAM principal scoped to the configured bucket and required prefixes. The frontend never receives AWS credentials; it only receives short-lived signed URLs. Rotate any key that has been committed, pasted, or shared outside the runtime secret store.
