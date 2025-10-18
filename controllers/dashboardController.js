import asyncHandler from "express-async-handler"
import User from "../models/userModel.js"
import Schedule from "../models/scheduleModel.js"
import Event from "../models/eventModel.js"
import Result from "../models/resultModel.js"
import GeneralInfo from "../models/generalInfoModel.js"
import Chat from "../models/chatModel.js"

/**
 * ✅ GET DASHBOARD STATS (Role-based)
 * GET /api/dashboard/stats
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const userId = req.user._id
  const userRole = req.user.role

  let stats = {}

  if (userRole === "admin") {
    // Admin sees all statistics
    stats = {
      users: {
        total: await User.countDocuments(),
        students: await User.countDocuments({ role: "student" }),
        crs: await User.countDocuments({ role: "cr" }),
        admins: await User.countDocuments({ role: "admin" }),
      },
      schedules: {
        total: await Schedule.countDocuments(),
        classes: await Schedule.countDocuments({ kind: "class" }),
        exams: await Schedule.countDocuments({ kind: "exam" }),
        assignments: await Schedule.countDocuments({ kind: "assignment" }),
        quizzes: await Schedule.countDocuments({ kind: "quiz" }),
        tests: await Schedule.countDocuments({ kind: "test" }),
      },
      events: {
        total: await Event.countDocuments(),
        upcoming: await Event.countDocuments({ date: { $gte: new Date() } }),
        past: await Event.countDocuments({ date: { $lt: new Date() } }),
      },
      results: {
        total: await Result.countDocuments(),
        students: await Result.distinct("rollNo").then((arr) => arr.length),
      },
      announcements: {
        total: await GeneralInfo.countDocuments(),
      },
      chats: {
        total: await Chat.countDocuments(),
      },
    }
  } else if (userRole === "cr") {
    // CR sees stats for their semester/class
    const crSemester = req.user.semester
    const crClass = req.user.className

    stats = {
      users: {
        total: await User.countDocuments({ semester: crSemester, className: crClass }),
        students: await User.countDocuments({ role: "student", semester: crSemester, className: crClass }),
      },
      schedules: {
        total: await Schedule.countDocuments({ semester: crSemester, className: crClass }),
        classes: await Schedule.countDocuments({ kind: "class", semester: crSemester, className: crClass }),
        exams: await Schedule.countDocuments({ kind: "exam", semester: crSemester, className: crClass }),
        assignments: await Schedule.countDocuments({ kind: "assignment", semester: crSemester, className: crClass }),
      },
      events: {
        total: await Event.countDocuments({ semester: crSemester }),
        upcoming: await Event.countDocuments({ semester: crSemester, date: { $gte: new Date() } }),
      },
      results: {
        total: await Result.countDocuments({ semester: crSemester, className: crClass }),
      },
    }
  } else if (userRole === "student") {
    // Student sees only their personal stats
    const studentSemester = req.user.semester
    const studentClass = req.user.className
    const studentRoll = req.user.rollNo

    stats = {
      schedules: {
        total: await Schedule.countDocuments({ semester: studentSemester, className: studentClass }),
        classes: await Schedule.countDocuments({ kind: "class", semester: studentSemester, className: studentClass }),
        exams: await Schedule.countDocuments({ kind: "exam", semester: studentSemester, className: studentClass }),
        assignments: await Schedule.countDocuments({
          kind: "assignment",
          semester: studentSemester,
          className: studentClass,
        }),
      },
      events: {
        total: await Event.countDocuments({ semester: studentSemester }),
        upcoming: await Event.countDocuments({ semester: studentSemester, date: { $gte: new Date() } }),
      },
      results: {
        total: await Result.countDocuments({ rollNo: studentRoll }),
      },
    }
  }

  res.json({
    success: true,
    userRole,
    stats,
    timestamp: new Date(),
  })
})

/**
 * ✅ GET UPCOMING SCHEDULES & EVENTS
 * GET /api/dashboard/upcoming
 */
export const getUpcomingItems = asyncHandler(async (req, res) => {
  const userRole = req.user.role
  const now = new Date()
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  let upcomingSchedules = []
  let upcomingEvents = []

  if (userRole === "admin") {
    upcomingSchedules = await Schedule.find({
      date: { $gte: now, $lte: thirtyDaysLater },
    })
      .sort({ date: 1 })
      .limit(10)
      .populate("createdBy", "name role")

    upcomingEvents = await Event.find({
      date: { $gte: now, $lte: thirtyDaysLater },
    })
      .sort({ date: 1 })
      .limit(10)
      .populate("createdBy", "name role")
  } else if (userRole === "cr") {
    upcomingSchedules = await Schedule.find({
      semester: req.user.semester,
      className: req.user.className,
      date: { $gte: now, $lte: thirtyDaysLater },
    })
      .sort({ date: 1 })
      .limit(10)
      .populate("createdBy", "name role")

    upcomingEvents = await Event.find({
      semester: req.user.semester,
      date: { $gte: now, $lte: thirtyDaysLater },
    })
      .sort({ date: 1 })
      .limit(10)
      .populate("createdBy", "name role")
  } else if (userRole === "student") {
    upcomingSchedules = await Schedule.find({
      semester: req.user.semester,
      className: req.user.className,
      date: { $gte: now, $lte: thirtyDaysLater },
    })
      .sort({ date: 1 })
      .limit(10)
      .populate("createdBy", "name role")

    upcomingEvents = await Event.find({
      semester: req.user.semester,
      date: { $gte: now, $lte: thirtyDaysLater },
    })
      .sort({ date: 1 })
      .limit(10)
      .populate("createdBy", "name role")
  }

  res.json({
    success: true,
    upcomingSchedules,
    upcomingEvents,
    timestamp: new Date(),
  })
})

/**
 * ✅ GET PERFORMANCE ANALYTICS
 * GET /api/dashboard/analytics
 */
export const getAnalytics = asyncHandler(async (req, res) => {
  const userRole = req.user.role
  let analytics = {}

  if (userRole === "admin") {
    // Overall performance metrics
    const allResults = await Result.find()
    const allGrades = allResults.flatMap((r) => r.items.map((item) => item.grade))

    const gradeDistribution = {
      "A+": allGrades.filter((g) => g === "A+").length,
      A: allGrades.filter((g) => g === "A").length,
      B: allGrades.filter((g) => g === "B").length,
      C: allGrades.filter((g) => g === "C").length,
      D: allGrades.filter((g) => g === "D").length,
      E: allGrades.filter((g) => g === "E").length,
      F: allGrades.filter((g) => g === "F").length,
    }

    const passCount = allGrades.filter((g) => g !== "F").length
    const failCount = allGrades.filter((g) => g === "F").length

    analytics = {
      gradeDistribution,
      passRate: allGrades.length > 0 ? ((passCount / allGrades.length) * 100).toFixed(2) : 0,
      failRate: allGrades.length > 0 ? ((failCount / allGrades.length) * 100).toFixed(2) : 0,
      totalGrades: allGrades.length,
      semesterBreakdown: await getSemesterBreakdown(),
      departmentBreakdown: await getDepartmentBreakdown(),
    }
  } else if (userRole === "cr") {
    // Semester-specific analytics
    const semesterResults = await Result.find({ semester: req.user.semester })
    const semesterGrades = semesterResults.flatMap((r) => r.items.map((item) => item.grade))

    const gradeDistribution = {
      "A+": semesterGrades.filter((g) => g === "A+").length,
      A: semesterGrades.filter((g) => g === "A").length,
      B: semesterGrades.filter((g) => g === "B").length,
      C: semesterGrades.filter((g) => g === "C").length,
      D: semesterGrades.filter((g) => g === "D").length,
      E: semesterGrades.filter((g) => g === "E").length,
      F: semesterGrades.filter((g) => g === "F").length,
    }

    const passCount = semesterGrades.filter((g) => g !== "F").length
    const failCount = semesterGrades.filter((g) => g === "F").length

    analytics = {
      semester: req.user.semester,
      className: req.user.className,
      gradeDistribution,
      passRate: semesterGrades.length > 0 ? ((passCount / semesterGrades.length) * 100).toFixed(2) : 0,
      failRate: semesterGrades.length > 0 ? ((failCount / semesterGrades.length) * 100).toFixed(2) : 0,
      totalStudents: await User.countDocuments({
        semester: req.user.semester,
        className: req.user.className,
        role: "student",
      }),
    }
  } else if (userRole === "student") {
    // Student personal analytics
    const studentResults = await Result.find({ rollNo: req.user.rollNo })

    analytics = {
      totalResults: studentResults.length,
      results: studentResults.map((r) => ({
        semester: r.semester,
        subjects: r.items.length,
        averageMarks: (r.items.reduce((sum, item) => sum + item.marks, 0) / r.items.length).toFixed(2),
        grades: r.items.map((item) => ({ subject: item.subject, grade: item.grade, marks: item.marks })),
      })),
    }
  }

  res.json({
    success: true,
    analytics,
    timestamp: new Date(),
  })
})

/**
 * ✅ GET RECENT ACTIVITY
 * GET /api/dashboard/activity
 */
export const getRecentActivity = asyncHandler(async (req, res) => {
  const { limit = 20 } = req.query
  const userRole = req.user.role

  let activities = []

  if (userRole === "admin") {
    // Get recent activities from all collections
    const recentSchedules = await Schedule.find().sort({ createdAt: -1 }).limit(5).populate("createdBy", "name role")

    const recentEvents = await Event.find().sort({ createdAt: -1 }).limit(5).populate("createdBy", "name role")

    const recentResults = await Result.find().sort({ createdAt: -1 }).limit(5).populate("createdBy", "name role")

    activities = [
      ...recentSchedules.map((s) => ({
        type: "schedule_created",
        description: `${s.kind} "${s.title}" created`,
        createdBy: s.createdBy,
        timestamp: s.createdAt,
      })),
      ...recentEvents.map((e) => ({
        type: "event_created",
        description: `Event "${e.title}" created`,
        createdBy: e.createdBy,
        timestamp: e.createdAt,
      })),
      ...recentResults.map((r) => ({
        type: "result_added",
        description: `Results added for roll ${r.rollNo}`,
        createdBy: r.createdBy,
        timestamp: r.createdAt,
      })),
    ]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  } else if (userRole === "cr") {
    const crSchedules = await Schedule.find({ semester: req.user.semester })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("createdBy", "name role")

    activities = crSchedules.map((s) => ({
      type: "schedule_created",
      description: `${s.kind} "${s.title}" created`,
      createdBy: s.createdBy,
      timestamp: s.createdAt,
    }))
  }

  res.json({
    success: true,
    activities,
    count: activities.length,
    timestamp: new Date(),
  })
})

/**
 * ✅ GET SEMESTER BREAKDOWN
 * Helper function for admin analytics
 */
async function getSemesterBreakdown() {
  const semesters = await Schedule.distinct("semester")
  const breakdown = []

  for (const semester of semesters) {
    const scheduleCount = await Schedule.countDocuments({ semester })
    const studentCount = await User.countDocuments({ semester, role: "student" })
    const eventCount = await Event.countDocuments({ semester })

    breakdown.push({
      semester,
      scheduleCount,
      studentCount,
      eventCount,
    })
  }

  return breakdown
}

/**
 * ✅ GET DEPARTMENT BREAKDOWN
 * Helper function for admin analytics
 */
async function getDepartmentBreakdown() {
  const departments = await User.distinct("department")
  const breakdown = []

  for (const department of departments) {
    const studentCount = await User.countDocuments({ department, role: "student" })
    const eventCount = await Event.countDocuments({ department })
    const announcementCount = await GeneralInfo.countDocuments({ department })

    breakdown.push({
      department,
      studentCount,
      eventCount,
      announcementCount,
    })
  }

  return breakdown
}

/**
 * ✅ GET SCHEDULE BREAKDOWN BY TYPE
 * GET /api/dashboard/schedule-breakdown
 */
export const getScheduleBreakdown = asyncHandler(async (req, res) => {
  const userRole = req.user.role
  let breakdown = {}

  if (userRole === "admin") {
    breakdown = {
      classes: await Schedule.countDocuments({ kind: "class" }),
      exams: await Schedule.countDocuments({ kind: "exam" }),
      assignments: await Schedule.countDocuments({ kind: "assignment" }),
      quizzes: await Schedule.countDocuments({ kind: "quiz" }),
      tests: await Schedule.countDocuments({ kind: "test" }),
    }
  } else if (userRole === "cr") {
    breakdown = {
      classes: await Schedule.countDocuments({ kind: "class", semester: req.user.semester }),
      exams: await Schedule.countDocuments({ kind: "exam", semester: req.user.semester }),
      assignments: await Schedule.countDocuments({ kind: "assignment", semester: req.user.semester }),
      quizzes: await Schedule.countDocuments({ kind: "quiz", semester: req.user.semester }),
      tests: await Schedule.countDocuments({ kind: "test", semester: req.user.semester }),
    }
  } else if (userRole === "student") {
    breakdown = {
      classes: await Schedule.countDocuments({
        kind: "class",
        semester: req.user.semester,
        className: req.user.className,
      }),
      exams: await Schedule.countDocuments({
        kind: "exam",
        semester: req.user.semester,
        className: req.user.className,
      }),
      assignments: await Schedule.countDocuments({
        kind: "assignment",
        semester: req.user.semester,
        className: req.user.className,
      }),
      quizzes: await Schedule.countDocuments({
        kind: "quiz",
        semester: req.user.semester,
        className: req.user.className,
      }),
      tests: await Schedule.countDocuments({
        kind: "test",
        semester: req.user.semester,
        className: req.user.className,
      }),
    }
  }

  res.json({
    success: true,
    breakdown,
    timestamp: new Date(),
  })
})

/**
 * ✅ GET USER STATISTICS
 * GET /api/dashboard/users
 */
export const getUserStatistics = asyncHandler(async (req, res) => {
  const userRole = req.user.role
  let userStats = {}

  if (userRole === "admin") {
    userStats = {
      total: await User.countDocuments(),
      byRole: {
        students: await User.countDocuments({ role: "student" }),
        crs: await User.countDocuments({ role: "cr" }),
        admins: await User.countDocuments({ role: "admin" }),
      },
      byDepartment: await User.aggregate([
        { $group: { _id: "$department", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      bySemester: await User.aggregate([
        { $match: { role: "student" } },
        { $group: { _id: "$semester", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    }
  } else if (userRole === "cr") {
    userStats = {
      semester: req.user.semester,
      className: req.user.className,
      total: await User.countDocuments({ semester: req.user.semester, className: req.user.className }),
      students: await User.countDocuments({
        semester: req.user.semester,
        className: req.user.className,
        role: "student",
      }),
    }
  }

  res.json({
    success: true,
    userStats,
    timestamp: new Date(),
  })
})
