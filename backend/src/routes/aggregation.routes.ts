import { Router } from 'express';
import { AggregationController } from '../controllers/aggregation.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { UserRole } from '../types';

const router = Router();

// Both aggregation endpoints are protected and restricted to Admin as per section 9
router.use(authenticate, authorize(UserRole.ADMIN));

router.get('/users-by-interest', AggregationController.getUsersByInterest);
router.get('/user-posts/:userId', AggregationController.getUserPosts);

export default router;

