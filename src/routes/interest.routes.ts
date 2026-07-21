import { Router } from 'express';
import { submitInterest, getAllInterests, updateInterestStatus, getInterestById } from '../controllers/interest.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', submitInterest);
router.get('/', authenticate, getAllInterests);
router.get('/:id', authenticate, getInterestById);
router.patch('/:id/status', authenticate, updateInterestStatus);

export default router;
