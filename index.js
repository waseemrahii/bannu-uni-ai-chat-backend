// // import express from "express"
// // import dotenv from "dotenv"
// // import http from "http"
// // import { Server } from "socket.io"
// // import cors from "cors"
// // import connectDB from "./config/db.js"
// // import morgan from "morgan"

// // import { initializeQuotaTracker, getQuotaUsage } from "./utils/quotaInitializer.js"

// // // routes
// // import authRoutes from "./routes/authRoutes.js"
// // import chatRoutes from "./routes/chatRoutes.js"
// // import eventRoutes from "./routes/eventRoutes.js"
// // import scheduleRoutes from "./routes/scheduleRoutes.js"
// // import resultRoutes from "./routes/resultRoutes.js"
// // import ingestRoutes from "./routes/ingestionRoutes.js"
// // import generalInfoRoutes from "./routes/generalInfoRoutes.js"
// // import dashboardRoutes from "./routes/dashboardRoutes.js"
// // import vectorSearchRoutes from "./routes/vectorSearchRoutes.js"
// // import QuotaManager from './utils/quotaManager.js'

// // // middleware
// // import { notFound, errorHandler } from "./middlewares/errorMiddleware.js"

// // // controllers
// // import { handleRealtimeChat } from "./controllers/chatController.js"
// // import embeddingService from "./services/embeddingService.js"

// // dotenv.config()
// // connectDB()


// // initializeQuotaTracker()

// // const app = express()
// // app.use(express.json())
// // app.use(cors())
// // app.use(morgan("dev"))

// // // Initialize quota system on startup
// // QuotaManager.ensureQuotaFile()
// // const quotaStatus = QuotaManager.getStatus()
// // console.log('📊 Quota system initialized:', quotaStatus)

// // // Log embedding service status
// // const embeddingStats = embeddingService.getCacheStats()
// // console.log('🔧 Embedding service status:', {
// //   quota: embeddingStats.quotaUsage,
// //   cache: embeddingStats.cacheSize,
// //   queue: embeddingStats.queueLength
// // })
// // // REST routes
// // app.use("/api/auth", authRoutes)
// // app.use("/api/chat", chatRoutes)
// // app.use("/api/events", eventRoutes)
// // app.use("/api/schedules", scheduleRoutes)
// // app.use("/api/results", resultRoutes)
// // app.use("/api/general-info", generalInfoRoutes)
// // app.use("/api/dashboard", dashboardRoutes)
// // app.use("/api/vector-search", vectorSearchRoutes)
// // app.use("/api/ingest", ingestRoutes)

// // // Health check route
// // app.get("/health", (req, res) => {
// //   res.status(200).json({ status: "OK", message: "Server is running" })
// // })

// // app.get("/api/quota-status", (req, res) => {
// //   const quotaUsage = getQuotaUsage()
// //   res.status(200).json({
// //     status: "OK",
// //     quotaUsage,
// //     message:
// //       quotaUsage.percentage >= 100
// //         ? "API quota exceeded for today. Using fallback embeddings."
// //         : `${quotaUsage.remaining} requests remaining today`,
// //   })
// // })

// // // Root route
// // app.get("/", (req, res) => {
// //   res.json({ message: "University AI Chat API", version: "1.0.0" })
// // })

// // app.use(notFound)
// // app.use(errorHandler)

// // // WebSocket setup
// // const server = http.createServer(app)
// // const io = new Server(server, {
// //   cors: { origin: "*", methods: ["GET", "POST"] },
// // })

// // io.on("connection", (socket) => {
// //   console.log("🟢 Client connected:", socket.id)

// //   socket.on("dashboard_subscribe", (data) => {
// //     const { userId, userRole } = data
// //     socket.join(`dashboard_${userId}`)
// //     console.log(`📊 User ${userId} subscribed to dashboard updates`)
// //   })

// //   socket.on("dashboard_unsubscribe", (data) => {
// //     const { userId } = data
// //     socket.leave(`dashboard_${userId}`)
// //     console.log(`📊 User ${userId} unsubscribed from dashboard updates`)
// //   })

// //   socket.on("student_message", async (data) => {
// //     try {
// //       const { userId, message } = data
// //       console.log("Question:", message)

// //       // 1. Echo student message immediately
// //       socket.emit("chat_message", {
// //         from: "student",
// //         content: message,
// //         timestamp: new Date(),
// //       })

// //       // 2. Handle AI logic with DB context and RAG
// //       const aiResponse = await handleRealtimeChat(userId, message)

// //       // 3. Send AI reply instantly
// //       socket.emit("chat_message", {
// //         from: "ai",
// //         content: aiResponse,
// //         timestamp: new Date(),
// //       })
// //     } catch (err) {
// //       console.error("Chat error:", err)
// //       socket.emit("chat_message", {
// //         from: "system",
// //         content: "⚠️ Sorry, something went wrong while replying.",
// //       })
// //     }
// //   })

// //   socket.on("disconnect", () => console.log("🔴 Client disconnected:", socket.id))
// // })

// // const PORT = process.env.PORT || 5000
// // server.listen(PORT, () => console.log(`✅ Server running on ${PORT}`))

// //// setting for chat history 

// import express from "express"
// import dotenv from "dotenv"
// import http from "http"
// import { Server } from "socket.io"
// import cors from "cors"
// import connectDB from "./config/db.js"
// import morgan from "morgan"

// import { initializeQuotaTracker, getQuotaUsage } from "./utils/quotaInitializer.js"

// // routes
// import authRoutes from "./routes/authRoutes.js"
// import chatRoutes from "./routes/chatRoutes.js"
// import eventRoutes from "./routes/eventRoutes.js"
// import scheduleRoutes from "./routes/scheduleRoutes.js"
// import resultRoutes from "./routes/resultRoutes.js"
// import generalInfoRoutes from "./routes/generalInfoRoutes.js"
// import dashboardRoutes from "./routes/dashboardRoutes.js"
// import vectorSearchRoutes from "./routes/vectorSearchRoutes.js"
// import ingestRoutes from "./routes/ingestionRoutes.js"

// // middleware
// import { notFound, errorHandler } from "./middlewares/errorMiddleware.js"

// // controllers
// import { handleRealtimeChat } from "./controllers/chatController.js"

// dotenv.config()
// connectDB()

// initializeQuotaTracker()

// const app = express()
// app.use(express.json())
// app.use(cors())
// app.use(morgan("dev"))

// // REST routes
// app.use("/api/auth", authRoutes)
// app.use("/api/chat", chatRoutes)
// app.use("/api/events", eventRoutes)
// app.use("/api/schedules", scheduleRoutes)
// app.use("/api/results", resultRoutes)
// app.use("/api/general-info", generalInfoRoutes)
// app.use("/api/dashboard", dashboardRoutes)
// app.use("/api/vector-search", vectorSearchRoutes)
// app.use("/api/ingest", ingestRoutes)

// // Health check route
// app.get("/health", (req, res) => {
//   res.status(200).json({ status: "OK", message: "Server is running" })
// })

// app.get("/api/quota-status", (req, res) => {
//   const quotaUsage = getQuotaUsage()
//   res.status(200).json({
//     status: "OK",
//     quotaUsage,
//     message:
//       quotaUsage.percentage >= 100
//         ? "API quota exceeded for today. Using fallback embeddings."
//         : `${quotaUsage.remaining} requests remaining today`,
//   })
// })

// // Root route
// app.get("/", (req, res) => {
//   res.json({ message: "University AI Chat API", version: "1.0.0" })
// })

// app.use(notFound)
// app.use(errorHandler)

// // WebSocket setup
// const server = http.createServer(app)
// const io = new Server(server, {
//   cors: { origin: "*", methods: ["GET", "POST"] },
// })

// io.on("connection", (socket) => {
//   console.log("🟢 Client connected:", socket.id)

//   socket.on("dashboard_subscribe", (data) => {
//     const { userId, userRole } = data
//     socket.join(`dashboard_${userId}`)
//     console.log(`📊 User ${userId} subscribed to dashboard updates`)
//   })

//   socket.on("dashboard_unsubscribe", (data) => {
//     const { userId } = data
//     socket.leave(`dashboard_${userId}`)
//     console.log(`📊 User ${userId} unsubscribed from dashboard updates`)
//   })

//   socket.on("user_typing", (data) => {
//     const { userId, conversationId } = data
//     socket.broadcast.emit("user_typing_indicator", {
//       userId,
//       conversationId,
//       isTyping: true,
//     })
//   })

//   socket.on("user_stopped_typing", (data) => {
//     const { userId, conversationId } = data
//     socket.broadcast.emit("user_typing_indicator", {
//       userId,
//       conversationId,
//       isTyping: false,
//     })
//   })

//   socket.on("message_read", (data) => {
//     const { messageId, userId } = data
//     socket.broadcast.emit("message_read_receipt", {
//       messageId,
//       userId,
//       readAt: new Date(),
//     })
//   })

//   socket.on("student_message", async (data) => {
//     try {
//       const { userId, message, conversationId } = data
//       console.log("Question:", message)

//       socket.emit("chat_message", {
//         from: "student",
//         content: message,
//         status: "sent",
//         timestamp: new Date(),
//         conversationId,
//       })

//       const aiResponse = await handleRealtimeChat(userId, message, conversationId)

//       socket.emit("chat_message", {
//         from: "ai",
//         content: aiResponse.reply,
//         messageId: aiResponse.messageId,
//         status: "delivered",
//         timestamp: new Date(),
//         conversationId: aiResponse.conversationId,
//         responseTime: aiResponse.responseTime,
//         sources: aiResponse.sources,
//       })
//     } catch (err) {
//       console.error("Chat error:", err)
//       socket.emit("chat_message", {
//         from: "system",
//         content: "⚠️ Sorry, something went wrong while replying.",
//         status: "failed",
//       })
//     }
//   })

//   socket.on("disconnect", () => console.log("🔴 Client disconnected:", socket.id))
// })

// const PORT = process.env.PORT || 5000
// server.listen(PORT, () => console.log(`✅ Server running on ${PORT}`))



///////////////////////


import express from "express"
import dotenv from "dotenv"
import http from "http"
import { Server } from "socket.io"
import cors from "cors"
import connectDB from "./config/db.js"
import morgan from "morgan"

import { initializeQuotaTracker, getQuotaUsage } from "./utils/quotaInitializer.js"
import typingSuggestionService from "./services/typingSuggestionService.js"

// routes
import authRoutes from "./routes/authRoutes.js"
import chatRoutes from "./routes/chatRoutes.js"
import eventRoutes from "./routes/eventRoutes.js"
import scheduleRoutes from "./routes/scheduleRoutes.js"
import resultRoutes from "./routes/resultRoutes.js"
import generalInfoRoutes from "./routes/generalInfoRoutes.js"
import dashboardRoutes from "./routes/dashboardRoutes.js"
import vectorSearchRoutes from "./routes/vectorSearchRoutes.js"

// middleware
import { notFound, errorHandler } from "./middlewares/errorMiddleware.js"

// controllers
import { handleRealtimeChat } from "./controllers/chatController.js"

dotenv.config()
connectDB()

initializeQuotaTracker()

const app = express()
app.use(express.json())
app.use(cors())
app.use(morgan("dev"))

// REST routes
app.use("/api/auth", authRoutes)
app.use("/api/chat", chatRoutes)
app.use("/api/events", eventRoutes)
app.use("/api/schedules", scheduleRoutes)
app.use("/api/results", resultRoutes)
app.use("/api/general-info", generalInfoRoutes)
app.use("/api/dashboard", dashboardRoutes)
app.use("/api/vector-search", vectorSearchRoutes)

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is running" })
})

app.get("/api/quota-status", (req, res) => {
  const quotaUsage = getQuotaUsage()
  res.status(200).json({
    status: "OK",
    quotaUsage,
    message:
      quotaUsage.percentage >= 100
        ? "API quota exceeded for today. Using fallback embeddings."
        : `${quotaUsage.remaining} requests remaining today`,
  })
})

// Root route
app.get("/", (req, res) => {
  res.json({ message: "University AI Chat API", version: "1.0.0" })
})

app.use(notFound)
app.use(errorHandler)

// WebSocket setup
const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
})

io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id)

  socket.on("dashboard_subscribe", (data) => {
    const { userId, userRole } = data
    socket.join(`dashboard_${userId}`)
    console.log(`📊 User ${userId} subscribed to dashboard updates`)
  })

  socket.on("dashboard_unsubscribe", (data) => {
    const { userId } = data
    socket.leave(`dashboard_${userId}`)
    console.log(`📊 User ${userId} unsubscribed from dashboard updates`)
  })

  // socket.on("user_typing", (data) => {
  //   const { userId, conversationId } = data
  //   socket.broadcast.emit("user_typing_indicator", {
  //     userId,
  //     conversationId,
  //     isTyping: true,
  //   })
  // })

  // socket.on("user_stopped_typing", (data) => {
  //   const { userId, conversationId } = data
  //   socket.broadcast.emit("user_typing_indicator", {
  //     userId,
  //     conversationId,
  //     isTyping: false,
  //   })
  // })

  // socket.on("typing_query", async (data) => {
  //   try {
  //     const { userId, query, className, semester, conversationId } = data

  //     if (!query || query.trim().length < 2) {
  //       socket.emit("typing_suggestions", {
  //         conversationId,
  //         suggestions: [],
  //       })
  //       return
  //     }

  //     const suggestions = await typingSuggestionService.generateSuggestions(userId, query.trim(), className, semester)

  //     socket.emit("typing_suggestions", {
  //       conversationId,
  //       suggestions,
  //       query,
  //     })
  //   } catch (error) {
  //     console.error("[Socket.IO] Error generating suggestions:", error)
  //     socket.emit("typing_suggestions", {
  //       suggestions: [],
  //       error: "Failed to generate suggestions",
  //     })
  //   }
  // })

  socket.on("message_read", (data) => {
    const { messageId, userId } = data
    socket.broadcast.emit("message_read_receipt", {
      messageId,
      userId,
      readAt: new Date(),
    })
  })

  socket.on("student_message", async (data) => {
    try {
      const { userId, message, conversationId } = data
      console.log("Question:", message)

      socket.emit("chat_message", {
        from: "student",
        content: message,
        status: "sent",
        timestamp: new Date(),
        conversationId,
      })

      const aiResponse = await handleRealtimeChat(userId, message, conversationId)

      socket.emit("chat_message", {
        from: "ai",
        content: aiResponse.reply,
        messageId: aiResponse.messageId,
        status: "delivered",
        timestamp: new Date(),
        conversationId: aiResponse.conversationId,
        responseTime: aiResponse.responseTime,
        sources: aiResponse.sources,
      })
    } catch (err) {
      console.error("Chat error:", err)
      socket.emit("chat_message", {
        from: "system",
        content: "⚠️ Sorry, something went wrong while replying.",
        status: "failed",
      })
    }
  })

  socket.on("disconnect", () => console.log("🔴 Client disconnected:", socket.id))
})

const PORT = process.env.PORT || 5000
server.listen(PORT, () => console.log(`✅ Server running on ${PORT}`))


