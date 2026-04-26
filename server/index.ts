import 'dotenv/config';
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

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
