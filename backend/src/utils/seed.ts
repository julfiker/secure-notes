import dotenv from 'dotenv';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { User } from '../models/User';
import { Note } from '../models/Note';
import { Post } from '../models/Post';
import { UserRole } from '../types';

dotenv.config();

export const seedData = async (): Promise<void> => {
  console.log('[Seed] Starting database seeding...');

  // Clear existing collections
  await User.deleteMany({});
  await Note.deleteMany({});
  await Post.deleteMany({});

  // 1. Create Initial Administrator
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'AdminSecurePass123!';
  const adminName = process.env.INITIAL_ADMIN_NAME || 'Platform Administrator';

  const admin = await User.create({
    name: adminName,
    email: adminEmail,
    password: adminPassword,
    role: UserRole.ADMIN,
    interests: ['Security', 'Cloud', 'Architecture'],
  });
  console.log(`[Seed] Administrator created: ${admin.email}`);

  // 2. Create Sample Users matching interview example
  const john = await User.create({
    name: 'John',
    email: 'john@example.com',
    password: 'Password123!',
    role: UserRole.USER,
    interests: ['Technology', 'Sports'],
  });

  const sarah = await User.create({
    name: 'Sarah',
    email: 'sarah@example.com',
    password: 'Password123!',
    role: UserRole.USER,
    interests: ['Technology', 'Music'],
  });

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
    interests: [], // Edge case: empty interests
  });

  console.log('[Seed] Standard users created: John, Sarah, David, Emma');

  // 3. Create Sample Notes
  await Note.create([
    {
      userId: john._id,
      title: "John's Project Ideas",
      content: 'Exploring event-driven architectures with RabbitMQ and Kafka.',
    },
    {
      userId: john._id,
      title: "John's Book Recommendations",
      content: 'Designing Data-Intensive Applications by Martin Kleppmann.',
    },
    {
      userId: sarah._id,
      title: "Sarah's Music Playlist",
      content: 'Chopin Nocturnes, Hans Zimmer soundtracks, and Daft Punk.',
    },
    {
      userId: sarah._id,
      title: "Sarah's Design Sprint",
      content: 'Wireframing notes dashboard with accessible contrast ratios.',
    },
    {
      userId: david._id,
      title: "David's Marathon Training",
      content: 'Weekly schedule: 10k tempo run Tuesday, 20k long run Sunday.',
    },
    {
      userId: admin._id,
      title: 'Confidential Infrastructure Audit',
      content: 'Annual security penetration test results and firewall rules.',
    },
  ]);
  console.log('[Seed] Sample notes created.');

  // 4. Create Sample Posts for Aggregation Scenario 2
  await Post.create([
    {
      userId: john._id,
      title: 'Introduction to MongoDB Indexes',
      content: 'An in-depth guide to ESR rule, compound indexes, and query plans.',
    },
    {
      userId: john._id,
      title: 'Why TypeScript Matters in Backend Systems',
      content: 'Type safety and compile-time correctness in mission-critical applications.',
    },
    {
      userId: sarah._id,
      title: 'The Art of Clean Architecture',
      content: 'Separation of concerns between controllers, services, and models.',
    },
    {
      userId: david._id,
      title: 'Training for a Half Marathon',
      content: 'Pacing strategies and nutritional preparation.',
    },
  ]);
  console.log('[Seed] Sample posts created.');

  console.log('[Seed] Seeding completed successfully.');
};

connectDatabase()
  .then(async () => {
    await seedData();
    await disconnectDatabase();
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Seed] Error during seeding:', err);
    process.exit(1);
  });

