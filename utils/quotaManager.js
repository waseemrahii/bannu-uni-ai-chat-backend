// utils/quotaManager.js
import fs from 'fs'
import path from 'path'

class QuotaManager {
  constructor() {
    this.quotaFilePath = path.join(process.cwd(), '.quota-tracker.json')
    this.dailyLimit = 1500
  }

  ensureQuotaFile() {
    try {
      if (!fs.existsSync(this.quotaFilePath)) {
        return this.resetQuota()
      }
      
      // Verify file is valid JSON and has correct structure
      const content = fs.readFileSync(this.quotaFilePath, 'utf8')
      const data = JSON.parse(content)
      
      // Validate structure
      if (!data.date || typeof data.count !== 'number') {
        console.log('Quota file structure invalid, resetting...')
        return this.resetQuota()
      }
      
      return this.getStatus()
    } catch (error) {
      console.log('Quota file corrupted, resetting...')
      return this.resetQuota()
    }
  }

  getStatus() {
    try {
      if (!fs.existsSync(this.quotaFilePath)) {
        return { error: 'Quota file not found', exists: false }
      }

      const quotaData = JSON.parse(fs.readFileSync(this.quotaFilePath, 'utf8'))
      const today = new Date().toISOString().split('T')[0]
      const isCurrentDay = quotaData.date === today
      
      return {
        exists: true,
        date: quotaData.date,
        today: today,
        count: quotaData.count || 0,
        limit: this.dailyLimit,
        percentage: Math.round(((quotaData.count || 0) / this.dailyLimit) * 100),
        isCurrentDay: isCurrentDay,
        isExceeded: (quotaData.count || 0) >= this.dailyLimit,
        lastReset: quotaData.lastReset || new Date().toISOString(),
        status: isCurrentDay ? 
          ((quotaData.count || 0) >= this.dailyLimit ? 'EXCEEDED' : 'ACTIVE') : 
          'EXPIRED'
      }
    } catch (error) {
      return { error: error.message, exists: false }
    }
  }

  resetQuota() {
    const today = new Date().toISOString().split('T')[0]
    const resetData = {
      date: today,
      count: 0,
      lastReset: new Date().toISOString()
    }
    
    try {
      // Ensure directory exists
      const dir = path.dirname(this.quotaFilePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      
      fs.writeFileSync(this.quotaFilePath, JSON.stringify(resetData, null, 2))
      console.log('✅ Quota file created/reset at:', this.quotaFilePath)
      return { ...this.getStatus(), reset: true }
    } catch (error) {
      console.error('❌ Failed to create quota file:', error.message)
      return { error: error.message, reset: false }
    }
  }

  incrementCount() {
    try {
      const status = this.getStatus()
      if (status.error || !status.exists) {
        this.resetQuota()
      }

      const quotaData = JSON.parse(fs.readFileSync(this.quotaFilePath, 'utf8'))
      const today = new Date().toISOString().split('T')[0]
      
      // Reset if it's a new day
      if (quotaData.date !== today) {
        console.log('New day detected, resetting quota...')
        return this.resetQuota().count
      }
      
      quotaData.count = (quotaData.count || 0) + 1
      fs.writeFileSync(this.quotaFilePath, JSON.stringify(quotaData, null, 2))
      return quotaData.count
    } catch (error) {
      console.error('Error incrementing quota count:', error)
      return -1
    }
  }
}

export default new QuotaManager()