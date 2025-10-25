


// import Chat from "../models/chatModel.js"
// import { processStudentMessage } from "../utils/aiHelper.js"

// export const handleRealtimeChat = async (userId, message) => {
//   const { reply, intent } = await processStudentMessage(userId, message)

//   await Chat.create({
//     userId,
//     question: message,
//     answer: reply,
//     intent,
//   })

//   return reply
// }

///////////////////////

import Chat from "../models/chatModel.js"
import { processStudentMessage } from "../utils/aiHelper.js"
import { processMessageHybrid } from "../utils/ragAiHelper.js"

export const handleRealtimeChat = async (userId, message) => {
  try {
    console.log("[Chat Controller] Processing message:", message)

    const response = await processMessageHybrid(userId, message, async () => {
      // Fallback to traditional intent-based processing
      console.log("[Chat Controller] Using intent-based fallback")
      const intentResponse = await processStudentMessage(userId, message)
      return {
        reply: intentResponse.reply,
        intent: intentResponse.intent,
        sources: [],
      }
    })

    // Save to database
    const chatData = {
      userId,
      question: message,
      answer: response.reply,
      intent: response.intent,
    }

    // Add sources if available
    if (response.sources && response.sources.length > 0) {
      chatData.sources = response.sources.map((s) => ({
        content: s.content,
        type: s.type,
        relevance: s.relevance,
      }))
    }

    await Chat.create(chatData)

    return response.reply
  } catch (error) {
    console.error("[Chat Controller] Error:", error)
    return "Sorry, I encountered an error while processing your request."
  }
}

/**
 * Get chat history with sources
 */
export const getChatHistory = async (userId) => {
  try {
    const chats = await Chat.find({ userId }).sort({ createdAt: -1 }).limit(50)
    return chats
  } catch (error) {
    console.error("[Chat Controller] Error getting history:", error)
    throw error
  }
}
