/**
 * Setup script for MongoDB Atlas Vector Search
 * Run this after creating the vector search index in MongoDB Atlas
 */

import mongoose from "mongoose"
import dotenv from "dotenv"
import DocumentIngestionHelper from "../utils/documentIngestionHelper.js"

dotenv.config()

async function setupVectorSearch() {
  try {
    console.log("[Setup] Connecting to MongoDB...")
    await mongoose.connect(process.env.MONGO_URI)
    console.log("[Setup] Connected to MongoDB")

    console.log("[Setup] Starting vector search setup...")

    // Step 1: Verify vector search index exists
    console.log("\n[Setup] Step 1: Verifying vector search index...")
    const db = mongoose.connection.db
    const searchIndexes = await db.collection("vectordocuments").listSearchIndexes().toArray()
    console.log(
      "[Setup] Available search indexes:",
      searchIndexes.map((idx) => idx.name),
    )

    if (!searchIndexes.some((idx) => idx.name === "vector_search_index")) {
      console.warn("[Setup] WARNING: vector_search_index not found!")
      console.warn("[Setup] Please create the index in MongoDB Atlas first:")
      console.warn("[Setup] 1. Go to MongoDB Atlas Dashboard")
      console.warn("[Setup] 2. Click Search tab")
      console.warn("[Setup] 3. Create Search Index with name 'vector_search_index'")
      console.warn("[Setup] 4. Use the configuration from VECTOR_SEARCH_SETUP_GUIDE.md")
      return
    }

    console.log("[Setup] ✓ Vector search index found!")

    // Step 2: Ingest documents
    console.log("\n[Setup] Step 2: Ingesting documents into vector database...")
    const result = await DocumentIngestionHelper.ingestAllDocuments()
    console.log("[Setup] ✓ Documents ingested:", result)

    // Step 3: Verify ingestion
    console.log("\n[Setup] Step 3: Verifying ingestion...")
    const VectorDocument = mongoose.model("VectorDocument")
    const count = await VectorDocument.countDocuments()
    console.log(`[Setup] ✓ Total vector documents: ${count}`)

    const stats = await VectorDocument.aggregate([
      {
        $group: {
          _id: "$metadata.type",
          count: { $sum: 1 },
        },
      },
    ])
    console.log("[Setup] Documents by type:", stats)

    console.log("\n[Setup] ✓ Vector search setup complete!")
    console.log("[Setup] You can now use RAG endpoints:")
    console.log("[Setup] - POST /api/vector-search/search")
    console.log("[Setup] - POST /api/vector-search/answer")
    console.log("[Setup] - GET /api/vector-search/stats")
  } catch (error) {
    console.error("[Setup] Error:", error)
  } finally {
    await mongoose.disconnect()
  }
}

setupVectorSearch()
