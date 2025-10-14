
import Chat from "../models/chatModel.js"
import { processStudentMessage } from "../utils/aiHelper.js"

export const handleRealtimeChat = async (userId, message) => {
  const { reply, intent } = await processStudentMessage(userId, message)

  await Chat.create({
    userId,
    question: message,
    answer: reply,
    intent,
  })

  return reply
}
