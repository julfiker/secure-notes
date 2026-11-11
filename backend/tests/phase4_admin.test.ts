import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app';
import { User } from '../src/models/User';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { generateToken } from '../src/utils/jwt';
import { UserRole } from '../src/types';

describe('Phase 4: Admin User Management & RBAC Tests', () => {
  let mongoServer: MongoMemoryServer;
  let adminToken: string;
  let adminId: string;
  let userToken: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await connectDatabase(mongoServer.getUri());
    await User.init();

    const admin = await User.create({
      name: 'Super Admin',
      email: 'superadmin@example.com',
      password: 'AdminPassword123!',
      role: UserRole.ADMIN,
    });
    adminId = admin._id.toString();
    adminToken = generateToken({ id: adminId, email: admin.email, role: admin.role });

    const user = await User.create({
      name: 'Standard User',
      email: 'standard@example.com',
      password: 'UserPassword123!',
      role: UserRole.USER,
    });
    userToken = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });
  });

  afterAll(async () => {
    await disconnectDatabase();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it('should list all users for admin with pagination metadata', async () => {
    const res = await request(app)
      .get('/api/admin/users?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination.totalCount).toBe(2);
  });

  it('should allow admin to create a new user with custom role and interests', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Manager User',
        email: 'manager@example.com',
        password: 'ManagerPassword123!',
        role: UserRole.ADMIN,
        interests: ['management', 'leadership'],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe(UserRole.ADMIN);
    expect(res.body.data.interests).toContain('management');
  });

  it('should allow admin to update user role and interests', async () => {
    const targetUser = await User.findOne({ email: 'standard@example.com' });

    const res = await request(app)
      .put(`/api/admin/users/${targetUser!._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Promoted User',
        role: UserRole.ADMIN,
        interests: ['promoted', 'admin_access'],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Promoted User');
    expect(res.body.data.role).toBe(UserRole.ADMIN);
  });

  it('CRITICAL SAFETY RULE: Admin cannot delete their own active account', async () => {
    const res = await request(app)
      .delete(`/api/admin/users/${adminId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('cannot delete their own');

    const adminStillExists = await User.findById(adminId);
    expect(adminStillExists).not.toBeNull();
  });

  it('should allow admin to delete another user account', async () => {
    const userToDelete = await User.create({
      name: 'To Be Deleted',
      email: 'delete_me@example.com',
      password: 'Password123!',
      role: UserRole.USER,
    });

    const res = await request(app)
      .delete(`/api/admin/users/${userToDelete._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);

    const deleted = await User.findById(userToDelete._id);
    expect(deleted).toBeNull();
  });

  it('Non-admin user cannot access admin user management endpoints', async () => {
    const regularUser = await User.create({
      name: 'Pure Regular User',
      email: 'pure_regular@example.com',
      password: 'UserPassword123!',
      role: UserRole.USER,
    });
    const regularUserToken = generateToken({
      id: regularUser._id.toString(),
      email: regularUser.email,
      role: regularUser.role,
    });

    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${regularUserToken}`);

    expect(res.status).toBe(403);
  });
});

