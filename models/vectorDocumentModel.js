import mongoose from "mongoose"

const vectorDocumentSchema = new mongoose.Schema(
  {
    // Original content
    content: {
      type: String,
      required: true,
      index: true,
    },

    // Vector embedding (768 dimensions for Gemini)
    embedding: {
      type: [Number],
      required: true,
      validate: {
        validator: (v) => v.length === 768,
        message: "Embedding must have exactly 768 dimensions",
      },
    },

    // Metadata for filtering
    metadata: {
      type: {
        type: String,
        enum: ["schedule", "assignment", "result", "event", "general_info", "exam", "quiz"],
        required: true,
      },
      semester: String,
      className: String,
      subject: String,
      date: Date,
      sourceId: mongoose.Schema.Types.ObjectId,
      sourceCollection: String,
    },

    // Chunk information
    chunkIndex: Number,
    totalChunks: Number,

    // Relevance tracking
    accessCount: {
      type: Number,
      default: 0,
    },
    lastAccessed: Date,

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    indexes: [
      { "metadata.type": 1 },
      { "metadata.semester": 1 },
      { "metadata.className": 1 },
      { "metadata.subject": 1 },
      { createdAt: -1 },
    ],
  },
)

// Update lastAccessed when document is retrieved
vectorDocumentSchema.methods.recordAccess = function () {
  this.accessCount += 1
  this.lastAccessed = new Date()
  return this.save()
}

export default mongoose.model("VectorDocument", vectorDocumentSchema)
