import GeneralInfo from "../models/generalInfoModel.js"
import { askGemini } from "../services/geminiService.js"

export const handleGeneralInfoQuery = async (user, message) => {
  const info = await GeneralInfo.find({
    $or: [
      { audience: "all" },
      { audience: "department", department: user.department },
      { audience: "semester", semester: user.semester }
    ]
  }).sort({ createdAt: -1 }).limit(5)

  if (!info.length) {
    return {
      reply: "No general information available at the moment.",
      intent: "GENERAL_INFO"
    }
  }

  const infoList = info.map(item => 
    `${item.title}: ${item.content}`
  ).join("\n• ")

  const prompt = `
Student asked: "${message}"
Available General Information:
${infoList}

Provide a helpful response based on the available information.`
  
  const aiResponse = await askGemini(prompt)
  const finalReply = aiResponse && !aiResponse.includes("AI request failed")
    ? aiResponse
    : `ℹ️ General Information:\n• ${infoList}`

  return {
    reply: finalReply,
    intent: "GENERAL_INFO",
    meta: { infoCount: info.length }
  }
}