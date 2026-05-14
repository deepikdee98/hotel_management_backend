const nodemailer = require("nodemailer");

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

const getLoginUrl = () => {
  if (process.env.FRONTEND_LOGIN_URL) {
    return process.env.FRONTEND_LOGIN_URL;
  }

  const frontendUrl = trimTrailingSlash(process.env.FRONTEND_URL || "http://localhost:3000");
  return `${frontendUrl}/login`;
};

const hasSmtpConfig = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const createTransporter = () => {
  if (!hasSmtpConfig()) {
    return null;
  }

  const port = Number(process.env.SMTP_PORT || 587);

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

const buildHotelAccountEmail = ({ hotelName, username, password, loginUrl }) => {
  const text = `Hello,

Your hotel account has been created successfully.

Hotel Name: ${hotelName}
Username: ${username}
Password: ${password}

Login URL:
${loginUrl}

For security reasons, please change your password after your first login.

Thank You.`;

  const html = `
    <p>Hello,</p>
    <p>Your hotel account has been created successfully.</p>
    <p>
      <strong>Hotel Name:</strong> ${escapeHtml(hotelName)}<br>
      <strong>Username:</strong> ${escapeHtml(username)}<br>
      <strong>Password:</strong> ${escapeHtml(password)}
    </p>
    <p>
      <strong>Login URL:</strong><br>
      <a href="${escapeHtml(loginUrl)}">${escapeHtml(loginUrl)}</a>
    </p>
    <p>For security reasons, please change your password after your first login.</p>
    <p>Thank You.</p>
  `;

  return { text, html };
};

const sendHotelAccountEmail = async ({ to, hotelName, username, password }) => {
  const transporter = createTransporter();

  if (!transporter) {
    return {
      sent: false,
      reason: "SMTP is not configured",
    };
  }

  const loginUrl = getLoginUrl();
  const { text, html } = buildHotelAccountEmail({
    hotelName,
    username,
    password,
    loginUrl,
  });

  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: "Your hotel account has been created",
    text,
    html,
  });

  return {
    sent: true,
    messageId: info.messageId,
  };
};

const buildOtpEmail = ({ otp }) => {
  const text = `Hello,

Your Password Reset OTP is: ${otp}

This OTP is valid for 5 minutes.

If you did not request this, please ignore this email.

Thank You.`;

  const html = `
    <p>Hello,</p>
    <p>Your Password Reset OTP is: <strong>${escapeHtml(otp)}</strong></p>
    <p>This OTP is valid for 5 minutes.</p>
    <p>If you did not request this, please ignore this email.</p>
    <p>Thank You.</p>
  `;

  return { text, html };
};

const sendOtpEmail = async ({ to, otp }) => {
  const transporter = createTransporter();

  if (!transporter) {
    return {
      sent: false,
      reason: "SMTP is not configured",
    };
  }

  const { text, html } = buildOtpEmail({ otp });

  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: "Your Password Reset OTP",
    text,
    html,
  });

  return {
    sent: true,
    messageId: info.messageId,
  };
};

module.exports = {
  sendHotelAccountEmail,
  sendOtpEmail,
};
