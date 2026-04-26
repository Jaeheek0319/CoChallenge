import 'dotenv/config';
import { getDb } from '../server/db';

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

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const LOGO_BUCKET = process.env.SUPABASE_LOGO_BUCKET ?? 'logos';

function publicLogoUrl(file: string): string | null {
  if (!SUPABASE_URL) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${LOGO_BUCKET}/${file}`;
}

const NOW = new Date().toISOString();

const SEEDS: ChallengeDoc[] = [
  {
    _id: 'seed-stripe-checkout',
    authorId: 'seed:stripe',
    authorEmail: 'seed@stripe.com',
    authorUsername: 'stripe',
    title: 'One-Click Checkout UI',
    description:
      'Build a high-conversion, accessible checkout form with micro-animations and real-time validation.',
    language: 'React',
    difficulty: 'Advanced',
    tags: ['Payments', 'Animation'],
    requirements:
      'Implement a single-page checkout that collects card details, validates input in real time, and gracefully handles error states. Use accessible labels, keyboard navigation, and ARIA roles. Include subtle entrance animations and a success state.',
    resources:
      'Stripe Elements docs, WAI-ARIA Authoring Practices, Framer Motion animation patterns.',
    starterCode: '',
    estimatedTime: '6 hours',
    company: { name: 'Stripe', role: 'Frontend Engineer' },
    verified: true,
    logoUrl: publicLogoUrl('stripe.svg'),
    likes: 0,
    createdAt: NOW,
  },
  {
    _id: 'seed-vercel-dashboard',
    authorId: 'seed:vercel',
    authorEmail: 'seed@vercel.com',
    authorUsername: 'vercel',
    title: 'Deployment Dashboard',
    description:
      'Create a real-time analytics dashboard showing deployment statuses, build logs, and visitor metrics.',
    language: 'Next.js',
    difficulty: 'Intermediate',
    tags: ['Real-time', 'Analytics'],
    requirements:
      'Stream deployment statuses with optimistic updates. Show build logs with virtualized scrolling. Render visitor metrics as a sparkline. Persist filter state in the URL.',
    resources:
      'Next.js App Router, SWR/React Query for real-time data, Recharts or visx for charts.',
    starterCode: '',
    estimatedTime: '5 hours',
    company: { name: 'Vercel', role: 'Fullstack Developer' },
    verified: true,
    logoUrl: publicLogoUrl('vercel.svg'),
    likes: 0,
    createdAt: NOW,
  },
  {
    _id: 'seed-airbnb-datepicker',
    authorId: 'seed:airbnb',
    authorEmail: 'seed@airbnb.com',
    authorUsername: 'airbnb',
    title: 'Interactive Date Picker',
    description:
      'Design and implement a responsive multi-month date range picker with accessibility in mind.',
    language: 'TypeScript',
    difficulty: 'Intermediate',
    tags: ['Accessibility', 'UI Components'],
    requirements:
      'Two-month side-by-side calendar that collapses to one on mobile. Full keyboard navigation (arrow keys, page up/down). Announce range selection via aria-live. Disable past dates and minimum-stay constraints.',
    resources:
      'WAI-ARIA Date Picker pattern, react-aria-components, date-fns.',
    starterCode: '',
    estimatedTime: '4 hours',
    company: { name: 'Airbnb', role: 'UI/UX Engineer' },
    verified: true,
    logoUrl: publicLogoUrl('airbnb.svg'),
    likes: 0,
    createdAt: NOW,
  },
  {
    _id: 'seed-linear-kanban',
    authorId: 'seed:linear',
    authorEmail: 'seed@linear.app',
    authorUsername: 'linear',
    title: 'Kanban Drag & Drop',
    description:
      'Build a highly performant, keyboard-accessible Kanban board with complex drag-and-drop interactions.',
    language: 'React',
    difficulty: 'Advanced',
    tags: ['Performance', 'DND'],
    requirements:
      'Render columns and cards with virtualization for boards with 1000+ items. Support pointer + keyboard drag-and-drop. Sub-16ms drop latency. Optimistic ordering with conflict resolution on the server.',
    resources:
      'dnd-kit, TanStack Virtual, Web Animations API.',
    starterCode: '',
    estimatedTime: '8 hours',
    company: { name: 'Linear', role: 'Frontend Engineer' },
    verified: true,
    logoUrl: publicLogoUrl('linear.svg'),
    likes: 0,
    createdAt: NOW,
  },
];

async function main() {
  if (!SUPABASE_URL) {
    console.warn('⚠ SUPABASE_URL not set — logoUrl will be null for all seeds');
  }
  const db = await getDb();
  const col = db.collection<ChallengeDoc>('challenges');

  let inserted = 0;
  let skipped = 0;
  for (const seed of SEEDS) {
    const existing = await col.findOne({ _id: seed._id });
    if (existing) {
      skipped++;
      console.log(`• skip   ${seed._id} (already exists)`);
      continue;
    }
    await col.insertOne(seed);
    inserted++;
    console.log(`• insert ${seed._id} → ${seed.company?.name}: ${seed.title}`);
  }

  console.log(`\nDone. ${inserted} inserted, ${skipped} skipped (already in DB).`);
  process.exit(0);
}

main().catch((err) => {
  console.error('seed failed:', err);
  process.exit(1);
});
