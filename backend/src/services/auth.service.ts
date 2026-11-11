import { User } from '../models/User';
import { UserRole, SafeUser } from '../types';
import { generateToken } from '../utils/jwt';
import { ConflictError, UnauthorizedError, NotFoundError } from '../utils/errors';
import { RegisterInput, LoginInput } from '../validations/auth.validation';

const toSafeUser = (user: any): SafeUser => ({
  id: user._id ? user._id.toString() : user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  interests: user.interests || [],
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export class AuthService {
  static async register(input: RegisterInput): Promise<{ user: SafeUser; token: string }> {
    const existing = await User.findOne({ email: input.email });
    if (existing) {
      throw new ConflictError('A user with this email address already exists');
    }

    // Explicit constraint: Never allow public registration to assign ADMIN role
    const user = await User.create({
      name: input.name,
      email: input.email,
      password: input.password,
      role: UserRole.USER,
      interests: input.interests || [],
    });

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return {
      user: toSafeUser(user),
      token,
    };
  }

  static async login(input: LoginInput): Promise<{ user: SafeUser; token: string }> {
    // Explicitly select password which is marked select: false in schema
    const user = await User.findOne({ email: input.email }).select('+password');
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isMatch = await user.comparePassword(input.password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return {
      user: toSafeUser(user),
      token,
    };
  }

  static async getCurrentUser(userId: string): Promise<SafeUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User profile not found');
    }

    return toSafeUser(user);
  }
}

