import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true,unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "user", enum: ["user", "moderator", "admin"] },
  skills: [String],
  embedding: [Number], // for AI matching
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("User", userSchema);
