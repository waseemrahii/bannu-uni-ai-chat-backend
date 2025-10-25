import fs from 'fs';
import path from 'path';

const quotaFilePath = path.join(process.cwd(), '.quota-tracker.json');

try {
  if (fs.existsSync(quotaFilePath)) {
    fs.unlinkSync(quotaFilePath);
    console.log('✅ Quota tracker reset successfully');
  } else {
    console.log('✅ No quota file found - starting fresh');
  }
} catch (error) {
  console.error('❌ Error resetting quota:', error);
}