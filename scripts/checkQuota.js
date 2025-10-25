import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';

const quotaFilePath = path.join(process.cwd(), '.quota-tracker.json');

function checkQuota() {
  try {
    if (fs.existsSync(quotaFilePath)) {
      const data = JSON.parse(fs.readFileSync(quotaFilePath, 'utf-8'));
      const today = new Date().toISOString().split('T')[0];
      
      console.log('📊 Current Quota Status:');
      console.log(`   Date: ${data.date}`);
      console.log(`   Today: ${today}`);
      console.log(`   Requests: ${data.count}/1500`);
      console.log(`   Percentage: ${Math.round((data.count / 1500) * 100)}%`);
      console.log(`   Last Reset: ${data.lastReset}`);
      
      if (data.date !== today) {
        console.log('🔄 Quota should reset today!');
      } else if (data.count >= 1500) {
        console.log('❌ QUOTA EXCEEDED - Wait until tomorrow');
      } else {
        console.log('✅ Quota available');
      }
    } else {
      console.log('✅ No quota file - Starting fresh');
    }
  } catch (error) {
    console.error('Error checking quota:', error);
  }
}

checkQuota();