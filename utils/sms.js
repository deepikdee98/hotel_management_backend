/**
 * SMS Service Utility
 * Placeholder for actual SMS gateway integration (e.g., Twilio, AWS SNS, etc.)
 */

/**
 * Sends an OTP via SMS
 * @param {Object} options - Sending options
 * @param {string} options.to - Recipient phone number
 * @param {string} options.otp - The OTP to send
 * @returns {Promise<{sent: boolean, messageId?: string, reason?: string}>}
 */
const sendOtpSms = async ({ to, otp }) => {
  try {
    // This is where you would integrate with an SMS provider like Twilio
    // Example (Twilio):
    // const client = require('twilio')(accountSid, authToken);
    // await client.messages.create({ body: `Your OTP is: ${otp}`, from: '+1234567890', to });

    console.log("\n=========================================");
    console.log(`[SMS SERVICE] OTP: ${otp} | TO: ${to}`);
    console.log("=========================================\n");
    
    // Simulating success for now
    return {
      sent: true,
      messageId: "stub-message-id-" + Date.now(),
    };
  } catch (error) {
    console.error("Failed to send SMS OTP:", error);
    return {
      sent: false,
      reason: error.message || "Failed to send SMS OTP",
    };
  }
};

module.exports = {
  sendOtpSms,
};
