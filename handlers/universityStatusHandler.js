import Event from "../models/eventModel.js"
import { detectMessageContext, getTargetDateFromMessage, weekdayName } from "../utils/dateTimeHelper.js"
import { askGemini } from "../services/geminiService.js"

export const handleUniversityStatusQuery = async (user, message) => {
  const context = detectMessageContext()
  const targetDate = getTargetDateFromMessage(message, context.now)
  const targetDay = weekdayName(targetDate)
  const targetDateFormatted = targetDate.toLocaleDateString('en-GB')
  
  console.log(`🏫 University Status Query:`, {
    message,
    currentDate: context.currentDate,
    targetDate: targetDateFormatted,
    targetDay,
    userDepartment: user.department,
    userSemester: user.semester
  })

  // Create date range for query
  const start = new Date(targetDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(targetDate)
  end.setHours(23, 59, 59, 999)

  // BROADER query to catch all relevant events
  const events = await Event.find({
    $or: [
      { audience: "all" },
      { audience: "department", department: user.department },
      { audience: "semester", semester: user.semester }
    ],
    $or: [
      { date: { $gte: start, $lte: end } },
      { date: { $exists: false } }
    ]
  }).sort({ date: 1, createdAt: -1 })

  console.log(`📋 Found ${events.length} events for date ${targetDateFormatted}:`, 
    events.map(e => ({ title: e.title, date: e.date })))



  // Analyze events for university status with better logic
  let statusInfo = {
    isOpen: true, // Default assumption
    openEvents: [],
    closeEvents: [],
    announcements: [],
    classCancellations: []
  }

  // In handleUniversityStatusQuery, add this check at the beginning:
const isEventInquiry = /(program|party|event|celebration|festival|function)/i.test(message)
if (isEventInquiry) {
  // Let the event inquiry handler take over
  throw new Error("This should be handled by EVENT_INQUIRY")
}

  events.forEach(event => {
    const eventText = `${event.title} ${event.description}`.toLowerCase()
    const eventDate = event.date ? new Date(event.date).toLocaleDateString('en-GB') : 'No date'
    
    console.log(`🔍 Analyzing event: "${event.title}" - Date: ${eventDate}`)
    
    // Check for closure indicators
    if (eventText.includes('close') || eventText.includes('closed') || 
        eventText.includes('holiday') || eventText.includes('leave') ||
        eventText.includes('break') || eventText.includes('no classes') ||
        eventText.includes('cancel') || eventText.includes('cancelled') ||
        eventText.includes('shut') || eventText.includes('off')) {
      
      statusInfo.closeEvents.push({
        title: event.title,
        description: event.description,
        date: event.date,
        type: 'CLOSURE'
      })
      
      if (!eventText.includes('not close') && !eventText.includes('not closed')) {
        statusInfo.isOpen = false
      }
    }
    
    // Check for open indicators
    if ((eventText.includes('open') && !eventText.includes('not open')) ||
        eventText.includes('will open') || eventText.includes('is open')) {
      
      statusInfo.openEvents.push({
        title: event.title,
        description: event.description,
        date: event.date,
        type: 'OPEN'
      })
      
      if (!eventText.includes('not open')) {
        statusInfo.isOpen = true
      }
    }
    
    // Check for class cancellations
    if (eventText.includes('cancel') || eventText.includes('cancelled') || 
        eventText.includes('no class') || eventText.includes('classes cancel')) {
      
      statusInfo.classCancellations.push({
        title: event.title,
        description: event.description,
        date: event.date,
        type: 'CANCELLATION'
      })
    }
    
    // General announcements (not specifically open/close)
    if (!eventText.includes('close') && !eventText.includes('open') && 
        !eventText.includes('cancel') && !eventText.includes('holiday')) {
      statusInfo.announcements.push({
        title: event.title,
        description: event.description,
        date: event.date,
        type: 'ANNOUNCEMENT'
      })
    }
  })

  console.log(`📊 Status Analysis:`, {
    isOpen: statusInfo.isOpen,
    openEvents: statusInfo.openEvents.length,
    closeEvents: statusInfo.closeEvents.length,
    cancellations: statusInfo.classCancellations.length,
    announcements: statusInfo.announcements.length
  })

  // Generate response based on analysis
  let reply = ""
  
  // Priority 1: Clear open events
  if (statusInfo.openEvents.length > 0) {
    const openEvent = statusInfo.openEvents[0] // Take the most relevant
    reply = `✅ UNIVERSITY WILL BE OPEN on ${targetDay} (${targetDateFormatted})\n\n📢 Announcement: ${openEvent.title}\n${openEvent.description ? `📝 Details: ${openEvent.description}` : ''}`
    
    if (statusInfo.classCancellations.length > 0) {
      reply += `\n\n⚠️ Note: Some classes may be cancelled. Check specific class schedules.`
    }
  }
  // Priority 2: Clear close events
  else if (statusInfo.closeEvents.length > 0 && statusInfo.openEvents.length === 0) {
    const closeEvent = statusInfo.closeEvents[0]
    reply = `🚫 UNIVERSITY WILL BE CLOSED on ${targetDay} (${targetDateFormatted})\n\n📢 Announcement: ${closeEvent.title}\n${closeEvent.description ? `📝 Reason: ${closeEvent.description}` : ''}`
  }
  // Priority 3: Class cancellations only
  else if (statusInfo.classCancellations.length > 0) {
    const cancellation = statusInfo.classCancellations[0]
    reply = `⚠️ CLASSES CANCELLED on ${targetDay} (${targetDateFormatted})\n\nBut university remains open.\n\n📢 Announcement: ${cancellation.title}\n${cancellation.description ? `📝 Details: ${cancellation.description}` : ''}`
  }
  // Priority 4: General announcements
  else if (statusInfo.announcements.length > 0) {
    const announcementsText = statusInfo.announcements.map(a => 
      `• ${a.title}${a.description ? ` - ${a.description}` : ''}`
    ).join('\n')
    
    const prompt = `
Student asked: "${message}"
Current date: ${context.currentDate}, Time: ${context.currentTime}
Target date: ${targetDay} (${targetDateFormatted})

Available announcements for ${targetDay}:
${announcementsText}

Based on these announcements, will the university be open or closed tomorrow? Provide a clear, direct answer about university status.
`
    reply = await askGemini(prompt)
  }
  // Priority 5: No relevant events found
  else {
    reply = `ℹ️ No specific announcements found about university status for ${targetDay} (${targetDateFormatted}).\n\nBased on regular schedule, the university is expected to be OPEN.\n\nPlease check official channels for any last-minute updates.`
  }

  // Fallback if AI fails or response is generic
  if (!reply || reply.includes("AI request failed") || reply.includes("I don't have information")) {
    if (statusInfo.openEvents.length > 0) {
      const openEvent = statusInfo.openEvents[0]
      reply = `✅ UNIVERSITY WILL BE OPEN on ${targetDay} (${targetDateFormatted})\n\n📢 ${openEvent.title}${openEvent.description ? `\n📝 ${openEvent.description}` : ''}`
    } else if (statusInfo.closeEvents.length > 0) {
      const closeEvent = statusInfo.closeEvents[0]
      reply = `🚫 UNIVERSITY WILL BE CLOSED on ${targetDay} (${targetDateFormatted})\n\n📢 ${closeEvent.title}${closeEvent.description ? `\n📝 ${closeEvent.description}` : ''}`
    } else {
      reply = `ℹ️ No specific announcements found for ${targetDay} (${targetDateFormatted}).\n\nUniversity is expected to be OPEN as per regular schedule.\n\nCheck official announcements for updates.`
    }
  }

  console.log(`📤 Final reply for university status:`, { 
    targetDate: targetDateFormatted, 
    isOpen: statusInfo.isOpen,
    replyLength: reply.length 
  })

  return {
    reply: reply.replace(/\n/g, '<br>'),
    intent: "UNIVERSITY_STATUS",
    meta: {
      currentDay: context.currentDay,
      currentDate: context.currentDate,
      targetDay,
      targetDate: targetDateFormatted,
      messageTime: context.currentTime,
      totalEvents: events.length,
      openEvents: statusInfo.openEvents.length,
      closeEvents: statusInfo.closeEvents.length,
      status: statusInfo.isOpen ? 'OPEN' : 'CLOSED'
    }
  }
}