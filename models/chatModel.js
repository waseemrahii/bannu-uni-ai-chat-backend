import mongoose from "mongoose"

const chatSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    question: String,
    answer: String,
    intent: String,
  },
  { timestamps: true }
)

export default mongoose.model("Chat", chatSchema)