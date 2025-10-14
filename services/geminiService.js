import axios from "axios"
import dotenv from "dotenv"

dotenv.config()

const GEMINI_MODEL = "gemini-2.0-flash"
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const getGeminiKey = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

export const askGemini = async (prompt) => {
  try {
    const key = getGeminiKey()
    if (!key) throw new Error("Missing GEMINI_API_KEY/GOOGLE_API_KEY")
    const url = `${GEMINI_URL}?key=${encodeURIComponent(key)}`
    
    const response = await axios.post(
      url,
      { contents: [{ parts: [{ text: prompt }] }] },
      { headers: { "Content-Type": "application/json" } }
    )
    
    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "No reply from AI"
  } catch (err) {
    console.error("❌ Gemini error:", err.response?.data || err.message)
    return "AI request failed."
  }
}

export const askAI = askGemini