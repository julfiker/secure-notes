import mongoose from 'mongoose';
import { Post } from '../models/Post';
import { IPostDocument, PaginatedResponse, PaginationParams } from '../types';
import { BadRequestError } from '../utils/errors';
import { CreatePostInput } from '../validations/post.validation';
import { createPaginationMeta } from '../utils/pagination';

export class PostService {
  static async createPost(userId: string, input: CreatePostInput): Promise<IPostDocument> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new BadRequestError(`Invalid user ID: ${userId}`);
    }

    const post = await Post.create({
      userId: new mongoose.Types.ObjectId(userId),
      title: input.title,
      content: input.content,
    });

    return post;
  }

  static async getAllPosts(params: PaginationParams): Promise<PaginatedResponse<any>> {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const [posts, totalCount] = await Promise.all([
      Post.find({})
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email'),
      Post.countDocuments({}),
    ]);

    return {
      success: true,
      data: posts,
      pagination: createPaginationMeta(totalCount, page, limit),
    };
  }
}

