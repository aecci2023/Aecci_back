import { Router } from 'express';
import { jobApplicationController } from '../controllers/job-application.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Public route to submit job applications
router.post('/', jobApplicationController.createJobApplication);

// Admin route to view all job applications
router.get('/', authenticate, requireRole(['admin']), jobApplicationController.getAllJobApplications);

export default router;
