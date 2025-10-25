// // services/embeddingService.js
// import { GoogleGenerativeAI } from "@google/generative-ai"
// import dotenv from "dotenv"
// import QuotaManager from "../utils/quotaManager.js"

// dotenv.config()

// class EmbeddingService {
//   constructor() {
//     const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
//     if (!apiKey) {
//       throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY is required")
//     }
//     this.client = new GoogleGenerativeAI(apiKey)

//     this.isFreeTier = process.env.API_TIER === "free" || true
//     this.embeddingCache = new Map()
//     this.requestQueue = []
//     this.isProcessing = false
//     this.lastRequestTime = 0

//     // Conservative rate limiting for free tier
//     this.minRequestInterval = this.isFreeTier ? 2000 : 100 // 2 seconds between requests
//     this.maxRetries = 3
//     this.retryDelays = [2000, 5000, 10000] // 2s, 5s, 10s

//     // Initialize quota system
//     this.quotaManager = QuotaManager
//     this.dailyQuotaLimit = 1500

//     console.log('[EmbeddingService] Initialized with free tier rate limiting')
//     console.log(`[EmbeddingService] Quota status:`, this.quotaManager.getStatus())
//   }

//   /**
//    * Check if daily quota is exceeded
//    * @private
//    */
//   _isQuotaExceeded() {
//     const status = this.quotaManager.getStatus()
//     return status.isExceeded
//   }

//   /**
//    * Generate embedding for text using Gemini API with retry logic and caching
//    * @param {string} text - Text to embed
//    * @returns {Promise<number[]>} - 768-dimensional embedding vector
//    */
//   async generateEmbedding(text) {
//     try {
//       if (!text || text.trim().length === 0) {
//         throw new Error("Text cannot be empty")
//       }

//       // Check cache first
//       const cacheKey = this._getCacheKey(text)
//       if (this.embeddingCache.has(cacheKey)) {
//         console.log("[EmbeddingService] Cache hit for text")
//         return this.embeddingCache.get(cacheKey)
//       }

//       // Check quota before making API call
//       if (this._isQuotaExceeded()) {
//         const status = this.quotaManager.getStatus()
//         console.warn(
//           `[EmbeddingService] Daily quota exceeded (${status.count}/${this.dailyQuotaLimit}). Using fallback embedding.`
//         )
//         return this._generateFallbackEmbedding(text)
//       }

//       return await this._queueEmbeddingRequest(text, cacheKey)
//     } catch (error) {
//       console.error("[EmbeddingService] Error generating embedding:", error.message)
//       return this._generateFallbackEmbedding(text)
//     }
//   }

//   /**
//    * Generate a fallback embedding using simple hashing when API quota is exceeded
//    * @private
//    */
//   _generateFallbackEmbedding(text) {
//     console.log("[EmbeddingService] Generating fallback embedding (hash-based)")
//     const embedding = new Array(768).fill(0)

//     // Create a deterministic hash-based embedding
//     let hash = 0
//     for (let i = 0; i < text.length; i++) {
//       const char = text.charCodeAt(i)
//       hash = (hash << 5) - hash + char
//       hash = hash & hash
//     }

//     // Distribute hash across embedding dimensions
//     for (let i = 0; i < 768; i++) {
//       const seed = (hash + i) * 73856093
//       embedding[i] = Math.sin(seed) * 0.5 + 0.5 // Normalize to 0-1 range
//     }

//     return embedding
//   }

//   /**
//    * Queue embedding request to respect rate limits
//    * @private
//    */
//   async _queueEmbeddingRequest(text, cacheKey) {
//     return new Promise((resolve, reject) => {
//       this.requestQueue.push({ text, cacheKey, resolve, reject })
//       this._processQueue()
//     })
//   }

//   /**
//    * Process queued embedding requests with rate limiting
//    * @private
//    */
//   async _processQueue() {
//     if (this.isProcessing || this.requestQueue.length === 0) {
//       return
//     }

//     this.isProcessing = true

//     while (this.requestQueue.length > 0) {
//       // Check quota before each request
//       if (this._isQuotaExceeded()) {
//         console.warn("[EmbeddingService] Quota exceeded, processing remaining requests with fallback")
//         while (this.requestQueue.length > 0) {
//           const { text, cacheKey, resolve } = this.requestQueue.shift()
//           const fallbackEmbedding = this._generateFallbackEmbedding(text)
//           this.embeddingCache.set(cacheKey, fallbackEmbedding)
//           resolve(fallbackEmbedding)
//         }
//         break
//       }

//       const { text, cacheKey, resolve, reject } = this.requestQueue.shift()

//       // Rate limiting: wait if needed
//       const timeSinceLastRequest = Date.now() - this.lastRequestTime
//       if (timeSinceLastRequest < this.minRequestInterval) {
//         const waitTime = this.minRequestInterval - timeSinceLastRequest
//         console.log(`[EmbeddingService] Rate limiting: waiting ${waitTime}ms`)
//         await new Promise((r) => setTimeout(r, waitTime))
//       }

//       try {
//         const embedding = await this._generateEmbeddingWithRetry(text)
//         this.embeddingCache.set(cacheKey, embedding)
//         this.lastRequestTime = Date.now()
//         resolve(embedding)
//       } catch (error) {
//         this.lastRequestTime = Date.now()
//         const fallbackEmbedding = this._generateFallbackEmbedding(text)
//         this.embeddingCache.set(cacheKey, fallbackEmbedding)
//         console.warn("[EmbeddingService] Using fallback embedding due to error:", error.message)
//         resolve(fallbackEmbedding)
//       }
//     }

//     this.isProcessing = false
//   }

//   /**
//    * Generate embedding with exponential backoff retry logic
//    * @private
//    */
//   async _generateEmbeddingWithRetry(text, attempt = 0) {
//     try {
//       const model = this.client.getGenerativeModel({
//         model: "embedding-001",
//       })

//       console.log(`[EmbeddingService] Generating embedding (attempt ${attempt + 1})`)
//       const result = await model.embedContent(text)
//       const embedding = result.embedding.values

//       if (!embedding || embedding.length !== 768) {
//         throw new Error(`Invalid embedding dimension: expected 768, got ${embedding?.length || 0}`)
//       }

//       // Increment quota count
//       const newCount = this.quotaManager.incrementCount()
//       const status = this.quotaManager.getStatus()
      
//       console.log(`[EmbeddingService] ✅ Embedding generated. Quota: ${status.count}/${this.dailyQuotaLimit}`)

//       // Warn when approaching limit
//       if (status.percentage >= 80) {
//         console.warn(`[EmbeddingService] ⚠️  Quota warning: ${status.percentage}% used`)
//       }

//       return embedding
//     } catch (error) {
//       // Handle rate limiting (429 errors)
//       if (error.status === 429 && attempt < this.maxRetries) {
//         const delayMs = this.retryDelays[attempt]
//         console.warn(
//           `[EmbeddingService] Rate limited (429). Retrying in ${delayMs}ms (attempt ${attempt + 1}/${this.maxRetries})`
//         )
//         await new Promise((r) => setTimeout(r, delayMs))
//         return this._generateEmbeddingWithRetry(text, attempt + 1)
//       }

//       // Handle quota exceeded
//       if (error.status === 429) {
//         const quotaError = new Error(
//           `API rate limit exceeded. Current quota: ${this.quotaManager.getStatus().count}/${this.dailyQuotaLimit}. ` +
//           "Using fallback embeddings. Free tier limit: 1500 requests/day and 60 requests/minute."
//         )
//         console.warn('[EmbeddingService]', quotaError.message)
//         throw quotaError
//       }

//       console.error('[EmbeddingService] API Error:', error.message)
//       throw error
//     }
//   }

//   /**
//    * Generate cache key from text
//    * @private
//    */
//   _getCacheKey(text) {
//     let hash = 0
//     for (let i = 0; i < text.length; i++) {
//       const char = text.charCodeAt(i)
//       hash = (hash << 5) - hash + char
//       hash = hash & hash
//     }
//     return `embedding_${Math.abs(hash)}`
//   }

//   /**
//    * Generate embeddings for multiple texts (batch) with rate limiting
//    * @param {string[]} texts - Array of texts to embed
//    * @returns {Promise<number[][]>} - Array of embedding vectors
//    */
//   async generateBatchEmbeddings(texts) {
//     try {
//       console.log(`[EmbeddingService] Generating batch embeddings for ${texts.length} texts`)
      
//       // Check quota first
//       if (this._isQuotaExceeded()) {
//         console.warn('[EmbeddingService] Quota exceeded, using fallback for batch')
//         return texts.map(text => this._generateFallbackEmbedding(text))
//       }

//       const embeddings = []
//       for (const text of texts) {
//         const embedding = await this.generateEmbedding(text)
//         embeddings.push(embedding)
        
//         // Small delay between batch items to respect rate limits
//         if (texts.indexOf(text) < texts.length - 1) {
//           await new Promise(r => setTimeout(r, 500))
//         }
//       }
//       return embeddings
//     } catch (error) {
//       console.error("[EmbeddingService] Error in batch embedding:", error)
//       // Fallback to hash-based embeddings for entire batch
//       return texts.map(text => this._generateFallbackEmbedding(text))
//     }
//   }

//   /**
//    * Clear embedding cache
//    */
//   clearCache() {
//     const cacheSize = this.embeddingCache.size
//     this.embeddingCache.clear()
//     console.log(`[EmbeddingService] Cleared cache (${cacheSize} entries)`)
//   }

//   /**
//    * Get cache and quota statistics
//    */
//   getCacheStats() {
//     const quotaStatus = this.quotaManager.getStatus()
//     return {
//       cacheSize: this.embeddingCache.size,
//       queueLength: this.requestQueue.length,
//       isProcessing: this.isProcessing,
//       quotaUsage: `${quotaStatus.count}/${this.dailyQuotaLimit}`,
//       quotaPercentage: quotaStatus.percentage,
//       isFreeTier: this.isFreeTier,
//       minRequestInterval: this.minRequestInterval,
//       quotaStatus: quotaStatus
//     }
//   }

//   /**
//    * Reset daily quota (admin only)
//    */
//   resetDailyQuota() {
//     this.quotaManager.resetQuota()
//     console.log("[EmbeddingService] Daily quota reset")
//   }

//   /**
//    * Get current quota status
//    */
//   getQuotaStatus() {
//     return this.quotaManager.getStatus()
//   }

//   /**
//    * Calculate cosine similarity between two vectors
//    * @param {number[]} vec1 - First vector
//    * @param {number[]} vec2 - Second vector
//    * @returns {number} - Similarity score (0-1)
//    */
//   static cosineSimilarity(vec1, vec2) {
//     if (vec1.length !== vec2.length) {
//       throw new Error("Vectors must have the same dimension")
//     }

//     let dotProduct = 0
//     let norm1 = 0
//     let norm2 = 0

//     for (let i = 0; i < vec1.length; i++) {
//       dotProduct += vec1[i] * vec2[i]
//       norm1 += vec1[i] * vec1[i]
//       norm2 += vec2[i] * vec2[i]
//     }

//     norm1 = Math.sqrt(norm1)
//     norm2 = Math.sqrt(norm2)

//     if (norm1 === 0 || norm2 === 0) {
//       return 0
//     }

//     return dotProduct / (norm1 * norm2)
//   }
// }

// export default new EmbeddingService()


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


// import { GoogleGenerativeAI } from "@google/generative-ai"
// import dotenv from "dotenv"
// import fs from "fs"
// import path from "path"

// dotenv.config()

// class EmbeddingService {
//   // constructor() {
//   //   const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
//   //   if (!apiKey) {
//   //     throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY is required")
//   //   }
//   //   this.client = new GoogleGenerativeAI(apiKey)

//   //   this.isFreeTier = process.env.API_TIER === "free" || true // Default to free tier
//   //   this.embeddingCache = new Map()
//   //   this.requestQueue = []
//   //   this.isProcessing = false
//   //   this.lastRequestTime = 0

//   //   this.minRequestInterval = this.isFreeTier ? 2500 : 1000
//   //   this.maxRetries = 2 // Reduced retries for free tier
//   //   this.retryDelays = [2000, 5000] // Longer delays for free tier

//   //   this.dailyQuotaLimit = 1500
//   //   this.quotaFilePath = path.join(process.cwd(), ".quota-tracker.json")
//   //   this.quotaData = this._loadQuotaData()
//   // }

//     constructor() {
//     const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
//     if (!apiKey) {
//       throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY is required")
//     }
//     this.client = new GoogleGenerativeAI(apiKey)

//     // FIX: Proper free tier detection
//     this.isFreeTier = process.env.API_TIER === "free" || !process.env.API_TIER
//     this.embeddingCache = new Map()
//     this.requestQueue = []
//     this.isProcessing = false
//     this.lastRequestTime = 0

//     // FIX: Use proper intervals for free tier
//     this.minRequestInterval = this.isFreeTier ? 4000 : 1000 // 4 seconds for free tier
//     this.maxRetries = 1 // Only 1 retry for free tier
//     this.retryDelays = [3000] // 3 second delay

//     this.dailyQuotaLimit = this.isFreeTier ? 1500 : 100000
//     this.quotaFilePath = path.join(process.cwd(), ".quota-tracker.json")
//     this.quotaData = this._loadQuotaData()
    
//     console.log(`[EmbeddingService] Initialized - Free Tier: ${this.isFreeTier}, Min Interval: ${this.minRequestInterval}ms`)
//   }

//   /**
//    * Load or initialize quota tracking data
//    * @private
//    */
//   // _loadQuotaData() {
//   //   try {
//   //     if (fs.existsSync(this.quotaFilePath)) {
//   //       const data = JSON.parse(fs.readFileSync(this.quotaFilePath, "utf-8"))
//   //       const today = new Date().toISOString().split("T")[0]

//   //       // Reset quota if it's a new day
//   //       if (data.date !== today) {
//   //         return { date: today, count: 0, lastReset: new Date().toISOString() }
//   //       }
//   //       return data
//   //     }
//   //   } catch (error) {
//   //     console.warn("[EmbeddingService] Could not load quota data:", error.message)
//   //   }

//   //   return { date: new Date().toISOString().split("T")[0], count: 0, lastReset: new Date().toISOString() }
//   // }

//   // In embeddingService.js - Replace the _loadQuotaData method with this:

// _loadQuotaData() {
//   try {
//     // Check if file exists and is readable
//     if (fs.existsSync(this.quotaFilePath)) {
//       try {
//         const fileContent = fs.readFileSync(this.quotaFilePath, 'utf-8')
//         if (!fileContent.trim()) {
//           throw new Error('File is empty')
//         }
        
//         const data = JSON.parse(fileContent)
//         const today = new Date().toISOString().split('T')[0]
//         const fileDate = data.date ? new Date(data.date).toISOString().split('T')[0] : null
        
//         console.log(`[EmbeddingService] Quota check - File date: ${fileDate}, Today: ${today}`)
        
//         // Reset quota if it's a new day OR if date format is invalid
//         if (!fileDate || fileDate !== today) {
//           console.log(`[EmbeddingService] 🔄 Resetting quota: ${fileDate} -> ${today}`)
//           const resetData = { 
//             date: today, 
//             count: 0, 
//             lastReset: new Date().toISOString() 
//           }
//           this._saveQuotaData(resetData)
//           return resetData
//         }
        
//         console.log(`[EmbeddingService] Current quota: ${data.count}/1500`)
//         return data
//       } catch (parseError) {
//         console.warn('[EmbeddingService] Error parsing quota file, resetting:', parseError.message)
//         return this._createNewQuotaFile()
//       }
//     } else {
//       console.log('[EmbeddingService] Quota file not found, creating new one...')
//       return this._createNewQuotaFile()
//     }
//   } catch (error) {
//     console.error('[EmbeddingService] Critical error loading quota data:', error.message)
//     return this._createNewQuotaFile()
//   }
// }

// // Add this new method to handle file creation
// _createNewQuotaFile() {
//   const today = new Date().toISOString().split('T')[0]
//   const newData = { 
//     date: today, 
//     count: 0, 
//     lastReset: new Date().toISOString() 
//   }
  
//   try {
//     fs.writeFileSync(this.quotaFilePath, JSON.stringify(newData, null, 2))
//     console.log('[EmbeddingService] ✅ Created new quota file')
//     return newData
//   } catch (error) {
//     console.error('[EmbeddingService] ❌ Could not create quota file:', error.message)
//     // Return in-memory data even if file creation fails
//     return newData
//   }
// }

// // Update the _saveQuotaData method to be more robust
// _saveQuotaData(data = null) {
//   try {
//     const saveData = data || this.quotaData
//     // Ensure directory exists
//     const dir = path.dirname(this.quotaFilePath)
//     if (!fs.existsSync(dir)) {
//       fs.mkdirSync(dir, { recursive: true })
//     }
//     fs.writeFileSync(this.quotaFilePath, JSON.stringify(saveData, null, 2))
//   } catch (error) {
//     console.warn('[EmbeddingService] Could not save quota data:', error.message)
//     // Don't throw error, just log warning
//   }
// }
//   /**
//    * Save quota tracking data
//    * @private
//    */
//   // _saveQuotaData() {
//   //   try {
//   //     fs.writeFileSync(this.quotaFilePath, JSON.stringify(this.quotaData, null, 2))
//   //   } catch (error) {
//   //     console.warn("[EmbeddingService] Could not save quota data:", error.message)
//   //   }
//   // }

//   /**
//    * Check if daily quota is exceeded
//    * @private
//    */
//   _isQuotaExceeded() {
//     return this.quotaData.count >= this.dailyQuotaLimit
//   }

//   /**
//    * Generate embedding for text using Gemini API with retry logic and caching
//    * @param {string} text - Text to embed
//    * @returns {Promise<number[]>} - 768-dimensional embedding vector
//    */
//   async generateEmbedding(text) {
//     try {
//       if (!text || text.trim().length === 0) {
//         throw new Error("Text cannot be empty")
//       }

//       const cacheKey = this._getCacheKey(text)
//       if (this.embeddingCache.has(cacheKey)) {
//         console.log("[EmbeddingService] Cache hit for text")
//         return this.embeddingCache.get(cacheKey)
//       }

//       if (this._isQuotaExceeded()) {
//         console.warn(
//           `[EmbeddingService] Daily quota exceeded (${this.quotaData.count}/${this.dailyQuotaLimit}). Using fallback embedding.`,
//         )
//         return this._generateFallbackEmbedding(text)
//       }

//       return await this._queueEmbeddingRequest(text, cacheKey)
//     } catch (error) {
//       console.error("[EmbeddingService] Error generating embedding:", error)
//       return this._generateFallbackEmbedding(text)
//     }
//   }

//   /**
//    * Generate a fallback embedding using simple hashing when API quota is exceeded
//    * @private
//    */
//   _generateFallbackEmbedding(text) {
//     console.log("[EmbeddingService] Generating fallback embedding (hash-based)")
//     const embedding = new Array(768).fill(0)

//     // Create a deterministic hash-based embedding
//     let hash = 0
//     for (let i = 0; i < text.length; i++) {
//       const char = text.charCodeAt(i)
//       hash = (hash << 5) - hash + char
//       hash = hash & hash
//     }

//     // Distribute hash across embedding dimensions
//     for (let i = 0; i < 768; i++) {
//       const seed = (hash + i) * 73856093
//       embedding[i] = Math.sin(seed) * 0.5 + 0.5 // Normalize to 0-1 range
//     }

//     return embedding
//   }

//   /**
//    * Queue embedding request to respect rate limits
//    * @private
//    */
//   async _queueEmbeddingRequest(text, cacheKey) {
//     return new Promise((resolve, reject) => {
//       this.requestQueue.push({ text, cacheKey, resolve, reject })
//       this._processQueue()
//     })
//   }

//   /**
//    * Process queued embedding requests with rate limiting
//    * @private
//    */
//   async _processQueue() {
//     if (this.isProcessing || this.requestQueue.length === 0) {
//       return
//     }

//     this.isProcessing = true

//     while (this.requestQueue.length > 0) {
//       if (this._isQuotaExceeded()) {
//         console.warn("[EmbeddingService] Quota exceeded, processing remaining requests with fallback")
//         while (this.requestQueue.length > 0) {
//           const { text, cacheKey, resolve } = this.requestQueue.shift()
//           const fallbackEmbedding = this._generateFallbackEmbedding(text)
//           this.embeddingCache.set(cacheKey, fallbackEmbedding)
//           resolve(fallbackEmbedding)
//         }
//         break
//       }

//       const { text, cacheKey, resolve, reject } = this.requestQueue.shift()

//       const timeSinceLastRequest = Date.now() - this.lastRequestTime
//       if (timeSinceLastRequest < this.minRequestInterval) {
//         await new Promise((r) => setTimeout(r, this.minRequestInterval - timeSinceLastRequest))
//       }

//       try {
//         const embedding = await this._generateEmbeddingWithRetry(text)
//         this.embeddingCache.set(cacheKey, embedding)
//         this.lastRequestTime = Date.now()
//         resolve(embedding)
//       } catch (error) {
//         this.lastRequestTime = Date.now()
//         const fallbackEmbedding = this._generateFallbackEmbedding(text)
//         this.embeddingCache.set(cacheKey, fallbackEmbedding)
//         console.warn("[EmbeddingService] Using fallback embedding due to error:", error.message)
//         resolve(fallbackEmbedding)
//       }
//     }

//     this.isProcessing = false
//   }

//   /**
//    * Generate embedding with exponential backoff retry logic
//    * @private
//    */
//   async _generateEmbeddingWithRetry(text, attempt = 0) {
//     try {
//       const model = this.client.getGenerativeModel({
//         model: "embedding-001",
//       })

//       const result = await model.embedContent(text)
//       const embedding = result.embedding.values

//       if (!embedding || embedding.length !== 768) {
//         throw new Error(`Invalid embedding dimension: expected 768, got ${embedding.length}`)
//       }

//       this.quotaData.count++
//       this._saveQuotaData()
//       console.log(`[EmbeddingService] Quota usage: ${this.quotaData.count}/${this.dailyQuotaLimit}`)

//       return embedding
//     } catch (error) {
//       if (error.status === 429 && attempt < this.maxRetries) {
//         const delayMs = this.retryDelays[attempt]
//         console.warn(
//           `[EmbeddingService] Rate limited (429). Retrying in ${delayMs}ms (attempt ${attempt + 1}/${this.maxRetries})`,
//         )
//         await new Promise((r) => setTimeout(r, delayMs))
//         return this._generateEmbeddingWithRetry(text, attempt + 1)
//       }

//       if (error.status === 429) {
//         throw new Error(
//           "API quota exceeded for today. Using fallback embeddings. " +
//             "Free tier limit: 1500 requests/day. Try again tomorrow or upgrade your API plan.",
//         )
//       }

//       throw error
//     }
//   }

//   /**
//    * Generate cache key from text
//    * @private
//    */
//   _getCacheKey(text) {
//     let hash = 0
//     for (let i = 0; i < text.length; i++) {
//       const char = text.charCodeAt(i)
//       hash = (hash << 5) - hash + char
//       hash = hash & hash
//     }
//     return `embedding_${Math.abs(hash)}`
//   }

//   /**
//    * Generate embeddings for multiple texts (batch) with rate limiting
//    * @param {string[]} texts - Array of texts to embed
//    * @returns {Promise<number[][]>} - Array of embedding vectors
//    */
//   async generateBatchEmbeddings(texts) {
//     try {
//       console.log(`[EmbeddingService] Generating batch embeddings for ${texts.length} texts`)
//       const embeddings = await Promise.all(texts.map((text) => this.generateEmbedding(text)))
//       return embeddings
//     } catch (error) {
//       console.error("[EmbeddingService] Error in batch embedding:", error)
//       throw error
//     }
//   }

//   /**
//    * Clear embedding cache
//    */
//   clearCache() {
//     const cacheSize = this.embeddingCache.size
//     this.embeddingCache.clear()
//     console.log(`[EmbeddingService] Cleared cache (${cacheSize} entries)`)
//   }

//   /**
//    * Get cache and quota statistics
//    */
//   getCacheStats() {
//     return {
//       cacheSize: this.embeddingCache.size,
//       queueLength: this.requestQueue.length,
//       isProcessing: this.isProcessing,
//       quotaUsage: `${this.quotaData.count}/${this.dailyQuotaLimit}`,
//       quotaPercentage: Math.round((this.quotaData.count / this.dailyQuotaLimit) * 100),
//       isFreeTier: this.isFreeTier,
//       minRequestInterval: this.minRequestInterval,
//     }
//   }

//   /**
//    * Reset daily quota (admin only)
//    */
//   resetDailyQuota() {
//     this.quotaData = { date: new Date().toISOString().split("T")[0], count: 0, lastReset: new Date().toISOString() }
//     this._saveQuotaData()
//     console.log("[EmbeddingService] Daily quota reset")
//   }

//   /**
//    * Calculate cosine similarity between two vectors
//    * @param {number[]} vec1 - First vector
//    * @param {number[]} vec2 - Second vector
//    * @returns {number} - Similarity score (0-1)
//    */
//   static cosineSimilarity(vec1, vec2) {
//     if (vec1.length !== vec2.length) {
//       throw new Error("Vectors must have the same dimension")
//     }

//     let dotProduct = 0
//     let norm1 = 0
//     let norm2 = 0

//     for (let i = 0; i < vec1.length; i++) {
//       dotProduct += vec1[i] * vec2[i]
//       norm1 += vec1[i] * vec1[i]
//       norm2 += vec2[i] * vec2[i]
//     }

//     norm1 = Math.sqrt(norm1)
//     norm2 = Math.sqrt(norm2)

//     if (norm1 === 0 || norm2 === 0) {
//       return 0
//     }

//     return dotProduct / (norm1 * norm2)
//   }
// }

// export default new EmbeddingService()

