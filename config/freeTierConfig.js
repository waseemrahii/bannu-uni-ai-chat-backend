/**
 * Google AI Studio Free Tier Configuration
 *
 * Free Tier Limits:
 * - 60 requests per minute
 * - 1500 requests per day
 * - 10 requests per second (burst)
 *
 * Recommended Settings:
 * - Minimum interval between requests: 2.5 seconds (24 req/min)
 * - Batch size: 3 documents
 * - Delay between batches: 5 seconds
 * - Daily quota: 1500 requests
 */

export const FREE_TIER_CONFIG = {
  // API Rate Limiting
  minRequestInterval: 2500, // 2.5 seconds between requests
  maxRequestsPerMinute: 24, // Conservative limit (60 / 2.5)
  maxRequestsPerDay: 1500,

  // Batch Processing
  batchSize: 3, // Documents per batch
  delayBetweenBatches: 5000, // 5 seconds
  delayBetweenDocuments: 1000, // 1 second

  // Retry Strategy
  maxRetries: 2,
  retryDelays: [2000, 5000], // 2s, 5s

  // Fallback Strategy
  useFallbackEmbeddings: true, // Use hash-based embeddings when quota exceeded
  enableCaching: true, // Cache embeddings to reduce API calls

  // Monitoring
  enableQuotaTracking: true,
  quotaTrackingFile: ".quota-tracker.json",

  // Warnings
  quotaWarningThreshold: 0.8, // Warn when 80% of quota is used
}

export const PAID_TIER_CONFIG = {
  minRequestInterval: 100, // 100ms between requests
  maxRequestsPerMinute: 600,
  maxRequestsPerDay: 100000,
  batchSize: 10,
  delayBetweenBatches: 500,
  delayBetweenDocuments: 0,
  maxRetries: 3,
  retryDelays: [1000, 3000, 10000],
  useFallbackEmbeddings: false,
  enableCaching: true,
  enableQuotaTracking: false,
}

export const getConfig = () => {
  const tier = process.env.API_TIER || "free"
  return tier === "free" ? FREE_TIER_CONFIG : PAID_TIER_CONFIG
}
