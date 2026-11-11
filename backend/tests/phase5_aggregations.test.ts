import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../src/app';
import { User } from '../src/models/User';
import { Post } from '../src/models/Post';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { generateToken } from '../src/utils/jwt';
import { UserRole } from '../src/types';

describe('Phase 5: Aggregations Verification Tests', () => {
  let mongoServer: MongoMemoryServer;
  let adminToken: string;
  let johnId: string;
  let sarahId: string;
  let emmaId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await connectDatabase(mongoServer.getUri());
    await User.init();
    await Post.init();

    const admin = await User.create({
      name: 'Admin Aggregation',
      email: 'admin_agg@example.com',
      password: 'AdminPassword123!',
      role: UserRole.ADMIN,
      interests: ['Security'],
    });
    adminToken = generateToken({ id: admin._id.toString(), email: admin.email, role: admin.role });

    // Seed data exactly matching Interview Spec
    const john = await User.create({
      name: 'John',
      email: 'john@example.com',
      password: 'Password123!',
      role: UserRole.USER,
      interests: ['Technology', 'Sports'],
    });
    johnId = john._id.toString();

    const sarah = await User.create({
      name: 'Sarah',
      email: 'sarah@example.com',
      password: 'Password123!',
      role: UserRole.USER,
      interests: ['Technology', 'Music'],
    });
    sarahId = sarah._id.toString();

    const david = await User.create({
      name: 'David',
      email: 'david@example.com',
      password: 'Password123!',
      role: UserRole.USER,
      interests: ['Sports', 'Music'],
    });

    const emma = await User.create({
      name: 'Emma',
      email: 'emma@example.com',
      password: 'Password123!',
      role: UserRole.USER,
      interests: [], // empty interests edge case
    });
    emmaId = emma._id.toString();

    // Create posts for John
    await Post.create([
      {
        userId: john._id,
        title: "John's First Post",
        content: 'Content about Technology and MongoDB.',
      },
      {
        userId: john._id,
        title: "John's Second Post",
        content: 'Content about Sports.',
      },
    ]);

    // Create post for Sarah
    await Post.create({
      userId: sarah._id,
      title: "Sarah's Music Post",
      content: 'Content about Classical Music.',
    });
  });

  afterAll(async () => {
    await disconnectDatabase();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it('Scenario 1: should correctly group users by interests using single aggregate() call', async () => {
    const res = await request(app)
      .get('/api/aggregations/users-by-interest')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data: Array<{ interest: string; userCount: number; users: Array<any> }> = res.body.data;
    expect(Array.isArray(data)).toBe(true);

    // Verify Technology group (John and Sarah)
    const techGroup = data.find((g) => g.interest === 'Technology');
    expect(techGroup).toBeDefined();
    expect(techGroup?.userCount).toBe(2);
    const techUserNames = techGroup?.users.map((u) => u.name);
    expect(techUserNames).toContain('John');
    expect(techUserNames).toContain('Sarah');

    // Verify Sports group (John and David)
    const sportsGroup = data.find((g) => g.interest === 'Sports');
    expect(sportsGroup).toBeDefined();
    expect(sportsGroup?.userCount).toBe(2);
    const sportsUserNames = sportsGroup?.users.map((u) => u.name);
    expect(sportsUserNames).toContain('John');
    expect(sportsUserNames).toContain('David');

    // Verify Music group (Sarah and David)
    const musicGroup = data.find((g) => g.interest === 'Music');
    expect(musicGroup).toBeDefined();
    expect(musicGroup?.userCount).toBe(2);
    const musicUserNames = musicGroup?.users.map((u) => u.name);
    expect(musicUserNames).toContain('Sarah');
    expect(musicUserNames).toContain('David');

    // Verify Security group (Admin)
    const secGroup = data.find((g) => g.interest === 'Security');
    expect(secGroup).toBeDefined();
    expect(secGroup?.userCount).toBe(1);

    // Verify that empty-interest user (Emma) did not create an empty interest bucket
    const emptyGroup = data.find((g) => !g.interest || g.interest === '');
    expect(emptyGroup).toBeUndefined();

    // Verify passwords are NEVER leaked
    for (const group of data) {
      for (const u of group.users) {
        expect(u.password).toBeUndefined();
      }
    }
  });

  it('Scenario 2: should retrieve user profile and associated posts using $lookup aggregation', async () => {
    const res = await request(app)
      .get(`/api/aggregations/user-posts/${johnId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const userProfile = res.body.data;
    expect(userProfile.name).toBe('John');
    expect(userProfile.email).toBe('john@example.com');
    expect(userProfile.postCount).toBe(2);
    expect(userProfile.posts.length).toBe(2);
    expect(userProfile.posts[0].title).toBeDefined();
    expect(userProfile.password).toBeUndefined();
  });

  it('Scenario 2: should handle users who have zero posts gracefully', async () => {
    const res = await request(app)
      .get(`/api/aggregations/user-posts/${emmaId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Emma');
    expect(res.body.data.postCount).toBe(0);
    expect(res.body.data.posts).toEqual([]);
  });

  it('Scenario 2: should return 404 if user does not exist', async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/api/aggregations/user-posts/${nonExistentId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

