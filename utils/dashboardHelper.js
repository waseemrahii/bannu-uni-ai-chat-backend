/**
 * Dashboard Helper Utilities
 * Real-time data aggregation and formatting
 */

/**
 * Calculate days until a date
 */
export const daysUntil = (date) => {
  const now = new Date()
  const target = new Date(date)
  const diffTime = target - now
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Format schedule for dashboard display
 */
export const formatScheduleForDashboard = (schedule) => {
  return {
    id: schedule._id,
    title: schedule.title,
    kind: schedule.kind,
    subject: schedule.subject,
    date: schedule.date,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    daysUntil: daysUntil(schedule.date),
    isUpcoming: new Date(schedule.date) > new Date(),
    createdBy: schedule.createdBy?.name || "Unknown",
  }
}

/**
 * Format event for dashboard display
 */
export const formatEventForDashboard = (event) => {
  return {
    id: event._id,
    title: event.title,
    description: event.description,
    date: event.date,
    daysUntil: daysUntil(event.date),
    isUpcoming: new Date(event.date) > new Date(),
    audience: event.audience,
    createdBy: event.createdBy?.name || "Unknown",
  }
}

/**
 * Calculate GPA from grades
 */
export const calculateGPA = (grades) => {
  const gradePoints = {
    "A+": 4.0,
    A: 4.0,
    B: 3.0,
    C: 2.0,
    D: 1.0,
    E: 0.5,
    F: 0.0,
  }

  if (grades.length === 0) return 0

  const totalPoints = grades.reduce((sum, grade) => sum + (gradePoints[grade] || 0), 0)
  return (totalPoints / grades.length).toFixed(2)
}

/**
 * Get grade distribution statistics
 */
export const getGradeDistribution = (grades) => {
  return {
    "A+": grades.filter((g) => g === "A+").length,
    A: grades.filter((g) => g === "A").length,
    B: grades.filter((g) => g === "B").length,
    C: grades.filter((g) => g === "C").length,
    D: grades.filter((g) => g === "D").length,
    E: grades.filter((g) => g === "E").length,
    F: grades.filter((g) => g === "F").length,
  }
}

/**
 * Format activity for dashboard
 */
export const formatActivity = (activity) => {
  return {
    type: activity.type,
    description: activity.description,
    createdBy: activity.createdBy?.name || "Unknown",
    timestamp: activity.timestamp,
    timeAgo: getTimeAgo(activity.timestamp),
  }
}

/**
 * Get human-readable time difference
 */
export const getTimeAgo = (date) => {
  const now = new Date()
  const diffMs = now - new Date(date)
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(date).toLocaleDateString()
}

/**
 * Get dashboard summary for role
 */
export const getDashboardSummary = (stats, userRole) => {
  if (userRole === "admin") {
    return {
      title: "Admin Dashboard",
      primaryMetric: stats.users?.total || 0,
      primaryLabel: "Total Users",
      secondaryMetrics: [
        { label: "Students", value: stats.users?.students || 0 },
        { label: "Schedules", value: stats.schedules?.total || 0 },
        { label: "Events", value: stats.events?.total || 0 },
      ],
    }
  } else if (userRole === "cr") {
    return {
      title: "CR Dashboard",
      primaryMetric: stats.users?.total || 0,
      primaryLabel: "Class Students",
      secondaryMetrics: [
        { label: "Schedules", value: stats.schedules?.total || 0 },
        { label: "Events", value: stats.events?.total || 0 },
      ],
    }
  } else if (userRole === "student") {
    return {
      title: "Student Dashboard",
      primaryMetric: stats.schedules?.total || 0,
      primaryLabel: "Upcoming Classes",
      secondaryMetrics: [
        { label: "Exams", value: stats.schedules?.exams || 0 },
        { label: "Assignments", value: stats.schedules?.assignments || 0 },
      ],
    }
  }
}
