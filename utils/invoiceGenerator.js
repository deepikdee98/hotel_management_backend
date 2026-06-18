const http = require("http");
const https = require("https");
const PDFDocument = require("pdfkit");

const PAGE = {
  left: 30,
  right: 565,
  width: 535,
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const toNum = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const money = (value) => toNum(value).toFixed(2);

const clean = (value, fallback = "") => {
  const text = value === undefined || value === null ? "" : String(value).trim();
  return text || fallback;
};

const formatDate = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getDate()).padStart(2, "0")}-${MONTHS[date.getMonth()]}-${date.getFullYear()}`;
};

const formatDateTime = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const suffix = hours >= 12 ? "PM" : "AM";
  hours %= 12;
  if (hours === 0) hours = 12;
  return `${formatDate(date)} ${String(hours).padStart(2, "0")}:${minutes} ${suffix}`;
};

const line = (doc, y, x1 = PAGE.left, x2 = PAGE.right) => {
  doc.moveTo(x1, y).lineTo(x2, y).stroke();
};

const text = (doc, value, x, y, options = {}) => {
  doc.text(clean(value), x, y, options);
};

const detailRow = (doc, label, value, x, y, labelWidth = 90, valueWidth = 210) => {
  doc.font("Helvetica").fontSize(9);
  text(doc, label, x, y, { width: labelWidth });
  text(doc, ":", x + labelWidth, y, { width: 8 });
  text(doc, value, x + labelWidth + 10, y, { width: valueWidth });
};

const sectionLabel = (doc, value, x, y, width, align = "left") => {
  doc.font("Helvetica-Bold").fontSize(9);
  text(doc, value, x, y, { width, align });
  doc.font("Helvetica").fontSize(9);
};

const numberToWords = (amount) => {
  const n = Math.round(Math.abs(toNum(amount)));
  if (n === 0) return "Zero Rupees Only";

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const belowHundred = (num) => (num < 20 ? ones[num] : `${tens[Math.floor(num / 10)]}${num % 10 ? ` ${ones[num % 10]}` : ""}`);
  const belowThousand = (num) => {
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    return `${hundred ? `${ones[hundred]} Hundred` : ""}${hundred && rest ? " " : ""}${rest ? belowHundred(rest) : ""}`.trim();
  };

  const parts = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  if (crore) parts.push(`${belowThousand(crore)} Crore`);
  if (lakh) parts.push(`${belowThousand(lakh)} Lakh`);
  if (thousand) parts.push(`${belowThousand(thousand)} Thousand`);
  if (rest) parts.push(belowThousand(rest));
  return `${parts.join(" ")} Rupees Only`;
};

const fetchLogoBuffer = async (logoUrl) => {
  if (!logoUrl) return null;

  if (String(logoUrl).startsWith("data:image/")) {
    const [, base64 = ""] = String(logoUrl).split(",", 2);
    return base64 ? Buffer.from(base64, "base64") : null;
  }

  try {
    const url = new URL(logoUrl);
    const client = url.protocol === "http:" ? http : https;

    return await new Promise((resolve) => {
      const request = client.get(url, (response) => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          response.resume();
          resolve(null);
          return;
        }

        const contentType = response.headers["content-type"] || "";
        if (contentType && !String(contentType).includes("image/") && contentType !== "application/octet-stream") {
          response.resume();
          resolve(null);
          return;
        }

        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => resolve(Buffer.concat(chunks)));
      });

      request.setTimeout(5000, () => {
        request.destroy();
        resolve(null);
      });
      request.on("error", () => resolve(null));
    });
  } catch (error) {
    return null;
  }
};

const drawInitialsLogo = (doc, hotelName) => {
  const x = 42;
  const y = 78;
  const size = 100;
  const initials = clean(hotelName, "Hotel")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  doc.save();
  doc.circle(x + size / 2, y + size / 2, size / 2).lineWidth(1).stroke("#111111");
  doc.circle(x + size / 2, y + size / 2, size / 2 - 7).lineWidth(0.75).stroke("#111111");
  doc.font("Helvetica-Bold").fontSize(25).text(initials, x, y + 25, { width: size, align: "center" });
  doc.font("Helvetica").fontSize(7).text("HOTEL", x, y + 52, { width: size, align: "center" });
  doc.restore();
};

const drawLogo = async (doc, payload, hotelName) => {
  const x = 48;
  const y = 86;
  const size = 76;
  const logoBuffer = await fetchLogoBuffer(payload.hotelLogoUrl);

  if (logoBuffer) {
    try {
      doc.image(logoBuffer, x, y, {
        fit: [size, size],
        align: "center",
        valign: "center",
      });
      return;
    } catch (error) {
      // Fall through to initials when PDFKit cannot decode the uploaded image.
    }
  }

  drawInitialsLogo(doc, hotelName);
};

const drawPaymentQr = async (doc, payload, x, y, size = 80) => {
  if (!payload.paymentQrUrl) return false;
  const qrBuffer = await fetchLogoBuffer(payload.paymentQrUrl);
  if (qrBuffer) {
    try {
      doc.image(qrBuffer, x, y, {
        fit: [size, size],
      });
      return true;
    } catch (error) {
      return false;
    }
  }
  return false;
};

const drawBankDetails = (doc, bank, x, y) => {
  if (!bank || !bank.accountNumber) return false;
  
  doc.font("Helvetica-Bold").fontSize(9);
  text(doc, "Bank Account Details", x, y);
  
  doc.font("Helvetica").fontSize(8);
  let currentY = y + 14;
  
  if (bank.accountName) {
    text(doc, `A/c Name: ${bank.accountName}`, x, currentY);
    currentY += 12;
  }
  if (bank.accountNumber) {
    text(doc, `A/c No: ${bank.accountNumber}`, x, currentY);
    currentY += 12;
  }
  if (bank.bankName) {
    text(doc, `Bank: ${bank.bankName}`, x, currentY);
    currentY += 12;
  }
  if (bank.ifscCode) {
    text(doc, `IFSC: ${bank.ifscCode}`, x, currentY);
    currentY += 12;
  }
  if (bank.branchName) {
    text(doc, `Branch: ${bank.branchName}`, x, currentY);
    currentY += 12;
  }
  
  return true;
};

const buildHotelAddress = (payload) => {
  const parts = [
    clean(payload.hotelAddress),
    clean(payload.hotelCity),
    clean(payload.hotelState),
    clean(payload.hotelCountry),
    clean(payload.hotelZip),
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "Address not configured";
};

const buildChargeRows = (payload) => {
  if (Array.isArray(payload.chargeRows) && payload.chargeRows.length) {
    return payload.chargeRows;
  }

  const rows = [];
  const nights = Math.max(1, Math.round(toNum(payload.nights || 1)));
  const roomTotal = toNum(payload.roomCharges);
  const perNight = nights ? roomTotal / nights : roomTotal;
  const start = payload.checkInDate ? new Date(payload.checkInDate) : new Date(payload.invoiceDate || Date.now());

  for (let i = 0; i < nights; i += 1) {
    const rowDate = new Date(start);
    rowDate.setDate(start.getDate() + i);
    rows.push({
      date: formatDate(rowDate),
      roomNumber: payload.roomNumber,
      description: "Room Charges",
      amount: perNight,
    });
  }

  if (toNum(payload.serviceCharges) > 0) {
    rows.push({
      date: formatDate(payload.invoiceDate),
      roomNumber: payload.roomNumber,
      description: "Service Charges",
      amount: toNum(payload.serviceCharges),
    });
  }

  if (!rows.length) {
    rows.push({
      date: formatDate(payload.invoiceDate),
      roomNumber: payload.roomNumber,
      description: clean(payload.title, "Invoice Charges"),
      amount: toNum(payload.totalAmount),
    });
  }

  return rows;
};

async function generateCheckoutInvoicePdf(payload) {
  const fileName = `${payload.invoiceNumber}.pdf`;
  const doc = new PDFDocument({ size: "A4", margin: 20 });
  const chunks = [];
  
  const promise = new Promise((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  
  const roomCharges = toNum(payload.roomCharges);
  const serviceCharges = toNum(payload.serviceCharges);
  const subtotal = roomCharges + serviceCharges;
  const cgst = toNum(payload.cgst);
  const sgst = toNum(payload.sgst);
  const gst = cgst + sgst;
  const total = payload.totalAmount === undefined || payload.totalAmount === null ? subtotal + gst : toNum(payload.totalAmount);
  const payable = payload.payableAmount === undefined || payload.payableAmount === null ? total : toNum(payload.payableAmount);
  const paid = payload.amountPaid === undefined || payload.amountPaid === null ? payable : toNum(payload.amountPaid);
  const balance = toNum(payload.balanceDue || Math.max(0, payable - paid));
  const cashLabel = clean(payload.paymentMode, "Cash");
  const hotelName = clean(payload.hotelName, "Hotel");
  const hotelAddress = buildHotelAddress(payload);
  const checkIn = payload.checkInDate || payload.invoiceDate;
  const checkOut = payload.checkOutDate || payload.invoiceDate;
  const adultChild = clean(payload.adultChild, `${toNum(payload.adults || 1)} / ${toNum(payload.children || 0)}`);

  doc.lineWidth(0.5).strokeColor("#111111").fillColor("#000000");

  doc.font("Helvetica-Bold").fontSize(11).text(clean(payload.title, "TAX INVOICE").toUpperCase(), PAGE.left, 24, {
    width: PAGE.width,
    align: "center",
  });
  doc.font("Helvetica").fontSize(8).text(`GST IN. ${clean(payload.hotelGstin, "N/A")}`, 420, 28, {
    width: 130,
    align: "left",
  });

  doc.font("Helvetica-Bold").fontSize(16).text(hotelName, PAGE.left, 62, {
    width: PAGE.width,
    align: "center",
  });
  await drawLogo(doc, payload, hotelName);
  doc.font("Helvetica").fontSize(9).text(hotelAddress, 190, 94, {
    width: 270,
    align: "center",
  });
  if (payload.hotelPhone) {
    doc.text(`Contact No. : ${clean(payload.hotelPhone)}`, 190, 115, { width: 270, align: "center" });
  }
  if (payload.hotelState || payload.stateCode) {
    doc.text(`STATE : ${clean(payload.hotelState, "N/A")} , STATE CODE : ${clean(payload.stateCode, "N/A")}`, 190, 130, {
      width: 270,
      align: "center",
    });
  }

  line(doc, 184, PAGE.left, PAGE.right);

  const billY = 190;
  detailRow(doc, "Bill To", payload.billToName || payload.guestName, 34, billY, 88, 210);
  detailRow(doc, "GST IN", payload.guestGstin || payload.companyGstin || "", 340, billY, 76, 135);
  detailRow(doc, "Company Add.", payload.companyAddress || "", 34, billY + 17, 88, 220);
  detailRow(doc, "Guest Name", payload.guestName, 34, billY + 34, 88, 220);
  detailRow(doc, "Mobile No.", payload.mobileNo, 34, billY + 51, 88, 220);
  detailRow(doc, "Address", payload.guestAddress, 34, billY + 68, 88, 220);
  detailRow(doc, "Bill No.", payload.invoiceNumber, 34, billY + 93, 88, 220);
  detailRow(doc, "Bill Date", formatDate(payload.invoiceDate), 340, billY + 93, 76, 140);
  detailRow(doc, "Nationality", payload.nationality, 34, billY + 116, 88, 220);
  detailRow(doc, "Adult / Child", adultChild, 340, billY + 116, 76, 140);
  detailRow(doc, "Check In", formatDateTime(checkIn), 34, billY + 133, 88, 220);
  detailRow(doc, "Check Out", formatDateTime(checkOut), 340, billY + 133, 76, 140);
  detailRow(doc, "Room No", payload.roomNumber, 34, billY + 150, 88, 220);
  detailRow(doc, "Plan", payload.planName || payload.planType || "", 340, billY + 150, 76, 140);
  detailRow(doc, "Regd No.", payload.registerNo, 340, billY + 167, 76, 140);

  const tableTop = 375;
  line(doc, tableTop);
  sectionLabel(doc, "Date", 34, tableTop + 8, 90);
  sectionLabel(doc, "Particulars", 135, tableTop + 8, 250);
  sectionLabel(doc, "Amount", 470, tableTop + 8, 70, "right");
  line(doc, tableTop + 23);

  let rowY = tableTop + 30;
  const rows = buildChargeRows(payload);
  rows.slice(0, 5).forEach((row) => {
    doc.font("Helvetica").fontSize(9);
    text(doc, row.date, 36, rowY, { width: 80 });
    text(doc, `Room No. : ${clean(row.roomNumber, payload.roomNumber || "N/A")}`, 135, rowY, { width: 250 });
    text(doc, money(row.amount), 470, rowY + 12, { width: 70, align: "right" });
    text(doc, row.description, 148, rowY + 12, { width: 250 });
    rowY += 28;
  });

  const totalsTop = 520;
  line(doc, totalsTop);
  doc.font("Helvetica").fontSize(9);
  const cgstRate = clean(payload.cgstRate, "6");
  const sgstRate = clean(payload.sgstRate, "6");
  const roundOff = payload.roundOff === undefined || payload.roundOff === null ? total - (subtotal + gst) : toNum(payload.roundOff);
  const totalRows = [
    ["Total Amount", subtotal],
    [`Central GST @ ${cgstRate}%`, cgst],
    [`State GST @ ${sgstRate}%`, sgst],
    ["Total GST", gst],
    ["Round Off", roundOff],
    ["Net Amount", total],
    ["Payable", payable],
  ];
  totalRows.forEach(([label, value], index) => {
    const y = totalsTop + 5 + index * 12;
    text(doc, `${label} :`, 350, y, { width: 95, align: "right" });
    text(doc, money(value), 458, y, { width: 82, align: "right" });
  });
  line(doc, totalsTop + 90);

  doc.font("Helvetica-Bold").fontSize(9);
  const summaryY = totalsTop + 98;
  text(doc, cashLabel, 38, summaryY, { width: 80 });
  text(doc, money(paid), 145, summaryY, { width: 80 });
  if (balance > 0) {
    text(doc, `Balance ${money(balance)}`, 250, summaryY, { width: 120 });
  }

  doc.font("Helvetica").fontSize(9);
  text(doc, `In Words : ${numberToWords(payable)}`, 38, summaryY + 16, { width: 490 });

  // Payment Section (Bank Details & QR Code)
  const paymentSectionY = summaryY + 36;
  drawBankDetails(doc, payload.bankDetails, 34, paymentSectionY);
  await drawPaymentQr(doc, payload, 470, paymentSectionY - 5, 80);

  const footerY = 740;
  text(doc, "Page No.", 34, footerY, { width: 70 });
  text(doc, "1", 125, footerY, { width: 30 });
  text(doc, "E.&O.E.", 82, footerY + 22, { width: 80 });
  text(doc, "Guest Signature", 205, footerY + 22, { width: 120 });
  text(doc, clean(payload.signatureName, hotelName), 420, footerY + 6, { width: 110, align: "center" });
  text(doc, `For ${hotelName}`, 395, footerY + 22, { width: 160, align: "center" });
  doc.fontSize(6).text("Powered by Prevoir Infotech", 438, footerY + 38, { width: 120, align: "right" });

  doc.end();

  const buffer = await promise;

  return {
    buffer,
    fileName,
    contentType: "application/pdf",
    fileSize: buffer.length,
  };
}

module.exports = {
  generateCheckoutInvoicePdf,
};
