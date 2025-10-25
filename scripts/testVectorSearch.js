/**
 * Test script for vector search functionality
 * Tests embedding generation, vector search, and RAG answer generation
 */

import mongoose from "mongoose"
import dotenv from "dotenv"
import embeddingService from "../services/embeddingService.js"
import ragService from "../services/ragService.js"
import advancedRAGService from "../services/advancedRAGService.js"

dotenv.config()

async function testVectorSearch() {
  try {
    console.log("[Test] Connecting to MongoDB...")
    await mongoose.connect(process.env.MONGO_URI)
    console.log("[Test] Connected!")

    // Test 1: Embedding generation
    console.log("\n[Test] Test 1: Embedding Generation")
    const testText = "What are my classes tomorrow?"

    try {
      const embedding = await embeddingService.generateEmbedding(testText)
      console.log(`[Test] ✓ Generated embedding with ${embedding.length} dimensions`)
      console.log(
        `[Test] First 5 values: ${embedding
          .slice(0, 5)
          .map((v) => v.toFixed(3))
          .join(", ")}`,
      )
    } catch (error) {
      console.error("[Test] ✗ Embedding generation failed:", error.message)
      console.log("[Test] Note: This is likely due to API quota limits. Check your Google API plan.")
      console.log("[Test] Skipping remaining tests...")
      return
    }

    // Test 2: Vector search
    console.log("\n[Test] Test 2: Vector Search")
    try {
      const searchResults = await ragService.retrieveRelevantDocuments(testText, {}, 3)
      console.log(`[Test] ✓ Found ${searchResults.length} relevant documents`)
      searchResults.forEach((doc, idx) => {
        console.log(
          `[Test] Result ${idx + 1}: ${doc.content.substring(0, 100)}... (Score: ${doc.similarityScore?.toFixed(3)})`,
        )
      })
    } catch (error) {
      console.error("[Test] ✗ Vector search failed:", error.message)
    }

    // Test 3: RAG answer generation
    console.log("\n[Test] Test 3: RAG Answer Generation")
    try {
      const ragAnswer = await ragService.generateRAGAnswer(testText)
      console.log(`[Test] ✓ Generated RAG answer`)
      console.log(`[Test] Answer: ${ragAnswer.answer.substring(0, 200)}...`)
      console.log(`[Test] Sources: ${ragAnswer.sources.length}`)
    } catch (error) {
      console.error("[Test] ✗ RAG answer generation failed:", error.message)
    }

    // Test 4: Advanced RAG with multiple strategies
    console.log("\n[Test] Test 4: Advanced RAG (Multiple Strategies)")
    try {
      const advancedResults = await advancedRAGService.retrieveWithMultipleStrategies(testText, {}, 3)
      console.log(`[Test] ✓ Retrieved ${advancedResults.length} documents using multiple strategies`)
    } catch (error) {
      console.error("[Test] ✗ Advanced RAG failed:", error.message)
    }

    // Test 5: Statistics
    console.log("\n[Test] Test 5: Vector Database Statistics")
    try {
      const stats = await ragService.getStatistics()
      console.log(`[Test] ✓ Total documents: ${stats.totalDocuments}`)
      console.log(`[Test] By type:`, stats.byType)
    } catch (error) {
      console.error("[Test] ✗ Statistics retrieval failed:", error.message)
    }

    console.log("\n[Test] Test 6: Embedding Cache Statistics")
    const cacheStats = embeddingService.getCacheStats()
    console.log(`[Test] Cache size: ${cacheStats.cacheSize} entries`)
    console.log(`[Test] Queue length: ${cacheStats.queueLength}`)
    console.log(`[Test] Is processing: ${cacheStats.isProcessing}`)

    console.log("\n[Test] ✓ Tests completed!")
  } catch (error) {
    console.error("[Test] Fatal error:", error)
  } finally {
    await mongoose.disconnect()
  }
}

testVectorSearch()
