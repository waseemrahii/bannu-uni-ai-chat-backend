// import Schedule from "../models/scheduleModel.js"
// import { detectMessageContext, getTargetDateFromMessage, weekdayName } from "../utils/dateTimeHelper.js"
// import { normalizeSubject } from "../utils/subjectNormalizer.js"
// import { askGemini } from "../services/geminiService.js"
// import { formatClassStatus } from "../utils/timeHelper.js"

// export const handleClassScheduleQuery = async (user, message) => {
//   const context = detectMessageContext()
//   const targetDate = getTargetDateFromMessage(message, context.now)
//   const targetDay = weekdayName(targetDate)
//   const targetDateFormatted = targetDate.toLocaleDateString("en-GB")
  
//   // Create date range for query
//   const start = new Date(targetDate)
//   start.setHours(0, 0, 0, 0)
//   const end = new Date(targetDate)
//   end.setHours(23, 59, 59, 999)

//   // Query classes for the target day/date
//   const scheduleQuery = {
//     semester: user.semester,
//     $or: [
//       { day: targetDay }, // Weekly schedule
//       { date: { $gte: start, $lte: end } } // Specific date
//     ]
//   }

//   if (user.className) {
//     scheduleQuery.className = user.className
//   }

//   let data = await Schedule.find(scheduleQuery).sort({ startTime: 1 })

//   // Handle no results
//   if (!data.length) {
//     const isToday = targetDate.toDateString() === context.now.toDateString()
//     const isTomorrow = targetDate.toDateString() === new Date(context.now.getTime() + 86400000).toDateString()
//     const isYesterday = targetDate.toDateString() === new Date(context.now.getTime() - 86400000).toDateString()
    
//     let timeContext = ""
//     if (isToday) timeContext = "today"
//     else if (isTomorrow) timeContext = "tomorrow"
//     else if (isYesterday) timeContext = "yesterday"
//     else timeContext = `on ${targetDay}`

//     return {
//       reply: `No classes found ${timeContext} (${targetDateFormatted}) for semester ${user.semester}.`,
//       intent: "CLASSES",
//       meta: {
//         currentDay: context.currentDay,
//         currentDate: context.currentDate,
//         targetDay,
//         targetDate: targetDateFormatted,
//         messageTime: context.currentTime
//       }
//     }
//   }

//   // Format classes information
//   const formattedClasses = data.map(cls => {
//     const subject = normalizeSubject(cls.subject)
//     const status = formatClassStatus(targetDate, cls.startTime, cls.endTime)
//     return `${subject} (${cls.kind}) — ${cls.startTime} to ${cls.endTime}${cls.room ? ` in ${cls.room}` : ""} — ${status}`
//   }).join("\n• ")

//   // Generate AI response
//   const prompt = `
// You are a helpful university assistant.
// Student asked: "${message}"
// Current context: Today is ${context.currentDay} ${context.currentDate}, time is ${context.currentTime}

// Schedule for ${targetDay} (${targetDateFormatted}):
// ${formattedClasses}

// Write a short natural answer for the student (2-3 lines).
// `
//   const aiText = await askGemini(prompt)
//   const clean = aiText?.trim() || `Classes for ${targetDay} (${targetDateFormatted}):\n• ${formattedClasses}`

//   return {
//     reply: clean,
//     intent: "CLASSES",
//     meta: {
//       currentDay: context.currentDay,
//       currentDate: context.currentDate,
//       targetDay,
//       targetDate: targetDateFormatted,
//       messageTime: context.currentTime,
//       classesCount: data.length
//     }
//   }
// }


///////////today 
import Schedule from "../models/scheduleModel.js"
import { detectMessageContext, getTargetDateFromMessage, getDateRangeFromMessage, weekdayName, parseTimeToMinutes } from "../utils/dateTimeHelper.js"
import { normalizeSubject, CS_SUBJECTS_NORMALIZATION } from "../utils/subjectNormalizer.js"
import { askGemini } from "../services/geminiService.js"
import { formatClassStatus } from "../utils/timeHelper.js"

export const handleClassScheduleQuery = async (user, message) => {
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
    
    console.log(`📝 Class Query Analysis:`, {
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
    let isCurrentNextQuery = false;
    
    // Check for current/next class queries
    if (/(current|now|ongoing|running|present)/i.test(messageLower)) {
      queryType = "CURRENT_CLASS";
      isCurrentNextQuery = true;
    } else if (/(next|upcoming|coming|after)/i.test(messageLower)) {
      queryType = "NEXT_CLASS";
      isCurrentNextQuery = true;
    }
    
    // Check for specific date queries
    if (!isCurrentNextQuery && /(\d{1,2})\s*(date|oct|nov|dec|jan|feb|mar|apr|may|jun|jul|aug|sep)/i.test(message)) {
      const dateMatch = message.match(/(\d{1,2})/);
      if (dateMatch) {
        const day = parseInt(dateMatch[1]);
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        specificDate = new Date(currentYear, currentMonth, day);
        queryType = "SPECIFIC_DATE";
      }
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
    
    // Check for timetable queries
    if (/(timetable|schedule|all\s+classes|weekly|routine)/i.test(messageLower)) {
      queryType = "TIMETABLE";
    }
    
    // Check for day-specific queries
    if (/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(messageLower)) {
      queryType = "DAY_SPECIFIC";
    }
    
    // Check for today/tomorrow/yesterday
    if (/(today|now)/i.test(messageLower) && !isCurrentNextQuery) {
      queryType = "TODAY_CLASSES";
    } else if (/(tomorrow|tmrw)/i.test(messageLower)) {
      queryType = "TOMORROW_CLASSES";
    } else if (/(yesterday)/i.test(messageLower)) {
      queryType = "YESTERDAY_CLASSES";
    }

    console.log(`🔍 Class Query Analysis:`, {
      queryType,
      targetSubject,
      specificDate: specificDate ? specificDate.toLocaleDateString('en-GB') : null,
      isCurrentNextQuery
    });

    // Build query based on analysis
    let classQuery = {
      semester: user.semester,
      className: user.className,
      kind: { $in: ["class", "lecture", "lab", "tutorial"] }
    };

    let sortOrder = { date: 1, startTime: 1 };
    let limit = null;
    let targetDate = today;

    switch (queryType) {
      case "CURRENT_CLASS":
        // Get classes happening right now
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 8);
        classQuery.$or = [
          { 
            day: weekdayName(now),
            startTime: { $lte: currentTime },
            endTime: { $gte: currentTime }
          },
          {
            date: { 
              $gte: new Date(now.setHours(0, 0, 0, 0)),
              $lte: new Date(now.setHours(23, 59, 59, 999))
            },
            startTime: { $lte: currentTime },
            endTime: { $gte: currentTime }
          }
        ];
        break;
        
      case "NEXT_CLASS":
        // Get next upcoming class
        targetDate = today;
        classQuery.$or = [
          { 
            day: weekdayName(targetDate),
            startTime: { $gt: context.currentTime }
          },
          {
            date: { 
              $gte: new Date(targetDate.setHours(0, 0, 0, 0)),
              $lte: new Date(targetDate.setHours(23, 59, 59, 999))
            },
            startTime: { $gt: context.currentTime }
          }
        ];
        sortOrder = { startTime: 1 };
        limit = 1;
        break;
        
      case "SPECIFIC_DATE":
        if (specificDate) {
          targetDate = specificDate;
          const start = new Date(targetDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(targetDate);
          end.setHours(23, 59, 59, 999);
          classQuery.$or = [
            { day: weekdayName(targetDate) },
            { date: { $gte: start, $lte: end } }
          ];
        }
        break;
        
      case "SUBJECT_SPECIFIC":
        if (targetSubject && CS_SUBJECTS_NORMALIZATION && CS_SUBJECTS_NORMALIZATION[targetSubject]) {
          const subjectVariations = CS_SUBJECTS_NORMALIZATION[targetSubject];
          classQuery.subject = { 
            $in: subjectVariations.map(v => new RegExp(v, 'i'))
          };
          // Get upcoming classes for this subject
          classQuery.$or = [
            { day: { $exists: true } },
            { date: { $gte: today } }
          ];
        }
        break;
        
      case "TIMETABLE":
        // Get weekly schedule
        classQuery.day = { $exists: true };
        sortOrder = { day: 1, startTime: 1 };
        break;
        
      case "DAY_SPECIFIC":
        const dayMatch = messageLower.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
        if (dayMatch) {
          const targetDay = dayMatch[0].charAt(0).toUpperCase() + dayMatch[0].slice(1);
          classQuery.day = targetDay;
        }
        break;
        
      case "TODAY_CLASSES":
        targetDate = today;
        classQuery.$or = [
          { day: weekdayName(targetDate) },
          { 
            date: { 
              $gte: new Date(targetDate.setHours(0, 0, 0, 0)),
              $lte: new Date(targetDate.setHours(23, 59, 59, 999))
            }
          }
        ];
        break;
        
      case "TOMORROW_CLASSES":
        targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + 1);
        classQuery.$or = [
          { day: weekdayName(targetDate) },
          { 
            date: { 
              $gte: new Date(targetDate.setHours(0, 0, 0, 0)),
              $lte: new Date(targetDate.setHours(23, 59, 59, 999))
            }
          }
        ];
        break;
        
      case "YESTERDAY_CLASSES":
        targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() - 1);
        classQuery.$or = [
          { day: weekdayName(targetDate) },
          { 
            date: { 
              $gte: new Date(targetDate.setHours(0, 0, 0, 0)),
              $lte: new Date(targetDate.setHours(23, 59, 59, 999))
            }
          }
        ];
        break;
        
      default:
        // GENERAL query - get today's classes
        targetDate = today;
        classQuery.$or = [
          { day: weekdayName(targetDate) },
          { 
            date: { 
              $gte: new Date(targetDate.setHours(0, 0, 0, 0)),
              $lte: new Date(targetDate.setHours(23, 59, 59, 999))
            }
          }
        ];
        break;
    }

    // Execute query
    let classesQuery = Schedule.find(classQuery).sort(sortOrder);
    if (limit) {
      classesQuery = classesQuery.limit(limit);
    }
    
    const classes = await classesQuery;

    console.log(`📋 Found ${classes.length} classes:`, 
      classes.map(c => ({ 
        subject: c.subject,
        day: c.day,
        date: c.date,
        startTime: c.startTime,
        endTime: c.endTime,
        room: c.room,
        kind: c.kind
      })));

    // Generate intelligent response
    let reply = "";

    if (classes.length > 0) {
      // Build response based on query type
      switch (queryType) {
        case "CURRENT_CLASS":
          reply = generateCurrentClassResponse(classes, context);
          break;
          
        case "NEXT_CLASS":
          reply = generateNextClassResponse(classes, context);
          break;
          
        case "SPECIFIC_DATE":
          reply = generateSpecificDateResponse(classes, specificDate);
          break;
          
        case "SUBJECT_SPECIFIC":
          reply = generateSubjectResponse(classes, targetSubject);
          break;
          
        case "TIMETABLE":
          reply = generateTimetableResponse(classes, user);
          break;
          
        case "DAY_SPECIFIC":
          reply = generateDaySpecificResponse(classes, messageLower);
          break;
          
        default:
          reply = generateGeneralResponse(classes, queryType, targetDate, context);
          break;
      }
    } else {
      // No classes found - provide helpful information
      reply = generateNoClassesResponse(queryType, targetSubject, specificDate, user, targetDate);
    }

    console.log(`📤 Class response:`, { 
      queryType,
      classesFound: classes.length,
      responseLength: reply.length
    });

    return {
      reply: reply.replace(/\n/g, '<br>'),
      intent: "CLASS_SCHEDULE",
      meta: {
        currentDay: context.currentDay,
        currentDate: context.currentDate,
        queryType,
        targetSubject,
        classesCount: classes.length
      }
    };
  } catch (error) {
    console.error("💥 [Class Schedule Error]:", error.message);
    return {
      reply: "Sorry, I encountered an error while checking the class schedule. Please try again.",
      intent: "ERROR"
    };
  }
};

// Response generators for different query types
function generateCurrentClassResponse(classes, context) {
  const currentClass = classes[0];
  const subject = normalizeSubject(currentClass.subject);
  
  // Use the proper formatClassStatus function
  const classDate = currentClass.date ? new Date(currentClass.date) : new Date();
  const status = formatClassStatus(classDate, currentClass.startTime, currentClass.endTime);
  
  return `🎯 Currently Ongoing:\n\n📚 ${subject} (${currentClass.kind})\n⏰ ${currentClass.startTime} - ${currentClass.endTime}${currentClass.room ? `\n📍 ${currentClass.room}` : ""}\n\n${status}\n\nFocus on your class! 📖`;
}

function generateNextClassResponse(classes, context) {
  const nextClass = classes[0];
  const subject = normalizeSubject(nextClass.subject);
  const classDate = nextClass.date ? new Date(nextClass.date) : new Date();
  const dayName = weekdayName(classDate);
  
  const timeUntil = calculateTimeUntil(nextClass.startTime, context);
  
  let response = `⏭️ Your Next Class:\n\n📚 ${subject} (${nextClass.kind})\n📅 ${dayName}\n⏰ ${nextClass.startTime} - ${nextClass.endTime}${nextClass.room ? `\n📍 ${nextClass.room}` : ""}`;
  
  if (timeUntil) {
    response += `\n\n⏳ ${timeUntil}`;
  }
  
  return response;
}

function generateSpecificDateResponse(classes, specificDate) {
  const dateFormatted = specificDate.toLocaleDateString('en-GB');
  const dayName = weekdayName(specificDate);
  
  const classList = classes.map(cls => {
    const subject = normalizeSubject(cls.subject);
    return `• ${subject} (${cls.kind}) — ${cls.startTime} to ${cls.endTime}${cls.room ? ` in ${cls.room}` : ""}`;
  }).join('\n');
  
  return `📅 Classes on ${dayName} (${dateFormatted}):\n\n${classList}\n\nPlan your day accordingly! 🗓️`;
}

function generateSubjectResponse(classes, targetSubject) {
  // Safe way to get subject name
  let subjectName = targetSubject;
  if (CS_SUBJECTS_NORMALIZATION && CS_SUBJECTS_NORMALIZATION[targetSubject]) {
    subjectName = CS_SUBJECTS_NORMALIZATION[targetSubject][0];
  }
  
  const classList = classes.map(cls => {
    const day = cls.day || weekdayName(cls.date);
    return `• ${day}: ${cls.startTime} - ${cls.endTime} (${cls.kind})${cls.room ? ` in ${cls.room}` : ""}`;
  }).join('\n');
  
  return `📚 ${subjectName} Class Schedule:\n\n${classList}\n\nStay consistent with your attendance! ✅`;
}

function generateTimetableResponse(classes, user) {
  // Group classes by day
  const classesByDay = {};
  classes.forEach(cls => {
    const day = cls.day;
    if (!classesByDay[day]) {
      classesByDay[day] = [];
    }
    classesByDay[day].push(cls);
  });
  
  let response = `📅 Weekly Class Timetable (Semester ${user.semester}):\n\n`;
  
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  days.forEach(day => {
    if (classesByDay[day]) {
      response += `📌 ${day}:\n`;
      classesByDay[day].forEach(cls => {
        const subject = normalizeSubject(cls.subject);
        response += `   • ${subject} (${cls.kind}) — ${cls.startTime} to ${cls.endTime}${cls.room ? ` in ${cls.room}` : ""}\n`;
      });
      response += '\n';
    }
  });
  
  return response + "Plan your week effectively! 🗓️";
}

function generateDaySpecificResponse(classes, message) {
  const dayMatch = message.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
  const dayName = dayMatch[0].charAt(0).toUpperCase() + dayMatch[0].slice(1);
  
  const classList = classes.map(cls => {
    const subject = normalizeSubject(cls.subject);
    return `• ${subject} (${cls.kind}) — ${cls.startTime} to ${cls.endTime}${cls.room ? ` in ${cls.room}` : ""}`;
  }).join('\n');
  
  return `📅 Classes on ${dayName}:\n\n${classList}\n\nMake the most of your ${dayName}! 💪`;
}

function generateGeneralResponse(classes, queryType, targetDate, context) {
  const dateFormatted = targetDate.toLocaleDateString('en-GB');
  const dayName = weekdayName(targetDate);
  
  let timeContext = "";
  switch (queryType) {
    case "TODAY_CLASSES":
      timeContext = "Today";
      break;
    case "TOMORROW_CLASSES":
      timeContext = "Tomorrow";
      break;
    case "YESTERDAY_CLASSES":
      timeContext = "Yesterday";
      break;
    default:
      timeContext = `On ${dayName} (${dateFormatted})`;
  }
  
  const classList = classes.map(cls => {
    const subject = normalizeSubject(cls.subject);
    
    // For past dates (yesterday), don't show status - just show they happened
    const isPastDate = targetDate < new Date().setHours(0, 0, 0, 0);
    
    if (isPastDate) {
      return `• ${subject} (${cls.kind}) — ${cls.startTime} to ${cls.endTime}${cls.room ? ` in ${cls.room}` : ""}`;
    } else {
      // For today/future, use the proper status
      const classDate = cls.date ? new Date(cls.date) : targetDate;
      const status = formatClassStatus(classDate, cls.startTime, cls.endTime);
      return `• ${subject} (${cls.kind}) — ${cls.startTime} to ${cls.endTime}${cls.room ? ` in ${cls.room}` : ""} — ${status}`;
    }
  }).join('\n');
  
  return `📚 ${timeContext}'s Classes:\n\n${classList}\n\nHave a productive day! 🎯`;
}

function generateNoClassesResponse(queryType, targetSubject, specificDate, user, targetDate) {
  const dateFormatted = targetDate.toLocaleDateString('en-GB');
  const dayName = weekdayName(targetDate);
  
  switch (queryType) {
    case "CURRENT_CLASS":
      return `🎉 No classes currently running!\n\nYou can use this time for self-study or break. 📚`;
      
    case "NEXT_CLASS":
      return `🎉 No more classes scheduled for today!\n\nYou're free for the rest of the day. Enjoy! 🎊`;
      
    case "SPECIFIC_DATE":
      return `📭 No classes scheduled for ${dayName} (${dateFormatted}).\n\nIt's a free day! Use it productively. 🌟`;
      
    case "SUBJECT_SPECIFIC":
      // Safe way to get subject name
      let subjectName = targetSubject;
      if (CS_SUBJECTS_NORMALIZATION && CS_SUBJECTS_NORMALIZATION[targetSubject]) {
        subjectName = CS_SUBJECTS_NORMALIZATION[targetSubject][0];
      }
      return `📭 No ${subjectName} classes found in the schedule.\n\nCheck with your department for any updates.`;
      
    case "TIMETABLE":
      return `📭 No class timetable available for semester ${user.semester}.\n\nPlease check with your department.`;
      
    case "TODAY_CLASSES":
      return `🎉 No classes today! (${dateFormatted})\n\nUse this day for self-study, projects, or well-deserved rest! 📚`;
      
    case "TOMORROW_CLASSES":
      return `🎉 No classes tomorrow! (${dateFormatted})\n\nPlan your free day in advance! 🗓️`;
      
    case "YESTERDAY_CLASSES":
      return `📭 No classes were scheduled for yesterday (${dateFormatted}).`;
      
    default:
      return `📭 No classes found for ${dayName} (${dateFormatted}).\n\nCheck your schedule or contact your department.`;
  }
}

// Helper function to calculate time until next class
function calculateTimeUntil(classTime, context) {
  const now = new Date();
  
  // Fix invalid time format before parsing
  const cleanTime = classTime.replace('!', '1'); // Fix "!1:00 AM" to "11:00 AM"
  
  // Parse the time using the same logic as formatClassStatus
  const parseTime = (t) => {
    if (!t) return [0, 0];
    const match = t.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
    if (!match) return [0, 0];
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]) || 0;
    const meridian = (match[3] || "").toUpperCase();
    if (meridian === "PM" && hours !== 12) hours += 12;
    if (meridian === "AM" && hours === 12) hours = 0;
    return [hours, minutes];
  };

  const [classHours, classMinutes] = parseTime(cleanTime);
  
  const classTimeToday = new Date();
  classTimeToday.setHours(classHours, classMinutes, 0, 0);
  
  const timeDiff = classTimeToday - now;
  
  if (timeDiff <= 0) {
    return "Starting now!";
  }
  
  const hoursUntil = Math.floor(timeDiff / (1000 * 60 * 60));
  const minutesUntil = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hoursUntil > 0) {
    return `Starts in ${hoursUntil}h ${minutesUntil}m`;
  } else if (minutesUntil > 0) {
    return `Starts in ${minutesUntil} minutes`;
  } else {
    return "Starting very soon!";
  }
}