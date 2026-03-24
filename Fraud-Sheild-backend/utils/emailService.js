const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendFraudAlertEmail = async (toEmail, accountNumber, amount) => {
  try {
    console.log("Sending fraud email to:", toEmail);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: "🚨 Fraud Alert - Suspicious Transaction Detected",
      text: `
Suspicious Transaction Alert

Account Number: ${accountNumber}
Amount: ₹${amount}

If this was not you, please contact bank support immediately.
`
    };

    await transporter.sendMail(mailOptions);

  } catch (error) {
    console.log("Email sending error:", error);
  }
};

module.exports = sendFraudAlertEmail;