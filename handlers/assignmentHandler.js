import Schedule from "../models/scheduleModel.js"
import { detectMessageContext, getTargetDateFromMessage, weekdayName } from "../utils/dateTimeHelper.js"
import { normalizeSubject, CS_SUBJECTS_NORMALIZATION } from "../utils/subjectNormalizer.js"
import { askGemini } from "../services/geminiService.js"

export const handleAssignmentQuery = async (user, message) => {
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
    
    console.log(`📋 Assignment Query Analysis:`, {
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
    let targetDate = today;
    
    // Check for today/tomorrow/yesterday queries
    if (/(today|now)/i.test(messageLower)) {
      queryType = "TODAY_ASSIGNMENTS";
      targetDate = today;
    } else if (/(tomorrow|tmrw)/i.test(messageLower)) {
      queryType = "TOMORROW_ASSIGNMENTS";
      targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (/(yesterday)/i.test(messageLower)) {
      queryType = "YESTERDAY_ASSIGNMENTS";
      targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() - 1);
    }
    
    // Check for deadline/due date queries
    if (/(deadline|due|when is|when's|submit|submission)/i.test(messageLower)) {
      queryType = "DEADLINES";
    }
    
    // Check for upcoming queries
    if (/(upcoming|coming|next|future)/i.test(messageLower)) {
      queryType = "UPCOMING";
    }
    
    // Check for overdue queries
    if (/(overdue|late|missed|past)/i.test(messageLower)) {
      queryType = "OVERDUE";
    }
    
    // Check for assigned today queries
    if (/(assigned|given|posted|created)/i.test(messageLower)) {
      queryType = "ASSIGNED_TODAY";
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

    console.log(`🔍 Assignment Query Analysis:`, {
      queryType,
      targetSubject,
      targetDate: targetDate.toLocaleDateString('en-GB')
    });

    // Build query based on analysis
    let assignmentQuery = {
      semester: user.semester,
      className: user.className,
      kind: "assignment"
    };

    // Date filtering based on query type
    switch (queryType) {
      case "TODAY_ASSIGNMENTS":
        // FIXED: Show assignments that are either due today OR were assigned today
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        
        assignmentQuery.$or = [
          { dueDate: { $gte: todayStart, $lte: todayEnd } }, // Due today
          { date: { $gte: todayStart, $lte: todayEnd } }     // Assigned today
        ];
        break;
        
      case "TOMORROW_ASSIGNMENTS":
        const tomorrowStart = new Date(targetDate);
        tomorrowStart.setHours(0, 0, 0, 0);
        const tomorrowEnd = new Date(targetDate);
        tomorrowEnd.setHours(23, 59, 59, 999);
        
        assignmentQuery.$or = [
          { dueDate: { $gte: tomorrowStart, $lte: tomorrowEnd } },
          { date: { $gte: tomorrowStart, $lte: tomorrowEnd } }
        ];
        break;
        
      case "YESTERDAY_ASSIGNMENTS":
        const yesterdayStart = new Date(targetDate);
        yesterdayStart.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date(targetDate);
        yesterdayEnd.setHours(23, 59, 59, 999);
        
        assignmentQuery.$or = [
          { dueDate: { $gte: yesterdayStart, $lte: yesterdayEnd } },
          { date: { $gte: yesterdayStart, $lte: yesterdayEnd } }
        ];
        break;
        
      case "ASSIGNED_TODAY":
        // Only assignments assigned today
        const assignedStart = new Date(today);
        assignedStart.setHours(0, 0, 0, 0);
        const assignedEnd = new Date(today);
        assignedEnd.setHours(23, 59, 59, 999);
        assignmentQuery.date = { $gte: assignedStart, $lte: assignedEnd };
        break;
        
      case "DEADLINES":
        // Get upcoming deadlines (next 30 days)
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        assignmentQuery.dueDate = { $gte: today, $lte: futureDate };
        break;
        
      case "UPCOMING":
        // Get upcoming assignments (next 30 days)
        const upcomingFuture = new Date();
        upcomingFuture.setDate(upcomingFuture.getDate() + 30);
        assignmentQuery.$or = [
          { dueDate: { $gte: today, $lte: upcomingFuture } },
          { date: { $gte: today, $lte: upcomingFuture } }
        ];
        break;
        
      case "OVERDUE":
        // Get overdue assignments
        assignmentQuery.dueDate = { $lt: today };
        break;
        
      default:
        // GENERAL query - check upcoming assignments and assignments from today
        const generalFuture = new Date();
        generalFuture.setDate(generalFuture.getDate() + 7);
        assignmentQuery.$or = [
          { dueDate: { $gte: today, $lte: generalFuture } },
          { date: { $gte: today } } // Any assignments from today onwards
        ];
        break;
    }

    // Add subject filter if specified
    if (targetSubject && CS_SUBJECTS_NORMALIZATION && CS_SUBJECTS_NORMALIZATION[targetSubject]) {
      const subjectVariations = CS_SUBJECTS_NORMALIZATION[targetSubject];
      assignmentQuery.subject = { 
        $in: subjectVariations.map(v => new RegExp(v, 'i'))
      };
    }

    let sortOrder = { dueDate: 1, date: 1 };
    let limit = null;

    // Execute query
    let assignmentsQuery = Schedule.find(assignmentQuery).sort(sortOrder);
    if (limit) {
      assignmentsQuery = assignmentsQuery.limit(limit);
    }
    
    const assignments = await assignmentsQuery;

    console.log(`📝 Found ${assignments.length} assignments:`, 
      assignments.map(a => ({ 
        subject: a.subject,
        title: a.title,
        date: a.date,
        dueDate: a.dueDate,
        formattedDate: a.date ? new Date(a.date).toLocaleDateString('en-GB') : null,
        formattedDueDate: a.dueDate ? new Date(a.dueDate).toLocaleDateString('en-GB') : null,
        submissionStart: a.submissionStart,
        submissionEnd: a.submissionEnd,
        room: a.room
      })));

    // Generate intelligent response
    let reply = "";

    if (assignments.length > 0) {
      switch (queryType) {
        case "TODAY_ASSIGNMENTS":
        case "TOMORROW_ASSIGNMENTS":
        case "YESTERDAY_ASSIGNMENTS":
          reply = generateDateSpecificResponse(assignments, queryType, targetDate, today);
          break;
          
        case "ASSIGNED_TODAY":
          reply = generateAssignedTodayResponse(assignments, today);
          break;
          
        case "DEADLINES":
          reply = generateDeadlinesResponse(assignments, today);
          break;
          
        case "UPCOMING":
          reply = generateUpcomingResponse(assignments, today);
          break;
          
        case "OVERDUE":
          reply = generateOverdueResponse(assignments, today);
          break;
          
        case "SUBJECT_SPECIFIC":
          reply = generateSubjectSpecificResponse(assignments, targetSubject, today);
          break;
          
        default:
          reply = generateGeneralResponse(assignments, today);
          break;
      }
    } else {
      reply = generateNoAssignmentsResponse(queryType, targetSubject, user, targetDate);
    }

    console.log(`📤 Assignment response:`, { 
      queryType,
      assignmentsFound: assignments.length
    });

    return {
      reply: reply.replace(/\n/g, '<br>'),
      intent: "ASSIGNMENT",
      meta: {
        currentDay: context.currentDay,
        currentDate: context.currentDate,
        queryType,
        targetSubject,
        assignmentsCount: assignments.length
      }
    };
  } catch (error) {
    console.error("💥 [Assignment Handler Error]:", error.message);
    return {
      reply: "Sorry, I encountered an error while checking assignments. Please try again.",
      intent: "ERROR"
    };
  }
};

// Response generators for assignment handler
function generateDateSpecificResponse(assignments, queryType, targetDate, today) {
  const dateFormatted = targetDate.toLocaleDateString('en-GB');
  const dayName = weekdayName(targetDate);
  
  let timeContext = "";
  switch (queryType) {
    case "TODAY_ASSIGNMENTS":
      timeContext = "Today";
      break;
    case "TOMORROW_ASSIGNMENTS":
      timeContext = "Tomorrow";
      break;
    case "YESTERDAY_ASSIGNMENTS":
      timeContext = "Yesterday";
      break;
  }
  
  // Separate assignments by type
  const dueToday = assignments.filter(a => {
    const dueDate = new Date(a.dueDate);
    return dueDate.toDateString() === targetDate.toDateString();
  });
  
  const assignedToday = assignments.filter(a => {
    const assignDate = new Date(a.date);
    return assignDate.toDateString() === targetDate.toDateString();
  });

  let response = `📋 ${timeContext}'s Assignments (${dayName}, ${dateFormatted}):\n\n`;

  if (dueToday.length > 0) {
    response += `⏰ Due ${timeContext.toLowerCase()}:\n`;
    response += dueToday.map(assignment => {
      const subject = normalizeSubject(assignment.subject);
      const dueTime = assignment.submissionEnd || "11:59 PM";
      const daysLeft = calculateDaysLeft(assignment.dueDate);
      
      return `• ${subject} - "${assignment.title}"\n  Due: ${dueTime}${assignment.room ? ` in ${assignment.room}` : ""}\n  ${daysLeft}`;
    }).join('\n\n');
    response += '\n\n';
  }

  if (assignedToday.length > 0) {
    response += `📝 Assigned ${timeContext.toLowerCase()}:\n`;
    response += assignedToday.map(assignment => {
      const subject = normalizeSubject(assignment.subject);
      const dueDate = new Date(assignment.dueDate);
      const dueFormatted = dueDate.toLocaleDateString('en-GB');
      const daysLeft = calculateDaysLeft(assignment.dueDate);
      
      return `• ${subject} - "${assignment.title}"\n  Due: ${dueFormatted}\n  ${daysLeft}`;
    }).join('\n\n');
  }

  return response + `\n\n${getAssignmentAdvice(queryType)}`;
}

function generateAssignedTodayResponse(assignments, today) {
  const assignmentList = assignments.map(assignment => {
    const subject = normalizeSubject(assignment.subject);
    const dueDate = new Date(assignment.dueDate);
    const dueFormatted = dueDate.toLocaleDateString('en-GB');
    const daysLeft = calculateDaysLeft(assignment.dueDate);
    
    return `• ${subject} - "${assignment.title}"\n  Due: ${dueFormatted}\n  ${daysLeft}`;
  }).join('\n\n');

  return `📝 Assignments Assigned Today:\n\n${assignmentList}\n\nStart working on these assignments! 🚀`;
}

function generateDeadlinesResponse(assignments, today) {
  const assignmentList = assignments.map(assignment => {
    const subject = normalizeSubject(assignment.subject);
    const dueDate = new Date(assignment.dueDate);
    const dateFormatted = dueDate.toLocaleDateString('en-GB');
    const dayName = weekdayName(dueDate);
    const dueTime = assignment.submissionEnd || "11:59 PM";
    const daysLeft = calculateDaysLeft(assignment.dueDate);
    
    return `• ${subject} - "${assignment.title}"\n  ${dayName} (${dateFormatted}) at ${dueTime}${assignment.room ? ` in ${assignment.room}` : ""}\n  ${daysLeft}`;
  }).join('\n\n');

  return `⏰ Assignment Deadlines:\n\n${assignmentList}\n\nDon't wait until the last minute! 🚀`;
}

function generateUpcomingResponse(assignments, today) {
  const assignmentList = assignments.map(assignment => {
    const subject = normalizeSubject(assignment.subject);
    const eventDate = assignment.dueDate || assignment.date;
    const eventDateObj = new Date(eventDate);
    const dateFormatted = eventDateObj.toLocaleDateString('en-GB');
    const dayName = weekdayName(eventDateObj);
    const dueTime = assignment.submissionEnd || "11:59 PM";
    const daysLeft = calculateDaysLeft(assignment.dueDate);
    const eventType = assignment.dueDate ? "Due" : "Assigned";
    
    return `• ${subject} - "${assignment.title}"\n  ${eventType}: ${dayName} (${dateFormatted}) at ${dueTime}\n  ${daysLeft}`;
  }).join('\n\n');

  return `📅 Upcoming Assignments:\n\n${assignmentList}\n\nPlan your work schedule accordingly! 🗓️`;
}

function generateOverdueResponse(assignments, today) {
  const assignmentList = assignments.map(assignment => {
    const subject = normalizeSubject(assignment.subject);
    const dueDate = new Date(assignment.dueDate);
    const dateFormatted = dueDate.toLocaleDateString('en-GB');
    const daysOverdue = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
    
    return `• ${subject} - "${assignment.title}"\n  Was due: ${dateFormatted}\n  ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue ⚠️`;
  }).join('\n\n');

  return `🚨 Overdue Assignments:\n\n${assignmentList}\n\nSubmit these as soon as possible! ⏰`;
}

function generateSubjectSpecificResponse(assignments, targetSubject, today) {
  // Safe way to get subject name
  let subjectName = targetSubject;
  if (CS_SUBJECTS_NORMALIZATION && CS_SUBJECTS_NORMALIZATION[targetSubject]) {
    subjectName = CS_SUBJECTS_NORMALIZATION[targetSubject][0];
  }
  
  const assignmentList = assignments.map(assignment => {
    const dueDate = new Date(assignment.dueDate);
    const dateFormatted = dueDate.toLocaleDateString('en-GB');
    const dayName = weekdayName(dueDate);
    const dueTime = assignment.submissionEnd || "11:59 PM";
    const daysLeft = calculateDaysLeft(assignment.dueDate);
    
    return `• "${assignment.title}"\n  ${dayName} (${dateFormatted}) at ${dueTime}${assignment.room ? ` in ${assignment.room}` : ""}\n  ${daysLeft}`;
  }).join('\n\n');

  return `📚 ${subjectName} Assignments:\n\n${assignmentList}\n\nStay on top of your deadlines! ✅`;
}

function generateGeneralResponse(assignments, today) {
  const assignmentList = assignments.slice(0, 5).map(assignment => {
    const subject = normalizeSubject(assignment.subject);
    const dueDate = new Date(assignment.dueDate);
    const dateFormatted = dueDate.toLocaleDateString('en-GB');
    const dayName = weekdayName(dueDate);
    const dueTime = assignment.submissionEnd || "11:59 PM";
    const daysLeft = calculateDaysLeft(assignment.dueDate);
    
    return `• ${subject} - "${assignment.title}"\n  ${dayName} (${dateFormatted}) at ${dueTime}\n  ${daysLeft}`;
  }).join('\n\n');

  return `📋 Your Assignments:\n\n${assignmentList}\n\nPlan your submission schedule! 📅`;
}

function generateNoAssignmentsResponse(queryType, targetSubject, user, targetDate) {
  const dateFormatted = targetDate.toLocaleDateString('en-GB');
  const dayName = weekdayName(targetDate);
  
  if (targetSubject) {
    let subjectName = targetSubject;
    if (CS_SUBJECTS_NORMALIZATION && CS_SUBJECTS_NORMALIZATION[targetSubject]) {
      subjectName = CS_SUBJECTS_NORMALIZATION[targetSubject][0];
    }
    
    switch (queryType) {
      case "TODAY_ASSIGNMENTS":
        return `🎉 No ${subjectName} assignments due or assigned today! (${dateFormatted})\n\nYou can focus on other subjects. 📖`;
      case "TOMORROW_ASSIGNMENTS":
        return `🎉 No ${subjectName} assignments due or assigned tomorrow! (${dateFormatted})\n\nEnjoy your day! 🌟`;
      case "YESTERDAY_ASSIGNMENTS":
        return `📭 No ${subjectName} assignments were due or assigned yesterday (${dateFormatted}).`;
      case "OVERDUE":
        return `✅ No ${subjectName} assignments are overdue!\n\nGreat job staying on track! 🎯`;
      default:
        return `🎉 No ${subjectName} assignments found!\n\nFocus on your current studies. 📖`;
    }
  }
  
  switch (queryType) {
    case "TODAY_ASSIGNMENTS":
      return `🎉 No assignments due or assigned today! (${dateFormatted})\n\nYou can focus on other coursework. 📚`;
    case "TOMORROW_ASSIGNMENTS":
      return `🎉 No assignments due or assigned tomorrow! (${dateFormatted})\n\nPlan your study schedule accordingly. 🗓️`;
    case "YESTERDAY_ASSIGNMENTS":
      return `📭 No assignments were due or assigned yesterday (${dateFormatted}).`;
    case "OVERDUE":
      return `✅ No assignments are overdue!\n\nExcellent work staying on top of your deadlines! 🎉`;
    case "DEADLINES":
      return `🎉 No assignment deadlines in the next 30 days!\n\nYou're up to date! ✅`;
    case "ASSIGNED_TODAY":
      return `📝 No new assignments assigned today!\n\nCheck back tomorrow for new assignments. 📅`;
    default:
      return `🎉 No assignments found for semester ${user.semester}!\n\nYou can focus on your regular coursework.`;
  }
}

// Helper functions
function calculateDaysLeft(dueDate) {
  if (!dueDate) return "No due date set";
  
  const now = new Date();
  const due = new Date(dueDate);
  const timeDiff = due - now;
  const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  
  if (daysLeft < 0) return "🚨 OVERDUE! Submit immediately!";
  if (daysLeft === 0) return "⏰ Due today! Submit now!";
  if (daysLeft === 1) return "⏳ Due tomorrow! Finish up!";
  if (daysLeft <= 3) return `⚠️ ${daysLeft} days left - Urgent!`;
  if (daysLeft <= 7) return `⏰ ${daysLeft} days left`;
  return `📅 ${daysLeft} days left`;
}

function getAssignmentAdvice(queryType) {
  switch (queryType) {
    case "TODAY_ASSIGNMENTS":
      return "⏰ Submit assignments due today and start working on new ones!";
    case "TOMORROW_ASSIGNMENTS":
      return "📝 Prepare to submit assignments due tomorrow!";
    case "YESTERDAY_ASSIGNMENTS":
      return "✅ These assignments were due or assigned yesterday.";
    default:
      return "📚 Stay on top of your assignments!";
  }
}