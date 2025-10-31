// import express from "express"
// import { handleRealtimeChat } from "../controllers/chatController.js"
// import { protect } from "../middlewares/authMiddleware.js"

// const router = express.Router()

// router.post("/ask", protect, async (req, res) => {
//   try {
//     const { message } = req.body
//     if (!message || typeof message !== "string" || !message.trim()) {
//       return res.status(400).json({ error: "Message is required" })
//     }
//     const userId = req.user?._id
//     const response = await handleRealtimeChat(userId, message.trim())
//     res.json({ reply: response })
//   } catch (err) {
//     res.status(500).json({ error: err.message })
//   }
// })

// export default router


////////// setting for chat history 

// import express from "express"
// import {
//   handleRealtimeChat,
//   getChatHistory,
//   markMessageAsRead,
//   getConversationThread,
//   createNewConversation,
//   getUserConversations
// } from "../controllers/chatController.js"
// import typingSuggestionService from "../services/typingSuggestionService.js"
// import { protect } from "../middlewares/authMiddleware.js"

// const router = express.Router()

// router.post("/ask", protect, async (req, res) => {
//   try {
//     const { message, conversationId } = req.body
//     if (!message || typeof message !== "string" || !message.trim()) {
//       return res.status(400).json({ error: "Message is required" })
//     }
//     const userId = req.user?._id
//     const response = await handleRealtimeChat(userId, message.trim(), conversationId)
//     res.json(response)
//   } catch (err) {
//     res.status(500).json({ error: err.message })
//   }
// })

// router.get("/history", protect, async (req, res) => {
//   try {
//     const userId = req.user?._id
//     const { conversationId } = req.query
//     const history = await getChatHistory(userId, conversationId)
//     res.json({ history })
//   } catch (err) {
//     res.status(500).json({ error: err.message })
//   }
// })

// router.put("/:messageId/read", protect, async (req, res) => {
//   try {
//     const { messageId } = req.params
//     const message = await markMessageAsRead(messageId)
//     res.json({ message })
//   } catch (err) {
//     res.status(500).json({ error: err.message })
//   }
// })

// router.get("/conversation/:conversationId", protect, async (req, res) => {
//   try {
//     const userId = req.user?._id
//     const { conversationId } = req.params
//     const thread = await getConversationThread(userId, conversationId)
//     res.json({ thread })
//   } catch (err) {
//     res.status(500).json({ error: err.message })
//   }
// })

// router.get("/suggestions", protect, async (req, res) => {
//   try {
//     const userId = req.user?._id
//     const { query } = req.query
//     const className = req.user?.className
//     const semester = req.user?.semester

//     if (!query || query.trim().length < 2) {
//       return res.json({ suggestions: [] })
//     }

//     const suggestions = await typingSuggestionService.generateSuggestions(userId, query.trim(), className, semester)
//     res.json({ suggestions })
//   } catch (err) {
//     res.status(500).json({ error: err.message })
//   }
// })


// // Create new conversation
// router.post("/conversations", protect, async (req, res) => {
//   try {
//     const userId = req.user?._id
//     const { title } = req.body
//     const conversation = await createNewConversation(userId, title)
//     res.status(201).json(conversation)
//   } catch (err) {
//     res.status(500).json({ error: err.message })
//   }
// })

// // Get user's conversations list
// router.get("/conversations", protect, async (req, res) => {
//   try {
//     const userId = req.user?._id
//     const { page = 1, limit = 20 } = req.query
//     const conversations = await getUserConversations(userId, parseInt(page), parseInt(limit))
//     res.json({ conversations })
//   } catch (err) {
//     res.status(500).json({ error: err.message })
//   }
// })

// export default router

import express from "express"
import {
  handleRealtimeChat,
  getChatHistory,
  markMessageAsRead,
  getConversationThread,
  getUserConversations,
  updateConversationTitle,
  deleteConversation,
  retryFailedMessage,
} from "../controllers/chatController.js"
import typingSuggestionService from "../services/typingSuggestionService.js"
import { protect } from "../middlewares/authMiddleware.js"

const router = express.Router()

router.post("/ask", protect, async (req, res) => {
  try {
    const { message, conversationId } = req.body
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required" })
    }
    const userId = req.user?._id
    const response = await handleRealtimeChat(userId, message.trim(), conversationId)

    if (response.status === "failed") {
      return res.status(500).json(response)
    }

    res.json(response)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get("/history", protect, async (req, res) => {
  try {
    const userId = req.user?._id
    const { conversationId } = req.query
    const history = await getChatHistory(userId, conversationId)
    res.json({ history })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put("/:messageId/read", protect, async (req, res) => {
  try {
    const { messageId } = req.params
    const message = await markMessageAsRead(messageId)
    res.json({ message })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post("/:messageId/retry", protect, async (req, res) => {
  try {
    const { messageId } = req.params
    const userId = req.user?._id
    const result = await retryFailedMessage(userId, messageId)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get("/conversation/:conversationId", protect, async (req, res) => {
  try {
    const userId = req.user?._id
    const { conversationId } = req.params
    const thread = await getConversationThread(userId, conversationId)
    res.json({ thread })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get("/suggestions", protect, async (req, res) => {
  try {
    const userId = req.user?._id
    const { query } = req.query
    const className = req.user?.className
    const semester = req.user?.semester

    if (!query || query.trim().length < 2) {
      return res.json({ suggestions: [] })
    }

    const suggestions = await typingSuggestionService.generateSuggestions(userId, query.trim(), className, semester)
    res.json({ suggestions })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get("/conversations", protect, async (req, res) => {
  try {
    const userId = req.user?._id
    const { page = 1, limit = 20 } = req.query
    const conversations = await getUserConversations(userId, Number.parseInt(page), Number.parseInt(limit))
    res.json({ conversations })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post("/conversations", protect, async (req, res) => {
  try {
    const userId = req.user?._id
    const conversationId = new Date().getTime().toString()
    res.status(201).json({
      conversationId,
      title: null,
      createdAt: new Date(),
      messageCount: 0,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put("/conversations/:conversationId/title", protect, async (req, res) => {
  try {
    const userId = req.user?._id
    const { conversationId } = req.params
    const { title } = req.body

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required" })
    }

    const result = await updateConversationTitle(userId, conversationId, title.trim())
    res.json({ success: true, message: "Title updated", result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})


router.delete("/conversations/:conversationId", protect, async (req, res) => {
  try {
    const userId = req.user?._id
    const { conversationId } = req.params

    const result = await deleteConversation(userId, conversationId)
    res.json({ success: true, message: "Conversation deleted", result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
