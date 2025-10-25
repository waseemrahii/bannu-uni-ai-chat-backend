// create-quota-file.js
import fs from 'fs'
import path from 'path'

const quotaFilePath = path.join(process.cwd(), '.quota-tracker.json')

function createQuotaFile() {
  const today = new Date().toISOString().split('T')[0]
  const initialData = {
    date: today,
    count: 0,
    lastReset: new Date().toISOString()
  }
  
  fs.writeFileSync(quotaFilePath, JSON.stringify(initialData, null, 2))
  
  // Verify it was created
  if (fs.existsSync(quotaFilePath)) {
    const data = JSON.parse(fs.readFileSync(quotaFilePath, 'utf8'))
    console.log('✅ Quota file created successfully!')
    console.log('Location:', quotaFilePath)
    console.log('Content:', JSON.stringify(data, null, 2))
  } else {
    console.log('❌ Failed to create quota file')
  }
}

createQuotaFile()