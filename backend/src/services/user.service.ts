import mongoose from 'mongoose';
import { User } from '../models/User';
import { PaginatedResponse, PaginationParams, SafeUser } from '../types';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../utils/errors';
import { AdminCreateUserInput, AdminUpdateUserInput } from '../validations/user.validation';
import { createPaginationMeta } from '../utils/pagination';

const toSafeUser = (user: any): SafeUser => ({
  id: user._id ? user._id.toString() : user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  interests: user.interests || [],
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const validateObjectId = (id: string, fieldName = 'User ID'): void => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequestError(`Invalid format for ${fieldName}: ${id}`);
  }
};

export class UserService {
  static async getAllUsers(params: PaginationParams): Promise<PaginatedResponse<SafeUser>> {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    // Query supported by Index 2: { createdAt: -1, _id: -1 }
    const [users, totalCount] = await Promise.all([
      User.find({})
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments({}),
    ]);

    return {
      success: true,
      data: users.map(toSafeUser),
      pagination: createPaginationMeta(totalCount, page, limit),
    };
  }

  static async getUserById(userId: string): Promise<SafeUser> {
    validateObjectId(userId);

    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return toSafeUser(user);
  }

  static async createUser(input: AdminCreateUserInput): Promise<SafeUser> {
    const existing = await User.findOne({ email: input.email });
    if (existing) {
      throw new ConflictError('A user with this email address already exists');
    }

    const user = await User.create({
      name: input.name,
      email: input.email,
      password: input.password,
      role: input.role,
      interests: input.interests || [],
    });

    return toSafeUser(user);
  }

  static async updateUser(userId: string, input: AdminUpdateUserInput): Promise<SafeUser> {
    validateObjectId(userId);

    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (input.name !== undefined) user.name = input.name;
    if (input.role !== undefined) user.role = input.role;
    if (input.interests !== undefined) user.interests = input.interests;

    await user.save();
    return toSafeUser(user);
  }

  static async deleteUser(targetUserId: string, requestingAdminId: string): Promise<void> {
    validateObjectId(targetUserId, 'Target User ID');

    // Strict constraint: Prevent accidental self-deletion of the authenticated admin
    if (targetUserId === requestingAdminId) {
      throw new ForbiddenError('Administrators cannot delete their own active account.');
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    await User.findByIdAndDelete(targetUserId);
  }
}

