import { inngest } from "../client.js";
import User from "../../models/user.js";
import { NonRetriableError } from "inngest";
import { sendMail } from "../../utils/mailer.js";

export const onUserSignup = inngest.createFunction(
  { id: "on-user-signup", retries: 2 },
  { event: "user/signup" },
  async ({ event, step }) => {
    try {
      const { email } = event.data;
      const user = await step.run("get-user-email", async () => {
        const userObject = await User.findOne({ email });
        if (!userObject) {
          throw new NonRetriableError("User no longer exists in our database");
        }
        return userObject;
      });

      await step.run("send-welcome-email", async () => {
      const subject = "Welcome to the Platform";

      const message = `
    Dear ${user.username || "User"},

    Welcome to our platform!

    We're excited to have you on board. Your account has been successfully created, and you can now start exploring all the features available to you.

    Here’s what you can do next:
    - Log in to your dashboard
    - Explore available features
    - Start creating and managing tickets

    If you need any assistance, feel free to reach out to our support team.

    We look forward to helping you have a great experience.

    Best regards,  
    Support Team  
    `;

      await sendMail(user.email, subject, message);
    });

      return { success: true };
    } catch (error) {
      console.error("❌ Error running step", error.message);
      return { success: false };
    }
  }
);
