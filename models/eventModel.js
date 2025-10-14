import mongoose from "mongoose"

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    date: { type: Date, required: true },
    audience: {
      type: String,
      enum: ["all", "department", "semester"],
      default: "all",
    },
    department: { type: String, default: "CS" },
    semester: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
)

export default mongoose.model("Event", eventSchema)
