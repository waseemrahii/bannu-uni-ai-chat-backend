import Result from "../models/resultModel.js"
import { askGemini } from "../services/geminiService.js"

export const handleResultQuery = async (user) => {
  const results = await Result.find({ rollNo: user.rollNo }).sort({ semester: 1 })
  
  if (!results.length) {
    return {
      reply: `No results found for roll number ${user.rollNo}.`,
      intent: "RESULT"
    }
  }

  const resultSummary = results.map(result => {
    const details = (result.items || []).map(item => 
      `${item.subject}: ${item.grade || item.marks}`
    ).join(", ")
    return `Semester ${result.semester}: ${details || "No detailed subjects"}`
  }).join("\n• ")

  const prompt = `
Student asked for their results.
Results for Roll No ${user.rollNo}:
${resultSummary}

Provide a friendly summary of the student's academic performance.`
  
  const aiResponse = await askGemini(prompt)
  const finalReply = aiResponse && !aiResponse.includes("AI request failed")
    ? aiResponse
    : `📊 Results for ${user.rollNo}:\n• ${resultSummary}`

  return {
    reply: finalReply,
    intent: "RESULT",
    meta: { rollNo: user.rollNo, semestersCount: results.length }
  }
}