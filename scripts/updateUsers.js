// scripts/updateUsers.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/userModel.js";

dotenv.config();

const updateUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected...");

    const users = await User.find({});
    console.log(`🔍 Found ${users.length} users.`);

    for (const user of users) {
      let updated = false;

      // --- Add missing fields safely ---
      if (!user.className) {
        user.className = "A"; // default class
        updated = true;
      }

      if (!user.department) {
        user.department = "CS";
        updated = true;
      }

      if (!user.session) {
        user.session = "2021-2025";
        updated = true;
      }

      if (!user.semester) {
        user.semester = "1";
        updated = true;
      }

      if (!user.rollNo) {
        user.rollNo = `BSCS-${Math.floor(Math.random() * 900 + 100)}`; // generate dummy roll number
        updated = true;
      }

      if (updated) {
        await user.save();
        console.log(`✅ Updated user: ${user.email}`);
      }
    }

    console.log("🎉 All users updated successfully!");
    process.exit();
  } catch (err) {
    console.error("❌ Error updating users:", err);
    process.exit(1);
  }
};

updateUsers();
