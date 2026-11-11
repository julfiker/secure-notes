import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required prior to authorization check.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError(`Access denied. Requires one of: [${allowedRoles.join(', ')}]`));
    }

    next();
  };
};

