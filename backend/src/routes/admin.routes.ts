import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { NoteController } from '../controllers/note.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { validateBody, validateQuery } from '../middleware/validate';
import { adminCreateUserSchema, adminUpdateUserSchema } from '../validations/user.validation';
import { paginationQuerySchema } from '../utils/pagination';
import { UserRole } from '../types';

const router = Router();

// Protect all admin routes with authentication and ADMIN role guard
router.use(authenticate, authorize(UserRole.ADMIN));

// Admin Notes Endpoint
router.get('/notes', validateQuery(paginationQuerySchema), NoteController.getAllNotesAdmin);

// Admin User Management Endpoints
router.get('/users', validateQuery(paginationQuerySchema), UserController.getAllUsers);
router.post('/users', validateBody(adminCreateUserSchema), UserController.createUser);
router.get('/users/:id', UserController.getUserById);
router.put('/users/:id', validateBody(adminUpdateUserSchema), UserController.updateUser);
router.delete('/users/:id', UserController.deleteUser);

export default router;

