import { Router } from 'express';
import { NoteController } from '../controllers/note.controller';
import { authenticate } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { createNoteSchema, updateNoteSchema } from '../validations/note.validation';
import { paginationQuerySchema } from '../utils/pagination';

const router = Router();

router.use(authenticate);

router.post('/', validateBody(createNoteSchema), NoteController.createNote);
router.get('/', validateQuery(paginationQuerySchema), NoteController.getUserNotes);
router.get('/:id', NoteController.getNoteById);
router.put('/:id', validateBody(updateNoteSchema), NoteController.updateNote);
router.delete('/:id', NoteController.deleteNote);

export default router;

