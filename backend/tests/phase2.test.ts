import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../src/models/User';
import { Note } from '../src/models/Note';
import { Post } from '../src/models/Post';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { UserRole } from '../src/types';

describe('Phase 2: Database Models & Indexes Verification', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await connectDatabase(mongoServer.getUri());

    // Ensure all model indexes are synchronized with MongoDB
    await User.init();
    await Note.init();
    await Post.init();
  });

  afterAll(async () => {
    await disconnectDatabase();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it('should verify User collection indexes', async () => {
    const userIndexes = await User.collection.indexes();
    const indexNames = userIndexes.map((idx) => idx.name);

    // Index on _id is default
    expect(indexNames).toContain('_id_');
    // Index 1: email_1 unique
    expect(indexNames).toContain('email_1');
    const emailIndex = userIndexes.find((idx) => idx.name === 'email_1');
    expect(emailIndex?.unique).toBe(true);

    // Index 2: createdAt_-1__id_-1
    expect(indexNames).toContain('createdAt_-1__id_-1');

    // Strict constraint: exactly 3 indexes in MongoDB (_id default + 2 declared)
    expect(userIndexes.length).toBe(3);
  });

  it('should verify Note collection indexes', async () => {
    const noteIndexes = await Note.collection.indexes();
    const indexNames = noteIndexes.map((idx) => idx.name);

    expect(indexNames).toContain('_id_');
    // Index 3: userId_1_createdAt_-1__id_-1
    expect(indexNames).toContain('userId_1_createdAt_-1__id_-1');
    // Index 4: createdAt_-1__id_-1
    expect(indexNames).toContain('createdAt_-1__id_-1');

    // Strict constraint: exactly 3 indexes in MongoDB (_id default + 2 declared)
    expect(noteIndexes.length).toBe(3);
  });

  it('should verify Post collection indexes', async () => {
    const postIndexes = await Post.collection.indexes();
    const indexNames = postIndexes.map((idx) => idx.name);

    expect(indexNames).toContain('_id_');
    // Index 5: userId_1_createdAt_-1__id_-1
    expect(indexNames).toContain('userId_1_createdAt_-1__id_-1');

    // Strict constraint: exactly 2 indexes in MongoDB (_id default + 1 declared)
    expect(postIndexes.length).toBe(2);
  });

  it('should hash user password on save and exclude it from JSON serialization', async () => {
    const user = await User.create({
      name: 'Test Candidate',
      email: 'test@example.com',
      password: 'PlainPassword123!',
      role: UserRole.USER,
      interests: ['coding', 'algorithms'],
    });

    expect(user.password).not.toBe('PlainPassword123!');
    expect(user.password?.startsWith('$2')).toBe(true);

    const isMatch = await user.comparePassword('PlainPassword123!');
    expect(isMatch).toBe(true);

    const isWrong = await user.comparePassword('WrongPassword');
    expect(isWrong).toBe(false);

    const json = user.toJSON();
    expect(json.password).toBeUndefined();
    expect(json.__v).toBeUndefined();
    expect(json.id).toBeDefined();
  });

  it('should reject duplicate email registration at the database level', async () => {
    await expect(
      User.create({
        name: 'Duplicate Candidate',
        email: 'test@example.com', // same email
        password: 'AnotherPassword123!',
      })
    ).rejects.toThrow();
  });
});

