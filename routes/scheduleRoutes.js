// routes/scheduleRoutes.js
import express from "express";
import {
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getAllSchedules,
  getScheduleById,
  listSchedulesBySemester,
} from "../controllers/scheduleController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { allowRoles } from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Admin + CR create/update/delete
router.post("/", protect, allowRoles("admin", "cr"), createSchedule);
router.put("/:id", protect, allowRoles("admin", "cr"), updateSchedule);
// router.delete("/:id", protect, allowRoles("admin", "cr"), deleteSchedule);
router.delete("/:id", protect,  deleteSchedule);

// Public/authorized read
router.get("/", protect, getAllSchedules);
router.get("/:id", protect, getScheduleById);
router.get("/semester/:semester", protect, listSchedulesBySemester);

export default router;


// // routes/scheduleRoutes.js
// import express from 'express';
// import { createSchedule, updateSchedule, listSchedulesBySemester } from '../controllers/scheduleController.js';
// import { protect } from '../middlewares/authMiddleware.js';
// import { allowRoles } from '../middlewares/roleMiddleware.js';

// const router = express.Router();

// // create: admin or cr
// router.post('/', protect, allowRoles('admin','cr'), createSchedule);
// router.put('/:id', protect, allowRoles('admin','cr'), updateSchedule);

// // get by semester
// router.get('/semester/:semester', protect, listSchedulesBySemester);

// export default router;
