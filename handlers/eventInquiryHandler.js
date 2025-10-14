// import Event from "../models/eventModel.js"
// import { detectMessageContext, getTargetDateFromMessage, weekdayName } from "../utils/dateTimeHelper.js"
// import { askGemini } from "../services/geminiService.js"

// export const handleEventInquiryQuery = async (user, message) => {
//   const context = detectMessageContext()
//   const targetDate = getTargetDateFromMessage(message, context.now)
//   const targetDay = weekdayName(targetDate)
//   const targetDateFormatted = targetDate.toLocaleDateString('en-GB')
  
//   console.log(`🎭 Event Inquiry:`, {
//     message,
//     currentDate: context.currentDate,
//     targetDate: targetDateFormatted,
//     targetDay,
//     userDepartment: user.department
//   })

//   // Create date range for query
//   const start = new Date(targetDate)
//   start.setHours(0, 0, 0, 0)
//   const end = new Date(targetDate)
//   end.setHours(23, 59, 59, 999)

//   // Query for events with program/party keywords
//   const events = await Event.find({
//     $or: [
//       { audience: "all" },
//       { audience: "department", department: user.department },
//       { audience: "semester", semester: user.semester }
//     ],
//     $or: [
//       { date: { $gte: start, $lte: end } },
//       { date: { $exists: false } }
//     ],
//     $or: [
//       { title: { $regex: /program|party|event|celebration|festival|function|ceremony|gathering|meetup|social/i } },
//       { description: { $regex: /program|party|event|celebration|festival|function|ceremony|gathering|meetup|social/i } }
//     ]
//   }).sort({ date: 1, createdAt: -1 })

//   console.log(`🎉 Found ${events.length} program/party events:`, 
//     events.map(e => ({ title: e.title, date: e.date })))

//   // Also get regular events for the day (without program/party keywords)
//   const regularEvents = await Event.find({
//     $or: [
//       { audience: "all" },
//       { audience: "department", department: user.department },
//       { audience: "semester", semester: user.semester }
//     ],
//     $or: [
//       { date: { $gte: start, $lte: end } },
//       { date: { $exists: false } }
//     ],
//     title: { $not: { $regex: /program|party|event|celebration|festival|function|ceremony|gathering|meetup|social/i } },
//     description: { $not: { $regex: /program|party|event|celebration|festival|function|ceremony|gathering|meetup|social/i } }
//   }).sort({ date: 1, createdAt: -1 })

//   console.log(`📅 Found ${regularEvents.length} regular events:`, 
//     regularEvents.map(e => ({ title: e.title, date: e.date })))

//   // Generate response based on found events
//   let reply = ""

//   if (events.length > 0) {
//     // Found program/party events
//     const eventList = events.map(event => {
//       const eventDate = event.date ? new Date(event.date).toLocaleDateString('en-GB') : targetDateFormatted
//       return `🎉 ${event.title}${event.description ? ` - ${event.description}` : ''}`
//     }).join('\n• ')

//     const prompt = `
// Student asked: "${message}"
// Current date: ${context.currentDate}
// Target date: ${targetDay} (${targetDateFormatted})

// Found events/programs/parties:
// ${eventList}

// Provide a friendly, enthusiastic response about the upcoming events. Mention the events and any important details.
// `
//     reply = await askGemini(prompt)
//   } else if (regularEvents.length > 0) {
//     // No program/party events, but regular events exist
//     const eventList = regularEvents.map(event => {
//       const eventDate = event.date ? new Date(event.date).toLocaleDateString('en-GB') : targetDateFormatted
//       return `📢 ${event.title}${event.description ? ` - ${event.description}` : ''}`
//     }).join('\n• ')

//     const prompt = `
// Student asked: "${message}"
// Current date: ${context.currentDate}
// Target date: ${targetDay} (${targetDateFormatted})

// No specific parties or programs found, but here are the announcements for ${targetDay}:
// ${eventList}

// Provide a helpful response about the announcements. Let them know there are no parties but mention the existing announcements.
// `
//     reply = await askGemini(prompt)
//   } else {
//     // No events found
//     const prompt = `
// Student asked: "${message}"
// Current date: ${context.currentDate}
// Target date: ${targetDay} (${targetDateFormatted})

// No events, programs, or parties found for ${targetDay}.

// Provide a friendly response letting them know there are no events scheduled and suggest checking back later or contacting the event organizers.
// `
//     reply = await askGemini(prompt)
//   }

//   // Fallback responses
//   if (!reply || reply.includes("AI request failed")) {
//     if (events.length > 0) {
//       const eventList = events.map(event => 
//         `🎉 ${event.title}${event.description ? ` - ${event.description}` : ''}`
//       ).join('\n• ')
      
//       reply = `🎊 Yes! There are events on ${targetDay} (${targetDateFormatted}):\n\n• ${eventList}`
//     } else if (regularEvents.length > 0) {
//       const eventList = regularEvents.map(event => 
//         `📢 ${event.title}${event.description ? ` - ${event.description}` : ''}`
//       ).join('\n• ')
      
//       reply = `ℹ️ No parties or programs, but here are announcements for ${targetDay}:\n\n• ${eventList}`
//     } else {
//       reply = `📭 No events, programs, or parties found for ${targetDay} (${targetDateFormatted}).\n\nCheck with your department for upcoming events!`
//     }
//   }

//   console.log(`📤 Event inquiry response:`, { 
//     targetDate: targetDateFormatted, 
//     programEvents: events.length,
//     regularEvents: regularEvents.length
//   })

//   return {
//     reply: reply.replace(/\n/g, '<br>'),
//     intent: "EVENT_INQUIRY",
//     meta: {
//       currentDay: context.currentDay,
//       currentDate: context.currentDate,
//       targetDay,
//       targetDate: targetDateFormatted,
//       messageTime: context.currentTime,
//       programEvents: events.length,
//       regularEvents: regularEvents.length,
//       totalEvents: events.length + regularEvents.length
//     }
//   }
// }



// ///////today correct but litle setting

// import Event from "../models/eventModel.js"
// import { detectMessageContext, getDateRangeFromMessage, weekdayName } from "../utils/dateTimeHelper.js"
// import { askGemini } from "../services/geminiService.js"

// export const handleEventInquiryQuery = async (user, message) => {
//   try {
//     if (!user || !user.department) {
//       console.error("💥 User or user.department is undefined:", user);
//       return {
//         reply: "Sorry, there was an issue with your user information. Please try again.",
//         intent: "ERROR"
//       };
//     }

//     const context = detectMessageContext();
//     const dateRange = getDateRangeFromMessage(message, context.now);
//     const todayFormatted = new Date().toLocaleDateString('en-GB');
    
//     // Generate date context for response
//     let dateContext = "";
//     const startFormatted = dateRange.start.toLocaleDateString('en-GB');
//     const endFormatted = dateRange.end.toLocaleDateString('en-GB');
    
//     switch (dateRange.type) {
//       case 'TODAY':
//         dateContext = `today (${startFormatted})`;
//         break;
//       case 'TOMORROW':
//         dateContext = `tomorrow (${startFormatted})`;
//         break;
//       case 'WEEK':
//         dateContext = `this week (from ${startFormatted} to ${endFormatted})`;
//         break;
//       default:
//         dateContext = `on ${startFormatted}`;
//     }

//     console.log(`🎭 Event Inquiry:`, {
//       message,
//       currentDate: context.currentDate,
//       dateRange: {
//         start: dateRange.start.toISOString(),
//         end: dateRange.end.toISOString(),
//         type: dateRange.type
//       },
//       userDepartment: user.department
//     });

//     // Query for events within the date range with program/party keywords
//     const events = await Event.find({
//       $or: [
//         { audience: "all" },
//         { audience: "department", department: user.department },
//         { audience: "semester", semester: user.semester }
//       ],
//       date: { 
//         $gte: dateRange.start, 
//         $lte: dateRange.end 
//       },
//       $or: [
//         { title: { $regex: /program|party|event|celebration|festival|function|ceremony|gathering|meetup|social/i } },
//         { description: { $regex: /program|party|event|celebration|festival|function|ceremony|gathering|meetup|social/i } }
//       ]
//     }).sort({ date: 1, createdAt: -1 });

//     console.log(`🎉 Found ${events.length} program/party events in date range:`, 
//       events.map(e => ({ 
//         title: e.title, 
//         date: e.date,
//         formattedDate: new Date(e.date).toLocaleDateString('en-GB'),
//         description: e.description
//       })));

//     // Generate response based on found events
//     let reply = "";

//     if (events.length > 0) {
//       // Build event list with proper date context
//       const eventList = events.map(event => {
//         const eventDate = new Date(event.date);
//         const eventDateFormatted = eventDate.toLocaleDateString('en-GB');
//         const dayName = weekdayName(eventDate);
        
//         // Determine time context based on actual date
//         let timeContext = "";
//         if (eventDateFormatted === todayFormatted) {
//           timeContext = "🎉 **Today**";
//         } else {
//           const tomorrow = new Date();
//           tomorrow.setDate(tomorrow.getDate() + 1);
//           if (eventDateFormatted === tomorrow.toLocaleDateString('en-GB')) {
//             timeContext = "📅 **Tomorrow**";
//           } else {
//             timeContext = `🗓️ **${dayName} (${eventDateFormatted})**`;
//           }
//         }
        
//         return `${timeContext}: ${event.title}${event.description ? ` - ${event.description}` : ''}`;
//       }).join('\n');

//       // VERY CLEAR prompt for AI to use actual dates only
//       const prompt = `
// CRITICAL: Use ONLY the ACTUAL EVENT DATES shown below. IGNORE any time-related words like "tomorrow", "yesterday", "today" in the event descriptions.

// Student asked: "${message}"
// Current date: ${context.currentDate} (Today is ${todayFormatted})

// Events found with their ACTUAL DATES:
// ${eventList}

// RESPONSE RULES:
// 1. Look at the ACTUAL DATE next to each event (e.g., "Today", "Tomorrow", "Monday (14/10/2025)")
// 2. IGNORE completely any time words in the event descriptions
// 3. If the event date says "Today", then the event is happening TODAY
// 4. If the event date says "Tomorrow", then the event is happening TOMORROW
// 5. Base your response ONLY on the dates shown above the event descriptions

// Provide a clear response about what events are happening based on their ACTUAL DATES only.
// `;
      
//       reply = await askGemini(prompt);
      
//       // If AI still gets confused, use our direct response
//       if (!reply || reply.includes("AI request failed") || reply.toLowerCase().includes("tomorrow") && dateContext.includes("today")) {
//         reply = generateDirectResponse(events, dateContext, todayFormatted);
//       }
//     } else {
//       // No events found
//       reply = `📭 No events, programs, or parties found ${dateContext}.\n\nCheck with your department for upcoming events!`;
//     }

//     console.log(`📤 Event inquiry response:`, { 
//       dateContext,
//       programEvents: events.length,
//       todayEvents: events.filter(e => new Date(e.date).toLocaleDateString('en-GB') === todayFormatted).length
//     });

//     return {
//       reply: reply.replace(/\n/g, '<br>'),
//       intent: "EVENT_INQUIRY",
//       meta: {
//         currentDay: context.currentDay,
//         currentDate: context.currentDate,
//         dateContext,
//         messageTime: context.currentTime,
//         programEvents: events.length
//       }
//     };
//   } catch (error) {
//     console.error("💥 [Event Inquiry Error]:", error.message);
//     return {
//       reply: "Sorry, I encountered an error while checking for events. Please try again.",
//       intent: "ERROR"
//     };
//   }
// };

// // Simple direct response generator that uses actual dates
// function generateDirectResponse(events, dateContext, todayFormatted) {
//   if (events.length === 0) {
//     return `📭 No events, programs, or parties found ${dateContext}.`;
//   }

//   const todayEvents = events.filter(event => 
//     new Date(event.date).toLocaleDateString('en-GB') === todayFormatted
//   );

//   if (todayEvents.length > 0) {
//     const eventList = todayEvents.map(event => 
//       `🎉 ${event.title}${event.description ? ` - ${event.description}` : ''}`
//     ).join('\n• ');

//     return `🎊 Yes! There are events today (${todayFormatted}):\n\n• ${eventList}`;
//   } else {
//     const eventList = events.map(event => {
//       const eventDate = new Date(event.date);
//       const eventDateFormatted = eventDate.toLocaleDateString('en-GB');
//       const dayName = weekdayName(eventDate);
//       return `🗓️ ${dayName} (${eventDateFormatted}): ${event.title}${event.description ? ` - ${event.description}` : ''}`;
//     }).join('\n• ');

//     return `📅 Events ${dateContext}:\n\n• ${eventList}`;
//   }
// }


import Event from "../models/eventModel.js"
import { detectMessageContext, getDateRangeFromMessage, weekdayName } from "../utils/dateTimeHelper.js"
import { askGemini } from "../services/geminiService.js"

export const handleEventInquiryQuery = async (user, message) => {
  try {
    if (!user || !user.department) {
      console.error("💥 User or user.department is undefined:", user);
      return {
        reply: "Sorry, there was an issue with your user information. Please try again.",
        intent: "ERROR"
      };
    }

    const context = detectMessageContext();
    const dateRange = getDateRangeFromMessage(message, context.now);
    const todayFormatted = new Date().toLocaleDateString('en-GB');
    
    // Generate date context for response
    let dateContext = "";
    const startFormatted = dateRange.start.toLocaleDateString('en-GB');
    const endFormatted = dateRange.end.toLocaleDateString('en-GB');
    
    switch (dateRange.type) {
      case 'TODAY':
        dateContext = `today (${startFormatted})`;
        break;
      case 'TOMORROW':
        dateContext = `tomorrow (${startFormatted})`;
        break;
      case 'WEEK':
        dateContext = `this week (from ${startFormatted} to ${endFormatted})`;
        break;
      default:
        dateContext = `on ${startFormatted}`;
    }

    console.log(`🎭 Event Inquiry:`, {
      message,
      currentDate: context.currentDate,
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
        type: dateRange.type
      },
      userDepartment: user.department
    });

    // Query for events within the date range with program/party keywords
    const events = await Event.find({
      $or: [
        { audience: "all" },
        { audience: "department", department: user.department },
        { audience: "semester", semester: user.semester }
      ],
      date: { 
        $gte: dateRange.start, 
        $lte: dateRange.end 
      },
      $or: [
        { title: { $regex: /program|party|event|celebration|festival|function|ceremony|gathering|meetup|social/i } },
        { description: { $regex: /program|party|event|celebration|festival|function|ceremony|gathering|meetup|social/i } }
      ]
    }).sort({ date: 1, createdAt: -1 });

    console.log(`🎉 Found ${events.length} program/party events in date range:`, 
      events.map(e => ({ 
        title: e.title, 
        date: e.date,
        formattedDate: new Date(e.date).toLocaleDateString('en-GB'),
        description: e.description
      })));

    // Generate response based on found events
    let reply = "";

    if (events.length > 0) {
      // Build event list with MODIFIED descriptions
      const eventList = events.map(event => {
        const eventDate = new Date(event.date);
        const eventDateFormatted = eventDate.toLocaleDateString('en-GB');
        const dayName = weekdayName(eventDate);
        
        // Determine time context based on actual date
        let timeContext = "";
        if (eventDateFormatted === todayFormatted) {
          timeContext = "🎉 **Today**";
        } else {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          if (eventDateFormatted === tomorrow.toLocaleDateString('en-GB')) {
            timeContext = "📅 **Tomorrow**";
          } else {
            timeContext = `🗓️ **${dayName} (${eventDateFormatted})**`;
          }
        }
        
        // MODIFY THE DESCRIPTION to replace time-related words
        let modifiedDescription = event.description || "";
        if (eventDateFormatted === todayFormatted) {
          // Replace "tomorrow" with "today" for today's events
          modifiedDescription = modifiedDescription
            .replace(/\btomorrow\b/gi, 'today')
            .replace(/\btmrw\b/gi, 'today')
            .replace(/\btommorow\b/gi, 'today')
            .replace(/\byesterday\b/gi, 'today');
        } else if (eventDateFormatted === new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleDateString('en-GB')) {
          // Replace "today" with "tomorrow" for tomorrow's events
          modifiedDescription = modifiedDescription
            .replace(/\btoday\b/gi, 'tomorrow')
            .replace(/\byesterday\b/gi, 'tomorrow');
        }
        
        return `${timeContext}: ${event.title}${modifiedDescription ? ` - ${modifiedDescription}` : ''}`;
      }).join('\n');

      // Simple prompt - we've already modified the descriptions
      const prompt = `
Student asked: "${message}"
Current date: ${context.currentDate} (Today is ${todayFormatted})

Events found:
${eventList}

Provide a clear, natural response about these events.
`;
      
      reply = await askGemini(prompt);
      
      // If AI fails, use our direct response
      if (!reply || reply.includes("AI request failed")) {
        reply = generateDirectResponse(events, dateContext, todayFormatted);
      }
    } else {
      // No events found
      reply = `📭 No events, programs, or parties found ${dateContext}.\n\nCheck with your department for upcoming events!`;
    }

    console.log(`📤 Event inquiry response:`, { 
      dateContext,
      programEvents: events.length,
      todayEvents: events.filter(e => new Date(e.date).toLocaleDateString('en-GB') === todayFormatted).length
    });

    return {
      reply: reply.replace(/\n/g, '<br>'),
      intent: "EVENT_INQUIRY",
      meta: {
        currentDay: context.currentDay,
        currentDate: context.currentDate,
        dateContext,
        messageTime: context.currentTime,
        programEvents: events.length
      }
    };
  } catch (error) {
    console.error("💥 [Event Inquiry Error]:", error.message);
    return {
      reply: "Sorry, I encountered an error while checking for events. Please try again.",
      intent: "ERROR"
    };
  }
};

// Simple direct response generator that uses MODIFIED descriptions
function generateDirectResponse(events, dateContext, todayFormatted) {
  if (events.length === 0) {
    return `📭 No events, programs, or parties found ${dateContext}.`;
  }

  const todayEvents = events.filter(event => 
    new Date(event.date).toLocaleDateString('en-GB') === todayFormatted
  );

  if (todayEvents.length > 0) {
    const eventList = todayEvents.map(event => {
      // Modify description for today's events
      let modifiedDescription = event.description || "";
      modifiedDescription = modifiedDescription
        .replace(/\btomorrow\b/gi, 'today')
        .replace(/\btmrw\b/gi, 'today')
        .replace(/\btommorow\b/gi, 'today')
        .replace(/\byesterday\b/gi, 'today');
      
      return `🎉 ${event.title}${modifiedDescription ? ` - ${modifiedDescription}` : ''}`;
    }).join('\n• ');

    return `🎊 Yes! There are events today (${todayFormatted}):\n\n• ${eventList}`;
  } else {
    const eventList = events.map(event => {
      const eventDate = new Date(event.date);
      const eventDateFormatted = eventDate.toLocaleDateString('en-GB');
      const dayName = weekdayName(eventDate);
      
      // Modify description for future events
      let modifiedDescription = event.description || "";
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (eventDateFormatted === tomorrow.toLocaleDateString('en-GB')) {
        modifiedDescription = modifiedDescription
          .replace(/\btoday\b/gi, 'tomorrow')
          .replace(/\byesterday\b/gi, 'tomorrow');
      }
      
      return `🗓️ ${dayName} (${eventDateFormatted}): ${event.title}${modifiedDescription ? ` - ${modifiedDescription}` : ''}`;
    }).join('\n• ');

    return `📅 Events ${dateContext}:\n\n• ${eventList}`;
  }
}