import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

/**
 * Generate a concise, user-friendly title from the first message
 * @param {string} firstMessage - The first user message
 * @param {string} intent - The detected intent
 * @returns {Promise<string>} Generated title
 */
export const generateConversationTitle = async (firstMessage, intent) => {
  try {
    // If message is short enough, use it as title
    if (firstMessage.length <= 50) {
      return firstMessage.trim()
    }

    // For longer messages, use AI to generate a concise title
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

    const prompt = `Generate a very short (3-7 words) conversation title based on this message. 
The title should be user-friendly and summarize the main topic.
Intent: ${intent}
Message: "${firstMessage}"

Return ONLY the title, nothing else.`

    const result = await model.generateContent(prompt)
    const title = result.response.text().trim()

    // Ensure title is not too long
    return title.length > 50 ? firstMessage.substring(0, 50) + "..." : title
  } catch (error) {
    console.error("[Title Generator] Error:", error)
    // Fallback: use first 50 characters of message
    return firstMessage.substring(0, 50) + (firstMessage.length > 50 ? "..." : "")
  }
}

/**
 * Generate title based on intent type
 * @param {string} intent - The detected intent
 * @param {string} message - The user message
 * @returns {string} Generated title
 */
export const generateTitleByIntent = (intent, message) => {
  const intentTitles = {
    TODAY_CLASSES: "Today's Classes",
    TOMORROW_CLASSES: "Tomorrow's Classes",
    DAY_CLASSES: "Class Schedule",
    EXAM_SCHEDULE: "Exam Schedule",
    ASSIGNMENT: "Assignments",
    QUIZ: "Quiz Information",
    RESULT: "My Results",
    EVENT: "University Events",
    HOLIDAY: "Holiday Information",
    GENERAL_INFO: "University Information",
    UNIVERSITY_STATUS: "University Status",
    EVENT_INQUIRY: "Event Details",
    UNKNOWN: "Chat",
  }

  const title = intentTitles[intent] || "Chat"

  // Add timestamp for uniqueness if needed
  return title
}
