import User from "../models/userModel.js";
import { detectIntent } from "./intentDetector.js";
import { handleClassScheduleQuery } from "../handlers/classScheduleHandler.js";
import { handleExamScheduleQuery } from "../handlers/examScheduleHandler.js";
import { handleQuizQuery } from "../handlers/quizHandler.js";
import { handleAssignmentQuery } from "../handlers/assignmentHandler.js";
import { handleResultQuery } from "../handlers/resultHandler.js";
import { handleEventQuery } from "../handlers/eventHandler.js";
import { handleGeneralInfoQuery } from "../handlers/generalInfoHandler.js";
import { handleUniversityStatusQuery } from "../handlers/universityStatusHandler.js";
import { handleEventInquiryQuery } from "../handlers/eventInquiryHandler.js";
import { askGemini } from "../services/geminiService.js";

// Pending clarifications management
const pendingClarifications = new Map();

const getPending = (userId) => pendingClarifications.get(String(userId));
const setPending = (userId, payload) => pendingClarifications.set(String(userId), payload);
const clearPending = (userId) => pendingClarifications.delete(String(userId));

export const processStudentMessage = async (userId, message) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { 
        reply: "User not found. Please check your account.", 
        intent: "UNKNOWN" 
      };
    }

    // Check for pending clarification
    const pending = getPending(userId);
    if (pending) {
      const augmented = `${pending.originalMessage} ${message}`;

      if (pending.type === "CLASS") {
        clearPending(userId);
        const { reply, intent } = await handleClassScheduleQuery(user, augmented);
        return { reply, intent };
      }

      if (pending.type === "EXAM") {
        clearPending(userId);
        const { reply, intent } = await handleExamScheduleQuery(user, augmented);
        return { reply, intent };
      }

      if (pending.type === "UNIVERSITY_STATUS") {
        clearPending(userId);
        const { reply, intent } = await handleUniversityStatusQuery(user, augmented);
        return { reply, intent };
      }

      if (pending.type === "EVENT_INQUIRY") {
        clearPending(userId);
        const { reply, intent } = await handleEventInquiryQuery(user, augmented);
        return { reply, intent };
      }

      if (pending.type === "RESULT_SEMESTER") {
        clearPending(userId);
        const { reply, intent } = await handleResultQuery(user, augmented);
        return { reply, intent };
      }
    }

    // Detect intent from message
    const intent = await detectIntent(message);
    
    console.log(`🎯 Detected intent: ${intent} for message: "${message}"`);

    // Handle result intent with semester clarification if needed
    if (intent === "RESULT") {
      // Check if semester is specified in the message
      const semesterMatch = message.match(/(\d+)(?:st|nd|rd|th)?\s+semester/i) || 
                           message.match(/semester\s+(\d+)/i);
      
      if (!semesterMatch) {
        setPending(userId, { 
          type: "RESULT_SEMESTER", 
          originalMessage: message 
        });
        return {
          reply: "Which semester results would you like to see? Please specify the semester number (e.g., 1st semester, semester 2).",
          intent: "AWAITING_CLARIFICATION"
        };
      }
    }

    if (intent === "UNIVERSITY_STATUS" && !/(today|tomorrow|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(message)) {
      setPending(userId, { type: "UNIVERSITY_STATUS", originalMessage: message });
      return {
        reply: "Are you asking about university status for today, tomorrow, or a specific day?",
        intent: "AWAITING_CLARIFICATION"
      };
    }

    if (intent === "EVENT_INQUIRY" && !/(today|tomorrow|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(message)) {
      setPending(userId, { type: "EVENT_INQUIRY", originalMessage: message });
      return {
        reply: "Are you asking about events for today, tomorrow, or a specific day?",
        intent: "AWAITING_CLARIFICATION"
      };
    }

    // Route to appropriate handler
    switch (intent) {
      case "TODAY_CLASSES":
      case "TOMORROW_CLASSES":
      case "YESTERDAY_CLASSES":
      case "DAY_CLASSES":
      case "NEXT_CLASS":
        return await handleClassScheduleQuery(user, message);
        
      case "EXAM_SCHEDULE":
        return await handleExamScheduleQuery(user, message);
        
      case "ASSIGNMENT":
        return await handleAssignmentQuery(user, message);
        
      case "QUIZ":
        return await handleQuizQuery(user, message);
        
      case "RESULT":
        return await handleResultQuery(user, message);
        
      case "EVENT":
        try {
          return await handleEventQuery(user, message);
        } catch (error) {
          console.error("💥 [Event Handler Error in AI Helper]:", error.message);
          return {
            reply: "Sorry, I encountered an error while checking events. Please try again.",
            intent: "ERROR"
          };
        }
        
      case "HOLIDAY":
      case "GENERAL_INFO":
        return await handleGeneralInfoQuery(user, message);
        
      case "UNIVERSITY_STATUS":
        return await handleUniversityStatusQuery(user, message);
        
      case "EVENT_INQUIRY":
        try {
          return await handleEventInquiryQuery(user, message);
        } catch (error) {
          console.error("💥 [Event Inquiry Error in AI Helper]:", error.message);
          return {
            reply: "Sorry, I encountered an error while checking for events. Please try again.",
            intent: "ERROR"
          };
        }
        
      default:
        // For unknown intent, use AI for general response
        const aiResponse = await askGemini(
          `You are a university assistant. A student asked: "${message}". 
Provide a brief, helpful response related to classes, exams, events, results, or university information.`
        );
        return {
          reply: aiResponse || "I'm not sure about that. Could you ask about classes, exams, events, results, or university status?",
          intent: "UNKNOWN"
        };
    }
  } catch (error) {
    console.error("💥 [Message Processing Error]:", error.message);
    return {
      reply: "Sorry, I encountered an error while processing your request. Please try again.",
      intent: "ERROR"
    };
  }
}

// Export for use in other files
export { askGemini } from "../services/geminiService.js";