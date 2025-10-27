import mongoose from "mongoose"

const messageStatusSchema = new mongoose.Schema(
  {
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["sent", "delivered", "read", "failed"],
      default: "sent",
    },
    sentAt: { type: Date, default: Date.now },
    deliveredAt: Date,
    readAt: Date,
    failedReason: String,
  },
  { timestamps: true },
)

// Index for quick lookups
messageStatusSchema.index({ userId: 1, status: 1 })
messageStatusSchema.index({ chatId: 1, userId: 1 })

export default mongoose.model("MessageStatus", messageStatusSchema)
