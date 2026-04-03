import nodemailer from "nodemailer";

export const sendMail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.GOOGLE_APP_EMAIL,
        pass: process.env.GOOGLE_APP_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: '"AI TICKETING" <no-reply@example.com>',
      to,
      subject,
      text,
    });

    return info;
  } catch (error) {
    console.error("❌ Mail error", error.message);
    throw error;
  }
};
