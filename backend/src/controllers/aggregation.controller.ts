import { Request, Response, NextFunction } from 'express';
import { UserAggregations } from '../aggregations/user.aggregations';

export class AggregationController {
  static async getUsersByInterest(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await UserAggregations.groupUsersByInterest();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await UserAggregations.getUserWithPosts(req.params.userId as string);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

