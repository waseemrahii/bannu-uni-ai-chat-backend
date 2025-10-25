/**
 * Build context for RAG from retrieved documents
 */
class RAGContextBuilder {
  /**
   * Build context from documents
   */
  static buildContext(documents, options = {}) {
    const { maxLength = 3000, includeMetadata = true, includeScores = false } = options

    let context = ""
    let currentLength = 0

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i]
      let section = ""

      if (includeMetadata) {
        section += `[Source ${i + 1} - ${doc.metadata?.type || "Unknown"}]\n`
      }

      section += doc.content

      if (includeScores && doc.similarityScore) {
        section += `\n[Relevance: ${(doc.similarityScore * 100).toFixed(1)}%]`
      }

      section += "\n\n"

      if (currentLength + section.length > maxLength) {
        break
      }

      context += section
      currentLength += section.length
    }

    return context.trim()
  }

  /**
   * Build system prompt with context
   */
  static buildSystemPrompt(context, role = "university assistant") {
    return `You are a helpful ${role}. Use the provided context to answer questions accurately and helpfully.

Context:
${context}

Instructions:
- Answer based on the provided context
- Be concise and clear
- If information is not in the context, acknowledge it
- Provide specific details when available
- Format your response clearly with proper punctuation`
  }

  /**
   * Build user prompt with query
   */
  static buildUserPrompt(query, additionalContext = "") {
    let prompt = `Question: ${query}`

    if (additionalContext) {
      prompt += `\n\nAdditional context: ${additionalContext}`
    }

    return prompt
  }

  /**
   * Extract key information from documents
   */
  static extractKeyInfo(documents) {
    const keyInfo = {
      types: new Set(),
      subjects: new Set(),
      dates: new Set(),
      semesters: new Set(),
    }

    for (const doc of documents) {
      if (doc.metadata) {
        if (doc.metadata.type) keyInfo.types.add(doc.metadata.type)
        if (doc.metadata.subject) keyInfo.subjects.add(doc.metadata.subject)
        if (doc.metadata.date) keyInfo.dates.add(doc.metadata.date)
        if (doc.metadata.semester) keyInfo.semesters.add(doc.metadata.semester)
      }
    }

    return {
      types: Array.from(keyInfo.types),
      subjects: Array.from(keyInfo.subjects),
      dates: Array.from(keyInfo.dates),
      semesters: Array.from(keyInfo.semesters),
    }
  }

  /**
   * Format documents for display
   */
  static formatForDisplay(documents) {
    return documents.map((doc, idx) => ({
      id: doc._id,
      index: idx + 1,
      content: doc.content,
      type: doc.metadata?.type,
      relevance: doc.similarityScore ? `${(doc.similarityScore * 100).toFixed(1)}%` : "N/A",
      metadata: doc.metadata,
    }))
  }
}

export default RAGContextBuilder
