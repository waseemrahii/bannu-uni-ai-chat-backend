

import Schedule from "../models/scheduleModel.js";
import { detectMessageContext, getDateRangeFromMessage, getTargetDateFromMessage, weekdayName } from "../utils/dateTimeHelper.js"
import { normalizeSubject, CS_SUBJECTS_NORMALIZATION } from "../utils/subjectNormalizer.js"
import { askGemini } from "../services/geminiService.js"

export const handleQuizQuery = async (user, message) => {
  try {
    console.log('🔍 [Quiz Handler] Starting with:', { 
      user: user.rollNo, 
      message, 
      semester: user.semester,
      className: user.className
    });

    if (!user || !user.semester) {
      console.error("💥 User or user.semester is undefined:", user);
      return {
        reply: "Sorry, there was an issue with your user information. Please try again.",
        intent: "ERROR"
      };
    }

    const context = detectMessageContext();
    const today = new Date();
    const todayFormatted = today.toLocaleDateString('en-GB');
    
    console.log(`📋 Quiz/Assignment Query Analysis:`, {
      message,
      currentDate: context.currentDate,
      userSemester: user.semester,
      userClass: user.className
    });

    // Analyze the message type
    const messageLower = message.toLowerCase();
    
    // Determine query type and assessment type
    let queryType = "GENERAL";
    let assessmentTypes = ["quiz", "test"]; // Always include both by default
    let targetSubject = null;
    let targetDate = today;
    
    // Check for today/tomorrow/yesterday queries
    if (/(today|now)/i.test(messageLower)) {
      queryType = "TODAY_ASSESSMENTS";
      targetDate = today;
    } else if (/(tomorrow|tmrw)/i.test(messageLower)) {
      queryType = "TOMORROW_ASSESSMENTS";
      targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (/(yesterday)/i.test(messageLower)) {
      queryType = "YESTERDAY_ASSESSMENTS";
      targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() - 1);
    }
    
    // Check if user specifically asks for quiz or test
    if (messageLower.includes("quiz") && !messageLower.includes("test")) {
      assessmentTypes = ["quiz"];
    } else if (messageLower.includes("test") && !messageLower.includes("quiz")) {
      assessmentTypes = ["test"];
    }
    
    // Check for subject-specific queries
    if (CS_SUBJECTS_NORMALIZATION) {
      const subjects = Object.keys(CS_SUBJECTS_NORMALIZATION);
      for (const subject of subjects) {
        const variations = CS_SUBJECTS_NORMALIZATION[subject];
        for (const variation of variations) {
          if (messageLower.includes(variation.toLowerCase())) {
            targetSubject = subject;
            queryType = "SUBJECT_SPECIFIC";
            break;
          }
        }
        if (targetSubject) break;
      }
    }
    
    // Check for deadline queries
    if (/(deadline|due|when is|when's)/i.test(message)) {
      queryType = "DEADLINE";
    }
    
    // Check for sequence queries (next, upcoming)
    if (/(next|upcoming|coming)\s+(quiz|test)/i.test(message)) {
      queryType = "SEQUENCE";
    }

    // For "any test in today or upcoming days" - show both today and upcoming
    if (/(today|upcoming|coming).*(test|quiz)/i.test(messageLower) || 
        /(test|quiz).*(today|upcoming|coming)/i.test(messageLower)) {
      queryType = "TODAY_AND_UPCOMING";
    }

    console.log(`🔍 Quiz Query Analysis:`, {
      queryType,
      assessmentTypes,
      targetSubject,
      targetDate: targetDate.toLocaleDateString('en-GB')
    });

    // Build query based on analysis
    let assessmentQuery = {
      semester: user.semester,
      className: user.className,
      kind: { $in: assessmentTypes }
    };

    // Date filtering based on query type
    switch (queryType) {
      case "TODAY_ASSESSMENTS":
      case "TOMORROW_ASSESSMENTS":
      case "YESTERDAY_ASSESSMENTS":
        const start = new Date(targetDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(targetDate);
        end.setHours(23, 59, 59, 999);
        assessmentQuery.date = { $gte: start, $lte: end };
        break;
        
      case "TODAY_AND_UPCOMING":
        // For queries like "any test in today or upcoming days" - show both today and future
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        assessmentQuery.date = { $gte: todayStart };
        break;
        
      case "SEQUENCE":
        // Get next upcoming assessments
        assessmentQuery.date = { $gte: today };
        break;
        
      case "DEADLINE":
        // Get upcoming deadlines
        assessmentQuery.date = { $gte: today };
        break;
        
      default:
        // GENERAL query - check today first
        const todayStartDefault = new Date();
        todayStartDefault.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        assessmentQuery.date = { $gte: todayStartDefault, $lte: todayEnd };
        break;
    }

    // Add subject filter if specified
    if (targetSubject && CS_SUBJECTS_NORMALIZATION && CS_SUBJECTS_NORMALIZATION[targetSubject]) {
      const subjectVariations = CS_SUBJECTS_NORMALIZATION[targetSubject];
      assessmentQuery.subject = { 
        $in: subjectVariations.map(v => new RegExp(v, 'i'))
      };
    }

    let sortOrder = { date: 1, startTime: 1 };
    let limit = queryType === "SEQUENCE" ? 5 : null;

    // Execute query
    console.log('🔍 [Quiz Query]:', assessmentQuery);
    
    let assessmentsQuery = Schedule.find(assessmentQuery).sort(sortOrder);
    if (limit) {
      assessmentsQuery = assessmentsQuery.limit(limit);
    }
    
    const assessments = await assessmentsQuery;

    console.log(`📝 Found ${assessments.length} assessments:`, 
      assessments.map(a => ({ 
        kind: a.kind,
        subject: a.subject,
        date: a.date,
        formattedDate: new Date(a.date).toLocaleDateString('en-GB'),
        startTime: a.startTime,
        title: a.title
      })));

    // Generate intelligent response
    let reply = "";

    if (assessments.length > 0) {
      switch (queryType) {
        case "TODAY_ASSESSMENTS":
        case "TOMORROW_ASSESSMENTS":
        case "YESTERDAY_ASSESSMENTS":
          reply = generateDateSpecificResponse(assessments, queryType, targetDate);
          break;
          
        case "TODAY_AND_UPCOMING":
          reply = generateTodayAndUpcomingResponse(assessments, assessmentTypes, today);
          break;
          
        case "DEADLINE":
          reply = generateDeadlineResponse(assessments, todayFormatted);
          break;
          
        case "SEQUENCE":
          reply = generateQuizSequenceResponse(assessments, assessmentTypes, todayFormatted);
          break;
          
        case "SUBJECT_SPECIFIC":
          reply = generateQuizSubjectResponse(assessments, targetSubject, todayFormatted);
          break;
          
        default:
          reply = generateQuizGeneralResponse(assessments, assessmentTypes, targetDate);
          break;
      }
    } else {
      // If no assessments found for today, check for upcoming ones for general queries
      if (queryType === "GENERAL" || queryType === "TODAY_ASSESSMENTS" || queryType === "TODAY_AND_UPCOMING") {
        const upcomingQuery = {
          semester: user.semester,
          className: user.className,
          kind: { $in: assessmentTypes },
          date: { $gte: today }
        };
        
        console.log('🔍 [Upcoming Query]:', upcomingQuery);
        const upcomingAssessments = await Schedule.find(upcomingQuery).sort({ date: 1, startTime: 1 }).limit(5);
        
        if (upcomingAssessments.length > 0) {
          reply = generateUpcomingResponse(upcomingAssessments, assessmentTypes, queryType);
        } else {
          reply = generateNoAssessmentsResponse(queryType, assessmentTypes, targetSubject, user, targetDate);
        }
      } else {
        reply = generateNoAssessmentsResponse(queryType, assessmentTypes, targetSubject, user, targetDate);
      }
    }

    console.log(`📤 Quiz/Assignment response generated successfully`);
    
    return {
      reply: reply,
      intent: "QUIZ",
      meta: {
        currentDay: context.currentDay,
        currentDate: context.currentDate,
        queryType,
        assessmentTypes,
        assessmentsCount: assessments.length
      }
    };
  } catch (error) {
    console.error("💥 [Quiz Handler Error]:", error.message);
    console.error("💥 [Quiz Handler Error Stack]:", error.stack);
    return {
      reply: "Sorry, I encountered an error while checking quizzes/tests. Please try again.",
      intent: "ERROR"
    };
  }
};

// Response generators for quiz handler (keep the same as before)
function generateDateSpecificResponse(assessments, queryType, targetDate) {
  const dateFormatted = targetDate.toLocaleDateString('en-GB');
  const dayName = weekdayName(targetDate);
  
  let timeContext = "";
  switch (queryType) {
    case "TODAY_ASSESSMENTS":
      timeContext = "Today";
      break;
    case "TOMORROW_ASSESSMENTS":
      timeContext = "Tomorrow";
      break;
    case "YESTERDAY_ASSESSMENTS":
      timeContext = "Yesterday";
      break;
  }
  
  const assessmentList = assessments.map(assessment => {
    const subject = assessment.subject;
    const kindEmoji = assessment.kind === "quiz" ? "🧩" : "📝";
    
    return `• ${kindEmoji} ${subject} ${assessment.kind} at ${assessment.startTime}${assessment.room ? ` in ${assessment.room}` : ""}${assessment.title ? ` - ${assessment.title}` : ""}`;
  }).join('\n');

  const typeText = assessments.length > 1 ? 'Assessments' : 'Assessment';
  
  return `📋 ${timeContext}'s ${typeText} (${dayName}, ${dateFormatted}):\n\n${assessmentList}\n\n${getAssessmentAdvice(assessments[0].kind)}`;
}

function generateTodayAndUpcomingResponse(assessments, assessmentTypes, today) {
  // Separate today's assessments from upcoming ones
  const todayAssessments = assessments.filter(assessment => {
    const assessmentDate = new Date(assessment.date);
    return assessmentDate.toDateString() === today.toDateString();
  });
  
  const upcomingAssessments = assessments.filter(assessment => {
    const assessmentDate = new Date(assessment.date);
    return assessmentDate > new Date(today.setHours(23, 59, 59, 999));
  });

  let response = "";

  if (todayAssessments.length > 0) {
    response += `📋 Today's Assessments:\n\n`;
    response += todayAssessments.map(assessment => {
      const subject = assessment.subject;
      const kindEmoji = assessment.kind === "quiz" ? "🧩" : "📝";
      return `• ${kindEmoji} ${subject} ${assessment.kind} at ${assessment.startTime}${assessment.room ? ` in ${assessment.room}` : ""}`;
    }).join('\n');
  }

  if (upcomingAssessments.length > 0) {
    if (todayAssessments.length > 0) {
      response += `\n\n📅 Upcoming Assessments:\n\n`;
    } else {
      response += `📅 Upcoming Assessments:\n\n`;
    }
    
    response += upcomingAssessments.map(assessment => {
      const assessmentDate = new Date(assessment.date);
      const dateFormatted = assessmentDate.toLocaleDateString('en-GB');
      const dayName = weekdayName(assessmentDate);
      const subject = assessment.subject;
      const kindEmoji = assessment.kind === "quiz" ? "🧩" : "📝";
      const daysUntil = Math.ceil((assessmentDate - new Date()) / (1000 * 60 * 60 * 24));
      
      return `• ${kindEmoji} ${subject} ${assessment.kind} - ${dayName} (${dateFormatted}) - ${daysUntil} day${daysUntil !== 1 ? 's' : ''} from now`;
    }).join('\n');
  }

  return response + `\n\nPlan your study schedule accordingly! 🗓️`;
}

function generateDeadlineResponse(assessments, todayFormatted) {
  const assessmentList = assessments.map(assessment => {
    const assessmentDate = new Date(assessment.date);
    const dateFormatted = assessmentDate.toLocaleDateString('en-GB');
    const dayName = weekdayName(assessmentDate);
    const subject = assessment.subject;
    const kindEmoji = assessment.kind === "quiz" ? "🧩" : "📝";
    const daysUntil = Math.ceil((assessmentDate - new Date()) / (1000 * 60 * 60 * 24));
    
    return `• ${kindEmoji} ${subject} ${assessment.kind} - ${dayName} (${dateFormatted}) at ${assessment.startTime} - ${daysUntil} day${daysUntil !== 1 ? 's' : ''} left`;
  }).join('\n');

  return `⏰ Upcoming Deadlines:\n\n${assessmentList}\n\nDon't wait until the last minute! 🚀`;
}

function generateQuizSequenceResponse(assessments, assessmentTypes, todayFormatted) {
  const assessmentList = assessments.map(assessment => {
    const assessmentDate = new Date(assessment.date);
    const dateFormatted = assessmentDate.toLocaleDateString('en-GB');
    const dayName = weekdayName(assessmentDate);
    const subject = assessment.subject;
    const kindEmoji = assessment.kind === "quiz" ? "🧩" : "📝";
    
    return `• ${kindEmoji} ${dayName} (${dateFormatted}): ${subject} ${assessment.kind} at ${assessment.startTime}`;
  }).join('\n');

  const typeText = getTypeText(assessmentTypes);
  
  return `📋 Your next ${typeText}:\n\n${assessmentList}\n\nStart preparing! 📚`;
}

function generateQuizSubjectResponse(assessments, targetSubject, todayFormatted) {
  let subjectName = targetSubject;
  if (CS_SUBJECTS_NORMALIZATION && CS_SUBJECTS_NORMALIZATION[targetSubject]) {
    subjectName = CS_SUBJECTS_NORMALIZATION[targetSubject][0];
  }
  
  const assessmentList = assessments.map(assessment => {
    const assessmentDate = new Date(assessment.date);
    const dateFormatted = assessmentDate.toLocaleDateString('en-GB');
    const dayName = weekdayName(assessmentDate);
    const kindEmoji = assessment.kind === "quiz" ? "🧩" : "📝";
    
    return `• ${kindEmoji} ${dayName} (${dateFormatted}): ${assessment.kind} at ${assessment.startTime}`;
  }).join('\n');

  return `📋 ${subjectName} Assessments:\n\n${assessmentList}`;
}

function generateQuizGeneralResponse(assessments, assessmentTypes, targetDate) {
  const dateFormatted = targetDate.toLocaleDateString('en-GB');
  const dayName = weekdayName(targetDate);
  
  const assessmentList = assessments.slice(0, 5).map(assessment => {
    const subject = assessment.subject;
    const kindEmoji = assessment.kind === "quiz" ? "🧩" : "📝";
    
    return `• ${kindEmoji} ${subject} ${assessment.kind} at ${assessment.startTime}${assessment.room ? ` in ${assessment.room}` : ""}`;
  }).join('\n');

  return `📋 Today's Assessments (${dayName}, ${dateFormatted}):\n\n${assessmentList}\n\nPlan your study time wisely! 🗓️`;
}

function generateUpcomingResponse(assessments, assessmentTypes, queryType) {
  const assessmentList = assessments.map(assessment => {
    const assessmentDate = new Date(assessment.date);
    const dateFormatted = assessmentDate.toLocaleDateString('en-GB');
    const dayName = weekdayName(assessmentDate);
    const subject = assessment.subject;
    const kindEmoji = assessment.kind === "quiz" ? "🧩" : "📝";
    const daysUntil = Math.ceil((assessmentDate - new Date()) / (1000 * 60 * 60 * 24));
    
    return `• ${kindEmoji} ${subject} ${assessment.kind} - ${dayName} (${dateFormatted}) - ${daysUntil} day${daysUntil !== 1 ? 's' : ''} from now`;
  }).join('\n');

  const typeText = getTypeText(assessmentTypes);

  if (queryType === "TODAY_ASSESSMENTS") {
    return `🎉 No assessments today! But here are your upcoming ${typeText}:\n\n${assessmentList}\n\nPlan ahead! 📅`;
  } else {
    return `📋 Your Upcoming ${typeText.charAt(0).toUpperCase() + typeText.slice(1)}:\n\n${assessmentList}\n\nPlan your study time wisely! 🗓️`;
  }
}

function generateNoAssessmentsResponse(queryType, assessmentTypes, targetSubject, user, targetDate) {
  const dateFormatted = targetDate.toLocaleDateString('en-GB');
  const dayName = weekdayName(targetDate);
  
  const typeText = getTypeText(assessmentTypes);
  
  if (targetSubject) {
    let subjectName = targetSubject;
    if (CS_SUBJECTS_NORMALIZATION && CS_SUBJECTS_NORMALIZATION[targetSubject]) {
      subjectName = CS_SUBJECTS_NORMALIZATION[targetSubject][0];
    }
    
    switch (queryType) {
      case "TODAY_ASSESSMENTS":
        return `🎉 No ${subjectName} ${typeText} today! (${dateFormatted})\n\nYou can focus on other subjects. 📖`;
      case "TOMORROW_ASSESSMENTS":
        return `🎉 No ${subjectName} ${typeText} tomorrow! (${dateFormatted})\n\nEnjoy your day! 🌟`;
      case "YESTERDAY_ASSESSMENTS":
        return `📭 No ${subjectName} ${typeText} were scheduled for yesterday (${dateFormatted}).`;
      default:
        return `🎉 No upcoming ${subjectName} ${typeText} found!\n\nFocus on your current studies. 📖`;
    }
  }
  
  switch (queryType) {
    case "TODAY_ASSESSMENTS":
      return `🎉 No ${typeText} today! (${dateFormatted})\n\nYou can focus on your regular coursework. 📚`;
    case "TOMORROW_ASSESSMENTS":
      return `🎉 No ${typeText} tomorrow! (${dateFormatted})\n\nPlan your study schedule accordingly. 🗓️`;
    case "YESTERDAY_ASSESSMENTS":
      return `📭 No ${typeText} were scheduled for yesterday (${dateFormatted}).`;
    case "TODAY_AND_UPCOMING":
      return `🎉 No ${typeText} found for today or upcoming days!\n\nYou can focus on your regular coursework. 📚`;
    default:
      return `🎉 No upcoming ${typeText} found for semester ${user.semester}!\n\nYou can focus on your regular coursework.`;
  }
}

// Helper function for assessment advice
function getAssessmentAdvice(kind) {
  switch (kind) {
    case "quiz":
      return "Good luck on your quiz! 🍀";
    case "test":
      return "Prepare well for your test! 📚";
    default:
      return "You've got this! 💪";
  }
}

// Helper function to get proper type text
function getTypeText(assessmentTypes) {
  if (assessmentTypes.length === 1) {
    if (assessmentTypes[0] === "quiz") return "quizzes";
    if (assessmentTypes[0] === "test") return "tests";
  } else if (assessmentTypes.length === 2) {
    return "quizzes or tests";
  }
  return "assessments";
}


// import Schedule from "../models/scheduleModel.js"
// import { detectMessageContext, getDateRangeFromMessage, getTargetDateFromMessage, weekdayName } from "../utils/dateTimeHelper.js"
// import { normalizeSubject, CS_SUBJECTS_NORMALIZATION } from "../utils/subjectNormalizer.js"
// import { askGemini } from "../services/geminiService.js"

// export const handleQuizQuery = async (user, message) => {
//   try {
//     if (!user || !user.semester) {
//       console.error("💥 User or user.semester is undefined:", user);
//       return {
//         reply: "Sorry, there was an issue with your user information. Please try again.",
//         intent: "ERROR"
//       };
//     }

//     const context = detectMessageContext();
//     const today = new Date();
//     const todayFormatted = today.toLocaleDateString('en-GB');
    
//     console.log(`📋 Quiz/Assignment Query Analysis:`, {
//       message,
//       currentDate: context.currentDate,
//       userSemester: user.semester,
//       userClass: user.className
//     });

//     // Analyze the message type
//     const messageLower = message.toLowerCase();
    
//     // Determine query type and assessment type
//     let queryType = "GENERAL";
//     let assessmentTypes = ["quiz","test"];
//     let targetSubject = null;
//     let targetDate = today;
    
//     // Check for today/tomorrow/yesterday queries
//     if (/(today|now)/i.test(messageLower)) {
//       queryType = "TODAY_ASSESSMENTS";
//       targetDate = today;
//     } else if (/(tomorrow|tmrw)/i.test(messageLower)) {
//       queryType = "TOMORROW_ASSESSMENTS";
//       targetDate = new Date(today);
//       targetDate.setDate(targetDate.getDate() + 1);
//     } else if (/(yesterday)/i.test(messageLower)) {
//       queryType = "YESTERDAY_ASSESSMENTS";
//       targetDate = new Date(today);
//       targetDate.setDate(targetDate.getDate() - 1);
//     }
    
//     // FIXED: Always include both quiz and test when either is mentioned
//     // If user asks about quiz OR test, include BOTH types
//     if (messageLower.includes("quiz") || messageLower.includes("test")) {
//       assessmentTypes = ["quiz", "test"];
//     //   // If assignment is also mentioned, include it too
//     //   if (messageLower.includes("assignment")) {
//     //     assessmentTypes = ["quiz", "test"];
//     //   }
//     // } else if (messageLower.includes("assignment")) {
//     //   assessmentTypes = ["assignment"];
//     }
    
//     // Check for subject-specific queries
//     if (CS_SUBJECTS_NORMALIZATION) {
//       const subjects = Object.keys(CS_SUBJECTS_NORMALIZATION);
//       for (const subject of subjects) {
//         const variations = CS_SUBJECTS_NORMALIZATION[subject];
//         for (const variation of variations) {
//           if (messageLower.includes(variation.toLowerCase())) {
//             targetSubject = subject;
//             queryType = "SUBJECT_SPECIFIC";
//             break;
//           }
//         }
//         if (targetSubject) break;
//       }
//     }
    
//     // Check for deadline queries
//     if (/(deadline|due|when is|when's)/i.test(message)) {
//       queryType = "DEADLINE";
//     }
    
//     // Check for sequence queries (next, upcoming)
//     if (/(next|upcoming|coming)\s+(quiz|assignment|test)/i.test(message)) {
//       queryType = "SEQUENCE";
//     }

//     // FIXED: For "any test in today or upcoming days" - show both today and upcoming
//     if (/(today|upcoming|coming).*(test|quiz)/i.test(messageLower) || 
//         /(test|quiz).*(today|upcoming|coming)/i.test(messageLower)) {
//       queryType = "TODAY_AND_UPCOMING";
//     }

//     console.log(`🔍 Quiz Query Analysis:`, {
//       queryType,
//       assessmentTypes,
//       targetSubject,
//       targetDate: targetDate.toLocaleDateString('en-GB')
//     });

//     // Build query based on analysis
//     let assessmentQuery = {
//       semester: user.semester,
//       className: user.className,
//       kind: { $in: assessmentTypes }
//     };

//     // Date filtering based on query type
//     switch (queryType) {
//       case "TODAY_ASSESSMENTS":
//       case "TOMORROW_ASSESSMENTS":
//       case "YESTERDAY_ASSESSMENTS":
//         const start = new Date(targetDate);
//         start.setHours(0, 0, 0, 0);
//         const end = new Date(targetDate);
//         end.setHours(23, 59, 59, 999);
//         assessmentQuery.date = { $gte: start, $lte: end };
//         break;
        
//       case "TODAY_AND_UPCOMING":
//         // For queries like "any test in today or upcoming days" - show both today and future
//         const todayStart = new Date(today);
//         todayStart.setHours(0, 0, 0, 0);
//         assessmentQuery.date = { $gte: todayStart };
//         break;
        
//       case "SEQUENCE":
//         // Get next upcoming assessments
//         assessmentQuery.date = { $gte: today };
//         break;
        
//       case "DEADLINE":
//         // Get upcoming deadlines
//         assessmentQuery.date = { $gte: today };
//         break;
        
//       default:
//         // GENERAL query - check today first, then upcoming
//         // const todayStart = new Date(today);
//         todayStart.setHours(0, 0, 0, 0);
//         const todayEnd = new Date(today);
//         todayEnd.setHours(23, 59, 59, 999);
//         assessmentQuery.date = { $gte: todayStart, $lte: todayEnd };
//         break;
//     }

//     // Add subject filter if specified
//     if (targetSubject && CS_SUBJECTS_NORMALIZATION && CS_SUBJECTS_NORMALIZATION[targetSubject]) {
//       const subjectVariations = CS_SUBJECTS_NORMALIZATION[targetSubject];
//       assessmentQuery.subject = { 
//         $in: subjectVariations.map(v => new RegExp(v, 'i'))
//       };
//     }

//     let sortOrder = { date: 1, startTime: 1 };
//     let limit = queryType === "SEQUENCE" ? 5 : null;

//     // Execute query
//     let assessmentsQuery = Schedule.find(assessmentQuery).sort(sortOrder);
//     if (limit) {
//       assessmentsQuery = assessmentsQuery.limit(limit);
//     }
    
//     const assessments = await assessmentsQuery;

//     console.log(`📝 Found ${assessments.length} assessments:`, 
//       assessments.map(a => ({ 
//         kind: a.kind,
//         subject: a.subject,
//         date: a.date,
//         formattedDate: new Date(a.date).toLocaleDateString('en-GB'),
//         startTime: a.startTime,
//         title: a.title
//       })));

//     // Generate intelligent response
//     let reply = "";

//     if (assessments.length > 0) {
//       switch (queryType) {
//         case "TODAY_ASSESSMENTS":
//         case "TOMORROW_ASSESSMENTS":
//         case "YESTERDAY_ASSESSMENTS":
//           reply = generateDateSpecificResponse(assessments, queryType, targetDate);
//           break;
          
//         case "TODAY_AND_UPCOMING":
//           reply = generateTodayAndUpcomingResponse(assessments, assessmentTypes, today);
//           break;
          
//         case "DEADLINE":
//           reply = generateDeadlineResponse(assessments, todayFormatted);
//           break;
          
//         case "SEQUENCE":
//           reply = generateQuizSequenceResponse(assessments, assessmentTypes, todayFormatted);
//           break;
          
//         case "SUBJECT_SPECIFIC":
//           reply = generateQuizSubjectResponse(assessments, targetSubject, todayFormatted);
//           break;
          
//         default:
//           reply = generateQuizGeneralResponse(assessments, assessmentTypes, targetDate);
//           break;
//       }
//     } else {
//       // If no assessments found for today, check for upcoming ones for general queries
//       if (queryType === "GENERAL" || queryType === "TODAY_ASSESSMENTS" || queryType === "TODAY_AND_UPCOMING") {
//         const upcomingQuery = {
//           semester: user.semester,
//           className: user.className,
//           kind: { $in: assessmentTypes },
//           date: { $gte: today }
//         };
        
//         const upcomingAssessments = await Schedule.find(upcomingQuery).sort({ date: 1, startTime: 1 }).limit(5);
        
//         if (upcomingAssessments.length > 0) {
//           reply = generateUpcomingResponse(upcomingAssessments, assessmentTypes, queryType);
//         } else {
//           reply = generateNoAssessmentsResponse(queryType, assessmentTypes, targetSubject, user, targetDate);
//         }
//       } else {
//         reply = generateNoAssessmentsResponse(queryType, assessmentTypes, targetSubject, user, targetDate);
//       }
//     }

//     console.log(`📤 Quiz/Assignment response:`, { 
//       queryType,
//       assessmentsFound: assessments.length
//     });

//     return {
//       reply: reply.replace(/\n/g, '<br>'),
//       intent: "QUIZ",
//       meta: {
//         currentDay: context.currentDay,
//         currentDate: context.currentDate,
//         queryType,
//         assessmentTypes,
//         assessmentsCount: assessments.length
//       }
//     };
//   } catch (error) {
//     console.error("💥 [Quiz Handler Error]:", error.message);
//     return {
//       reply: "Sorry, I encountered an error while checking quizzes/assignments. Please try again.",
//       intent: "ERROR"
//     };
//   }
// };

// // Response generators for quiz handler
// function generateDateSpecificResponse(assessments, queryType, targetDate) {
//   const dateFormatted = targetDate.toLocaleDateString('en-GB');
//   const dayName = weekdayName(targetDate);
  
//   let timeContext = "";
//   switch (queryType) {
//     case "TODAY_ASSESSMENTS":
//       timeContext = "Today";
//       break;
//     case "TOMORROW_ASSESSMENTS":
//       timeContext = "Tomorrow";
//       break;
//     case "YESTERDAY_ASSESSMENTS":
//       timeContext = "Yesterday";
//       break;
//   }
  
//   const assessmentList = assessments.map(assessment => {
//     const subject = normalizeSubject(assessment.subject);
//     const kindEmoji = assessment.kind === "quiz" ? "🧩" : 
//                      assessment.kind === "assignment" ? "📄" : "📝";
    
//     return `• ${kindEmoji} ${subject} ${assessment.kind} at ${assessment.startTime}${assessment.room ? ` in ${assessment.room}` : ""}${assessment.title ? ` - ${assessment.title}` : ""}`;
//   }).join('\n');

//   const typeText = assessments.length > 1 ? 'Assessments' : 'Assessment';
  
//   return `📋 ${timeContext}'s ${typeText} (${dayName}, ${dateFormatted}):\n\n${assessmentList}\n\n${getAssessmentAdvice(assessments[0].kind)}`;
// }

// function generateTodayAndUpcomingResponse(assessments, assessmentTypes, today) {
//   // Separate today's assessments from upcoming ones
//   const todayAssessments = assessments.filter(assessment => {
//     const assessmentDate = new Date(assessment.date);
//     return assessmentDate.toDateString() === today.toDateString();
//   });
  
//   const upcomingAssessments = assessments.filter(assessment => {
//     const assessmentDate = new Date(assessment.date);
//     return assessmentDate > new Date(today.setHours(23, 59, 59, 999));
//   });

//   let response = "";

//   if (todayAssessments.length > 0) {
//     response += `📋 Today's Assessments:\n\n`;
//     response += todayAssessments.map(assessment => {
//       const subject = normalizeSubject(assessment.subject);
//       const kindEmoji = assessment.kind === "quiz" ? "🧩" : 
//                        assessment.kind === "assignment" ? "📄" : "📝";
//       return `• ${kindEmoji} ${subject} ${assessment.kind} at ${assessment.startTime}${assessment.room ? ` in ${assessment.room}` : ""}`;
//     }).join('\n');
//   }

//   if (upcomingAssessments.length > 0) {
//     if (todayAssessments.length > 0) {
//       response += `\n\n📅 Upcoming Assessments:\n\n`;
//     } else {
//       response += `📅 Upcoming Assessments:\n\n`;
//     }
    
//     response += upcomingAssessments.map(assessment => {
//       const assessmentDate = new Date(assessment.date);
//       const dateFormatted = assessmentDate.toLocaleDateString('en-GB');
//       const dayName = weekdayName(assessmentDate);
//       const subject = normalizeSubject(assessment.subject);
//       const kindEmoji = assessment.kind === "quiz" ? "🧩" : 
//                        assessment.kind === "assignment" ? "📄" : "📝";
//       const daysUntil = Math.ceil((assessmentDate - new Date()) / (1000 * 60 * 60 * 24));
      
//       return `• ${kindEmoji} ${subject} ${assessment.kind} - ${dayName} (${dateFormatted}) - ${daysUntil} day${daysUntil !== 1 ? 's' : ''} from now`;
//     }).join('\n');
//   }

//   return response + `\n\nPlan your study schedule accordingly! 🗓️`;
// }

// function generateDeadlineResponse(assessments, todayFormatted) {
//   const assessmentList = assessments.map(assessment => {
//     const assessmentDate = new Date(assessment.date);
//     const dateFormatted = assessmentDate.toLocaleDateString('en-GB');
//     const dayName = weekdayName(assessmentDate);
//     const subject = normalizeSubject(assessment.subject);
//     const kindEmoji = assessment.kind === "quiz" ? "🧩" : 
//                      assessment.kind === "assignment" ? "📄" : "📝";
//     const daysUntil = Math.ceil((assessmentDate - new Date()) / (1000 * 60 * 60 * 24));
    
//     return `• ${kindEmoji} ${subject} ${assessment.kind} - ${dayName} (${dateFormatted}) at ${assessment.startTime} - ${daysUntil} day${daysUntil !== 1 ? 's' : ''} left`;
//   }).join('\n');

//   return `⏰ Upcoming Deadlines:\n\n${assessmentList}\n\nDon't wait until the last minute! 🚀`;
// }

// function generateQuizSequenceResponse(assessments, assessmentTypes, todayFormatted) {
//   const assessmentList = assessments.map(assessment => {
//     const assessmentDate = new Date(assessment.date);
//     const dateFormatted = assessmentDate.toLocaleDateString('en-GB');
//     const dayName = weekdayName(assessmentDate);
//     const subject = normalizeSubject(assessment.subject);
//     const kindEmoji = assessment.kind === "quiz" ? "🧩" : 
//                      assessment.kind === "assignment" ? "📄" : "📝";
    
//     return `• ${kindEmoji} ${dayName} (${dateFormatted}): ${subject} ${assessment.kind} at ${assessment.startTime}`;
//   }).join('\n');

//   const typeText = getTypeText(assessmentTypes);
  
//   return `📋 Your next ${typeText}:\n\n${assessmentList}\n\nStart preparing! 📚`;
// }

// function generateQuizSubjectResponse(assessments, targetSubject, todayFormatted) {
//   // Safe way to get subject name
//   let subjectName = targetSubject;
//   if (CS_SUBJECTS_NORMALIZATION && CS_SUBJECTS_NORMALIZATION[targetSubject]) {
//     subjectName = CS_SUBJECTS_NORMALIZATION[targetSubject][0];
//   }
  
//   const assessmentList = assessments.map(assessment => {
//     const assessmentDate = new Date(assessment.date);
//     const dateFormatted = assessmentDate.toLocaleDateString('en-GB');
//     const dayName = weekdayName(assessmentDate);
//     const kindEmoji = assessment.kind === "quiz" ? "🧩" : 
//                      assessment.kind === "assignment" ? "📄" : "📝";
    
//     return `• ${kindEmoji} ${dayName} (${dateFormatted}): ${assessment.kind} at ${assessment.startTime}`;
//   }).join('\n');

//   return `📋 ${subjectName} Assessments:\n\n${assessmentList}`;
// }

// function generateQuizGeneralResponse(assessments, assessmentTypes, targetDate) {
//   const dateFormatted = targetDate.toLocaleDateString('en-GB');
//   const dayName = weekdayName(targetDate);
  
//   const assessmentList = assessments.slice(0, 5).map(assessment => {
//     const subject = normalizeSubject(assessment.subject);
//     const kindEmoji = assessment.kind === "quiz" ? "🧩" : 
//                      assessment.kind === "assignment" ? "📄" : "📝";
    
//     return `• ${kindEmoji} ${subject} ${assessment.kind} at ${assessment.startTime}${assessment.room ? ` in ${assessment.room}` : ""}`;
//   }).join('\n');

//   return `📋 Today's Assessments (${dayName}, ${dateFormatted}):\n\n${assessmentList}\n\nPlan your study time wisely! 🗓️`;
// }

// function generateUpcomingResponse(assessments, assessmentTypes, queryType) {
//   const assessmentList = assessments.map(assessment => {
//     const assessmentDate = new Date(assessment.date);
//     const dateFormatted = assessmentDate.toLocaleDateString('en-GB');
//     const dayName = weekdayName(assessmentDate);
//     const subject = normalizeSubject(assessment.subject);
//     const kindEmoji = assessment.kind === "quiz" ? "🧩" : 
//                      assessment.kind === "assignment" ? "📄" : "📝";
//     const daysUntil = Math.ceil((assessmentDate - new Date()) / (1000 * 60 * 60 * 24));
    
//     return `• ${kindEmoji} ${subject} ${assessment.kind} - ${dayName} (${dateFormatted}) - ${daysUntil} day${daysUntil !== 1 ? 's' : ''} from now`;
//   }).join('\n');

//   const typeText = getTypeText(assessmentTypes);

//   if (queryType === "TODAY_ASSESSMENTS") {
//     return `🎉 No assessments today! But here are your upcoming ${typeText}:\n\n${assessmentList}\n\nPlan ahead! 📅`;
//   } else {
//     return `📋 Your Upcoming ${typeText.charAt(0).toUpperCase() + typeText.slice(1)}:\n\n${assessmentList}\n\nPlan your study time wisely! 🗓️`;
//   }
// }

// function generateNoAssessmentsResponse(queryType, assessmentTypes, targetSubject, user, targetDate) {
//   const dateFormatted = targetDate.toLocaleDateString('en-GB');
//   const dayName = weekdayName(targetDate);
  
//   const typeText = getTypeText(assessmentTypes);
  
//   if (targetSubject) {
//     // Safe way to get subject name
//     let subjectName = targetSubject;
//     if (CS_SUBJECTS_NORMALIZATION && CS_SUBJECTS_NORMALIZATION[targetSubject]) {
//       subjectName = CS_SUBJECTS_NORMALIZATION[targetSubject][0];
//     }
    
//     switch (queryType) {
//       case "TODAY_ASSESSMENTS":
//         return `🎉 No ${subjectName} ${typeText} today! (${dateFormatted})\n\nYou can focus on other subjects. 📖`;
//       case "TOMORROW_ASSESSMENTS":
//         return `🎉 No ${subjectName} ${typeText} tomorrow! (${dateFormatted})\n\nEnjoy your day! 🌟`;
//       case "YESTERDAY_ASSESSMENTS":
//         return `📭 No ${subjectName} ${typeText} were scheduled for yesterday (${dateFormatted}).`;
//       default:
//         return `🎉 No upcoming ${subjectName} ${typeText} found!\n\nFocus on your current studies. 📖`;
//     }
//   }
  
//   switch (queryType) {
//     case "TODAY_ASSESSMENTS":
//       return `🎉 No ${typeText} today! (${dateFormatted})\n\nYou can focus on your regular coursework. 📚`;
//     case "TOMORROW_ASSESSMENTS":
//       return `🎉 No ${typeText} tomorrow! (${dateFormatted})\n\nPlan your study schedule accordingly. 🗓️`;
//     case "YESTERDAY_ASSESSMENTS":
//       return `📭 No ${typeText} were scheduled for yesterday (${dateFormatted}).`;
//     case "TODAY_AND_UPCOMING":
//       return `🎉 No ${typeText} found for today or upcoming days!\n\nYou can focus on your regular coursework. 📚`;
//     default:
//       return `🎉 No upcoming ${typeText} found for semester ${user.semester}!\n\nYou can focus on your regular coursework.`;
//   }
// }

// // Helper function for assessment advice
// function getAssessmentAdvice(kind) {
//   switch (kind) {
//     case "quiz":
//       return "Good luck on your quiz! 🍀";
//     case "assignment":
//       return "Make sure to submit on time! ⏰";
//     case "test":
//       return "Prepare well for your test! 📚";
//     default:
//       return "You've got this! 💪";
//   }
// }

// // Helper function to get proper type text
// function getTypeText(assessmentTypes) {
//   if (assessmentTypes.length === 1) {
//     if (assessmentTypes[0] === "quiz") return "quizzes";
//     if (assessmentTypes[0] === "test") return "tests";
//     if (assessmentTypes[0] === "assignment") return "assignments";
//   } else if (assessmentTypes.length === 2 && 
//              assessmentTypes.includes("quiz") && 
//              assessmentTypes.includes("test")) {
//     return "quizzes or tests";
//   } else if (assessmentTypes.length === 3) {
//     return "assessments";
//   }
//   return "assessments";
// }

