import { Request, Response, NextFunction } from 'express';
import { NoteService } from '../services/note.service';
import { getPaginationParams } from '../utils/pagination';

export class NoteController {
  static async createNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const note = await NoteService.createNote(req.user!.id, req.body);
      res.status(201).json({
        success: true,
        message: 'Note created successfully',
        data: note,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pagination = getPaginationParams(req.query);
      const result = await NoteService.getUserNotes(req.user!.id, pagination);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getNoteById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const note = await NoteService.getNoteById(
        req.params.id as string,
        req.user!.id,
        req.user!.role
      );
      res.status(200).json({
        success: true,
        data: note,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const note = await NoteService.updateNote(
        req.params.id as string,
        req.user!.id,
        req.user!.role,
        req.body
      );
      res.status(200).json({
        success: true,
        message: 'Note updated successfully',
        data: note,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await NoteService.deleteNote(
        req.params.id as string,
        req.user!.id,
        req.user!.role
      );
      res.status(200).json({
        success: true,
        message: 'Note deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAllNotesAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pagination = getPaginationParams(req.query);
      const result = await NoteService.getAllNotesAdmin(pagination);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

