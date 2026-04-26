import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectToDb(): Promise<void> {
  if (db) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  client = new MongoClient(uri);
  await client.connect();
  db = client.db('projectcode');
  console.log('Successfully connected to MongoDB');
}

export async function getDb(): Promise<Db> {
  if (!db) await connectToDb();
  return db!;
}

