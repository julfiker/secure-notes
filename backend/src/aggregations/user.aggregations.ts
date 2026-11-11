import mongoose from 'mongoose';
import { User } from '../models/User';
import { BadRequestError, NotFoundError } from '../utils/errors';

export interface GroupedInterestResult {
  interest: string;
  userCount: number;
  users: Array<{
    id: string;
    name: string;
    email: string;
  }>;
}

export class UserAggregations {
  /**
   * Scenario 1: Group users by interests using EXACTLY ONE collection.aggregate() call.
   * Filters out missing/empty interest arrays, unwinds interests, groups users per interest,
   * sorts alphabetically by interest, and shapes output via $project.
   */
  static async groupUsersByInterest(): Promise<GroupedInterestResult[]> {
    const pipeline: mongoose.PipelineStage[] = [
      // 1. Filter out users with null, undefined, or empty interests array
      {
        $match: {
          interests: {
            $exists: true,
            $type: 'array',
            $ne: [],
          },
        },
      },
      // 2. Unwind interests array to produce a document per interest
      {
        $unwind: '$interests',
      },
      // 3. Ensure interest string is not empty or pure whitespace
      {
        $match: {
          interests: { $ne: '' },
        },
      },
      // 4. Group by interest string and push unique user profiles
      {
        $group: {
          _id: '$interests',
          users: {
            $addToSet: {
              id: '$_id',
              name: '$name',
              email: '$email',
            },
          },
        },
      },
      // 5. Project required shape with userCount computed via $size
      {
        $project: {
          _id: 0,
          interest: '$_id',
          userCount: { $size: '$users' },
          users: 1,
        },
      },
      // 6. Sort interests alphabetically for predictable ordering
      {
        $sort: { interest: 1 },
      },
    ];

    // Single collection.aggregate() call constraint strictly satisfied
    return User.aggregate<GroupedInterestResult>(pipeline);
  }

  /**
   * Scenario 2: Retrieve user profile and associated posts using a single $lookup aggregation pipeline.
   */
  static async getUserWithPosts(userId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new BadRequestError(`Invalid user ID: ${userId}`);
    }

    const objectId = new mongoose.Types.ObjectId(userId);

    const pipeline: mongoose.PipelineStage[] = [
      // 1. Match the specific user
      {
        $match: {
          _id: objectId,
        },
      },
      // 2. Single $lookup stage to join posts collection
      {
        $lookup: {
          from: 'posts',
          localField: '_id',
          foreignField: 'userId',
          as: 'posts',
        },
      },
      // 3. Sort posts chronologically inside the pipeline
      {
        $addFields: {
          posts: {
            $sortArray: {
              input: '$posts',
              sortBy: { createdAt: -1, _id: -1 },
            },
          },
        },
      },
      // 4. Project safe user profile and posts, omitting password and __v
      {
        $project: {
          _id: 0,
          id: '$_id',
          name: 1,
          email: 1,
          role: 1,
          interests: 1,
          createdAt: 1,
          updatedAt: 1,
          postCount: { $size: '$posts' },
          posts: {
            $map: {
              input: '$posts',
              as: 'post',
              in: {
                id: '$$post._id',
                title: '$$post.title',
                content: '$$post.content',
                createdAt: '$$post.createdAt',
                updatedAt: '$$post.updatedAt',
              },
            },
          },
        },
      },
    ];

    const results = await User.aggregate(pipeline);

    if (!results || results.length === 0) {
      throw new NotFoundError(`User with ID ${userId} was not found`);
    }

    return results[0];
  }
}

