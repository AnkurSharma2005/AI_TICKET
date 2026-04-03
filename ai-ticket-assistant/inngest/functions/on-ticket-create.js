import { inngest } from "../client.js";
import Ticket from "../../models/ticket.js";
import User from "../../models/user.js";
import { NonRetriableError } from "inngest";
import { sendMail } from "../../utils/mailer.js";
import analyzeTicket from "../../utils/ai.js";
import { getEmbedding } from "../../utils/ai.js";
import { getUserById } from "../../utils/user.js";

export const onTicketCreated = inngest.createFunction(
  { id: "on-ticket-created", retries: 2 },
  { event: "ticket/created" },
  async ({ event, step }) => {
    try {
      const { ticketId } = event.data;

      const ticket = await step.run("fetch-ticket", async () => {
      const ticketObject = await Ticket.findById(ticketId);
      if (!ticketObject) {
        throw new NonRetriableError("Ticket not found");
      }
      return ticketObject;
    });

      await step.run("update-ticket-status", async () => {
        await Ticket.findByIdAndUpdate(ticket._id, { status: "TODO" });
      });

      let aiResponse = null;
      try {
        aiResponse = await analyzeTicket(ticket);
      } catch (err) {
        console.error("AI analysis failed", err);
      }

      const relatedskills = await step.run("ai-processing", async () => {
        let skills = [];
        if (aiResponse) {
          await Ticket.findByIdAndUpdate(ticket._id, {
            priority: !["low", "medium", "high"].includes(aiResponse.priority)
              ? "medium"
              : aiResponse.priority,
            helpfulNotes: aiResponse.helpfulNotes,
            status: "IN_PROGRESS",
            relatedSkills: aiResponse.relatedSkills,
          });
          skills = aiResponse.relatedSkills || [];
        } else {
          await Ticket.findByIdAndUpdate(ticket._id, {
            status: "TODO",
            helpfulNotes: "Automated triage not available; please review manually.",
            relatedSkills: [],
            priority: "medium",
          });
        }
        return skills;
      });
      function cosineSimilarity(a, b) {
        if (!a || !b || a.length !== b.length) return -1;

        let dot = 0, magA = 0, magB = 0;

        for (let i = 0; i < a.length; i++) {
          dot += a[i] * b[i];
          magA += a[i] * a[i];
          magB += b[i] * b[i];
        }

        magA = Math.sqrt(magA);
        magB = Math.sqrt(magB);

        return dot / (magA * magB);
      }
      const moderator = await step.run("assign-moderator", async () => {
        // 🔹 Normalize skills
          const normalizedSkills = relatedskills.map(s =>
          s.toLowerCase().trim()
        );
        // 🔹 Step 2: AI ranking
        const ticketText = `Skills required: ${normalizedSkills.join(", ")}`;
        
        const ticketEmbedding = await getEmbedding(ticketText); 
        // 🔹 Step 1: Fast DB filter
        let candidates = await User.find({ role: "moderator" });
        


        // 🔹 If no candidates → fallback immediately
        if (!candidates.length) {
          const admin = await User.findOne({ role: "admin" });
          await Ticket.findByIdAndUpdate(ticket._id, {
            assignedTo: admin?._id || null,
          });
          return admin;
        }

        

        
        // ⚠️ You need to expose this from your ai.js
        let bestUser = null;
        let bestScore = -1;

        for (const user of candidates) {
          if (!user.embedding) continue; // skip if no embedding

          const score = cosineSimilarity(ticketEmbedding, user.embedding);  
          if (score > bestScore) {
            bestScore = score;
            bestUser = user;
          }
        }

        // 🔹 Step 3: fallback if AI fails
        if (!bestUser) {
          bestUser = candidates[0];
        }

        await Ticket.findByIdAndUpdate(ticket._id, {
          assignedTo: bestUser._id,
        });
        return bestUser;
      });

      await step.run("send-email-notification", async () => {
  if (moderator) {
    const finalTicket = await Ticket.findById(ticket._id);
    const ticketuser = await getUserById(finalTicket.createdBy);

    await sendMail(
      moderator.email,
      "New Ticket Assignment Notification",
      `
      Dear ${moderator.username || "Team Member"},

      You have been assigned a new support ticket. Please find the details below:

      ----------------------------------------
      Ticket Details
      ----------------------------------------
      Title      : ${finalTicket.title}
      Priority   : ${finalTicket.priority}
      Created By : ${ticketuser.username || ticketuser.email}
      ----------------------------------------

      Kindly log in to the dashboard at your earliest convenience to review and take appropriate action.

      If you have any questions or require assistance, please contact the support team.

      Best regards,  
      Support System  
      `
          );
        }
      });

      return { success: true };
    } catch (err) {
      console.error("❌ Error running the step", err.message);
      return { success: false };
    }
  }
);
