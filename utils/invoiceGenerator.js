const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

function ensureInvoiceDir() {
  const invoiceDir = path.join(process.cwd(), "storage", "invoices");
  if (!fs.existsSync(invoiceDir)) {
    fs.mkdirSync(invoiceDir, { recursive: true });
  }
  return invoiceDir;
}

function drawRow(doc, label, value) {
  doc.fontSize(11).text(label, 60, doc.y, { continued: true }).text(String(value), { align: "right" });
  doc.moveDown(0.4);
}

async function generateCheckoutInvoicePdf(payload) {
  const invoiceDir = ensureInvoiceDir();
  const fileName = `${payload.invoiceNumber}.pdf`;
  const absolutePath = path.join(invoiceDir, fileName);
  const relativePath = path.join("storage", "invoices", fileName);

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const stream = fs.createWriteStream(absolutePath);
  doc.pipe(stream);

  doc.fontSize(20).text("Tax Invoice", { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(10).text(`Invoice No: ${payload.invoiceNumber}`, { align: "right" });
  doc.text(`Date: ${new Date(payload.invoiceDate).toLocaleString()}`, { align: "right" });
  doc.moveDown();

  doc.fontSize(12).text(payload.hotelName || "Hotel");
  doc.fontSize(10).text(payload.hotelAddress || "Address not configured");
  doc.text(`GSTIN: ${payload.hotelGstin || "N/A"}`);
  doc.moveDown();

  doc.fontSize(12).text("Guest Details");
  doc.fontSize(10);
  drawRow(doc, "Guest Name", payload.guestName || "N/A");
  drawRow(doc, "Room No", payload.roomNumber || "N/A");
  drawRow(doc, "Stay Duration", payload.stayDuration || "N/A");
  doc.moveDown(0.5);

  doc.fontSize(12).text("Billing");
  doc.fontSize(10);
  drawRow(doc, "Room Charges", `Rs ${payload.roomCharges.toFixed(2)}`);
  drawRow(doc, "Service Charges", `Rs ${payload.serviceCharges.toFixed(2)}`);
  drawRow(doc, "CGST (6%)", `Rs ${payload.cgst.toFixed(2)}`);
  drawRow(doc, "SGST (6%)", `Rs ${payload.sgst.toFixed(2)}`);
  doc.fontSize(12).text(`Total Amount: Rs ${payload.totalAmount.toFixed(2)}`, { align: "right" });
  doc.moveDown();

  doc.fontSize(11).text("Payment Details");
  doc.fontSize(10).text(payload.paymentSummary || "Payment details unavailable");
  doc.moveDown(2);
  doc.fontSize(10).text("Thank you for staying with us.", { align: "center" });

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  return {
    fileName,
    absolutePath,
    relativePath,
  };
}

module.exports = {
  generateCheckoutInvoicePdf,
};
