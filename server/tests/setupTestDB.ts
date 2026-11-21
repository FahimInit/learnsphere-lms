import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoMemoryServer: MongoMemoryServer | null = null;

export async function setupTestDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  const localTestUri =
    process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/learnsphere_test';

  try {
    await mongoose.connect(localTestUri, {
      serverSelectionTimeoutMS: 1500,
    });
    return;
  } catch {
    await mongoose.disconnect().catch(() => undefined);
    mongoMemoryServer = await MongoMemoryServer.create();
    const memoryUri = mongoMemoryServer.getUri();
    await mongoose.connect(memoryUri);
  }
}

export async function clearTestDB(): Promise<void> {
  if (mongoose.connection.readyState !== 1) return;
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

export async function teardownTestDB(): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
    mongoMemoryServer = null;
  }
}
