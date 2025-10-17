// models/resultModel.js
import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema({
  rollNo: { type: String, required: true },
  studentName: String,
  semester: { type: String, required: true },
  className: { type: String, enum: ["A", "B", "C"] },
  items: [
    {
      subject: { type: String, required: true },
      marks: { 
        type: Number, 
        required: true,
        min: 0,
        max: 100
      },
      grade: { type: String }
    }
  ],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Compound index to prevent duplicate subjects for same student & semester
resultSchema.index({ rollNo: 1, semester: 1, "items.subject": 1 }, { unique: true });

// Pre-save middleware to calculate grades and prevent duplicates
resultSchema.pre('save', function(next) {
  // Calculate grade for each subject
  this.items.forEach(item => {
    item.grade = calculateGrade(item.marks);
  });
  
  next();
});

// Static method to check for duplicate subjects
resultSchema.statics.checkDuplicateSubjects = async function(rollNo, semester, subjects) {
  const existingResult = await this.findOne({
    rollNo,
    semester,
    "items.subject": { $in: subjects }
  });
  
  if (existingResult) {
    const duplicateSubjects = existingResult.items
      .filter(item => subjects.includes(item.subject))
      .map(item => item.subject);
    
    return duplicateSubjects;
  }
  
  return [];
};

// Grade calculation function
function calculateGrade(marks) {
  if (marks >= 90) return 'A+';
  if (marks >= 80) return 'A';
  if (marks >= 70) return 'B';
  if (marks >= 60) return 'C';
  if (marks >= 50) return 'D';
  if (marks >= 40) return 'E';
  return 'F';
}

export default mongoose.model('Result', resultSchema);
