import express from "express";
import {
  getUsers,
  login,
  signup,
  updateUser,
  logout,
  getuser,
} from "../controllers/user.js";

import { authenticate } from "../middlewares/auth.js";
import { getEmbedding } from "../utils/ai.js";
const router = express.Router();

router.post("/update-user", authenticate, updateUser);
router.get("/users", authenticate, getUsers);
router.get("/user/:id", authenticate, getuser);
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/get_Embedding", authenticate, async (req, res) => {
  try {
    const { text } = req.body;   

    console.log("TEXT RECEIVED:", text);

    const embedding = await getEmbedding(text); 

    if (!embedding) {
      return res.status(400).json({ error: "Embedding failed" });
    }
    res.json({ embedding });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
export default router;
