
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