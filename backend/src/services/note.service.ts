import mongoose from 'mongoose';
import { Note } from '../models/Note';
import { INoteDocument, PaginatedResponse, PaginationParams, UserRole } from '../types';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';
import { CreateNoteInput, UpdateNoteInput } from '../validations/note.validation';
import { createPaginationMeta } from '../utils/pagination';

const validateObjectId = (id: string, fieldName = 'Note ID'): void => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequestError(`Invalid format for ${fieldName}: ${id}`);
  }
};

export class NoteService {
  static async createNote(userId: string, input: CreateNoteInput): Promise<INoteDocument> {
    validateObjectId(userId, 'User ID');

    const note = await Note.create({
      userId: new mongoose.Types.ObjectId(userId),
      title: input.title,
      content: input.content,
    });

    return note;
  }

  static async getUserNotes(
    userId: string,
    params: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    validateObjectId(userId, 'User ID');

    const { page, limit } = params;
    const skip = (page - 1) * limit;
    const query = { userId: new mongoose.Types.ObjectId(userId) };

    // Query supported by Index 3: { userId: 1, createdAt: -1, _id: -1 }
    const [notes, totalCount] = await Promise.all([
      Note.find(query)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit),
      Note.countDocuments(query),
    ]);

    return {
      success: true,
      data: notes,
      pagination: createPaginationMeta(totalCount, page, limit),
    };
  }

  static async getNoteById(
    noteId: string,
    requestingUserId: string,
    role: UserRole
  ): Promise<INoteDocument> {
    validateObjectId(noteId, 'Note ID');

    const note = await Note.findById(noteId);
    if (!note) {
      throw new NotFoundError('Note not found');
    }

    // Ownership check & IDOR protection: Admin can view any note; regular user can only view their own
    if (role !== UserRole.ADMIN && note.userId.toString() !== requestingUserId) {
      throw new ForbiddenError('Access denied: You do not have permission to view this note');
    }

    return note;
  }

  static async updateNote(
    noteId: string,
    requestingUserId: string,
    role: UserRole,
    input: UpdateNoteInput
  ): Promise<INoteDocument> {
    validateObjectId(noteId, 'Note ID');

    const note = await Note.findById(noteId);
    if (!note) {
      throw new NotFoundError('Note not found');
    }

    // IDOR protection: Users can only update their own notes
    if (role !== UserRole.ADMIN && note.userId.toString() !== requestingUserId) {
      throw new ForbiddenError('Access denied: You can only update your own notes');
    }

    if (input.title !== undefined) {
      note.title = input.title;
    }
    if (input.content !== undefined) {
      note.content = input.content;
    }

    await note.save();
    return note;
  }

  static async deleteNote(
    noteId: string,
    requestingUserId: string,
    role: UserRole
  ): Promise<void> {
    validateObjectId(noteId, 'Note ID');

    const note = await Note.findById(noteId);
    if (!note) {
      throw new NotFoundError('Note not found');
    }

    // IDOR protection: Users can only delete their own notes
    if (role !== UserRole.ADMIN && note.userId.toString() !== requestingUserId) {
      throw new ForbiddenError('Access denied: You can only delete your own notes');
    }

    await Note.findByIdAndDelete(noteId);
  }

  static async getAllNotesAdmin(params: PaginationParams): Promise<PaginatedResponse<any>> {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    // Query supported by Index 4: { createdAt: -1, _id: -1 }
    const [notes, totalCount] = await Promise.all([
      Note.find({})
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email'),
      Note.countDocuments({}),
    ]);

    return {
      success: true,
      data: notes,
      pagination: createPaginationMeta(totalCount, page, limit),
    };
  }
}

