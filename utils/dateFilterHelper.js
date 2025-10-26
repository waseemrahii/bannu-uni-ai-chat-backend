/**
 * Helper to extract date filters from user queries
 */
class DateFilterHelper {
  /**
   * Extract date context from query and return MongoDB date filters
   * @param {string} query - User query
   * @returns {object} - Date filter object for MongoDB
   */
  static extractDateFilter(query) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    const nextMonth = new Date(today)
    nextMonth.setMonth(nextMonth.getMonth() + 1)

    const queryLower = query.toLowerCase()

    // Check for date keywords in query
    if (queryLower.includes("today")) {
      return {
        "metadata.date": {
          $gte: today,
          $lt: tomorrow,
        },
      }
    }

    if (queryLower.includes("tomorrow")) {
      return {
        "metadata.date": {
          $gte: tomorrow,
          $lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
        },
      }
    }

    if (queryLower.includes("upcoming") || queryLower.includes("coming") || queryLower.includes("next")) {
      return {
        "metadata.date": {
          $gte: today,
        },
      }
    }

    if (queryLower.includes("this week")) {
      return {
        "metadata.date": {
          $gte: today,
          $lt: nextWeek,
        },
      }
    }

    if (queryLower.includes("this month")) {
      return {
        "metadata.date": {
          $gte: today,
          $lt: nextMonth,
        },
      }
    }

    // Default: return documents from today onwards
    return {
      "metadata.date": {
        $gte: today,
      },
    }
  }

  /**
   * Format date for display
   */
  static formatDate(date) {
    if (!date) return "N/A"
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  /**
   * Get date range description
   */
  static getDateRangeDescription(filter) {
    if (!filter || !filter["metadata.date"]) return "All dates"

    const dateFilter = filter["metadata.date"]
    if (dateFilter.$gte && dateFilter.$lt) {
      return `${this.formatDate(dateFilter.$gte)} to ${this.formatDate(dateFilter.$lt)}`
    }
    if (dateFilter.$gte) {
      return `From ${this.formatDate(dateFilter.$gte)} onwards`
    }
    return "All dates"
  }
}

export default DateFilterHelper
