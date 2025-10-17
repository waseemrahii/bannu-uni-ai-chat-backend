import asyncHandler from "express-async-handler";
import Schedule from "../models/scheduleModel.js";

/**
 * Helper to get day name from a date
 * @param {string|Date} dateString
 * @returns {string} e.g. "Monday"
 */
const getDayName = (dateString) => {
  if (!dateString) return "";
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const date = new Date(dateString);
  return days[date.getDay()];
};



export const createSchedule = asyncHandler(async (req, res) => {
  const data = req.body;
 console.log(" data======", data)
  // CR permission check
  if (req.user.role === "cr" && data.semester !== req.user.semester) {
    res.status(403);
    throw new Error("CR can only create schedules for their own semester");
  }

  // Auto-assign day if date exists
  if (data.date) {
    const computedDay = getDayName(data.date);
    if (data.day && data.day !== computedDay) {
      res.status(400);
      throw new Error(`Invalid day selected! The date ${data.date} is actually a ${computedDay}.`);
    }
    data.day = computedDay;
  }

  // 🧩 Assignment validation
  if (data.kind === "assignment") {
    if (!data.dueDate) {
      res.status(400);
      throw new Error("Assignments must include a due date");
    }
    if (!data.submissionStart || !data.submissionEnd) {
      res.status(400);
      throw new Error("Assignments must include submission start and end times");
    }
  }

  const newSchedule = await Schedule.create({
    ...data,
    createdBy: req.user._id,
  });

  const populated = await Schedule.findById(newSchedule._id).populate(
    "createdBy",
    "name email role className semester"
  );

   console.log("form data response ======",populated)
  res.status(201).json(populated);
});
export const updateSchedule = asyncHandler(async (req, res) => {
  const schedule = await Schedule.findById(req.params.id);
  if (!schedule) {
    res.status(404);
    throw new Error("Schedule not found");
  }

  if (req.user.role === "cr" && schedule.semester !== req.user.semester) {
    res.status(403);
    throw new Error("CR can only update schedules for their semester");
  }

  // Validate day consistency
  if (req.body.date) {
    const computedDay = getDayName(req.body.date);
    if (req.body.day && req.body.day !== computedDay) {
      res.status(400);
      throw new Error(`Invalid day selected! The date ${req.body.date} is actually a ${computedDay}.`);
    }
    req.body.day = computedDay;
  }

  // 🧩 Assignment-specific check
  if (req.body.kind === "assignment") {
    if (!req.body.dueDate) {
      res.status(400);
      throw new Error("Assignments must include a due date");
    }
  }

  const updated = await Schedule.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  }).populate("createdBy", "name email role className semester");

  res.json(updated);
});


// ✅ Delete schedule
export const deleteSchedule = asyncHandler(async (req, res) => {
  const schedule = await Schedule.findById(req.params.id);
  if (!schedule) {
    res.status(404);
    throw new Error("Schedule not found");
  }

  if (req.user.role === "cr" && schedule.semester !== req.user.semester) {
    res.status(403);
    throw new Error("CR can only delete schedules of their semester");
  }

  await schedule.deleteOne();
  res.json({ message: "Schedule deleted successfully" });
});

// ✅ Get schedule by ID
export const getScheduleById = asyncHandler(async (req, res) => {
  const schedule = await Schedule.findById(req.params.id).populate(
    "createdBy",
    "name email role className semester"
  );
  if (!schedule) {
    res.status(404);
    throw new Error("Schedule not found");
  }
  res.json(schedule);
});

// ✅ Get all schedules (with filters)
export const getAllSchedules = asyncHandler(async (req, res) => {
  const filter = {};
  const { kind, semester, className, session, day, date } = req.query;

  if (kind) filter.kind = kind;
  if (semester) filter.semester = semester;
  if (className) filter.className = className;
  if (session) filter.session = session;
  if (day) filter.day = day;
  if (date) filter.date = new Date(date);

  const schedules = await Schedule.find(filter)
    .populate("createdBy", "name email role className semester")
    .sort({ date: 1, day: 1, startTime: 1 });

  res.json(schedules);
});

// ✅ Get all schedules by semester
export const listSchedulesBySemester = asyncHandler(async (req, res) => {
  const { semester } = req.params;
  const { kind } = req.query;
  const filter = { semester };
  if (kind) filter.kind = kind;

  const schedules = await Schedule.find(filter)
    .populate("createdBy", "name email role className semester")
    .sort({ date: 1, day: 1, startTime: 1 });

  res.json(schedules);
});

