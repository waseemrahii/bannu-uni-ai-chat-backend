import mongoose from "mongoose"

const ConversationStateSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
    pending: { type: Boolean, default: false },
    intent: { type: String },
    entities: { type: mongoose.Schema.Types.Mixed, default: {} },
    clarificationQuestion: { type: String },
    // Auto-expire stale states after 30 minutes
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 1000 * 60 * 30),
      index: { expires: 0 },
    },
  },
  { timestamps: true },
)

export default mongoose.models.ConversationState || mongoose.model("ConversationState", ConversationStateSchema)
