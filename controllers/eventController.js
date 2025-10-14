import asyncHandler from "express-async-handler"
import Event from "../models/eventModel.js"

/* ===================================================== */
/* 🔹 CREATE EVENT */
/* ===================================================== */
// POST /api/events
export const createEvent = asyncHandler(async (req, res) => {
  const data = req.body

  if (req.user.role === "cr") {
    if (data.audience === "semester" && data.semester !== req.user.semester) {
      res.status(403)
      throw new Error("CR can only create events for their own semester")
    }
  }

  const doc = await Event.create({ ...data, createdBy: req.user._id })
  res.status(201).json({ success: true, message: "Event created", data: doc })
})

/* ===================================================== */
/* 🔹 GET ALL EVENTS (with search, filters, pagination) */
/* ===================================================== */
// GET /api/events
export const listEvents = asyncHandler(async (req, res) => {
  const {
    search,
    semester,
    department,
    page = 1,
    limit = 10,
    sort = "date",
    order = "asc",
  } = req.query

  const filter = {}

  if (semester) filter.semester = semester
  if (department) filter.department = department

  // 🔍 Search by keyword in title or description
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ]
  }

  const skip = (Number(page) - 1) * Number(limit)
  const total = await Event.countDocuments(filter)
  const docs = await Event.find(filter)
    .sort({ [sort]: order === "desc" ? -1 : 1 })
    .skip(skip)
    .limit(Number(limit))

  res.json({
    success: true,
    count: docs.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
    data: docs,
  })
})

/* ===================================================== */
/* 🔹 GET SINGLE EVENT BY ID */
/* ===================================================== */
// GET /api/events/:id
export const getEventById = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id)
  if (!event) {
    res.status(404)
    throw new Error("Event not found")
  }
  res.json({ success: true, data: event })
})

/* ===================================================== */
/* 🔹 UPDATE EVENT */
/* ===================================================== */
// PUT /api/events/:id
export const updateEvent = asyncHandler(async (req, res) => {
  const { id } = req.params
  const updates = req.body
  const event = await Event.findById(id)

  if (!event) {
    res.status(404)
    throw new Error("Event not found")
  }

  // CR can only update events they created
  if (req.user.role === "cr" && event.createdBy.toString() !== req.user._id.toString()) {
    res.status(403)
    throw new Error("CRs can only update events they created")
  }

  const updated = await Event.findByIdAndUpdate(id, updates, { new: true })
  res.json({ success: true, message: "Event updated", data: updated })
})

/* ===================================================== */
/* 🔹 DELETE EVENT */
/* ===================================================== */
// DELETE /api/events/:id
export const deleteEvent = asyncHandler(async (req, res) => {
  const { id } = req.params
  const event = await Event.findById(id)

  if (!event) {
    res.status(404)
    throw new Error("Event not found")
  }

  // CR can only delete their own events
  if (req.user.role === "cr" && event.createdBy.toString() !== req.user._id.toString()) {
    res.status(403)
    throw new Error("CRs can only delete events they created")
  }

  await event.deleteOne()
  res.json({ success: true, message: "Event deleted successfully" })
})
