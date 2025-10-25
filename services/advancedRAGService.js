
import { RecursiveCharacterTextSplitter } from "@langchain/classic/text_splitter"
import VectorDocument from "../models/vectorDocumentModel.js"
import embeddingService from "./embeddingService.js"
import vectorMemoryStore from "./vectorMemoryStore.js"
import { GoogleGenerativeAI } from "@google/generative-ai"

/**
 * Advanced RAG Service with multiple retrieval strategies
 */
class AdvancedRAGService {
  constructor() {
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ["\n\n", "\n", ". ", " ", ""],
    })
    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)
    this.useMemoryStore = false // Set to true if MongoDB vector search unavailable
  }

  /**
   * Retrieve documents using multiple strategies
   */
  async retrieveWithMultipleStrategies(query, filters = {}, topK = 5) {
    try {
      console.log("[AdvancedRAG] Retrieving with multiple strategies")

      // Strategy 1: Vector similarity search
      const vectorResults = await this.vectorSearch(query, filters, topK)

      // Strategy 2: Keyword search (BM25-like)
      const keywordResults = await this.keywordSearch(query, filters, topK)

      // Strategy 3: Metadata-based filtering
      const metadataResults = await this.metadataSearch(query, filters, topK)

      // Combine and deduplicate results
      const combined = this.combineResults([...vectorResults, ...keywordResults, ...metadataResults])

      return combined.slice(0, topK)
    } catch (error) {
      console.error("[AdvancedRAG] Error in multi-strategy retrieval:", error)
      throw error
    }
  }

  /**
   * Vector similarity search
   */
  async vectorSearch(query, filters = {}, topK = 5) {
    try {
      const queryEmbedding = await embeddingService.generateEmbedding(query)

      if (this.useMemoryStore) {
        return vectorMemoryStore.search(queryEmbedding, topK)
      }

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
          matchStage.$match[`metadata.${key}`] = value
        })
        pipeline.push(matchStage)
      }

      return await VectorDocument.aggregate(pipeline).limit(topK)
    } catch (error) {
      console.error("[AdvancedRAG] Error in vector search:", error)
      return []
    }
  }

  /**
   * Keyword-based search
   */
  async keywordSearch(query, filters = {}, topK = 5) {
    try {
      const keywords = query.toLowerCase().split(/\s+/)

      const searchRegex = keywords.map((k) => `(?=.*${k})`).join("")

      const matchStage = {
        $match: {
          content: { $regex: searchRegex, $options: "i" },
        },
      }

      // Add metadata filters
      Object.entries(filters).forEach(([key, value]) => {
        matchStage.$match[`metadata.${key}`] = value
      })

      const results = await VectorDocument.find(matchStage.$match).limit(topK).lean()

      return results.map((doc) => ({
        ...doc,
        similarityScore: 0.5, // Lower score for keyword matches
      }))
    } catch (error) {
      console.error("[AdvancedRAG] Error in keyword search:", error)
      return []
    }
  }

  /**
   * Metadata-based search
   */
  async metadataSearch(query, filters = {}, topK = 5) {
    try {
      const matchStage = { $match: {} }

      Object.entries(filters).forEach(([key, value]) => {
        matchStage.$match[`metadata.${key}`] = value
      })

      const results = await VectorDocument.find(matchStage.$match).limit(topK).lean()

      return results.map((doc) => ({
        ...doc,
        similarityScore: 0.3, // Lower score for metadata matches
      }))
    } catch (error) {
      console.error("[AdvancedRAG] Error in metadata search:", error)
      return []
    }
  }

  /**
   * Combine and deduplicate results
   */
  combineResults(results) {
    const seen = new Set()
    const combined = []

    // Sort by similarity score
    results.sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0))

    for (const result of results) {
      const id = result._id?.toString() || result.id
      if (!seen.has(id)) {
        seen.add(id)
        combined.push(result)
      }
    }

    return combined
  }

  /**
   * Generate answer with context compression
   */
  async generateAnswerWithCompression(query, documents) {
    try {
      console.log("[AdvancedRAG] Generating answer with context compression")

      // Compress context by selecting most relevant sentences
      const compressedContext = this.compressContext(documents, query)

      // Generate answer
      const model = this.client.getGenerativeModel({
        model: "gemini-2.0-flash",
      })

      const systemPrompt = `You are a helpful university assistant. Use the provided context to answer the student's question accurately and helpfully.

Context:
${compressedContext}

Instructions:
- Answer based on the provided context
- Be concise and clear
- If information is not in the context, acknowledge it
- Provide specific details when available`

      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: query }],
          },
        ],
        systemInstruction: systemPrompt,
      })

      return result.response.text()
    } catch (error) {
      console.error("[AdvancedRAG] Error generating answer:", error)
      throw error
    }
  }

  /**
   * Compress context by selecting most relevant sentences
   */
  compressContext(documents, query) {
    const sentences = documents.flatMap((doc) => doc.content.split(/[.!?]+/)).filter((s) => s.trim().length > 0)

    // Score sentences by relevance to query
    const queryWords = query.toLowerCase().split(/\s+/)
    const scoredSentences = sentences.map((sentence) => {
      const score = queryWords.filter((word) => sentence.toLowerCase().includes(word)).length
      return { sentence: sentence.trim(), score }
    })

    // Select top sentences
    return scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((s) => s.sentence)
      .join(". ")
  }

  /**
   * Rerank results using LLM
   */
  async rerankResults(query, documents) {
    try {
      console.log("[AdvancedRAG] Reranking results with LLM")

      const model = this.client.getGenerativeModel({
        model: "gemini-2.0-flash",
      })

      const prompt = `Given the query: "${query}"

Rank these documents by relevance (1 = most relevant):
${documents.map((doc, idx) => `${idx + 1}. ${doc.content.substring(0, 100)}...`).join("\n")}

Return only the ranking as numbers separated by commas.`

      const result = await model.generateContent(prompt)
      const ranking = result.response.text().split(",").map(Number)

      // Reorder documents based on ranking
      return ranking.map((rank) => documents[rank - 1]).filter(Boolean)
    } catch (error) {
      console.error("[AdvancedRAG] Error reranking results:", error)
      return documents
    }
  }
}

export default new AdvancedRAGService()
