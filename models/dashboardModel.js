import mongoose from "mongoose"

const dashboardSchema = new mongoose.Schema(
  {
    // Dashboard metadata
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userRole: { type: String, enum: ["admin", "cr", "student"], required: true },

    // Statistics snapshots
    stats: {
      totalUsers: { type: Number, default: 0 },
      totalStudents: { type: Number, default: 0 },
      totalCRs: { type: Number, default: 0 },
      totalAdmins: { type: Number, default: 0 },
      totalSchedules: { type: Number, default: 0 },
      totalEvents: { type: Number, default: 0 },
      totalResults: { type: Number, default: 0 },
      totalAnnouncements: { type: Number, default: 0 },
    },

    // Breakdown by type
    scheduleBreakdown: {
      classes: { type: Number, default: 0 },
      exams: { type: Number, default: 0 },
      assignments: { type: Number, default: 0 },
      quizzes: { type: Number, default: 0 },
      tests: { type: Number, default: 0 },
    },

    // Semester-wise data
    semesterData: [
      {
        semester: String,
        studentCount: Number,
        scheduleCount: Number,
        eventCount: Number,
        averageGPA: Number,
      },
    ],

    // Department-wise data
    departmentData: [
      {
        department: String,
        studentCount: Number,
        eventCount: Number,
        announcementCount: Number,
      },
    ],

    // Recent activity
    recentActivity: [
      {
        type: String, // 'schedule_created', 'event_created', 'result_added', etc.
        description: String,
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        timestamp: { type: Date, default: Date.now },
      },
    ],

    // Performance metrics
    performanceMetrics: {
      averageGPA: { type: Number, default: 0 },
      highestGPA: { type: Number, default: 0 },
      lowestGPA: { type: Number, default: 0 },
      passRate: { type: Number, default: 0 }, // percentage
      failRate: { type: Number, default: 0 }, // percentage
    },

    // Upcoming events/schedules
    upcomingSchedules: [
      {
        scheduleId: { type: mongoose.Schema.Types.ObjectId, ref: "Schedule" },
        title: String,
        kind: String,
        date: Date,
        daysUntil: Number,
      },
    ],

    upcomingEvents: [
      {
        eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
        title: String,
        date: Date,
        daysUntil: Number,
      },
    ],

    // Last updated timestamp
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

// Index for faster queries
dashboardSchema.index({ userId: 1, userRole: 1 })
dashboardSchema.index({ lastUpdated: -1 })

export default mongoose.model("Dashboard", dashboardSchema)
