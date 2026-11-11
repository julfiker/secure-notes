import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app';
import { User } from '../src/models/User';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { generateToken } from '../src/utils/jwt';
import { UserRole } from '../src/types';

describe('Phase 3: Authentication and Security Tests', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await connectDatabase(mongoServer.getUri());
    await User.init();
  });

  afterAll(async () => {
    await disconnectDatabase();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  it('should successfully register a new user with default USER role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alice Developer',
        email: 'alice@example.com',
        password: 'Password123!',
        interests: ['typescript', 'mongodb'],
        role: 'ADMIN', // Client attempted privilege escalation
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('alice@example.com');
    // Ensure client cannot grant themselves ADMIN
    expect(res.body.data.user.role).toBe(UserRole.USER);
    expect(res.body.data.user.password).toBeUndefined();
    expect(res.body.data.token).toBeDefined();
  });

  it('should reject registration with duplicate email', async () => {
    await User.create({
      name: 'Existing User',
      email: 'duplicate@example.com',
      password: 'Password123!',
    });

    const res = await request(app).post('/api/auth/register').send({
      name: 'Another User',
      email: 'duplicate@example.com',
      password: 'Password456!',
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should reject registration with invalid email or short password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Bad Input',
      email: 'not-an-email',
      password: '123',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.details).toBeDefined();
  });

  it('should successfully login an existing user', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Bob Smith',
      email: 'bob@example.com',
      password: 'SecretPassword123!',
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'bob@example.com',
      password: 'SecretPassword123!',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('bob@example.com');
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('should reject login with incorrect password', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Charlie Brown',
      email: 'charlie@example.com',
      password: 'CorrectPassword123!',
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'charlie@example.com',
      password: 'WrongPassword!',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return current user profile from /api/auth/me with valid token', async () => {
    const registerRes = await request(app).post('/api/auth/register').send({
      name: 'Diana Prince',
      email: 'diana@example.com',
      password: 'Password123!',
      interests: ['superhero', 'security'],
    });

    const token = registerRes.body.data.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.name).toBe('Diana Prince');
    expect(meRes.body.data.email).toBe('diana@example.com');
    expect(meRes.body.data.interests).toEqual(['superhero', 'security']);
    expect(meRes.body.data.password).toBeUndefined();
  });

  it('should reject requests with missing or invalid token', async () => {
    const noTokenRes = await request(app).get('/api/auth/me');
    expect(noTokenRes.status).toBe(401);

    const badTokenRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token-string');
    expect(badTokenRes.status).toBe(401);
  });

  it('should reject a token if the user account was deleted from database', async () => {
    const tempUser = await User.create({
      name: 'Ephemeral User',
      email: 'ephemeral@example.com',
      password: 'Password123!',
      role: UserRole.USER,
    });

    const token = generateToken({
      id: tempUser._id.toString(),
      email: tempUser.email,
      role: tempUser.role,
    });

    // Delete user from database
    await User.findByIdAndDelete(tempUser._id);

    // Request should fail database-backed verification
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('no longer exists');
  });
});

