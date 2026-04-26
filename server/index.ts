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
  fullName: string;
  bio: string;
  avatarUrl: string;
  linkedinUrl: string;
  githubUrl: string;
  twitterUrl: string;
  updatedAt: string;
}

const emptyProfile = (userId: string): ProfileDoc => ({
  _id: userId,
  userId,
  fullName: '',
  bio: '',
  avatarUrl: '',
  linkedinUrl: '',
  githubUrl: '',
  twitterUrl: '',
  updatedAt: '',
});

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
    const db = await getDb();
    const doc = await db
      .collection<ProfileDoc>('profiles')
      .findOne({ _id: req.userId! });
    const profile = doc ?? emptyProfile(req.userId!);
    const { _id, userId, ...rest } = profile;
    res.json(rest);
  } catch (err) {
    res.status(500).json({ error: 'fetch failed', detail: String(err) });
  }
});

app.put('/api/profile', requireAuth, async (req, res) => {
  try {
    const body = req.body ?? {};
    const trim = (s: unknown, max: number): string =>
      typeof s === 'string' ? s.trim().slice(0, max) : '';

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

    const doc: ProfileDoc = {
      _id: req.userId!,
      userId: req.userId!,
      fullName,
      bio,
      avatarUrl,
      linkedinUrl,
      githubUrl,
      twitterUrl,
      updatedAt: new Date().toISOString(),
    };
    const db = await getDb();
    await db
      .collection<ProfileDoc>('profiles')
      .replaceOne({ _id: req.userId! }, doc, { upsert: true });
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

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
