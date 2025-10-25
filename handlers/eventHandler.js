
import Event from "../models/eventModel.js";
import { detectMessageContext, getDateRangeFromMessage, weekdayName } from "../utils/dateTimeHelper.js";
import { askGemini } from "../services/geminiService.js";

export const handleEventQuery = async (user, message) => {
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

    console.log(`📅 Event Query:`, {
      message,
      currentDate: context.currentDate,
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
        type: dateRange.type
      },
      userDepartment: user.department
    });

    // Fetch events for department & matching date range
    const events = await Event.find({
      $or: [
        { audience: "all" },
        { audience: "department", department: user.department },
        { audience: "semester", semester: user.semester },
      ],
      date: { $gte: dateRange.start, $lte: dateRange.end },
    }).sort({ date: 1 });

    console.log(`📋 Found ${events.length} events for ${dateContext}:`, 
      events.map(e => ({ 
        title: e.title, 
        date: e.date,
        formattedDate: new Date(e.date).toLocaleDateString('en-GB')
      })));

    // CASE 1: Events found for that date range
    if (events.length) {
      // Build event list with MODIFIED descriptions
      const eventList = events.map(event => {
        const eventDate = new Date(event.date);
        const eventDateFormatted = eventDate.toLocaleDateString('en-GB');
        const dayName = weekdayName(eventDate);
        
        // Determine time context based on actual date
        let timeContext = "";
        if (eventDateFormatted === todayFormatted) {
          timeContext = "📅 **Today**";
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
        
        return `${timeContext}: ${event.title}${modifiedDescription ? ` - ${modifiedDescription}` : ""}`;
      }).join('\n');

      const prompt = `
Student asked: "${message}"
Current date: ${context.currentDate} (Today is ${todayFormatted})

Events found:
${eventList}

Provide a clear, natural response about these events.
      `;

      const aiResponse = await askGemini(prompt);
      
      let finalReply = aiResponse && !aiResponse.includes("AI request failed")
        ? aiResponse
        : generateEventFallback(events, dateContext, todayFormatted);

      return {
        reply: finalReply,
        intent: "EVENT",
        meta: { dateContext, eventsCount: events.length },
      };
    }

    // CASE 2: No events for that date range, check if future events exist
    const upcoming = await Event.find({
      $or: [
        { audience: "all" },
        { audience: "department", department: user.department },
        { audience: "semester", semester: user.semester },
      ],
      date: { $gte: new Date() },
    })
      .sort({ date: 1 })
      .limit(5);

    if (upcoming.length) {
      const upcomingList = upcoming
        .map(
          (e) =>
            `• ${e.title} on ${new Date(e.date).toLocaleDateString("en-GB")} - ${
              e.description || "No description"
            }`
        )
        .join("\n");

      const aiResponse = await askGemini(`
Student asked: "${message}"
No specific events found ${dateContext}.
Upcoming events are:
${upcomingList}

Reply naturally, informing the student about the upcoming events.
      `);

      return {
        reply: aiResponse && !aiResponse.includes("AI request failed")
          ? aiResponse
          : `No events found ${dateContext}. Here are upcoming events:\n${upcomingList}`,
        intent: "EVENT",
        meta: { dateContext, upcoming: upcoming.length },
      };
    }

    // CASE 3: No events at all
    return {
      reply: `No events found ${dateContext}.`,
      intent: "EVENT",
    };
  } catch (error) {
    console.error("💥 [Event Handler Error]:", error.message);
    return {
      reply: "Sorry, I encountered an error while checking events. Please try again.",
      intent: "ERROR"
    };
  }
};

// Helper function for event handler fallback with MODIFIED descriptions
function generateEventFallback(events, dateContext, todayFormatted) {
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
      
      return `• ${event.title}${modifiedDescription ? ` - ${modifiedDescription}` : ''}`;
    }).join('\n');
    return `🎓 Events today (${todayFormatted}):\n${eventList}`;
  } else {
    const eventList = events.map(event => {
      const eventDate = new Date(event.date);
      const formattedDate = eventDate.toLocaleDateString('en-GB');
      const dayName = weekdayName(eventDate);
      
      // Modify description for future events
      let modifiedDescription = event.description || "";
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (formattedDate === tomorrow.toLocaleDateString('en-GB')) {
        modifiedDescription = modifiedDescription
          .replace(/\btoday\b/gi, 'tomorrow')
          .replace(/\byesterday\b/gi, 'tomorrow');
      }
      
      return `• ${dayName} (${formattedDate}): ${event.title}${modifiedDescription ? ` - ${modifiedDescription}` : ''}`;
    }).join('\n');
    return `🎓 Events ${dateContext}:\n${eventList}`;
  }
}