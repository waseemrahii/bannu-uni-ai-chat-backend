// scripts/test-quota-system.js

import QuotaManager from "../utils/quotaManager.js"

async function testQuotaSystem() {
  console.log('🧪 Testing Quota System...\n')

  // Step 1: Ensure quota file exists
  console.log('1. Ensuring quota file exists...')
  const ensureResult = QuotaManager.ensureQuotaFile()
  console.log('Ensure result:', ensureResult)

  // Step 2: Get current status
  console.log('\n2. Getting current status...')
  const status = QuotaManager.getStatus()
  console.log('Status:', status)

  // Step 3: Test increment
  console.log('\n3. Testing increment...')
  const newCount = QuotaManager.incrementCount()
  console.log('New count:', newCount)

  // Step 4: Get final status
  console.log('\n4. Final status...')
  const finalStatus = QuotaManager.getStatus()
  console.log('Final status:', finalStatus)

  console.log('\n✅ Quota system test completed!')
}

testQuotaSystem().catch(console.error)