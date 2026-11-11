import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../src/models/User';
import { Note } from '../src/models/Note';
import { Post } from '../src/models/Post';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { UserRole } from '../src/types';

describe('Phase 6: Database Indexing & Query Execution Plans (.explain)', () => {
  let mongoServer: MongoMemoryServer;
  let testUserId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await connectDatabase(mongoServer.getUri());

    await User.init();
    await Note.init();
    await Post.init();

    // Insert sample documents to allow query planner to evaluate execution stats
    testUserId = new mongoose.Types.ObjectId();
    await User.create({
      _id: testUserId,
      name: 'Indexing Tester',
      email: 'index_test@example.com',
      password: 'Password123!',
      role: UserRole.USER,
      interests: ['database', 'indexing'],
    });

    for (let i = 0; i < 5; i++) {
      await Note.create({
        userId: testUserId,
        title: `Test Note ${i}`,
        content: `Content ${i}`,
      });

      await Post.create({
        userId: testUserId,
        title: `Test Post ${i}`,
        content: `Post content ${i}`,
      });
    }
  });

  afterAll(async () => {
    await disconnectDatabase();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it('Index 1: Email point-lookup query must use IXSCAN on email_1', async () => {
    const explainResult: any = await User.find({ email: 'index_test@example.com' })
      .explain('executionStats');

    const winningPlan = explainResult.queryPlanner?.winningPlan;
    const planStr = JSON.stringify(winningPlan);

    expect(planStr).toContain('email_1');
    expect(planStr).toContain('IXSCAN');
    expect(explainResult.executionStats.nReturned).toBe(1);
    expect(explainResult.executionStats.totalDocsExamined).toBe(1);
  });

  it('Index 2: User pagination query must use IXSCAN on createdAt_-1__id_-1 without in-memory sort', async () => {
    const explainResult: any = await User.find({})
      .sort({ createdAt: -1, _id: -1 })
      .limit(10)
      .explain('executionStats');

    const winningPlan = explainResult.queryPlanner?.winningPlan;
    // When an index supports the sort order, no SORT stage is generated
    const stageStr = JSON.stringify(winningPlan);
    expect(stageStr).toContain('createdAt_-1__id_-1');
    expect(stageStr).toContain('IXSCAN');
  });

  it('Index 3: User-specific note listing must use IXSCAN on userId_1_createdAt_-1__id_-1', async () => {
    const explainResult: any = await Note.find({ userId: testUserId })
      .sort({ createdAt: -1, _id: -1 })
      .limit(10)
      .explain('executionStats');

    const winningPlan = explainResult.queryPlanner?.winningPlan;
    const stageStr = JSON.stringify(winningPlan);
    expect(stageStr).toContain('userId_1_createdAt_-1__id_-1');
    expect(stageStr).toContain('IXSCAN');
  });

  it('Index 4: Admin global note listing must use IXSCAN on createdAt_-1__id_-1', async () => {
    const explainResult: any = await Note.find({})
      .sort({ createdAt: -1, _id: -1 })
      .limit(10)
      .explain('executionStats');

    const winningPlan = explainResult.queryPlanner?.winningPlan;
    const stageStr = JSON.stringify(winningPlan);
    expect(stageStr).toContain('createdAt_-1__id_-1');
    expect(stageStr).toContain('IXSCAN');
  });

  it('Index 5: User post listing and $lookup foreign match must use IXSCAN on userId_1_createdAt_-1__id_-1', async () => {
    const explainResult: any = await Post.find({ userId: testUserId })
      .sort({ createdAt: -1, _id: -1 })
      .limit(10)
      .explain('executionStats');

    const winningPlan = explainResult.queryPlanner?.winningPlan;
    const stageStr = JSON.stringify(winningPlan);
    expect(stageStr).toContain('userId_1_createdAt_-1__id_-1');
    expect(stageStr).toContain('IXSCAN');
  });
});

