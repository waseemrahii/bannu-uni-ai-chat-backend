import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Generic email sender
export const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: `"University AI Chat" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error("❌ Email send error:", error.message);
    return false;
  }
};

// Reset email HTML template
export const generateResetPasswordEmail = (name, resetLink) => {
  return `
    <div style="font-family: Arial, sans-serif; background: #f7f7f7; padding: 20px;">
      <div style="max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
        <h2 style="color: #007bff;">Password Reset Request</h2>
        <p>Hi <b>${name}</b>,</p>
        <p>You requested to reset your password. Please click the button below to reset it:</p>
        <a href="${resetLink}" style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Reset Password</a>
        <p>If you didn’t request this, please ignore this email.</p>
        <br>
        <p>Thanks,</p>
        <p><b>University AI Chat Team</b></p>
      </div>
    </div>
  `;
};

// ✅ NEW FUNCTION - used by controller
export const sendResetEmail = async (user, resetLink) => {
  const html = generateResetPasswordEmail(user.name, resetLink);
  return await sendEmail(user.email, "Password Reset Request", html);
};
