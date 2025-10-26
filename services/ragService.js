import { RecursiveCharacterTextSplitter } from "@langchain/classic/text_splitter"
import VectorDocument from "../models/vectorDocumentModel.js"
import embeddingService from "./embeddingService.js"
import { GoogleGenerativeAI } from "@google/generative-ai"

class RAGService {
  constructor() {
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ["\n\n", "\n", ". ", " ", ""],
    })
    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)
    this.useVectorSearch = process.env.USE_VECTOR_SEARCH !== "false" // Default to true
  }

  /**
   * Ingest document into vector database
   * @param {string} content - Document content
   * @param {object} metadata - Document metadata
   * @returns {Promise<object>} - Ingestion result
   */
  async ingestDocument(content, metadata) {
    try {
      console.log("[RAGService] Ingesting document:", metadata.type)

      // Split document into chunks
      const chunks = await this.textSplitter.splitText(content)
      console.log(`[RAGService] Split into ${chunks.length} chunks`)

      const vectorDocuments = []

      // Generate embeddings for each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        const embedding = await embeddingService.generateEmbedding(chunk)

        const vectorDoc = new VectorDocument({
          content: chunk,
          embedding,
          metadata,
          chunkIndex: i,
          totalChunks: chunks.length,
        })

        vectorDocuments.push(vectorDoc)
      }

      // Save all documents
      const savedDocs = await VectorDocument.insertMany(vectorDocuments)
      console.log(`[RAGService] Saved ${savedDocs.length} vector documents`)

      return {
        success: true,
        documentsCount: savedDocs.length,
        chunksCount: chunks.length,
      }
    } catch (error) {
      console.error("[RAGService] Error ingesting document:", error)
      throw error
    }
  }

  /**
   * Retrieve relevant documents using vector search with fallback
   * @param {string} query - User query
   * @param {object} filters - Metadata filters
   * @param {number} topK - Number of results to return
   * @returns {Promise<object[]>} - Retrieved documents with scores
   */
  async retrieveRelevantDocuments(query, filters = {}, topK = 5) {
    try {
      console.log("[RAGService] Retrieving documents for query:", query)

      if (this.useVectorSearch) {
        try {
          const results = await this._vectorSearch(query, filters, topK)
          if (results && results.length > 0) {
            console.log(`[RAGService] Vector search returned ${results.length} documents`)
            return results
          }
        } catch (vectorError) {
          console.warn("[RAGService] Vector search failed, falling back to keyword search:", vectorError.message)
        }
      }

      console.log("[RAGService] Using keyword search fallback")
      const results = await this.keywordSearch(query, filters, topK)
      return results
    } catch (error) {
      console.error("[RAGService] Error retrieving documents:", error.message)
      return []
    }
  }

  /**
   * Vector search using MongoDB Atlas $vectorSearch operator
   * @private
   */
  async _vectorSearch(query, filters = {}, topK = 5) {
    try {
      // Generate embedding for query
      const queryEmbedding = await embeddingService.generateEmbedding(query)

      const pipeline = [
        {
          $vectorSearch: {
            index: "vector_search_index",
            path: "embedding",
            queryVector: queryEmbedding,
            numCandidates: Math.min(100, topK * 10),
            limit: topK,
          },
        },
        {
          $project: {
            similarityScore: { $meta: "vectorSearchScore" },
            content: 1,
            metadata: 1,
            chunkIndex: 1,
            totalChunks: 1,
            _id: 1,
          },
        },
      ]

      if (Object.keys(filters).length > 0) {
        const matchStage = { $match: {} }
        Object.entries(filters).forEach(([key, value]) => {
          if (key === "metadata.date") {
            matchStage.$match[key] = value
          } else if (key.startsWith("metadata.")) {
            matchStage.$match[key] = value
          } else {
            matchStage.$match[`metadata.${key}`] = value
          }
        })
        pipeline.push(matchStage)
      }

      // Execute search
      const results = await VectorDocument.aggregate(pipeline).limit(topK)

      // Record access for relevance tracking
      for (const doc of results) {
        await VectorDocument.findByIdAndUpdate(doc._id, {
          $inc: { accessCount: 1 },
          lastAccessed: new Date(),
        })
      }

      return results
    } catch (error) {
      console.error("[RAGService] Vector search error:", error.message)
      throw error
    }
  }

  /**
   * Keyword-based search fallback
   * @param {string} query - User query
   * @param {object} filters - Metadata filters
   * @param {number} topK - Number of results to return
   * @returns {Promise<object[]>} - Retrieved documents
   */
  async keywordSearch(query, filters = {}, topK = 5) {
    try {
      console.log("[RAGService] Performing keyword search for:", query)

      // Split query into keywords
      const keywords = query
        .toLowerCase()
        .split(/\s+/)
        .filter((k) => k.length > 2)

      // Build search regex pattern
      const searchPattern = keywords.join("|")
      const regex = new RegExp(searchPattern, "i")

      // Build query
      const searchQuery = {
        content: { $regex: regex },
      }

      Object.entries(filters).forEach(([key, value]) => {
        if (key === "metadata.date") {
          searchQuery[key] = value
        } else if (key.startsWith("metadata.")) {
          searchQuery[key] = value
        } else {
          searchQuery[`metadata.${key}`] = value
        }
      })

      // Execute keyword search
      const results = await VectorDocument.find(searchQuery).limit(topK).sort({ accessCount: -1, createdAt: -1 })

      console.log(`[RAGService] Keyword search returned ${results.length} documents`)
      return results
    } catch (error) {
      console.error("[RAGService] Error in keyword search:", error.message)
      return []
    }
  }

  /**
   * Generate answer using RAG (Retrieval Augmented Generation)
   * @param {string} query - User query
   * @param {object} filters - Metadata filters
   * @returns {Promise<object>} - Generated answer with sources
   */
  async generateRAGAnswer(query, filters = {}) {
    try {
      console.log("[RAGService] Generating RAG answer for:", query)

      // Step 1: Retrieve relevant documents
      const retrievedDocs = await this.retrieveRelevantDocuments(query, filters, 5)

      if (retrievedDocs.length === 0) {
        console.log("[RAGService] No relevant documents found")
        return {
          answer: "I could not find relevant information to answer your question.",
          sources: [],
          retrievedCount: 0,
        }
      }

      // Step 2: Build context from retrieved documents
      const context = retrievedDocs.map((doc, idx) => `[Source ${idx + 1}]\n${doc.content}`).join("\n\n")

      // Step 3: Create prompt with context
      const systemPrompt = `You are a helpful university assistant. Use the provided context to answer the student's question accurately and helpfully. If the context doesn't contain relevant information, say so clearly.

Context:
${context}

Instructions:
- Answer based on the provided context
- Be concise and clear
- If information is not in the context, acknowledge it
- Provide specific details when available`

      // Step 4: Generate answer using Gemini
      const model = this.client.getGenerativeModel({
        model: "gemini-2.0-flash",
      })

      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: query }],
          },
        ],
        systemInstruction: systemPrompt,
      })

      const answer = result.response.text()

      // Step 5: Format response with sources
      return {
        answer,
        sources: retrievedDocs.map((doc) => ({
          content: doc.content.substring(0, 200) + "...",
          type: doc.metadata.type,
          metadata: doc.metadata,
          score: doc.similarityScore || 0,
        })),
        retrievedCount: retrievedDocs.length,
      }
    } catch (error) {
      console.error("[RAGService] Error generating RAG answer:", error)
      throw error
    }
  }

  /**
   * Update document in vector database
   * @param {string} documentId - Document ID
   * @param {string} newContent - Updated content
   * @param {object} metadata - Updated metadata
   */
  async updateDocument(documentId, newContent, metadata) {
    try {
      console.log("[RAGService] Updating document:", documentId)

      // Delete old chunks
      await VectorDocument.deleteMany({
        "metadata.sourceId": documentId,
      })

      // Ingest updated document
      return await this.ingestDocument(newContent, metadata)
    } catch (error) {
      console.error("[RAGService] Error updating document:", error)
      throw error
    }
  }

  /**
   * Delete document from vector database
   * @param {string} documentId - Document ID
   */
  async deleteDocument(documentId) {
    try {
      console.log("[RAGService] Deleting document:", documentId)

      const result = await VectorDocument.deleteMany({
        "metadata.sourceId": documentId,
      })

      console.log(`[RAGService] Deleted ${result.deletedCount} chunks`)
      return result
    } catch (error) {
      console.error("[RAGService] Error deleting document:", error)
      throw error
    }
  }

  /**
   * Clear all vector documents (use with caution)
   */
  async clearAllDocuments() {
    try {
      console.log("[RAGService] Clearing all vector documents")
      const result = await VectorDocument.deleteMany({})
      console.log(`[RAGService] Deleted ${result.deletedCount} documents`)
      return result
    } catch (error) {
      console.error("[RAGService] Error clearing documents:", error)
      throw error
    }
  }

  /**
   * Get vector database statistics
   */
  async getStatistics() {
    try {
      const stats = await VectorDocument.aggregate([
        {
          $group: {
            _id: "$metadata.type",
            count: { $sum: 1 },
            avgAccessCount: { $avg: "$accessCount" },
          },
        },
      ])

      const totalDocs = await VectorDocument.countDocuments()

      return {
        totalDocuments: totalDocs,
        byType: stats,
      }
    } catch (error) {
      console.error("[RAGService] Error getting statistics:", error)
      throw error
    }
  }
}

export default new RAGService()
