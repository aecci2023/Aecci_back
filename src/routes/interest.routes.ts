import { Router } from 'express';
import { submitInterest, getAllInterests } from '../controllers/interest.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', submitInterest);
router.get('/', authenticate, getAllInterests);

export default router;
