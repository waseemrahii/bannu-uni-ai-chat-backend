/**
 * In-memory vector store for similarity search
 * Used as fallback when MongoDB vector search is not available
 */
class VectorMemoryStore {
  constructor() {
    this.documents = []
  }

  /**
   * Add document to memory store
   */
  addDocument(content, embedding, metadata) {
    this.documents.push({
      content,
      embedding,
      metadata,
      id: this.documents.length,
    })
  }

  /**
   * Search for similar documents
   */
  search(queryEmbedding, topK = 5) {
    const similarities = this.documents.map((doc) => ({
      ...doc,
      score: this.cosineSimilarity(queryEmbedding, doc.embedding),
    }))

    return similarities.sort((a, b) => b.score - a.score).slice(0, topK)
  }

  /**
   * Calculate cosine similarity
   */
  cosineSimilarity(vec1, vec2) {
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

  /**
   * Clear all documents
   */
  clear() {
    this.documents = []
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalDocuments: this.documents.length,
      byType: this.documents.reduce((acc, doc) => {
        const type = doc.metadata.type
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {}),
    }
  }
}

export default new VectorMemoryStore()
