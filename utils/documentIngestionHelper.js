

import ragService from "../services/ragService.js"
import Schedule from "../models/scheduleModel.js"
import Event from "../models/eventModel.js"
import Result from "../models/resultModel.js"
import GeneralInfo from "../models/generalInfoModel.js"

class DocumentIngestionHelper {
  // constructor() {
  //   this.batchSize = 3 // Process 3 documents at a time (reduced from 5)
  //   this.delayBetweenBatches = 5000 // 5 second delay between batches (increased from 2s)
  //   this.delayBetweenDocuments = 1000 // 1 second delay between documents in batch
  // }

   constructor() {
    // More conservative settings for free tier
    this.batchSize = 2 // Process only 2 documents at a time
    this.delayBetweenBatches = 8000 // 8 second delay between batches
    this.delayBetweenDocuments = 2000 // 2 second delay between documents
    
    console.log(`[DocumentIngestion] Rate limits - Batch: ${this.batchSize}, Between batches: ${this.delayBetweenBatches}ms, Between docs: ${this.delayBetweenDocuments}ms`)
  }
  /**
   * Ingest all schedules into vector database with batch processing
   */
  async ingestAllSchedules() {
    try {
      console.log("[DocumentIngestion] Starting schedule ingestion...")
      const schedules = await Schedule.find()

      let successCount = 0
      let failureCount = 0

      for (let i = 0; i < schedules.length; i += this.batchSize) {
        const batch = schedules.slice(i, i + this.batchSize)
        console.log(
          `[DocumentIngestion] Processing schedule batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(schedules.length / this.batchSize)}`,
        )

        for (const schedule of batch) {
          try {
            const content = this.formatScheduleContent(schedule)
            const metadata = {
              type: "schedule",
              semester: schedule.semester,
              className: schedule.className,
              subject: schedule.subject,
              date: schedule.date,
              sourceId: schedule._id,
              sourceCollection: "Schedule",
            }

            await ragService.ingestDocument(content, metadata)
            successCount++

            if (batch.indexOf(schedule) < batch.length - 1) {
              await new Promise((r) => setTimeout(r, this.delayBetweenDocuments))
            }
          } catch (error) {
            console.error(`[DocumentIngestion] Failed to ingest schedule ${schedule._id}:`, error.message)
            failureCount++
          }
        }

        if (i + this.batchSize < schedules.length) {
          console.log(`[DocumentIngestion] Waiting ${this.delayBetweenBatches}ms before next batch...`)
          await new Promise((r) => setTimeout(r, this.delayBetweenBatches))
        }
      }

      console.log(`[DocumentIngestion] Schedule ingestion complete: ${successCount} succeeded, ${failureCount} failed`)
      return successCount
    } catch (error) {
      console.error("[DocumentIngestion] Error ingesting schedules:", error)
      throw error
    }
  }

  /**
   * Ingest all events into vector database with batch processing
   */
  async ingestAllEvents() {
    try {
      console.log("[DocumentIngestion] Starting event ingestion...")
      const events = await Event.find()

      let successCount = 0
      let failureCount = 0

      for (let i = 0; i < events.length; i += this.batchSize) {
        const batch = events.slice(i, i + this.batchSize)
        console.log(
          `[DocumentIngestion] Processing event batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(events.length / this.batchSize)}`,
        )

        for (const event of batch) {
          try {
            const content = this.formatEventContent(event)
            const metadata = {
              type: "event",
              semester: event.semester,
              date: event.date,
              sourceId: event._id,
              sourceCollection: "Event",
            }

            await ragService.ingestDocument(content, metadata)
            successCount++
          } catch (error) {
            console.error(`[DocumentIngestion] Failed to ingest event ${event._id}:`, error.message)
            failureCount++
          }
        }

        if (i + this.batchSize < events.length) {
          await new Promise((r) => setTimeout(r, this.delayBetweenBatches))
        }
      }

      console.log(`[DocumentIngestion] Event ingestion complete: ${successCount} succeeded, ${failureCount} failed`)
      return successCount
    } catch (error) {
      console.error("[DocumentIngestion] Error ingesting events:", error)
      throw error
    }
  }

  /**
   * Ingest all results into vector database with batch processing
   */
  async ingestAllResults() {
    try {
      console.log("[DocumentIngestion] Starting result ingestion...")
      const results = await Result.find()

      let successCount = 0
      let failureCount = 0

      for (let i = 0; i < results.length; i += this.batchSize) {
        const batch = results.slice(i, i + this.batchSize)
        console.log(
          `[DocumentIngestion] Processing result batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(results.length / this.batchSize)}`,
        )

        for (const result of batch) {
          try {
            const content = this.formatResultContent(result)
            const metadata = {
              type: "result",
              semester: result.semester,
              className: result.className,
              sourceId: result._id,
              sourceCollection: "Result",
            }

            await ragService.ingestDocument(content, metadata)
            successCount++
          } catch (error) {
            console.error(`[DocumentIngestion] Failed to ingest result ${result._id}:`, error.message)
            failureCount++
          }
        }

        if (i + this.batchSize < results.length) {
          await new Promise((r) => setTimeout(r, this.delayBetweenBatches))
        }
      }

      console.log(`[DocumentIngestion] Result ingestion complete: ${successCount} succeeded, ${failureCount} failed`)
      return successCount
    } catch (error) {
      console.error("[DocumentIngestion] Error ingesting results:", error)
      throw error
    }
  }

  /**
   * Ingest all general info into vector database with batch processing
   */
  async ingestAllGeneralInfo() {
    try {
      console.log("[DocumentIngestion] Starting general info ingestion...")
      const generalInfos = await GeneralInfo.find()

      let successCount = 0
      let failureCount = 0

      for (let i = 0; i < generalInfos.length; i += this.batchSize) {
        const batch = generalInfos.slice(i, i + this.batchSize)
        console.log(
          `[DocumentIngestion] Processing general info batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(generalInfos.length / this.batchSize)}`,
        )

        for (const info of batch) {
          try {
            const content = this.formatGeneralInfoContent(info)
            const metadata = {
              type: "general_info",
              sourceId: info._id,
              sourceCollection: "GeneralInfo",
            }

            await ragService.ingestDocument(content, metadata)
            successCount++
          } catch (error) {
            console.error(`[DocumentIngestion] Failed to ingest general info ${info._id}:`, error.message)
            failureCount++
          }
        }

        if (i + this.batchSize < generalInfos.length) {
          await new Promise((r) => setTimeout(r, this.delayBetweenBatches))
        }
      }

      console.log(
        `[DocumentIngestion] General info ingestion complete: ${successCount} succeeded, ${failureCount} failed`,
      )
      return successCount
    } catch (error) {
      console.error("[DocumentIngestion] Error ingesting general info:", error)
      throw error
    }
  }

  /**
   * Ingest all documents (full database sync) with batch processing
   */
  async ingestAllDocuments() {
    try {
      console.log("[DocumentIngestion] Starting full database ingestion...")

      const scheduleCount = await this.ingestAllSchedules()
      const eventCount = await this.ingestAllEvents()
      const resultCount = await this.ingestAllResults()
      const infoCount = await this.ingestAllGeneralInfo()

      const totalCount = scheduleCount + eventCount + resultCount + infoCount
      console.log(`[DocumentIngestion] Total ingested: ${totalCount} documents`)

      return {
        schedules: scheduleCount,
        events: eventCount,
        results: resultCount,
        generalInfo: infoCount,
        total: totalCount,
      }
    } catch (error) {
      console.error("[DocumentIngestion] Error in full ingestion:", error)
      throw error
    }
  }

  // Content formatting helpers
  formatScheduleContent(schedule) {
    return `
Schedule: ${schedule.title}
Subject: ${schedule.subject}
Type: ${schedule.kind}
Class: ${schedule.className}
Semester: ${schedule.semester}
Date: ${schedule.date}
Time: ${schedule.startTime} - ${schedule.endTime}
Room: ${schedule.room}
Teacher: ${schedule.teacher}
${schedule.dueDate ? `Due Date: ${schedule.dueDate}` : ""}
    `.trim()
  }

  formatEventContent(event) {
    return `
Event: ${event.title}
Description: ${event.description}
Date: ${event.date}
Audience: ${event.audience}
${event.semester ? `Semester: ${event.semester}` : ""}
${event.department ? `Department: ${event.department}` : ""}
    `.trim()
  }

  formatResultContent(result) {
    const itemsText = result.items.map((item) => `${item.subject}: ${item.marks}/100 (Grade: ${item.grade})`).join("\n")

    return `
Student: ${result.studentName}
Roll No: ${result.rollNo}
Semester: ${result.semester}
Class: ${result.className}

Results:
${itemsText}
    `.trim()
  }

  formatGeneralInfoContent(info) {
    return `
Title: ${info.title}
Category: ${info.category}
Content: ${info.content}
${info.lastUpdated ? `Last Updated: ${info.lastUpdated}` : ""}
    `.trim()
  }
}

export default new DocumentIngestionHelper()
