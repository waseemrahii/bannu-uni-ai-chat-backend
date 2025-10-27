// import Chat from "../models/chatModel.js"
// import ragService from "./ragService.js"

// class TypingSuggestionService {
//   /**
//    * Generate typing suggestions based on user input
//    * @param {string} userId - User ID
//    * @param {string} query - Partial query being typed
//    * @param {string} className - User's class
//    * @param {string} semester - User's semester
//    * @returns {Promise<array>} - Array of suggestions
//    */
//   async generateSuggestions(userId, query, className, semester) {
//     try {
//       if (!query || query.trim().length < 2) {
//         return []
//       }

//       const suggestions = []

//       // 1. Get previous questions from user (context-aware)
//       const previousQuestions = await this._getPreviousQuestions(userId, query)
//       suggestions.push(...previousQuestions)

//       // 2. Get common questions from class
//       const commonQuestions = await this._getCommonQuestions(className, semester, query)
//       suggestions.push(...commonQuestions)

//       // 3. Get RAG-based suggestions (relevant documents)
//       const ragSuggestions = await this._getRagSuggestions(query, className, semester)
//       suggestions.push(...ragSuggestions)

//       // 4. Get intent-based suggestions
//       const intentSuggestions = this._getIntentSuggestions(query)
//       suggestions.push(...intentSuggestions)

//       // Remove duplicates and sort by relevance
//       const uniqueSuggestions = this._deduplicateSuggestions(suggestions)
//       return uniqueSuggestions.slice(0, 5) // Return top 5
//     } catch (error) {
//       console.error("[TypingSuggestionService] Error generating suggestions:", error)
//       return []
//     }
//   }

//   /**
//    * Get previous questions from user history
//    * @private
//    */
//   async _getPreviousQuestions(userId, query) {
//     try {
//       const regex = new RegExp(query.split(" ")[0], "i")
//       const previousChats = await Chat.find({
//         userId,
//         question: { $regex: regex },
//       })
//         .select("question")
//         .limit(3)
//         .sort({ createdAt: -1 })

//       return previousChats.map((chat) => ({
//         text: chat.question,
//         type: "previous",
//         confidence: 0.8,
//         icon: "history",
//       }))
//     } catch (error) {
//       console.error("[TypingSuggestionService] Error getting previous questions:", error)
//       return []
//     }
//   }

//   /**
//    * Get common questions from class
//    * @private
//    */
//   async _getCommonQuestions(className, semester, query) {
//     try {
//       const regex = new RegExp(query.split(" ")[0], "i")
//       const commonChats = await Chat.aggregate([
//         {
//           $match: {
//             "metadata.className": className,
//             "metadata.semester": semester,
//             question: { $regex: regex },
//           },
//         },
//         {
//           $group: {
//             _id: "$question",
//             count: { $sum: 1 },
//           },
//         },
//         {
//           $sort: { count: -1 },
//         },
//         {
//           $limit: 3,
//         },
//       ])

//       return commonChats.map((chat) => ({
//         text: chat._id,
//         type: "common",
//         confidence: Math.min(0.9, 0.5 + chat.count * 0.1),
//         icon: "trending",
//       }))
//     } catch (error) {
//       console.error("[TypingSuggestionService] Error getting common questions:", error)
//       return []
//     }
//   }

//   /**
//    * Get RAG-based suggestions from vector database
//    * @private
//    */
//   async _getRagSuggestions(query, className, semester) {
//     try {
//       const filters = {
//         "metadata.className": className,
//         "metadata.semester": semester,
//       }

//       const relevantDocs = await ragService.retrieveRelevantDocuments(query, filters, 3)

//       return relevantDocs.map((doc) => ({
//         text: `Ask about ${doc.metadata.type}: ${doc.content.substring(0, 50)}...`,
//         type: "rag",
//         confidence: doc.similarityScore || 0.7,
//         icon: "lightbulb",
//         metadata: doc.metadata,
//       }))
//     } catch (error) {
//       console.error("[TypingSuggestionService] Error getting RAG suggestions:", error)
//       return []
//     }
//   }

//   /**
//    * Get intent-based suggestions
//    * @private
//    */
//   _getIntentSuggestions(query) {
//     const lowerQuery = query.toLowerCase()
//     const suggestions = []

//     // Common intents
//     const intents = {
//       schedule: ["What classes do I have today?", "Show my schedule", "When is my next class?"],
//       assignment: ["What assignments are due?", "Show pending assignments", "Any assignments today?"],
//       result: ["Show my grades", "What are my results?", "How did I perform?"],
//       event: ["What events are happening?", "Show upcoming events", "Any events this week?"],
//       general: ["Tell me about the course", "What is this subject about?", "Course information"],
//     }

//     // Match query to intent
//     if (lowerQuery.includes("class") || lowerQuery.includes("schedule")) {
//       suggestions.push(
//         ...intents.schedule.map((text) => ({ text, type: "intent", confidence: 0.75, icon: "calendar" })),
//       )
//     }
//     if (lowerQuery.includes("assignment") || lowerQuery.includes("homework")) {
//       suggestions.push(...intents.assignment.map((text) => ({ text, type: "intent", confidence: 0.75, icon: "task" })))
//     }
//     if (lowerQuery.includes("grade") || lowerQuery.includes("result")) {
//       suggestions.push(...intents.result.map((text) => ({ text, type: "intent", confidence: 0.75, icon: "chart" })))
//     }
//     if (lowerQuery.includes("event")) {
//       suggestions.push(...intents.event.map((text) => ({ text, type: "intent", confidence: 0.75, icon: "event" })))
//     }

//     return suggestions.slice(0, 3)
//   }

//   /**
//    * Deduplicate suggestions and sort by confidence
//    * @private
//    */
//   _deduplicateSuggestions(suggestions) {
//     const seen = new Set()
//     const unique = []

//     for (const suggestion of suggestions) {
//       if (!seen.has(suggestion.text.toLowerCase())) {
//         seen.add(suggestion.text.toLowerCase())
//         unique.push(suggestion)
//       }
//     }

//     return unique.sort((a, b) => b.confidence - a.confidence)
//   }
// }

// export default new TypingSuggestionService()


import Chat from "../models/chatModel.js"
import ragService from "./ragService.js"

class TypingSuggestionService {
  /**
   * Generate typing suggestions based on user input
   * @param {string} userId - User ID
   * @param {string} query - Partial query being typed
   * @param {string} className - User's class
   * @param {string} semester - User's semester
   * @returns {Promise<array>} - Array of suggestions
   */
  // async generateSuggestions(userId, query, className, semester) {
  //   try {
  //     if (!query || query.trim().length < 2) {
  //       return []
  //     }

  //     const suggestions = []

  //     // 1. Get previous questions from user (context-aware)
  //     const previousQuestions = await this._getPreviousQuestions(userId, query)
  //     suggestions.push(...previousQuestions)

  //     // 2. Get common questions from class
  //     const commonQuestions = await this._getCommonQuestions(className, semester, query)
  //     suggestions.push(...commonQuestions)

  //     // 3. Get RAG-based suggestions (relevant documents)
  //     const ragSuggestions = await this._getRagSuggestions(query, className, semester)
  //     suggestions.push(...ragSuggestions)

  //     // 4. Get intent-based suggestions
  //     const intentSuggestions = this._getIntentSuggestions(query)
  //     suggestions.push(...intentSuggestions)

  //     // Remove duplicates and sort by relevance
  //     const uniqueSuggestions = this._deduplicateSuggestions(suggestions)
  //     return uniqueSuggestions.slice(0, 5) // Return top 5
  //   } catch (error) {
  //     console.error("[TypingSuggestionService] Error generating suggestions:", error)
  //     return []
  //   }
  // }

   constructor() {
    this.requestCache = new Map(); // Simple cache
  }

  async generateSuggestions(userId, query, className, semester) {
    try {
      if (!query || query.trim().length < 2) {
        return [];
      }

      // Simple cache to avoid duplicate processing
      const cacheKey = `${userId}-${query}`;
      if (this.requestCache.has(cacheKey)) {
        return this.requestCache.get(cacheKey);
      }

      const suggestions = [];

      // Run all suggestion sources in parallel for better performance
      const [previousQuestions, commonQuestions, ragSuggestions, intentSuggestions] = await Promise.all([
        this._getPreviousQuestions(userId, query),
        this._getCommonQuestions(className, semester, query),
        this._getRagSuggestions(query, className, semester),
        this._getIntentSuggestions(query)
      ]);

      suggestions.push(...previousQuestions, ...commonQuestions, ...ragSuggestions, ...intentSuggestions);

      // Remove duplicates and sort by confidence
      const uniqueSuggestions = this._deduplicateSuggestions(suggestions);
      const topSuggestions = uniqueSuggestions.slice(0, 5);

      // Cache for 1 minute
      this.requestCache.set(cacheKey, topSuggestions);
      setTimeout(() => this.requestCache.delete(cacheKey), 60000);

      return topSuggestions;
    } catch (error) {
      console.error("[TypingSuggestionService] Error:", error);
      return [];
    }
  }
  /**
   * Get previous questions from user history
   * @private
   */
  async _getPreviousQuestions(userId, query) {
    try {
      const regex = new RegExp(query.split(" ")[0], "i")
      const previousChats = await Chat.find({
        userId,
        question: { $regex: regex },
      })
        .select("question")
        .limit(3)
        .sort({ createdAt: -1 })

      return previousChats.map((chat) => ({
        text: chat.question,
        type: "previous",
        confidence: 0.8,
        icon: "history",
      }))
    } catch (error) {
      console.error("[TypingSuggestionService] Error getting previous questions:", error)
      return []
    }
  }

  /**
   * Get common questions from class
   * @private
   */
  async _getCommonQuestions(className, semester, query) {
    try {
      const regex = new RegExp(query.split(" ")[0], "i")
      const commonChats = await Chat.aggregate([
        {
          $match: {
            "metadata.className": className,
            "metadata.semester": semester,
            question: { $regex: regex },
          },
        },
        {
          $group: {
            _id: "$question",
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
        {
          $limit: 3,
        },
      ])

      return commonChats.map((chat) => ({
        text: chat._id,
        type: "common",
        confidence: Math.min(0.9, 0.5 + chat.count * 0.1),
        icon: "trending",
      }))
    } catch (error) {
      console.error("[TypingSuggestionService] Error getting common questions:", error)
      return []
    }
  }

  /**
   * Get RAG-based suggestions from vector database
   * @private
   */
  // async _getRagSuggestions(query, className, semester) {
  //   try {
  //     const filters = {
  //       "metadata.className": className,
  //       "metadata.semester": semester,
  //     }

  //     const relevantDocs = await ragService.retrieveRelevantDocuments(query, filters, 3)

  //     return relevantDocs.map((doc) => ({
  //       text: `Ask about ${doc.metadata.type}: ${doc.content.substring(0, 50)}...`,
  //       type: "rag",
  //       confidence: doc.similarityScore || 0.7,
  //       icon: "lightbulb",
  //       metadata: doc.metadata,
  //     }))
  //   } catch (error) {
  //     console.error("[TypingSuggestionService] Error getting RAG suggestions:", error)
  //     return []
  //   }
  // }
  // In your typingSuggestionService.js - improve RAG text formatting

     async _getRagSuggestions(query, className, semester) {
  try {
    const filters = {
      "metadata.className": className,
      "metadata.semester": semester,
    };

    const relevantDocs = await ragService.retrieveRelevantDocuments(query, filters, 3);

    return relevantDocs.map((doc) => {
      // Improved text formatting
      let friendlyText = "";
      if (doc.metadata.type === "schedule") {
        friendlyText = `Class schedule: ${doc.metadata.subject} on ${new Date(doc.metadata.date).toLocaleDateString()}`;
      } else if (doc.metadata.type === "assignment") {
        friendlyText = `Assignment: ${doc.content.substring(0, 60)}...`;
      } else {
        friendlyText = `Learn about ${doc.metadata.type}: ${doc.content.substring(0, 50)}...`;
      }

      return {
        text: friendlyText,
        type: "rag",
        confidence: doc.similarityScore || 0.7,
        icon: "lightbulb",
        metadata: doc.metadata,
      };
    });
  } catch (error) {
    console.error("[TypingSuggestionService] Error getting RAG suggestions:", error);
    return [];
  }
}

  /**
   * Get intent-based suggestions
   * @private
   */
  _getIntentSuggestions(query) {
    const lowerQuery = query.toLowerCase()
    const suggestions = []

    // Common intents
    const intents = {
      schedule: ["What classes do I have today?", "Show my schedule", "When is my next class?"],
      assignment: ["What assignments are due?", "Show pending assignments", "Any assignments today?"],
      result: ["Show my grades", "What are my results?", "How did I perform?"],
      event: ["What events are happening?", "Show upcoming events", "Any events this week?"],
      general: ["Tell me about the course", "What is this subject about?", "Course information"],
    }

    // Match query to intent
    if (lowerQuery.includes("class") || lowerQuery.includes("schedule")) {
      suggestions.push(
        ...intents.schedule.map((text) => ({ text, type: "intent", confidence: 0.75, icon: "calendar" })),
      )
    }
    if (lowerQuery.includes("assignment") || lowerQuery.includes("homework")) {
      suggestions.push(...intents.assignment.map((text) => ({ text, type: "intent", confidence: 0.75, icon: "task" })))
    }
    if (lowerQuery.includes("grade") || lowerQuery.includes("result")) {
      suggestions.push(...intents.result.map((text) => ({ text, type: "intent", confidence: 0.75, icon: "chart" })))
    }
    if (lowerQuery.includes("event")) {
      suggestions.push(...intents.event.map((text) => ({ text, type: "intent", confidence: 0.75, icon: "event" })))
    }

    return suggestions.slice(0, 3)
  }

  /**
   * Deduplicate suggestions and sort by confidence
   * @private
   */
  _deduplicateSuggestions(suggestions) {
    const seen = new Set()
    const unique = []

    for (const suggestion of suggestions) {
      if (!seen.has(suggestion.text.toLowerCase())) {
        seen.add(suggestion.text.toLowerCase())
        unique.push(suggestion)
      }
    }

    return unique.sort((a, b) => b.confidence - a.confidence)
  }
}

export default new TypingSuggestionService()




// // services/typingSuggestionService.js - Add caching and rate limiting
// import NodeCache from 'node-cache';

// class TypingSuggestionService {
//   constructor() {
//     this.cache = new NodeCache({ stdTTL: 300 }); // 5 min cache
//     this.userLastRequest = new Map();
//   }

//   async generateSuggestions(userId, query, className, semester) {
//     // Rate limiting: 1 request per 500ms per user
//     const lastRequest = this.userLastRequest.get(userId);
//     const now = Date.now();
//     if (lastRequest && now - lastRequest < 500) {
//       return [];
//     }
//     this.userLastRequest.set(userId, now);

//     // Cache key
//     const cacheKey = `suggestions:${userId}:${query.toLowerCase()}`;
    
//     try {
//       // Check cache first
//       const cached = this.cache.get(cacheKey);
//       if (cached) return cached;

//       if (!query || query.trim().length < 2) return [];

//       const [previous, common, rag, intent] = await Promise.allSettled([
//         this._getPreviousQuestions(userId, query),
//         this._getCommonQuestions(className, semester, query),
//         this._getRagSuggestions(query, className, semester),
//         this._getIntentSuggestions(query)
//       ]);

//       const suggestions = [
//         ...(previous.status === 'fulfilled' ? previous.value : []),
//         ...(common.status === 'fulfilled' ? common.value : []),
//         ...(rag.status === 'fulfilled' ? rag.value : []),
//         ...(intent.status === 'fulfilled' ? intent.value : [])
//       ];

//       const uniqueSuggestions = this._deduplicateSuggestions(suggestions);
//       const topSuggestions = uniqueSuggestions.slice(0, 5);

//       // Cache the results
//       this.cache.set(cacheKey, topSuggestions);
//       return topSuggestions;

//     } catch (error) {
//       console.error("[TypingSuggestionService] Error:", error);
//       return [];
//     }
//   }

//   // Add context-aware suggestion scoring
//   _scoreSuggestion(suggestion, query, userContext) {
//     const baseScore = suggestion.confidence;
//     const querySimilarity = this._calculateSimilarity(query, suggestion.text);
//     return baseScore * 0.7 + querySimilarity * 0.3;
//   }

//   _calculateSimilarity(str1, str2) {
//     const words1 = new Set(str1.toLowerCase().split(/\s+/));
//     const words2 = new Set(str2.toLowerCase().split(/\s+/));
//     const intersection = new Set([...words1].filter(x => words2.has(x)));
//     return intersection.size / Math.max(words1.size, words2.size);
//   }
// }

// export default new TypingSuggestionService()
