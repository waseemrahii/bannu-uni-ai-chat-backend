// models/userModel.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin','cr','student'], default: 'student' },
  className: { type: String, enum: ["A", "B", "C", "D"] },
  department: { type: String, default: 'CS' },
    session: String, // "2021-2025"
  semester: { type: String }, // e.g., "4" or "4th"
  rollNo: { type: String }, // optional for CR/admin
  phone: { type: String , required:true}, 
  gender: { type: String, enum: ['male','female'], default: 'male',  required: true },
}, { timestamps: true });

userSchema.pre('save', async function(next){
  if(!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function(entered) {
  return bcrypt.compare(entered, this.password);
};

export default mongoose.model('User', userSchema);
