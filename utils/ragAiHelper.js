import advancedRAGService from "../services/advancedRAGService.js"
import ragService from "../services/ragService.js"
import RAGContextBuilder from "./ragContextBuilder.js"
import User from "../models/userModel.js"

/**
 * Process student message using RAG with advanced strategies
 * @param {string} userId - User ID
 * @param {string} message - Student message
 * @returns {Promise<object>} - RAG response with answer and sources
 */
export const processStudentMessageWithRAG = async (userId, message) => {
  try {
    console.log("[RAG AI Helper] Processing message with RAG:", message)

    const user = await User.findById(userId)
    if (!user) {
      return {
        reply: "User not found. Please check your account.",
        intent: "UNKNOWN",
        sources: [],
      }
    }

    // Build filters based on user context
    const filters = {}
    if (user.semester) filters.semester = user.semester
    if (user.className) filters.className = user.className

    // Use advanced RAG with multiple retrieval strategies
    const retrievedDocs = await advancedRAGService.retrieveWithMultipleStrategies(message, filters, 5)

    if (retrievedDocs.length === 0) {
      console.log("[RAG AI Helper] No relevant documents found")
      return {
        reply: "I could not find relevant information to answer your question.",
        intent: "RAG_NO_RESULTS",
        sources: [],
        retrievedCount: 0,
      }
    }

    // Build context from retrieved documents
    const context = RAGContextBuilder.buildContext(retrievedDocs, {
      maxLength: 3000,
      includeMetadata: true,
      includeScores: true,
    })

    // Generate answer with context compression
    const answer = await advancedRAGService.generateAnswerWithCompression(message, retrievedDocs)

    // Format sources for response
    const sources = RAGContextBuilder.formatForDisplay(retrievedDocs)

    return {
      reply: answer,
      intent: "RAG_RESPONSE",
      sources: sources,
      retrievedCount: retrievedDocs.length,
      keyInfo: RAGContextBuilder.extractKeyInfo(retrievedDocs),
    }
  } catch (error) {
    console.error("[RAG AI Helper] Error processing message:", error)
    return {
      reply: "Sorry, I encountered an error while processing your request.",
      intent: "ERROR",
      sources: [],
    }
  }
}

/**
 * Hybrid approach: Try RAG first, fallback to intent-based handlers
 * @param {string} userId - User ID
 * @param {string} message - Student message
 * @param {function} intentHandler - Fallback intent handler
 * @returns {Promise<object>} - Response
 */
export const processMessageHybrid = async (userId, message, intentHandler) => {
  try {
    console.log("[RAG AI Helper] Processing message with hybrid approach")

    // Try RAG first
    const ragResponse = await processStudentMessageWithRAG(userId, message)

    // If RAG found relevant documents, use it
    if (ragResponse.retrievedCount > 0) {
      console.log("[RAG AI Helper] Using RAG response")
      return ragResponse
    }

    // Fallback to intent-based handler
    console.log("[RAG AI Helper] Falling back to intent handler")
    return await intentHandler()
  } catch (error) {
    console.error("[RAG AI Helper] Error in hybrid processing:", error)
    return {
      reply: "Sorry, I encountered an error while processing your request.",
      intent: "ERROR",
      sources: [],
    }
  }
}

/**
 * Get RAG statistics
 */
export const getRAGStatistics = async () => {
  try {
    return await ragService.getStatistics()
  } catch (error) {
    console.error("[RAG AI Helper] Error getting statistics:", error)
    throw error
  }
}
