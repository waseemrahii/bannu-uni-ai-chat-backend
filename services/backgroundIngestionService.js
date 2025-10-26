import MemoryQueue from "./memoryQueueService.js"
import { ingestDocumentToVector } from "../utils/documentIngestionHelper.js"
import Schedule from "../models/scheduleModel.js"
import Event from "../models/eventModel.js"
import Result from "../models/resultModel.js"
import GeneralInfo from "../models/generalInfoModel.js"
import VectorDocument from "../models/vectorDocumentModel.js"

const scheduleQueue = new MemoryQueue("schedule-ingestion")
const eventQueue = new MemoryQueue("event-ingestion")
const resultQueue = new MemoryQueue("result-ingestion")
const generalInfoQueue = new MemoryQueue("general-info-ingestion")

scheduleQueue.process(async (job) => {
  try {
    const { documentId, action } = job.data
    console.log(`[BackgroundIngestion] Processing schedule ${action}: ${documentId}`)

    if (action === "delete") {
      await VectorDocument.deleteOne({ sourceId: documentId, type: "schedule" })
      console.log(`[BackgroundIngestion] Deleted schedule from vector DB: ${documentId}`)
      return { success: true, action: "deleted" }
    }

    const schedule = await Schedule.findById(documentId).populate("createdBy", "name email")
    if (!schedule) {
      console.log(`[BackgroundIngestion] Schedule not found: ${documentId}`)
      return { success: false, error: "Schedule not found" }
    }

    const result = await ingestDocumentToVector({
      type: "schedule",
      sourceId: schedule._id,
      title: schedule.title,
      content: `Schedule: ${schedule.title}\nSubject: ${schedule.subject}\nKind: ${schedule.kind}\nDate: ${schedule.date}\nDay: ${schedule.day}\nTime: ${schedule.startTime} - ${schedule.endTime}\nRoom: ${schedule.room}`,
      metadata: {
        kind: schedule.kind,
        subject: schedule.subject,
        className: schedule.className,
        semester: schedule.semester,
        date: schedule.date,
        createdBy: schedule.createdBy?.name,
      },
    })

    console.log(`[BackgroundIngestion] Schedule ingested successfully: ${documentId}`)
    return { success: true, action: "ingested", result }
  } catch (error) {
    console.error(`[BackgroundIngestion] Error processing schedule:`, error.message)
    throw error
  }
})

eventQueue.process(async (job) => {
  try {
    const { documentId, action } = job.data
    console.log(`[BackgroundIngestion] Processing event ${action}: ${documentId}`)

    if (action === "delete") {
      await VectorDocument.deleteOne({ sourceId: documentId, type: "event" })
      console.log(`[BackgroundIngestion] Deleted event from vector DB: ${documentId}`)
      return { success: true, action: "deleted" }
    }

    const event = await Event.findById(documentId).populate("createdBy", "name email")
    if (!event) {
      console.log(`[BackgroundIngestion] Event not found: ${documentId}`)
      return { success: false, error: "Event not found" }
    }

    const result = await ingestDocumentToVector({
      type: "event",
      sourceId: event._id,
      title: event.title,
      content: `Event: ${event.title}\nDescription: ${event.description}\nDate: ${event.date}\nLocation: ${event.location}\nAudience: ${event.audience}`,
      metadata: {
        audience: event.audience,
        semester: event.semester,
        department: event.department,
        date: event.date,
        createdBy: event.createdBy?.name,
      },
    })

    console.log(`[BackgroundIngestion] Event ingested successfully: ${documentId}`)
    return { success: true, action: "ingested", result }
  } catch (error) {
    console.error(`[BackgroundIngestion] Error processing event:`, error.message)
    throw error
  }
})

resultQueue.process(async (job) => {
  try {
    const { documentId, action } = job.data
    console.log(`[BackgroundIngestion] Processing result ${action}: ${documentId}`)

    if (action === "delete") {
      await VectorDocument.deleteOne({ sourceId: documentId, type: "result" })
      console.log(`[BackgroundIngestion] Deleted result from vector DB: ${documentId}`)
      return { success: true, action: "deleted" }
    }

    const result = await Result.findById(documentId).populate("createdBy", "name email")
    if (!result) {
      console.log(`[BackgroundIngestion] Result not found: ${documentId}`)
      return { success: false, error: "Result not found" }
    }

    const itemsText = result.items.map((item) => `${item.subject}: ${item.marks} (${item.grade})`).join(", ")
    const ingestionResult = await ingestDocumentToVector({
      type: "result",
      sourceId: result._id,
      title: `Result for ${result.studentName}`,
      content: `Student Result: ${result.studentName}\nRoll No: ${result.rollNo}\nSemester: ${result.semester}\nSubjects: ${itemsText}`,
      metadata: {
        rollNo: result.rollNo,
        studentName: result.studentName,
        semester: result.semester,
        className: result.className,
        createdBy: result.createdBy?.name,
      },
    })

    console.log(`[BackgroundIngestion] Result ingested successfully: ${documentId}`)
    return { success: true, action: "ingested", result: ingestionResult }
  } catch (error) {
    console.error(`[BackgroundIngestion] Error processing result:`, error.message)
    throw error
  }
})

generalInfoQueue.process(async (job) => {
  try {
    const { documentId, action } = job.data
    console.log(`[BackgroundIngestion] Processing general info ${action}: ${documentId}`)

    if (action === "delete") {
      await VectorDocument.deleteOne({ sourceId: documentId, type: "general-info" })
      console.log(`[BackgroundIngestion] Deleted general info from vector DB: ${documentId}`)
      return { success: true, action: "deleted" }
    }

    const generalInfo = await GeneralInfo.findById(documentId).populate("createdBy", "name email")
    if (!generalInfo) {
      console.log(`[BackgroundIngestion] General info not found: ${documentId}`)
      return { success: false, error: "General info not found" }
    }

    const ingestionResult = await ingestDocumentToVector({
      type: "general-info",
      sourceId: generalInfo._id,
      title: generalInfo.title,
      content: `${generalInfo.title}\n${generalInfo.content}`,
      metadata: {
        category: generalInfo.category,
        semester: generalInfo.semester,
        createdBy: generalInfo.createdBy?.name,
      },
    })

    console.log(`[BackgroundIngestion] General info ingested successfully: ${documentId}`)
    return { success: true, action: "ingested", result: ingestionResult }
  } catch (error) {
    console.error(`[BackgroundIngestion] Error processing general info:`, error.message)
    throw error
  }
})

export const queueScheduleIngestion = (documentId, action = "create") => {
  scheduleQueue.add({ documentId, action }, { attempts: 3, backoff: { type: "exponential", delay: 2000 } })
}

export const queueEventIngestion = (documentId, action = "create") => {
  eventQueue.add({ documentId, action }, { attempts: 3, backoff: { type: "exponential", delay: 2000 } })
}

export const queueResultIngestion = (documentId, action = "create") => {
  resultQueue.add({ documentId, action }, { attempts: 3, backoff: { type: "exponential", delay: 2000 } })
}

export const queueGeneralInfoIngestion = (documentId, action = "create") => {
  generalInfoQueue.add({ documentId, action }, { attempts: 3, backoff: { type: "exponential", delay: 2000 } })
}

export { scheduleQueue, eventQueue, resultQueue, generalInfoQueue }
