/**
 * Seed Database Script
 * Populates MongoDB with sample data for testing RAG system
 */

import dotenv from "dotenv"
import connectDB from "../config/db.js"
import Schedule from "../models/scheduleModel.js"
import Event from "../models/eventModel.js"
import Result from "../models/resultModel.js"
import GeneralInfo from "../models/generalInfoModel.js"

dotenv.config()

const seedDatabase = async () => {
  try {
    console.log("[Seed] Connecting to database...")
    await connectDB()
    console.log("[Seed] Connected!")

    // Clear existing data
    console.log("[Seed] Clearing existing data...")
    await Schedule.deleteMany({})
    await Event.deleteMany({})
    await Result.deleteMany({})
    await GeneralInfo.deleteMany({})
    console.log("[Seed] ✓ Cleared existing data")

    // Seed Schedules
    console.log("[Seed] Seeding schedules...")
    const schedules = await Schedule.insertMany([
      {
        kind: "class",
        title: "Operating Systems Lecture",
        subject: "Operating Systems",
        teacher: "Dr. Ahmed Khan",
        className: "A",
        semester: "4",
        session: "2021-2025",
        day: "Monday",
        startTime: "09:00 AM",
        endTime: "10:30 AM",
        room: "Lab-101",
      },
      {
        kind: "class",
        title: "Data Structures Lecture",
        subject: "Data Structures",
        teacher: "Prof. Fatima Ali",
        className: "A",
        semester: "4",
        session: "2021-2025",
        day: "Wednesday",
        startTime: "11:00 AM",
        endTime: "12:30 PM",
        room: "Lab-102",
      },
      {
        kind: "assignment",
        title: "OS Assignment #2",
        subject: "Operating Systems",
        className: "A",
        semester: "4",
        session: "2021-2025",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        submissionStart: "09:00 AM",
        submissionEnd: "11:59 PM",
      },
      {
        kind: "exam",
        title: "Data Structures Midterm",
        subject: "Data Structures",
        className: "A",
        semester: "4",
        session: "2021-2025",
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        startTime: "02:00 PM",
        endTime: "04:00 PM",
        room: "Exam Hall-A",
      },
      {
        kind: "quiz",
        title: "OS Concepts Quiz",
        subject: "Operating Systems",
        className: "A",
        semester: "4",
        session: "2021-2025",
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        startTime: "10:00 AM",
        endTime: "10:30 AM",
        room: "Lab-101",
      },
    ])
    console.log(`[Seed] ✓ Seeded ${schedules.length} schedules`)

    // Seed Events
    console.log("[Seed] Seeding events...")
    const events = await Event.insertMany([
      {
        title: "Annual Tech Fest 2025",
        description:
          "Join us for the biggest tech event of the year with workshops, competitions, and networking opportunities.",
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        audience: "all",
        department: "CS",
      },
      {
        title: "CS Department Seminar",
        description: "Guest lecture on AI and Machine Learning by industry experts.",
        date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        audience: "department",
        department: "CS",
      },
      {
        title: "Semester 4 Orientation",
        description: "Welcome session for all 4th semester students. Learn about course structure and expectations.",
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        audience: "semester",
        semester: "4",
      },
    ])
    console.log(`[Seed] ✓ Seeded ${events.length} events`)

    // Seed Results
    console.log("[Seed] Seeding results...")
    const results = await Result.insertMany([
      {
        rollNo: "CS-001",
        studentName: "Ali Ahmed",
        semester: "3",
        className: "A",
        items: [
          { subject: "Data Structures", marks: 85, grade: "A" },
          { subject: "Web Development", marks: 92, grade: "A+" },
          { subject: "Database Systems", marks: 78, grade: "B" },
        ],
      },
      {
        rollNo: "CS-002",
        studentName: "Fatima Khan",
        semester: "3",
        className: "A",
        items: [
          { subject: "Data Structures", marks: 88, grade: "A" },
          { subject: "Web Development", marks: 95, grade: "A+" },
          { subject: "Database Systems", marks: 82, grade: "A" },
        ],
      },
      {
        rollNo: "CS-003",
        studentName: "Hassan Malik",
        semester: "3",
        className: "B",
        items: [
          { subject: "Data Structures", marks: 72, grade: "B" },
          { subject: "Web Development", marks: 80, grade: "A" },
          { subject: "Database Systems", marks: 75, grade: "B" },
        ],
      },
    ])
    console.log(`[Seed] ✓ Seeded ${results.length} results`)

    // Seed General Info
    console.log("[Seed] Seeding general information...")
    const generalInfos = await GeneralInfo.insertMany([
      {
        title: "Semester Fees",
        content:
          "Tuition Fee: 50,000 PKR\nLab Fee: 5,000 PKR\nLibrary Fee: 2,000 PKR\nTotal: 57,000 PKR\n\nPayment deadline: 15th of each month",
        audience: "all",
        department: "CS",
      },
      {
        title: "Academic Policies",
        content:
          "Attendance Policy: Minimum 75% attendance required\nGrading Scale: A+ (90-100), A (80-89), B (70-79), C (60-69), D (50-59), E (40-49), F (<40)\nMake-up Exam Policy: Only for medical emergencies with valid documentation",
        audience: "all",
        department: "CS",
      },
      {
        title: "University Holidays 2025",
        content:
          "Eid-ul-Fitr: May 1-5, 2025\nEid-ul-Adha: June 15-20, 2025\nIndependence Day: August 14, 2025\nAshura: July 15-17, 2025\nWinter Break: December 20, 2024 - January 5, 2025",
        audience: "all",
      },
      {
        title: "Campus Facilities",
        content:
          "Library: Open 8 AM - 8 PM (Monday-Friday), 10 AM - 6 PM (Saturday)\nLab Hours: 9 AM - 5 PM (Monday-Friday)\nCafeteria: 8 AM - 6 PM (Daily)\nSports Complex: 4 PM - 8 PM (Monday-Friday)\nComputer Lab: 24/7 access with student ID",
        audience: "all",
      },
    ])
    console.log(`[Seed] ✓ Seeded ${generalInfos.length} general info items`)

    console.log("\n[Seed] ✅ Database seeding completed successfully!")
    console.log(`[Seed] Total documents created:`)
    console.log(`  - Schedules: ${schedules.length}`)
    console.log(`  - Events: ${events.length}`)
    console.log(`  - Results: ${results.length}`)
    console.log(`  - General Info: ${generalInfos.length}`)
    console.log(`  - Total: ${schedules.length + events.length + results.length + generalInfos.length}`)

    process.exit(0)
  } catch (error) {
    console.error("[Seed] Error during seeding:", error)
    process.exit(1)
  }
}

seedDatabase()
