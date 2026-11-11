import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { UnauthorizedError } from '../utils/errors';
import { User } from '../models/User';

export const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication required. Missing Bearer token.');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Invalid authorization token format.');
    }

    const decoded = verifyToken(token);

    // Database-backed verification: Ensure the user still exists and obtain the current active role
    // This strictly prevents stale role claims from previously issued tokens
    const currentUser = await User.findById(decoded.id).select('_id email role');
    if (!currentUser) {
      throw new UnauthorizedError('User account associated with this token no longer exists.');
    }

    req.user = {
      id: currentUser._id.toString(),
      email: currentUser.email,
      role: currentUser.role,
    };

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      next(new UnauthorizedError('Invalid or expired authentication token.'));
    }
  }
};

