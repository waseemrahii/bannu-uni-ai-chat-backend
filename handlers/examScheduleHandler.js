import Schedule from "../models/scheduleModel.js"
import { detectMessageContext, getDateRangeFromMessage, weekdayName } from "../utils/dateTimeHelper.js"
import { normalizeSubject, CS_SUBJECTS_NORMALIZATION } from "../utils/subjectNormalizer.js"
import { askGemini } from "../services/geminiService.js"

export const handleExamScheduleQuery = async (user, message) => {
  try {
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
    
    console.log(`📝 Exam Query Analysis:`, {
      message,
      currentDate: context.currentDate,
      userSemester: user.semester,
      userClass: user.className
    });

    // Analyze the message type
    const messageLower = message.toLowerCase();
    
    // Determine query type
    let queryType = "GENERAL";
    let targetSubject = null;
    let specificDate = null;
    
    // Check for specific date queries
    if (/(\d{1,2})\s*(date|oct|nov|dec|jan|feb|mar|apr|may|jun|jul|aug|sep)/i.test(message)) {
      const dateMatch = message.match(/(\d{1,2})/);
      if (dateMatch) {
        const day = parseInt(dateMatch[1]);
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        specificDate = new Date(currentYear, currentMonth, day);
        queryType = "SPECIFIC_DATE";
      }
    }
    
    // Check for subject-specific queries - ONLY if CS_SUBJECTS_NORMALIZATION exists
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
    
    // Check for sequence queries (first, next, after)
    if (/(first|next|upcoming|coming)\s+(exam|paper)/i.test(message)) {
      queryType = "SEQUENCE";
    }
    
    // Check for timetable/datesheet queries
    if (/(date\s*sheet|timetable|schedule|all\s+exams)/i.test(message)) {
      queryType = "TIMETABLE";
    }

    console.log(`🔍 Query Analysis:`, {
      queryType,
      targetSubject,
      specificDate: specificDate ? specificDate.toLocaleDateString('en-GB') : null
    });

    // Build query based on analysis
    let examQuery = {
      semester: user.semester,
      className: user.className,
      kind: "exam"
    };

    let sortOrder = { date: 1, startTime: 1 };
    let limit = null;

    switch (queryType) {
      case "SPECIFIC_DATE":
        if (specificDate) {
          const start = new Date(specificDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(specificDate);
          end.setHours(23, 59, 59, 999);
          examQuery.date = { $gte: start, $lte: end };
        }
        break;
        
      case "SUBJECT_SPECIFIC":
        if (targetSubject && CS_SUBJECTS_NORMALIZATION && CS_SUBJECTS_NORMALIZATION[targetSubject]) {
          // Use regex to match subject variations
          const subjectVariations = CS_SUBJECTS_NORMALIZATION[targetSubject];
          examQuery.subject = { 
            $in: subjectVariations.map(v => new RegExp(v, 'i'))
          };
        }
        break;
        
      case "SEQUENCE":
        // Get next/first exam
        examQuery.date = { $gte: today };
        limit = 1;
        break;
        
      case "TIMETABLE":
        // Get all upcoming exams
        examQuery.date = { $gte: today };
        break;
        
      default:
        // GENERAL query - get exams for reasonable future (next 2 months)
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + 2);
        examQuery.date = { $gte: today, $lte: futureDate };
        break;
    }

    // Execute query
    let examsQuery = Schedule.find(examQuery).sort(sortOrder);
    if (limit) {
      examsQuery = examsQuery.limit(limit);
    }
    
    const exams = await examsQuery;

    console.log(`📋 Found ${exams.length} exams:`, 
      exams.map(e => ({ 
        subject: e.subject,
        date: e.date,
        formattedDate: new Date(e.date).toLocaleDateString('en-GB'),
        startTime: e.startTime,
        room: e.room
      })));

    // Generate intelligent response
    let reply = "";

    if (exams.length > 0) {
      // Build response based on query type
      switch (queryType) {
        case "SPECIFIC_DATE":
          reply = generateSpecificDateResponse(exams, specificDate, todayFormatted);
          break;
          
        case "SUBJECT_SPECIFIC":
          reply = generateSubjectResponse(exams, targetSubject, todayFormatted);
          break;
          
        case "SEQUENCE":
          reply = generateSequenceResponse(exams, messageLower, todayFormatted);
          break;
          
        case "TIMETABLE":
          reply = generateTimetableResponse(exams, todayFormatted);
          break;
          
        default:
          reply = generateGeneralResponse(exams, message, todayFormatted);
          break;
      }
    } else {
      // No exams found - provide helpful information
      reply = generateNoExamsResponse(queryType, targetSubject, specificDate, user);
    }

    console.log(`📤 Exam response:`, { 
      queryType,
      examsFound: exams.length,
      responseLength: reply.length
    });

    return {
      reply: reply.replace(/\n/g, '<br>'),
      intent: "EXAM_SCHEDULE",
      meta: {
        currentDay: context.currentDay,
        currentDate: context.currentDate,
        queryType,
        targetSubject,
        examsCount: exams.length
      }
    };
  } catch (error) {
    console.error("💥 [Exam Schedule Error]:", error.message);
    return {
      reply: "Sorry, I encountered an error while checking the exam schedule. Please try again.",
      intent: "ERROR"
    };
  }
};

// Response generators for different query types
function generateSpecificDateResponse(exams, specificDate, todayFormatted) {
  const dateFormatted = specificDate.toLocaleDateString('en-GB');
  const dayName = weekdayName(specificDate);
  
  if (exams.length > 0) {
    const examList = exams.map(exam => {
      const subject = normalizeSubject(exam.subject);
      return `• ${subject} at ${exam.startTime}${exam.room ? ` in ${exam.room}` : ""}${exam.title ? ` - ${exam.title}` : ""}`;
    }).join('\n');
    
    return `📝 Exams on ${dayName} (${dateFormatted}):\n\n${examList}`;
  } else {
    return `📭 No exams scheduled for ${dayName} (${dateFormatted}).\n\nYou can focus on other studies that day! 📚`;
  }
}

function generateSubjectResponse(exams, targetSubject, todayFormatted) {
  // Safe way to get subject name
  let subjectName = targetSubject;
  if (CS_SUBJECTS_NORMALIZATION && CS_SUBJECTS_NORMALIZATION[targetSubject]) {
    subjectName = CS_SUBJECTS_NORMALIZATION[targetSubject][0];
  }
  
  if (exams.length > 0) {
    const examList = exams.map(exam => {
      const examDate = new Date(exam.date);
      const dateFormatted = examDate.toLocaleDateString('en-GB');
      const dayName = weekdayName(examDate);
      return `• ${dayName} (${dateFormatted}) at ${exam.startTime}${exam.room ? ` in ${exam.room}` : ""}`;
    }).join('\n');
    
    return `📝 ${subjectName} Exam Schedule:\n\n${examList}\n\nStart preparing early! 💪`;
  } else {
    return `📭 No ${subjectName} exams found in the upcoming schedule.\n\nCheck with your department for the exam dates.`;
  }
}

function generateSequenceResponse(exams, message, todayFormatted) {
  if (exams.length > 0) {
    const nextExam = exams[0];
    const examDate = new Date(nextExam.date);
    const dateFormatted = examDate.toLocaleDateString('en-GB');
    const dayName = weekdayName(examDate);
    const subject = normalizeSubject(nextExam.subject);
    const daysUntil = Math.ceil((examDate - new Date()) / (1000 * 60 * 60 * 24));
    
    let response = `🎯 Your ${message.includes('first') ? 'first' : 'next'} exam:\n\n`;
    response += `📝 ${subject} on ${dayName} (${dateFormatted}) at ${nextExam.startTime}`;
    response += `${nextExam.room ? ` in ${nextExam.room}` : ""}`;
    response += `\n\n⏰ ${daysUntil} day${daysUntil !== 1 ? 's' : ''} until the exam - Start preparing! 📚`;
    
    return response;
  } else {
    return `🎉 No upcoming exams found! \n\nYou can focus on your current studies and assignments.`;
  }
}

function generateTimetableResponse(exams, todayFormatted) {
  if (exams.length > 0) {
    const examList = exams.map(exam => {
      const examDate = new Date(exam.date);
      const dateFormatted = examDate.toLocaleDateString('en-GB');
      const dayName = weekdayName(examDate);
      const subject = normalizeSubject(exam.subject);
      return `• ${dayName} (${dateFormatted}): ${subject} at ${exam.startTime}${exam.room ? ` in ${exam.room}` : ""}`;
    }).join('\n');
    
    return `📅 Your Exam Timetable:\n\n${examList}\n\nPlan your study schedule accordingly! 🗓️`;
  } else {
    return `📭 No exam timetable available yet.\n\nCheck with your department for the exam schedule.`;
  }
}

function generateGeneralResponse(exams, message, todayFormatted) {
  if (exams.length > 0) {
    // Group exams by proximity
    const todayExams = exams.filter(exam => 
      new Date(exam.date).toLocaleDateString('en-GB') === todayFormatted
    );
    
    const tomorrowExams = exams.filter(exam => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return new Date(exam.date).toLocaleDateString('en-GB') === tomorrow.toLocaleDateString('en-GB');
    });
    
    const upcomingExams = exams.filter(exam => {
      const examDate = new Date(exam.date);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return examDate > tomorrow;
    }).slice(0, 3); // Show only next 3 upcoming

    let response = "📝 Here's your exam information:\n\n";
    
    if (todayExams.length > 0) {
      response += "🎯 Today:\n";
      response += todayExams.map(exam => 
        `• ${normalizeSubject(exam.subject)} at ${exam.startTime}${exam.room ? ` in ${exam.room}` : ""}`
      ).join('\n') + "\n\n";
    }
    
    if (tomorrowExams.length > 0) {
      response += "📅 Tomorrow:\n";
      response += tomorrowExams.map(exam => 
        `• ${normalizeSubject(exam.subject)} at ${exam.startTime}${exam.room ? ` in ${exam.room}` : ""}`
      ).join('\n') + "\n\n";
    }
    
    if (upcomingExams.length > 0) {
      response += "🗓️ Upcoming:\n";
      response += upcomingExams.map(exam => {
        const examDate = new Date(exam.date);
        const dateFormatted = examDate.toLocaleDateString('en-GB');
        const dayName = weekdayName(examDate);
        return `• ${dayName} (${dateFormatted}): ${normalizeSubject(exam.subject)} at ${exam.startTime}`;
      }).join('\n');
    }
    
    return response;
  } else {
    return `📭 No exams found in the upcoming schedule.\n\nFocus on your current studies and check back later for exam updates! 📚`;
  }
}

function generateNoExamsResponse(queryType, targetSubject, specificDate, user) {
  switch (queryType) {
    case "SPECIFIC_DATE":
      const dateFormatted = specificDate.toLocaleDateString('en-GB');
      const dayName = weekdayName(specificDate);
      return `📭 No exams scheduled for ${dayName} (${dateFormatted}).\n\nYou can focus on other studies that day!`;
      
    case "SUBJECT_SPECIFIC":
      // Safe way to get subject name
      let subjectName = targetSubject;
      if (CS_SUBJECTS_NORMALIZATION && CS_SUBJECTS_NORMALIZATION[targetSubject]) {
        subjectName = CS_SUBJECTS_NORMALIZATION[targetSubject][0];
      }
      return `📭 No ${subjectName} exams found.\n\nCheck with your department for the exam schedule.`;
      
    default:
      return `🎉 No upcoming exams found for semester ${user.semester}!\n\nFocus on your current studies and assignments. 📚`;
  }
}
