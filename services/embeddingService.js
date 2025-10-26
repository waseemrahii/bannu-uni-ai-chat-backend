
import { GoogleGenerativeAI } from "@google/generative-ai"
import dotenv from "dotenv"
import fs from "fs"
import path from "path"

dotenv.config()

class EmbeddingService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    if (!apiKey) {
      console.error("[EmbeddingService] ERROR: GEMINI_API_KEY or GOOGLE_API_KEY is not set!")
      console.error("[EmbeddingService] Please set the API key in your .env file")
      throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY is required")
    }

    console.log("[EmbeddingService] API Key found:", apiKey.substring(0, 10) + "...")

    this.client = new GoogleGenerativeAI(apiKey)
    this.apiKey = apiKey

    this.isFreeTier = process.env.API_TIER === "free" || true
    this.embeddingCache = new Map()
    this.requestQueue = []
    this.isProcessing = false
    this.lastRequestTime = 0

    this.minRequestInterval = this.isFreeTier ? 2500 : 1000
    this.maxRetries = 3 // Increased retries for network errors
    this.retryDelays = [1000, 3000, 8000] // Better backoff strategy

    this.dailyQuotaLimit = 1500
    this.quotaFilePath = path.join(process.cwd(), ".quota-tracker.json")
    this.quotaData = this._loadQuotaData()
  }

  /**
   * Load or initialize quota tracking data
   * @private
   */
  _loadQuotaData() {
    try {
      if (fs.existsSync(this.quotaFilePath)) {
        const data = JSON.parse(fs.readFileSync(this.quotaFilePath, "utf-8"))
        const today = new Date().toISOString().split("T")[0]

        if (data.date !== today) {
          return { date: today, count: 0, lastReset: new Date().toISOString() }
        }
        return data
      }
    } catch (error) {
      console.warn("[EmbeddingService] Could not load quota data:", error.message)
    }

    return { date: new Date().toISOString().split("T")[0], count: 0, lastReset: new Date().toISOString() }
  }

  /**
   * Save quota tracking data
   * @private
   */
  _saveQuotaData() {
    try {
      fs.writeFileSync(this.quotaFilePath, JSON.stringify(this.quotaData, null, 2))
    } catch (error) {
      console.warn("[EmbeddingService] Could not save quota data:", error.message)
    }
  }

  /**
   * Check if daily quota is exceeded
   * @private
   */
  _isQuotaExceeded() {
    return this.quotaData.count >= this.dailyQuotaLimit
  }

  /**
   * Generate embedding for text using Gemini API with retry logic and caching
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} - 768-dimensional embedding vector
   */
  async generateEmbedding(text) {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error("Text cannot be empty")
      }

      const cacheKey = this._getCacheKey(text)
      if (this.embeddingCache.has(cacheKey)) {
        console.log("[EmbeddingService] Cache hit for text")
        return this.embeddingCache.get(cacheKey)
      }

      if (this._isQuotaExceeded()) {
        console.warn(
          `[EmbeddingService] Daily quota exceeded (${this.quotaData.count}/${this.dailyQuotaLimit}). Using fallback embedding.`,
        )
        return this._generateFallbackEmbedding(text)
      }

      return await this._queueEmbeddingRequest(text, cacheKey)
    } catch (error) {
      console.error("[EmbeddingService] Error generating embedding:", error.message)
      return this._generateFallbackEmbedding(text)
    }
  }

  /**
   * Generate a fallback embedding using simple hashing when API quota is exceeded
   * @private
   */
  _generateFallbackEmbedding(text) {
    console.log("[EmbeddingService] Generating fallback embedding (hash-based)")
    const embedding = new Array(768).fill(0)

    let hash = 0
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }

    for (let i = 0; i < 768; i++) {
      const seed = (hash + i) * 73856093
      embedding[i] = Math.sin(seed) * 0.5 + 0.5
    }

    return embedding
  }

  /**
   * Queue embedding request to respect rate limits
   * @private
   */
  async _queueEmbeddingRequest(text, cacheKey) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ text, cacheKey, resolve, reject })
      this._processQueue()
    })
  }

  /**
   * Process queued embedding requests with rate limiting
   * @private
   */
  async _processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return
    }

    this.isProcessing = true

    while (this.requestQueue.length > 0) {
      if (this._isQuotaExceeded()) {
        console.warn("[EmbeddingService] Quota exceeded, processing remaining requests with fallback")
        while (this.requestQueue.length > 0) {
          const { text, cacheKey, resolve } = this.requestQueue.shift()
          const fallbackEmbedding = this._generateFallbackEmbedding(text)
          this.embeddingCache.set(cacheKey, fallbackEmbedding)
          resolve(fallbackEmbedding)
        }
        break
      }

      const { text, cacheKey, resolve, reject } = this.requestQueue.shift()

      const timeSinceLastRequest = Date.now() - this.lastRequestTime
      if (timeSinceLastRequest < this.minRequestInterval) {
        await new Promise((r) => setTimeout(r, this.minRequestInterval - timeSinceLastRequest))
      }

      try {
        const embedding = await this._generateEmbeddingWithRetry(text)
        this.embeddingCache.set(cacheKey, embedding)
        this.lastRequestTime = Date.now()
        resolve(embedding)
      } catch (error) {
        this.lastRequestTime = Date.now()
        const fallbackEmbedding = this._generateFallbackEmbedding(text)
        this.embeddingCache.set(cacheKey, fallbackEmbedding)
        console.warn("[EmbeddingService] Using fallback embedding due to error:", error.message)
        resolve(fallbackEmbedding)
      }
    }

    this.isProcessing = false
  }

  /**
   * Generate embedding with exponential backoff retry logic
   * @private
   */
  async _generateEmbeddingWithRetry(text, attempt = 0) {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("API request timeout after 30s")), 30000),
      )

      const model = this.client.getGenerativeModel({
        model: "gemini-embedding-001",
      })

      const embeddingPromise = model.embedContent({
        content: {
          parts: [{ text: text }],
        },
        taskType: "RETRIEVAL_DOCUMENT",
        outputDimensionality: 768,
      })

      const result = await Promise.race([embeddingPromise, timeoutPromise])

      const embedding = result.embedding.values

      if (!embedding || embedding.length !== 768) {
        throw new Error(`Invalid embedding dimension: expected 768, got ${embedding.length}`)
      }

      const normalizedEmbedding = this._normalizeEmbedding(embedding)

      this.quotaData.count++
      this._saveQuotaData()
      console.log(`[EmbeddingService] Quota usage: ${this.quotaData.count}/${this.dailyQuotaLimit}`)

      return normalizedEmbedding
    } catch (error) {
      const isNetworkError =
        error.message.includes("fetch failed") ||
        error.message.includes("ETIMEDOUT") ||
        error.message.includes("timeout") ||
        error.message.includes("ECONNREFUSED")

      const isRateLimitError = error.status === 429 || error.message.includes("rate limit")

      if ((isNetworkError || isRateLimitError) && attempt < this.maxRetries) {
        const delayMs = this.retryDelays[attempt]
        console.warn(
          `[EmbeddingService] ${isNetworkError ? "Network error" : "Rate limited"} (attempt ${attempt + 1}/${this.maxRetries}). Retrying in ${delayMs}ms...`,
        )
        await new Promise((r) => setTimeout(r, delayMs))
        return this._generateEmbeddingWithRetry(text, attempt + 1)
      }

      if (isRateLimitError) {
        throw new Error(
          "API quota exceeded for today. Using fallback embeddings. " +
            "Free tier limit: 1500 requests/day and 60 requests/minute. Try again tomorrow or upgrade your API plan.",
        )
      }

      console.error("[EmbeddingService] API Error Details:", {
        message: error.message,
        status: error.status,
        attempt: attempt + 1,
        maxRetries: this.maxRetries,
      })

      throw error
    }
  }

  /**
   * Normalize embedding vector (required for 768 dimensions per Google docs)
   * @private
   */
  _normalizeEmbedding(embedding) {
    let norm = 0
    for (let i = 0; i < embedding.length; i++) {
      norm += embedding[i] * embedding[i]
    }
    norm = Math.sqrt(norm)

    if (norm === 0) {
      return embedding
    }

    return embedding.map((val) => val / norm)
  }

  /**
   * Generate cache key from text
   * @private
   */
  _getCacheKey(text) {
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return `embedding_${Math.abs(hash)}`
  }

  /**
   * Generate embeddings for multiple texts (batch) with rate limiting
   * @param {string[]} texts - Array of texts to embed
   * @returns {Promise<number[][]>} - Array of embedding vectors
   */
  async generateBatchEmbeddings(texts) {
    try {
      console.log(`[EmbeddingService] Generating batch embeddings for ${texts.length} texts`)
      const embeddings = await Promise.all(texts.map((text) => this.generateEmbedding(text)))
      return embeddings
    } catch (error) {
      console.error("[EmbeddingService] Error in batch embedding:", error)
      throw error
    }
  }

  /**
   * Clear embedding cache
   */
  clearCache() {
    const cacheSize = this.embeddingCache.size
    this.embeddingCache.clear()
    console.log(`[EmbeddingService] Cleared cache (${cacheSize} entries)`)
  }

  /**
   * Get cache and quota statistics
   */
  getCacheStats() {
    return {
      cacheSize: this.embeddingCache.size,
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessing,
      quotaUsage: `${this.quotaData.count}/${this.dailyQuotaLimit}`,
      quotaPercentage: Math.round((this.quotaData.count / this.dailyQuotaLimit) * 100),
      isFreeTier: this.isFreeTier,
      minRequestInterval: this.minRequestInterval,
    }
  }

  /**
   * Reset daily quota (admin only)
   */
  resetDailyQuota() {
    this.quotaData = { date: new Date().toISOString().split("T")[0], count: 0, lastReset: new Date().toISOString() }
    this._saveQuotaData()
    console.log("[EmbeddingService] Daily quota reset")
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {number[]} vec1 - First vector
   * @param {number[]} vec2 - Second vector
   * @returns {number} - Similarity score (0-1)
   */
  static cosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) {
      throw new Error("Vectors must have the same dimension")
    }

    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i]
      norm1 += vec1[i] * vec1[i]
      norm2 += vec2[i] * vec2[i]
    }

    norm1 = Math.sqrt(norm1)
    norm2 = Math.sqrt(norm2)

    if (norm1 === 0 || norm2 === 0) {
      return 0
    }

    return dotProduct / (norm1 * norm2)
  }
}

export default new EmbeddingService()
