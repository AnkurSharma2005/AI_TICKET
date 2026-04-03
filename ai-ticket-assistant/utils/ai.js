import "dotenv/config";
import { createAgent, gemini } from "@inngest/agent-kit";
import { GoogleGenerativeAI } from "@google/generative-ai";

const analyzeTicket = async (ticket) => {
  const supportAgent = createAgent({
    model: gemini({
      model: "gemini-2.5-flash",
      apiKey: process.env.GEMINI_API_KEY,
    }),
    name: "AI Ticket Triage Assistant",
    system: `You are an expert AI assistant that processes technical support tickets. 

      Your job is to:
      1. Summarize the issue.
      2. Estimate its priority.
      3. Provide helpful notes and resource links for human moderators.
      4. List relevant technical skills required.

      IMPORTANT:
      - Respond with *only* valid raw JSON.
      - Do NOT include markdown, code fences, comments, or any extra formatting.
      - The format must be a raw JSON object.

      Repeat: Do not wrap your output in markdown or code fences.`,
        });

  let response;
  try {
    response = await supportAgent.run(`You are a ticket triage agent. Only return a strict JSON object with no extra text, headers, or markdown.
        
Analyze the following support ticket and provide a JSON object with:

- summary: A short 1-2 sentence summary of the issue.
- priority: One of "low", "medium", or "high".
- helpfulNotes: A detailed technical explanation that a moderator can use to solve this issue. Include useful external links or resources if possible.
- relatedSkills: An array of relevant skills required to solve the issue (e.g., ["React", "MongoDB"]).

Respond ONLY in this JSON format and do not include any other text or markdown in the answer:

{
"summary": "Short summary of the ticket",
"priority": "high",
"helpfulNotes": "Here are useful tips...",
"relatedSkills": ["React", "Node.js"]
}

---

Ticket information:

- Title: ${ticket.title}
- Description: ${ticket.description}`);
  } catch (err) {
    console.error("AI inference failed", err); 
  }
  // console.log("Raw AI response1111:", response);
  try {
    const raw = response.output?.[0]?.content || "";
    // console.log("RAW AI OUTPUT:", raw);
    const match = raw.match(/```json\s*([\s\S]*?)\s*```/i);
    const jsonString = match ? match[1] : raw.trim();
    return JSON.parse(jsonString);
  } catch (e) {
    console.log("Failed to parse JSON from AI response" , e.message);
    return {
      summary: "Auto triage unavailable",
      priority: "medium",
      helpfulNotes:
        "Unable to parse AI output. Review this issue manually and update status/assignment.",
      relatedSkills: [],
    };
  }
};




const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🔹 Embedding model (different from gemini-2.5-flash)
const embeddingModel = genAI.getGenerativeModel({
  model: "gemini-embedding-2-preview",
});

export async function getEmbedding(text) {
  try {
    if (!text || typeof text !== "string") {
      throw new Error("Invalid text input");
    }

    const response = await embeddingModel.embedContent({
      content: {
        parts: [{ text }],
      },
    });

    const embedding = response.embedding.values;

    return embedding;
  } catch (err) {
    console.error("Embedding error:", err.message);
    return null;
  }
}

export default analyzeTicket;
