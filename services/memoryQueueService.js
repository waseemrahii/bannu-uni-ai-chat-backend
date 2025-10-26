class MemoryQueue {
  constructor(name) {
    this.name = name
    this.jobs = []
    this.processing = false
    this.stats = {
      pending: 0,
      active: 0,
      completed: 0,
      failed: 0,
    }
  }

  async add(data, options = {}) {
    const job = {
      id: Date.now() + Math.random(),
      data,
      attempts: 0,
      maxAttempts: options.attempts || 3,
      backoff: options.backoff || { type: "exponential", delay: 2000 },
      status: "pending",
      createdAt: new Date(),
    }

    this.jobs.push(job)
    this.stats.pending++
    console.log(`[MemoryQueue] Job added to ${this.name}: ${job.id}`)

    // Start processing if not already running
    if (!this.processing) {
      this.processJobs()
    }

    return job
  }

  async process(handler) {
    this.handler = handler
  }

  async processJobs() {
    if (this.processing || !this.handler) return

    this.processing = true

    while (this.jobs.length > 0) {
      const job = this.jobs.find((j) => j.status === "pending")
      if (!job) break

      job.status = "active"
      this.stats.pending--
      this.stats.active++

      try {
        console.log(`[MemoryQueue] Processing job ${job.id} in ${this.name}`)
        const result = await this.handler(job)
        job.status = "completed"
        job.result = result
        this.stats.active--
        this.stats.completed++
        console.log(`[MemoryQueue] Job ${job.id} completed in ${this.name}`)
      } catch (error) {
        job.attempts++
        console.error(`[MemoryQueue] Job ${job.id} failed (attempt ${job.attempts}):`, error.message)

        if (job.attempts < job.maxAttempts) {
          // Retry with backoff
          const delay =
            job.backoff.type === "exponential" ? job.backoff.delay * Math.pow(2, job.attempts - 1) : job.backoff.delay

          await new Promise((resolve) => setTimeout(resolve, delay))
          job.status = "pending"
          this.stats.active--
          this.stats.pending++
        } else {
          job.status = "failed"
          job.error = error.message
          this.stats.active--
          this.stats.failed++
          console.error(`[MemoryQueue] Job ${job.id} failed permanently in ${this.name}`)
        }
      }
    }

    this.processing = false
  }

  async getJobCounts() {
    return {
      pending: this.stats.pending,
      active: this.stats.active,
      completed: this.stats.completed,
      failed: this.stats.failed,
    }
  }

  on(event, handler) {
    // Placeholder for event handling
    if (event === "error") {
      this.errorHandler = handler
    }
  }
}

export default MemoryQueue
