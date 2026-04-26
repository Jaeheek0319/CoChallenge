import 'dotenv/config';
import { randomUUID } from 'crypto';
import express from 'express';
import { getDb } from './db';
import { requireAuth } from './auth';

const app = express();
app.use(express.json({ limit: '2mb' }));

interface ProjectDoc {
  _id: string;
  userId: string;
  title: string;
  description: string;
  language: string;
  difficulty: string;
  learningGoals: string[];
  files: unknown[];
  steps: unknown[];
  currentStep: number;
  updatedAt: string;
}

interface ChallengeDoc {
  _id: string;
  authorId: string;
  authorEmail: string;
  authorUsername: string;
  title: string;
  description: string;
  language: string;
  difficulty: string;
  tags: string[];
  requirements: string;
  resources: string;
  starterCode: string;
  estimatedTime: string;
  company: { name: string; role: string } | null;
  verified: boolean;
  logoUrl: string | null;
  likes: number;
  createdAt: string;
}

interface VerifiedCompany {
  name: string;
  logoFile: string;
}

const VERIFIED_COMPANY_DOMAINS: Record<string, VerifiedCompany> = {
  'stripe.com': { name: 'Stripe', logoFile: 'stripe.svg' },
  'vercel.com': { name: 'Vercel', logoFile: 'vercel.svg' },
  'airbnb.com': { name: 'Airbnb', logoFile: 'airbnb.svg' },
  'linear.app': { name: 'Linear', logoFile: 'linear.svg' },
  'autodb.app': { name: 'AutoDB', logoFile: 'autodb.svg' },
};

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const LOGO_BUCKET = process.env.SUPABASE_LOGO_BUCKET ?? 'logos';

function publicLogoUrl(file: string): string | null {
  if (!SUPABASE_URL) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${LOGO_BUCKET}/${file}`;
}

const ALLOWED_DIFFICULTIES = new Set(['Beginner', 'Intermediate', 'Advanced']);

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
  updatedAt: string;
}

const emptyProfile = (userId: string, username: string): ProfileDoc => ({
  _id: userId,
  userId,
  username,
  fullName: '',
  bio: '',
  avatarUrl: '',
  linkedinUrl: '',
  githubUrl: '',
  twitterUrl: '',
  updatedAt: '',
});

const RESERVED_USERNAMES = new Set([
  'admin', 'settings', 'api', 'login', 'signup', 'logout',
  'null', 'undefined', 'me', 'search', 'user', 'users',
  'profile', 'profiles', 'auth', 'health', 'home',
]);

class UsernameValidationError extends Error {}

function validateUsername(raw: unknown): string {
  if (typeof raw !== 'string') throw new UsernameValidationError('username must be a string');
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.length < 3 || trimmed.length > 30) {
    throw new UsernameValidationError('username must be 3-30 characters');
  }
  if (!/^[a-z0-9_-]+$/.test(trimmed)) {
    throw new UsernameValidationError('username may only contain letters, numbers, _ and -');
  }
  if (RESERVED_USERNAMES.has(trimmed)) {
    throw new UsernameValidationError('username is reserved');
  }
  return trimmed;
}

function deriveUsernameBase(email: string): string {
  if (!email || !email.includes('@')) return 'user';
  const cleaned = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const sliced = cleaned.slice(0, 25);
  if (sliced.length < 3) return `user-${sliced || ''}`.slice(0, 30);
  if (RESERVED_USERNAMES.has(sliced)) return `${sliced}-1`;
  return sliced;
}

async function pickAvailableUsername(base: string): Promise<string> {
  const db = await getDb();
  const collection = db.collection<ProfileDoc>('profiles');
  if (!(await collection.findOne({ username: base }))) return base;
  for (let i = 1; i < 1000; i++) {
    const candidate = `${base}-${i}`.slice(0, 30);
    if (!(await collection.findOne({ username: candidate }))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`.slice(0, 30);
}

let indexesEnsured = false;
async function ensureIndexes(): Promise<void> {
  if (indexesEnsured) return;
  const db = await getDb();
  await db.collection<ProfileDoc>('profiles').createIndex(
    { username: 1 },
    {
      unique: true,
      partialFilterExpression: { username: { $type: 'string', $gt: '' } },
    }
  );
  indexesEnsured = true;
}

function isValidAvatarUrl(url: string, userId: string): boolean {
  if (url === '') return true;
  const re = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/avatars\/([^/]+)\/[^/]+\.(png|jpe?g|webp)(\?.*)?$/i;
  const m = url.match(re);
  if (!m) return false;
  return m[1] === userId;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    res.json({ userId: req.userId, dbConnected: true });
  } catch (err) {
    res.status(500).json({ error: 'db ping failed', detail: String(err) });
  }
});

app.get('/api/profile', requireAuth, async (req, res) => {
  try {
    await ensureIndexes();
    const db = await getDb();
    const collection = db.collection<ProfileDoc>('profiles');
    let doc = await collection.findOne({ _id: req.userId! });

    if (!doc) {
      const base = deriveUsernameBase(req.userEmail ?? '');
      const username = await pickAvailableUsername(base);
      doc = emptyProfile(req.userId!, username);
      await collection.insertOne(doc);
    } else if (!doc.username) {
      const base = deriveUsernameBase(req.userEmail ?? '');
      const username = await pickAvailableUsername(base);
      await collection.updateOne({ _id: req.userId! }, { $set: { username } });
      doc.username = username;
    }

    const { _id, userId, ...rest } = doc;
    res.json(rest);
  } catch (err) {
    res.status(500).json({ error: 'fetch failed', detail: String(err) });
  }
});

app.get('/api/profile/check-username', requireAuth, async (req, res) => {
  let username: string;
  try {
    username = validateUsername(req.query.username);
  } catch (err) {
    if (err instanceof UsernameValidationError) {
      return res.json({ available: false, reason: err.message });
    }
    return res.status(500).json({ error: 'check failed', detail: String(err) });
  }
  try {
    const db = await getDb();
    const existing = await db
      .collection<ProfileDoc>('profiles')
      .findOne({ username });
    if (!existing) return res.json({ available: true });
    return res.json({
      available: existing._id === req.userId,
      isMine: existing._id === req.userId,
    });
  } catch (err) {
    res.status(500).json({ error: 'check failed', detail: String(err) });
  }
});

app.put('/api/profile', requireAuth, async (req, res) => {
  try {
    await ensureIndexes();
    const body = req.body ?? {};
    const trim = (s: unknown, max: number): string =>
      typeof s === 'string' ? s.trim().slice(0, max) : '';

    let username: string;
    try {
      username = validateUsername(body.username);
    } catch (err) {
      if (err instanceof UsernameValidationError) {
        return res.status(400).json({ error: err.message });
      }
      throw err;
    }

    const fullName = trim(body.fullName, 100);
    const bio = trim(body.bio, 280);
    const avatarUrl = trim(body.avatarUrl, 500);
    const linkedinUrl = trim(body.linkedinUrl, 300);
    const githubUrl = trim(body.githubUrl, 300);
    const twitterUrl = trim(body.twitterUrl, 300);

    const validUrl = (u: string) => u === '' || /^https?:\/\//i.test(u);
    if (!validUrl(linkedinUrl) || !validUrl(githubUrl) || !validUrl(twitterUrl)) {
      return res.status(400).json({ error: 'urls must start with http(s)://' });
    }
    if (!isValidAvatarUrl(avatarUrl, req.userId!)) {
      return res.status(400).json({ error: 'avatarUrl must be a Supabase avatars/<userId>/* URL' });
    }

    const db = await getDb();
    const collection = db.collection<ProfileDoc>('profiles');

    const conflict = await collection.findOne({
      username,
      _id: { $ne: req.userId! },
    });
    if (conflict) {
      return res.status(409).json({ error: 'username is taken' });
    }

    const doc: ProfileDoc = {
      _id: req.userId!,
      userId: req.userId!,
      username,
      fullName,
      bio,
      avatarUrl,
      linkedinUrl,
      githubUrl,
      twitterUrl,
      updatedAt: new Date().toISOString(),
    };

    await collection.replaceOne({ _id: req.userId! }, doc, { upsert: true });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'save failed', detail: String(err) });
  }
});

app.get('/api/projects', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const docs = await db
      .collection<ProjectDoc>('projects')
      .find({ userId: req.userId! })
      .toArray();
    const projects = docs.map(({ _id, userId, ...rest }) => ({ id: _id, ...rest }));
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'fetch failed', detail: String(err) });
  }
});

app.put('/api/projects/:id', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const id = req.params.id;
    const { id: _ignore, ...body } = req.body ?? {};
    const doc: ProjectDoc = {
      _id: id,
      userId: req.userId!,
      title: body.title ?? '',
      description: body.description ?? '',
      language: body.language ?? '',
      difficulty: body.difficulty ?? '',
      learningGoals: body.learningGoals ?? [],
      files: body.files ?? [],
      steps: body.steps ?? [],
      currentStep: body.currentStep ?? 0,
      updatedAt: body.updatedAt ?? new Date().toISOString(),
    };
    await db
      .collection<ProjectDoc>('projects')
      .replaceOne({ _id: id, userId: req.userId! }, doc, { upsert: true });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'save failed', detail: String(err) });
  }
});

app.delete('/api/projects/:id', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const result = await db
      .collection<ProjectDoc>('projects')
      .deleteOne({ _id: req.params.id, userId: req.userId! });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'not found' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'delete failed', detail: String(err) });
  }
});

app.get('/api/challenges', async (_req, res) => {
  try {
    const db = await getDb();
    const docs = await db
      .collection<ChallengeDoc>('challenges')
      .find({})
      .sort({ likes: -1, createdAt: -1 })
      .toArray();
    const challenges = docs.map(({ _id, ...rest }) => ({ id: _id, ...rest }));
    res.json(challenges);
  } catch (err) {
    res.status(500).json({ error: 'fetch failed', detail: String(err) });
  }
});

app.post('/api/challenges', requireAuth, async (req, res) => {
  try {
    const body = req.body ?? {};
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const language = typeof body.language === 'string' ? body.language.trim() : '';
    const difficulty = typeof body.difficulty === 'string' ? body.difficulty.trim() : '';

    if (!title || title.length > 120) {
      return res.status(400).json({ error: 'title required (1-120 chars)' });
    }
    if (!description || description.length > 1000) {
      return res.status(400).json({ error: 'description required (1-1000 chars)' });
    }
    if (!language || language.length > 40) {
      return res.status(400).json({ error: 'language required (1-40 chars)' });
    }
    if (!ALLOWED_DIFFICULTIES.has(difficulty)) {
      return res.status(400).json({ error: 'difficulty must be Beginner | Intermediate | Advanced' });
    }

    const tags = Array.isArray(body.tags)
      ? body.tags
          .map((t: unknown) => (typeof t === 'string' ? t.trim() : ''))
          .filter((t: string) => t.length > 0 && t.length <= 30)
          .slice(0, 12)
      : [];

    const requirements =
      typeof body.requirements === 'string' ? body.requirements.slice(0, 4000) : '';
    const resources =
      typeof body.resources === 'string' ? body.resources.slice(0, 4000) : '';
    const starterCode =
      typeof body.starterCode === 'string' ? body.starterCode.slice(0, 10000) : '';
    const estimatedTime =
      typeof body.estimatedTime === 'string' ? body.estimatedTime.trim().slice(0, 40) : '';

    const submittedCompanyName =
      typeof body.company?.name === 'string' ? body.company.name.trim().slice(0, 60) : '';
    const submittedCompanyRole =
      typeof body.company?.role === 'string' ? body.company.role.trim().slice(0, 60) : '';

    const email = (req.userEmail ?? '').toLowerCase();
    const domain = email.includes('@') ? email.split('@')[1] : '';
    const verifiedCompany = VERIFIED_COMPANY_DOMAINS[domain] ?? null;

    let company: ChallengeDoc['company'] = null;
    let logoUrl: string | null = null;
    if (verifiedCompany) {
      company = { name: verifiedCompany.name, role: submittedCompanyRole || 'Engineer' };
      logoUrl = publicLogoUrl(verifiedCompany.logoFile);
    } else if (submittedCompanyName) {
      company = { name: submittedCompanyName, role: submittedCompanyRole };
    }

    const username = email ? email.split('@')[0] : 'anonymous';

    const doc: ChallengeDoc = {
      _id: randomUUID(),
      authorId: req.userId!,
      authorEmail: email,
      authorUsername: username,
      title,
      description,
      language,
      difficulty,
      tags,
      requirements,
      resources,
      starterCode,
      estimatedTime,
      company,
      verified: Boolean(verifiedCompany),
      logoUrl,
      likes: 0,
      createdAt: new Date().toISOString(),
    };

    const db = await getDb();
    await db.collection<ChallengeDoc>('challenges').insertOne(doc);

    const { _id, ...rest } = doc;
    res.status(201).json({ id: _id, ...rest });
  } catch (err) {
    res.status(500).json({ error: 'create failed', detail: String(err) });
  }
});

function publicProfile(doc: ProfileDoc) {
  return {
    username: doc.username,
    fullName: doc.fullName,
    bio: doc.bio,
    avatarUrl: doc.avatarUrl,
    linkedinUrl: doc.linkedinUrl,
    githubUrl: doc.githubUrl,
    twitterUrl: doc.twitterUrl,
    updatedAt: doc.updatedAt,
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

app.get('/api/users/search', async (req, res) => {
  try {
    const q = String(req.query.q ?? '').trim();
    if (!q) return res.json([]);
    const re = new RegExp(escapeRegex(q), 'i');
    const db = await getDb();
    const docs = await db
      .collection<ProfileDoc>('profiles')
      .find({
        $and: [
          { username: { $type: 'string', $gt: '' } },
          { $or: [{ username: re }, { fullName: re }] },
        ],
      })
      .limit(10)
      .toArray();
    res.json(
      docs.map((d) => ({
        username: d.username,
        fullName: d.fullName,
        avatarUrl: d.avatarUrl,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: 'search failed', detail: String(err) });
  }
});

app.get('/api/users/:username', async (req, res) => {
  try {
    const username = req.params.username.toLowerCase();
    const db = await getDb();
    const doc = await db
      .collection<ProfileDoc>('profiles')
      .findOne({ username });
    if (!doc) return res.status(404).json({ error: 'not found' });
    res.json(publicProfile(doc));
  } catch (err) {
    res.status(500).json({ error: 'fetch failed', detail: String(err) });
  }
});

app.get('/api/users/:username/projects', async (req, res) => {
  try {
    const username = req.params.username.toLowerCase();
    const db = await getDb();
    const profile = await db
      .collection<ProfileDoc>('profiles')
      .findOne({ username });
    if (!profile) return res.status(404).json({ error: 'user not found' });
    const docs = await db
      .collection<ProjectDoc>('projects')
      .find({ userId: profile.userId })
      .sort({ updatedAt: -1 })
      .toArray();
    const projects = docs.map(({ _id, userId, files, steps, ...rest }) => ({
      id: _id,
      ...rest,
      totalSteps: Array.isArray(steps) ? steps.length : 0,
    }));
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'fetch failed', detail: String(err) });
  }
});

app.get('/api/users/:username/challenges', async (req, res) => {
  try {
    const username = req.params.username.toLowerCase();
    const db = await getDb();
    const profile = await db
      .collection<ProfileDoc>('profiles')
      .findOne({ username });
    if (!profile) return res.status(404).json({ error: 'user not found' });
    const docs = await db
      .collection<ChallengeDoc>('challenges')
      .find({ authorId: profile.userId })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(docs.map(({ _id, authorEmail, ...rest }) => ({ id: _id, ...rest })));
  } catch (err) {
    res.status(500).json({ error: 'fetch failed', detail: String(err) });
  }
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
