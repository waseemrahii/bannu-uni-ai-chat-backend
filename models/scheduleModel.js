// models/scheduleModel.js
import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ["class", "exam", "assignment", "quiz", "test"],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    }, // e.g. "OS Midterm", "DS Assignment #2"

    subject: { type: String, required: true },
    teacher: { type: String },
    className: { type: String, enum: ["A", "B", "C", "D"], required: true },
    semester: { type: String, required: true },
    session: { type: String, required: true }, // e.g. "2021-2025"

    // 🗓 General schedule fields
    day: { type: String }, // For regular classes: “Monday”, “Tuesday”
    date: { type: Date }, // Used for exams, quizzes, tests

    startTime: { type: String }, // “09:00 AM”
    endTime: { type: String },   // “10:30 AM”
    room: { type: String },

    // 📘 Assignment-specific fields
    dueDate: { type: Date }, // Assignment deadline date
    submissionStart: { type: String }, // e.g. “09:00 AM”
    submissionEnd: { type: String },   // e.g. “11:59 PM”

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// 🔍 Auto validation for assignment fields
scheduleSchema.pre("save", function (next) {
  if (this.kind === "assignment") {
    if (!this.dueDate) {
      return next(new Error("Assignments must have a due date"));
    }
  }
  next();
});

export default mongoose.model("Schedule", scheduleSchema);
