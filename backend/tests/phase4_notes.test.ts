import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../src/app';
import { User } from '../src/models/User';
import { Note } from '../src/models/Note';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { generateToken } from '../src/utils/jwt';
import { UserRole } from '../src/types';

describe('Phase 4: Notes CRUD & IDOR Protection Tests', () => {
  let mongoServer: MongoMemoryServer;
  let user1Token: string;
  let user1Id: string;
  let user2Token: string;
  let user2Id: string;
  let adminToken: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await connectDatabase(mongoServer.getUri());
    await User.init();
    await Note.init();

    // Create User 1
    const user1 = await User.create({
      name: 'User One',
      email: 'user1@example.com',
      password: 'Password123!',
      role: UserRole.USER,
    });
    user1Id = user1._id.toString();
    user1Token = generateToken({ id: user1Id, email: user1.email, role: user1.role });

    // Create User 2
    const user2 = await User.create({
      name: 'User Two',
      email: 'user2@example.com',
      password: 'Password123!',
      role: UserRole.USER,
    });
    user2Id = user2._id.toString();
    user2Token = generateToken({ id: user2Id, email: user2.email, role: user2.role });

    // Create Admin
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin_notes@example.com',
      password: 'AdminPassword123!',
      role: UserRole.ADMIN,
    });
    adminToken = generateToken({ id: admin._id.toString(), email: admin.email, role: admin.role });
  });

  afterAll(async () => {
    await disconnectDatabase();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it('should allow User 1 to create a note', async () => {
    const res = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: "User 1's First Note",
        content: 'This note belongs strictly to User 1.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("User 1's First Note");
    expect(res.body.data.userId).toBe(user1Id);
  });

  it('should list only User 1 notes for User 1 with pagination metadata', async () => {
    // Create a note for User 2
    await Note.create({
      userId: new mongoose.Types.ObjectId(user2Id),
      title: "User 2's Secret Note",
      content: 'Confidential to User 2.',
    });

    const res = await request(app)
      .get('/api/notes?page=1&limit=10')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].title).toBe("User 1's First Note");
    expect(res.body.pagination.totalCount).toBe(1);
    expect(res.body.pagination.page).toBe(1);
  });

  it('CRITICAL IDOR TEST: User 2 cannot view User 1 note', async () => {
    const note = await Note.findOne({ userId: user1Id });
    expect(note).toBeDefined();

    const res = await request(app)
      .get(`/api/notes/${note!._id}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Access denied');
  });

  it('CRITICAL IDOR TEST: User 2 cannot update User 1 note', async () => {
    const note = await Note.findOne({ userId: user1Id });

    const res = await request(app)
      .put(`/api/notes/${note!._id}`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        title: 'Tampered Title',
      });

    expect(res.status).toBe(403);

    // Verify title was not changed in database
    const refreshed = await Note.findById(note!._id);
    expect(refreshed?.title).toBe("User 1's First Note");
  });

  it('CRITICAL IDOR TEST: User 2 cannot delete User 1 note', async () => {
    const note = await Note.findOne({ userId: user1Id });

    const res = await request(app)
      .delete(`/api/notes/${note!._id}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(res.status).toBe(403);

    const exists = await Note.findById(note!._id);
    expect(exists).not.toBeNull();
  });

  it('Admin can view any user note', async () => {
    const note = await Note.findOne({ userId: user1Id });

    const res = await request(app)
      .get(`/api/notes/${note!._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("User 1's First Note");
  });

  it('Admin can list all notes across all users from /api/admin/notes', async () => {
    const res = await request(app)
      .get('/api/admin/notes?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Should have User 1's note and User 2's note
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination.totalCount).toBe(2);
  });

  it('Non-admin user cannot access /api/admin/notes', async () => {
    const res = await request(app)
      .get('/api/admin/notes')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(403);
  });
});

