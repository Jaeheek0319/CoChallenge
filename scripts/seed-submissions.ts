import 'dotenv/config';
import { createHash } from 'crypto';
import { getDb } from '../server/db';

const CHALLENGE_ID = process.argv[2] ?? 'e39ab251-0cbd-4a73-b679-b59bbd433fe9';

interface SubmissionDoc {
  _id: string;
  challengeId: string;
  userId: string;
  authorEmail: string;
  authorUsername: string;
  zipPath: string | null;
  zipFileName: string | null;
  githubUrl: string;
  deployedUrl: string;
  notes: string;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
}

interface ProfileDoc {
  _id: string;
  userId: string;
  username: string;
  fullName: string;
  bio: string;
  avatarUrl: string;
  linkedinUrl: string;
  githubUrl: string;
  twitterUrl: string;
  elo: number;
  updatedAt: string;
}

interface ChallengeDoc {
  _id: string;
  title: string;
}

// Deterministic UUIDs derived from email so re-running is idempotent.
function stableUserId(email: string): string {
  const h = createHash('sha256').update(email).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

interface SeedSubmitter {
  email: string;
  fullName: string;
  username: string;
  linkedinUrl: string;
  githubUrl: string;
  notes: string;
  builderGithubUrl: string;
  deployedUrl: string;
}

const SEED_SUBMITTERS: SeedSubmitter[] = [
  {
    email: 'alice.chen@example.com',
    fullName: 'Alice Chen',
    username: 'alicechen',
    linkedinUrl: 'https://linkedin.com/in/alicechen',
    githubUrl: 'https://github.com/alicechen',
    notes:
      'Built with React + Tailwind. Focused on accessibility — full keyboard navigation, ARIA roles, screen-reader announcements on state changes. Minor sacrifice on bundle size for animation polish.',
    builderGithubUrl: 'https://github.com/alicechen/challenge-attempt',
    deployedUrl: 'https://alicechen-challenge.vercel.app',
  },
  {
    email: 'bob.singh@example.com',
    fullName: 'Bob Singh',
    username: 'bobsingh',
    linkedinUrl: 'https://linkedin.com/in/bobsingh',
    githubUrl: 'https://github.com/bobsingh',
    notes:
      'Vanilla TS + Vite — no framework. Tradeoff: more code I had to write myself; benefit: no runtime overhead. Hit ~95 Lighthouse perf.',
    builderGithubUrl: 'https://github.com/bobsingh/the-challenge',
    deployedUrl: '',
  },
  {
    email: 'carol.park@example.com',
    fullName: 'Carol Park',
    username: 'carolpark',
    linkedinUrl: 'https://linkedin.com/in/carolpark',
    githubUrl: '',
    notes:
      "Took the spec literally — implemented exactly what's in requirements, nothing more. If you want flair, this isn't it; if you want correctness, this passes every edge case I could think of.",
    builderGithubUrl: '',
    deployedUrl: 'https://carol-park-submission.netlify.app',
  },
  {
    email: 'dimitri.levovich@example.com',
    fullName: 'Dimitri Levovich',
    username: 'dimitril',
    linkedinUrl: 'https://linkedin.com/in/dimitril',
    githubUrl: 'https://github.com/dimitril',
    notes:
      'Stack: Next.js 15 + Drizzle. Did the bonus stretch goal too. Demo includes the optional dark mode toggle and i18n scaffolding for 3 locales.',
    builderGithubUrl: 'https://github.com/dimitril/coding-challenge',
    deployedUrl: 'https://dimitri-challenge.fly.dev',
  },
];

async function main() {
  const db = await getDb();
  const challenge = await db.collection<ChallengeDoc>('challenges').findOne({ _id: CHALLENGE_ID });
  if (!challenge) {
    console.error(`Challenge ${CHALLENGE_ID} not found.`);
    process.exit(1);
  }
  console.log(`Seeding submissions for: "${challenge.title}" (${CHALLENGE_ID})`);

  const submissions = db.collection<SubmissionDoc>('challenge_submissions');
  const profiles = db.collection<ProfileDoc>('profiles');

  let inserted = 0;
  let skipped = 0;

  for (const s of SEED_SUBMITTERS) {
    const userId = stableUserId(s.email);
    const submissionId = `seed-sub-${CHALLENGE_ID.slice(0, 8)}-${s.username}`;
    const now = new Date().toISOString();

    // Profile (upsert so re-runs are safe)
    await profiles.updateOne(
      { _id: userId },
      {
        $setOnInsert: {
          _id: userId,
          userId,
          username: s.username,
          fullName: s.fullName,
          bio: 'Seed account for grading flow demo.',
          avatarUrl: '',
          linkedinUrl: s.linkedinUrl,
          githubUrl: s.githubUrl,
          twitterUrl: '',
          elo: 500,
          updatedAt: now,
        },
      },
      { upsert: true },
    );

    // Submission
    const existing = await submissions.findOne({ _id: submissionId });
    if (existing) {
      skipped++;
      console.log(`• skip   ${s.username} (already submitted)`);
      continue;
    }

    const doc: SubmissionDoc = {
      _id: submissionId,
      challengeId: CHALLENGE_ID,
      userId,
      authorEmail: s.email,
      authorUsername: s.username,
      zipPath: null, // intentionally none — grader has no zip to download
      zipFileName: null,
      githubUrl: s.builderGithubUrl,
      deployedUrl: s.deployedUrl,
      notes: s.notes,
      locked: true,
      createdAt: now,
      updatedAt: now,
      submittedAt: now,
    };
    await submissions.insertOne(doc);
    inserted++;
    console.log(`• insert ${s.username}`);
  }

  console.log(`\nDone. ${inserted} inserted, ${skipped} skipped.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('seed-submissions failed:', err);
  process.exit(1);
});
