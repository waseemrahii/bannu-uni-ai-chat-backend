


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

// import Chat from "../models/chatModel.js"
// import { processStudentMessage } from "../utils/aiHelper.js"
// import { processMessageHybrid } from "../utils/ragAiHelper.js"

// export const handleRealtimeChat = async (userId, message) => {
//   try {
//     console.log("[Chat Controller] Processing message:", message)

//     const response = await processMessageHybrid(userId, message, async () => {
//       // Fallback to traditional intent-based processing
//       console.log("[Chat Controller] Using intent-based fallback")
//       const intentResponse = await processStudentMessage(userId, message)
//       return {
//         reply: intentResponse.reply,
//         intent: intentResponse.intent,
//         sources: [],
//       }
//     })

//     // Save to database
//     const chatData = {
//       userId,
//       question: message,
//       answer: response.reply,
//       intent: response.intent,
//     }

//     // Add sources if available
//     if (response.sources && response.sources.length > 0) {
//       chatData.sources = response.sources.map((s) => ({
//         content: s.content,
//         type: s.type,
//         relevance: s.relevance,
//       }))
//     }

//     await Chat.create(chatData)

//     return response.reply
//   } catch (error) {
//     console.error("[Chat Controller] Error:", error)
//     return "Sorry, I encountered an error while processing your request."
//   }
// }

// /**
//  * Get chat history with sources
//  */
// export const getChatHistory = async (userId) => {
//   try {
//     const chats = await Chat.find({ userId }).sort({ createdAt: -1 }).limit(50)
//     return chats
//   } catch (error) {
//     console.error("[Chat Controller] Error getting history:", error)
//     throw error
//   }
// }


////////////////// adding chat history
// controllers/chatController.js 
// import Chat from "../models/chatModel.js"
// import MessageStatus from "../models/messageStatusModel.js"
// import { processStudentMessage } from "../utils/aiHelper.js"
// import { processMessageHybrid } from "../utils/ragAiHelper.js"

// export const handleRealtimeChat = async (userId, message, conversationId = null) => {
//   const startTime = Date.now()
//   try {
//     console.log("[Chat Controller] Processing message:", message)

//     let parentMessage = null
//     if (conversationId) {
//       parentMessage = await Chat.findOne({ userId, conversationId }).sort({ createdAt: -1 })
//     }

//     const response = await processMessageHybrid(userId, message, async () => {
//       console.log("[Chat Controller] Using intent-based fallback")
//       const intentResponse = await processStudentMessage(userId, message)
//       return {
//         reply: intentResponse.reply,
//         intent: intentResponse.intent,
//         sources: [],
//       }
//     })

//     const chatData = {
//       userId,
//       conversationId: conversationId || new Date().getTime().toString(),
//       parentMessageId: parentMessage?._id,
//       question: message,
//       answer: response.reply,
//       intent: response.intent,
//       status: "delivered",
//       metadata: {
//         responseTime: Date.now() - startTime,
//         retrievedDocuments: response.retrievedCount || 0,
//         confidence: response.sources?.length > 0 ? 0.9 : 0.5,
//       },
//       sources: [], // Initialize as empty array
//     }

//     // FIXED: Proper sources handling with validation
//     if (response.sources && Array.isArray(response.sources)) {
//       chatData.sources = response.sources
//         .filter(source => source && typeof source === 'object') // Filter out invalid sources
//         .map((source) => {
//           // Ensure proper data types
//           let relevance = 0.5; // default
          
//           if (typeof source.relevance === 'number') {
//             relevance = source.relevance;
//           } else if (typeof source.relevance === 'string') {
//             // Handle percentage strings like "88.2%"
//             const match = source.relevance.toString().match(/(\d+\.?\d*)%/);
//             relevance = match ? parseFloat(match[1]) / 100 : 0.5;
//           }

//           // Ensure content is a string and truncate if too long
//           let content = '';
//           if (typeof source.content === 'string') {
//             content = source.content.length > 500 ? source.content.substring(0, 500) + '...' : source.content;
//           } else if (source.content) {
//             content = String(source.content).substring(0, 500) + '...';
//           }

//           return {
//             content: content,
//             type: typeof source.type === 'string' ? source.type : 'unknown',
//             relevance: Math.min(Math.max(relevance, 0), 1), // Ensure between 0-1
//             metadata: source.metadata && typeof source.metadata === 'object' ? source.metadata : {}
//           };
//         })
//         .filter(source => source.content && source.content.trim().length > 0); // Remove empty sources
//     }

//     console.log("[Chat Controller] Saving chat with sources:", chatData.sources.length);

//     const savedChat = await Chat.create(chatData)

//     await MessageStatus.create({
//       chatId: savedChat._id,
//       userId,
//       status: "delivered",
//       deliveredAt: new Date(),
//     })

//     return {
//       reply: response.reply,
//       conversationId: chatData.conversationId,
//       messageId: savedChat._id,
//       status: "delivered",
//       responseTime: chatData.metadata.responseTime,
//       sources: chatData.sources, // Include in response
//       retrievedCount: response.retrievedCount || 0,
//     }
//   } catch (error) {
//     console.error("[Chat Controller] Error:", error)
    
//     // More specific error handling
//     if (error.name === 'ValidationError') {
//       console.error("Validation Error Details:", error.errors);
//       return {
//         reply: "Sorry, there was a data validation error. Please try again.",
//         status: "failed",
//         error: "Data validation failed",
//       }
//     }
    
//     return {
//       reply: "Sorry, I encountered an error while processing your request.",
//       status: "failed",
//       error: error.message,
//     }
//   }
// }

// /**
//  * Get chat history with conversation threading
//  */
// export const getChatHistory = async (userId, conversationId = null) => {
//   try {
//     const query = { userId }
//     if (conversationId) {
//       query.conversationId = conversationId
//     }

//     const chats = await Chat.find(query).sort({ createdAt: -1 }).limit(50)
//     return chats
//   } catch (error) {
//     console.error("[Chat Controller] Error getting history:", error)
//     throw error
//   }
// }

// /**
//  * Mark message as read
//  */
// export const markMessageAsRead = async (messageId) => {
//   try {
//     const chat = await Chat.findByIdAndUpdate(
//       messageId, 
//       { status: "read" }, 
//       { new: true }
//     )

//     await MessageStatus.findOneAndUpdate(
//       { chatId: messageId }, 
//       { status: "read", readAt: new Date() }, 
//       { new: true }
//     )

//     return chat
//   } catch (error) {
//     console.error("[Chat Controller] Error marking as read:", error)
//     throw error
//   }
// }

// /**
//  * Get conversation thread
//  */
// export const getConversationThread = async (userId, conversationId) => {
//   try {
//     const messages = await Chat.find({ userId, conversationId }).sort({ createdAt: 1 })
//     return messages
//   } catch (error) {
//     console.error("[Chat Controller] Error getting conversation:", error)
//     throw error
//   }
// }

// export const createNewConversation = async (userId, title = null) => {
//   try {
//     const conversationId = new Date().getTime().toString();
//     const firstMessage = await Chat.create({
//       userId,
//       conversationId,
//       question: "Conversation started",
//       answer: "Hello! How can I help you today?",
//       intent: "greeting",
//       status: "read",
//       metadata: { isSystemMessage: true }
//     });

//     return {
//       conversationId,
//       title: title || `Chat ${new Date().toLocaleDateString()}`,
//       createdAt: new Date(),
//       messageCount: 1
//     };
//   } catch (error) {
//     throw error;
//   }
// };

// export const getUserConversations = async (userId, page = 1, limit = 20) => {
//   try {
//     const conversations = await Chat.aggregate([
//       { $match: { userId } },
//       {
//         $group: {
//           _id: "$conversationId",
//           lastMessage: { $last: "$$ROOT" },
//           messageCount: { $sum: 1 },
//           createdAt: { $first: "$createdAt" }
//         }
//       },
//       { $sort: { "lastMessage.createdAt": -1 } },
//       { $skip: (page - 1) * limit },
//       { $limit: limit }
//     ]);

//     return conversations.map(conv => ({
//       conversationId: conv._id,
//       lastMessage: conv.lastMessage,
//       messageCount: conv.messageCount,
//       createdAt: conv.createdAt
//     }));
//   } catch (error) {
//     throw error;
//   }
// };


///////////// adding conversation title 

import Chat from "../models/chatModel.js"
import MessageStatus from "../models/messageStatusModel.js"
import { processStudentMessage } from "../utils/aiHelper.js"
import { processMessageHybrid } from "../utils/ragAiHelper.js"
import { generateConversationTitle } from "../utils/titleGeneratorHelper.js"

const convertSourcesToValidFormat = (sources) => {
  if (!sources || !Array.isArray(sources)) return []

  return sources
    .filter((source) => source && typeof source === "object") // Filter out invalid sources
    .map((source) => {
      let relevance = 0.5 // default fallback

      if (source.relevance !== undefined && source.relevance !== null) {
        const relevanceValue = source.relevance

        if (typeof relevanceValue === "number") {
          // Already a number
          relevance = relevanceValue
        } else if (typeof relevanceValue === "string") {
          // Handle string formats
          const trimmed = relevanceValue.trim()

          // Handle percentage format (e.g., "88.2%")
          if (trimmed.includes("%")) {
            const match = trimmed.match(/(\d+\.?\d*)%/)
            if (match) {
              relevance = Number.parseFloat(match[1]) / 100
            }
          } else {
            // Handle decimal format (e.g., "0.882" or "88.2")
            const num = Number.parseFloat(trimmed)
            if (!Number.isNaN(num)) {
              relevance = num > 1 ? num / 100 : num
            }
          }
        }
      }

      let content = ""
      if (typeof source.content === "string") {
        content = source.content.length > 500 ? source.content.substring(0, 500) + "..." : source.content
      } else if (source.content) {
        content = String(source.content).substring(0, 500) + "..."
      }

      return {
        content: content,
        type: typeof source.type === "string" ? source.type : "unknown",
        relevance: Math.min(Math.max(relevance, 0), 1), // Ensure between 0-1
        metadata: source.metadata && typeof source.metadata === "object" ? source.metadata : {},
      }
    })
    .filter((source) => source.content && source.content.trim().length > 0) // Remove empty sources
}

export const handleRealtimeChat = async (userId, message, conversationId = null) => {
  const startTime = Date.now()
  try {
    console.log("[Chat Controller] Processing message:", message)

    let parentMessage = null
    let isFirstMessage = false
    let conversationTitle = null

    if (conversationId) {
      parentMessage = await Chat.findOne({ userId, conversationId }).sort({ createdAt: -1 })
    } else {
      isFirstMessage = true
    }

    const response = await processMessageHybrid(userId, message, async () => {
      console.log("[Chat Controller] Using intent-based fallback")
      const intentResponse = await processStudentMessage(userId, message)
      return {
        reply: intentResponse.reply,
        intent: intentResponse.intent,
        sources: [],
      }
    })

    if (isFirstMessage) {
      conversationTitle = await generateConversationTitle(message, response.intent)
    }

    const convertedSources = convertSourcesToValidFormat(response.sources)

    const chatData = {
      userId,
      conversationId: conversationId || new Date().getTime().toString(),
      conversationTitle: conversationTitle,
      isFirstMessage: isFirstMessage,
      parentMessageId: parentMessage?._id,
      question: message,
      answer: response.reply,
      intent: response.intent,
      status: "delivered",
      sources: convertedSources,
      metadata: {
        responseTime: Date.now() - startTime,
        retrievedDocuments: response.retrievedCount || 0,
        confidence: response.sources?.length > 0 ? 0.9 : 0.5,
      },
    }

    const savedChat = await Chat.create(chatData)

    await MessageStatus.create({
      chatId: savedChat._id,
      userId,
      status: "delivered",
      deliveredAt: new Date(),
    })

    return {
      reply: response.reply,
      conversationId: chatData.conversationId,
      conversationTitle: conversationTitle,
      messageId: savedChat._id,
      status: "delivered",
      responseTime: chatData.metadata.responseTime,
      sources: convertedSources,
    }
  } catch (error) {
    console.error("[Chat Controller] Error:", error)
    return {
      reply: "Sorry, I encountered an error while processing your request.",
      status: "failed",
      error: error.message,
    }
  }
}

/**
 * Get chat history with conversation threading
 */
export const getChatHistory = async (userId, conversationId = null) => {
  try {
    const query = { userId }
    if (conversationId) {
      query.conversationId = conversationId
    }

    const chats = await Chat.find(query).sort({ createdAt: -1 }).limit(50)
    return chats
  } catch (error) {
    console.error("[Chat Controller] Error getting history:", error)
    throw error
  }
}

/**
 * Mark message as read
 */
export const markMessageAsRead = async (messageId) => {
  try {
    const chat = await Chat.findByIdAndUpdate(messageId, { status: "read" }, { new: true })

    await MessageStatus.findOneAndUpdate({ chatId: messageId }, { status: "read", readAt: new Date() }, { new: true })

    return chat
  } catch (error) {
    console.error("[Chat Controller] Error marking as read:", error)
    throw error
  }
}

/**
 * Get conversation thread
 */
export const getConversationThread = async (userId, conversationId) => {
  try {
    const messages = await Chat.find({ userId, conversationId }).sort({ createdAt: 1 })
    return messages
  } catch (error) {
    console.error("[Chat Controller] Error getting conversation:", error)
    throw error
  }
}

/**
 * Get user conversations with titles
 */
export const getUserConversations = async (userId, page = 1, limit = 20) => {
  try {
    const conversations = await Chat.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: "$conversationId",
          title: { $first: "$conversationTitle" },
          lastMessage: { $last: "$$ROOT" },
          messageCount: { $sum: 1 },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $last: "$createdAt" },
        },
      },
      { $sort: { updatedAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ])

    return conversations.map((conv) => ({
      conversationId: conv._id,
      title: conv.title || "Chat",
      lastMessage: conv.lastMessage?.question || "No messages",
      messageCount: conv.messageCount,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    }))
  } catch (error) {
    console.error("[Chat Controller] Error getting conversations:", error)
    throw error
  }
}

/**
 * Update conversation title
 */
export const updateConversationTitle = async (userId, conversationId, newTitle) => {
  try {
    const result = await Chat.updateMany({ userId, conversationId }, { conversationTitle: newTitle })
    return result
  } catch (error) {
    console.error("[Chat Controller] Error updating title:", error)
    throw error
  }
}

/**
 * Delete conversation
 */
export const deleteConversation = async (userId, conversationId) => {
  try {
    const result = await Chat.deleteMany({ userId, conversationId })
    return result
  } catch (error) {
    console.error("[Chat Controller] Error deleting conversation:", error)
    throw error
  }
}

/**
 * Retry failed message
 */
export const retryFailedMessage = async (userId, messageId) => {
  try {
    const failedChat = await Chat.findById(messageId)
    if (!failedChat || failedChat.userId.toString() !== userId.toString()) {
      throw new Error("Message not found or unauthorized")
    }

    // Reprocess the original question
    const response = await processMessageHybrid(userId, failedChat.question, async () => {
      const intentResponse = await processStudentMessage(userId, failedChat.question)
      return {
        reply: intentResponse.reply,
        intent: intentResponse.intent,
        sources: [],
      }
    })

    const convertedSources = convertSourcesToValidFormat(response.sources)

    // Update the failed message with new response
    const updatedChat = await Chat.findByIdAndUpdate(
      messageId,
      {
        answer: response.reply,
        intent: response.intent,
        status: "delivered",
        sources: convertedSources,
        metadata: {
          responseTime: Date.now() - failedChat.createdAt.getTime(),
          retrievedDocuments: response.retrievedCount || 0,
          confidence: response.sources?.length > 0 ? 0.9 : 0.5,
          retried: true,
        },
      },
      { new: true },
    )

    await MessageStatus.findOneAndUpdate(
      { chatId: messageId },
      { status: "delivered", deliveredAt: new Date() },
      { new: true },
    )

    return {
      reply: response.reply,
      messageId: updatedChat._id,
      status: "delivered",
      sources: convertedSources,
    }
  } catch (error) {
    console.error("[Chat Controller] Error retrying message:", error)
    throw error
  }
}

export const createNewConversation = async (userId, title = null) => {
  try {
    const conversationId = new Date().getTime().toString()
    return {
      conversationId,
      title: title || `Chat ${new Date().toLocaleDateString()}`,
      createdAt: new Date(),
      messageCount: 0,
    }
  } catch (error) {
    throw error
  }
}
