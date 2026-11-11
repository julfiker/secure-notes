import { Router } from 'express';
import { PostController } from '../controllers/post.controller';
import { authenticate } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { createPostSchema } from '../validations/post.validation';
import { paginationQuerySchema } from '../utils/pagination';

const router = Router();

router.use(authenticate);

router.post('/', validateBody(createPostSchema), PostController.createPost);
router.get('/', validateQuery(paginationQuerySchema), PostController.getAllPosts);

export default router;

