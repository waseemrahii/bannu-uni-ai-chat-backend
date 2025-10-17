// routes/resultRoutes.js
import express from "express";
import {
  createResult,
  getAllResults,
  getResultById,
  getResultByRoll,
  updateResult,
  deleteResult,
  addSubjectToResult,
} from "../controllers/resultController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { allowRoles } from "../middlewares/roleMiddleware.js";

const router = express.Router();

// CRUD Routes
router.post("/", protect, allowRoles("admin", "cr"), createResult);
router.get("/", protect, getAllResults);
router.get("/:id", protect, getResultById);
router.get("/roll/:rollNo", protect, getResultByRoll);
router.put("/:id", protect, allowRoles("admin", "cr"), updateResult);
router.patch("/:id/subject", protect, allowRoles("admin", "cr"), addSubjectToResult);
router.delete("/:id", protect, allowRoles("admin", "cr"), deleteResult);

export default router;