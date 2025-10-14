// routes/resultRoutes.js
import express from 'express';
import { createResult, getResultByRoll } from '../controllers/resultController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { allowRoles } from '../middlewares/roleMiddleware.js';

const router = express.Router();

router.post('/', protect, allowRoles('admin','cr'), createResult);
router.get('/:rollNo', protect, getResultByRoll);

export default router;
