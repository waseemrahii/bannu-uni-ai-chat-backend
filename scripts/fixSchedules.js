// scripts/fixSchedules.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Schedule from "../models/scheduleModel.js";
import User from "../models/userModel.js";

dotenv.config();

const fixSchedules = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const schedules = await Schedule.find();

    for (const schedule of schedules) {
      let updated = false;

      // 🧩 Ensure required fields exist or have defaults
      if (!schedule.session) {
        schedule.session = "2021-2025";
        updated = true;
      }

      if (!schedule.className) {
        schedule.className = "A";
        updated = true;
      }

      if (!schedule.startTime || !schedule.endTime) {
        // Example fallback times
        schedule.startTime = schedule.startTime || "09:00 AM";
        schedule.endTime = schedule.endTime || "10:00 AM";
        updated = true;
      }

      // 🧑 Ensure createdBy is a valid reference
      if (!schedule.createdBy) {
        // Find admin user to assign as default creator
        const adminUser = await User.findOne({ role: "admin" });
        if (adminUser) {
          schedule.createdBy = adminUser._id;
          updated = true;
        }
      }

      // ✅ Save if any field was changed
      if (updated) {
        await schedule.save();
        console.log(`Updated schedule: ${schedule._id}`);
      }
    }

    console.log("🎯 All schedules checked and updated successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error fixing schedules:", err);
    process.exit(1);
  }
};

fixSchedules();
