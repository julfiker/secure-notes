import { Request, Response, NextFunction } from 'express';
import { PostService } from '../services/post.service';
import { getPaginationParams } from '../utils/pagination';

export class PostController {
  static async createPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const post = await PostService.createPost(req.user!.id, req.body);
      res.status(201).json({
        success: true,
        message: 'Post created successfully',
        data: post,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAllPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pagination = getPaginationParams(req.query);
      const result = await PostService.getAllPosts(pagination);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

