import { Router } from 'express';
import { submitInterest, getAllInterests, updateInterestStatus, getInterestById, approveInterest } from '../controllers/interest.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', submitInterest);
router.get('/', authenticate, getAllInterests);
router.get('/:id', authenticate, getInterestById);
router.patch('/:id/status', authenticate, updateInterestStatus);
router.post('/:id/approve', authenticate, approveInterest);

export default router;
