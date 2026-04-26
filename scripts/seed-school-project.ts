import 'dotenv/config';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getDb } from '../server/db';

interface ProfileDoc {
  _id: string;
  username?: string;
}

interface SchoolProjectDoc {
  _id: string;
  title: string;
  description: string;
  language: string;
  difficulty: string;
  learningGoals: string[];
  files: unknown[];
  steps: unknown[];
  sourceChallengeId: string | null;
  sourceWinnerId: string | null;
  sourceWinnerUsername: string | null;
  likes: number;
  createdAt: string;
  updatedAt: string;
}

// Strip a leading JS-style block comment (the `pasted_text` files start with one).
function stripLeadingComment(s: string): string {
  const trimmed = s.trimStart();
  if (trimmed.startsWith('/*')) {
    const end = trimmed.indexOf('*/');
    if (end !== -1) return trimmed.slice(end + 2);
  }
  return trimmed;
}

function getFlag(name: string): string | null {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

async function main() {
  const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const path = positional[0];
  const userIdOverride = getFlag('user-id');
  if (!path) {
    console.error('usage: tsx scripts/seed-school-project.ts <path-to-json> [--user-id=<id>]');
    process.exit(1);
  }

  const raw = readFileSync(resolve(path), 'utf-8');
  const cleaned = stripLeadingComment(raw);
  const input = JSON.parse(cleaned) as Record<string, unknown>;

  const title = String(input.title ?? '').trim();
  const description = String(input.description ?? '').trim();
  const language = String(input.language ?? '').trim();
  const difficulty = String(input.difficulty ?? '').trim();
  if (!title) throw new Error('title required');
  if (!language) throw new Error('language required');
  if (!['Beginner', 'Intermediate', 'Advanced'].includes(difficulty)) {
    throw new Error(`difficulty must be Beginner|Intermediate|Advanced, got ${difficulty}`);
  }

  const learningGoals = Array.isArray(input.learningGoals)
    ? (input.learningGoals as unknown[]).filter((g): g is string => typeof g === 'string')
    : [];
  const files = Array.isArray(input.files) ? (input.files as unknown[]) : [];
  const steps = Array.isArray(input.steps) ? (input.steps as unknown[]) : [];

  const sourceWinnerId =
    userIdOverride ??
    (typeof input.userId === 'string' ? input.userId : null);
  const sourceChallengeId =
    typeof input.sourceChallengeId === 'string' ? input.sourceChallengeId : null;

  const db = await getDb();

  // Look up username for the original owner, if we have a userId.
  let sourceWinnerUsername: string | null = null;
  if (sourceWinnerId) {
    const profile = await db
      .collection<ProfileDoc>('profiles')
      .findOne({ _id: sourceWinnerId });
    sourceWinnerUsername = profile?.username ?? null;
  }

  const now = new Date().toISOString();
  const doc: SchoolProjectDoc = {
    _id: typeof input._id === 'string' ? input._id : randomUUID(),
    title,
    description,
    language,
    difficulty,
    learningGoals,
    files,
    steps,
    sourceChallengeId,
    sourceWinnerId,
    sourceWinnerUsername,
    likes: typeof input.likes === 'number' ? input.likes : 0,
    createdAt: now,
    updatedAt: now,
  };

  await db
    .collection<SchoolProjectDoc>('school_projects')
    .replaceOne({ _id: doc._id }, doc, { upsert: true });

  console.log(JSON.stringify(
    {
      ok: true,
      id: doc._id,
      title: doc.title,
      sourceWinnerId,
      sourceWinnerUsername,
      stepCount: steps.length,
      fileCount: files.length,
    },
    null,
    2,
  ));

  process.exit(0);
}

main().catch((err) => {
  console.error('seed failed:', err);
  process.exit(1);
});
