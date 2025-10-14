import express from "express"
import { handleRealtimeChat } from "../controllers/chatController.js"
import { protect } from "../middlewares/authMiddleware.js"

const router = express.Router()

router.post("/ask", protect, async (req, res) => {
  try {
    const { message } = req.body
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required" })
    }
    const userId = req.user?._id
    const response = await handleRealtimeChat(userId, message.trim())
    res.json({ reply: response })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router

