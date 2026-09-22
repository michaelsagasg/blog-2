import { getCollection, type CollectionEntry } from 'astro:content';
import config from '../../site.config.json';

export const site = config;
export type Post = CollectionEntry<'posts'>;

// Astro's `base` config (e.g. "/titrationtrack" when deployed under a GitHub Pages
// project subpath) is NOT applied automatically to hand-written absolute
// hrefs/srcs, only to assets Astro itself resolves. Every root-relative link
// in this site must go through this helper instead of a bare "/..." string,
// or it 404s once deployed anywhere but the domain root.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, ''); // '' at the domain root, '/titrationtrack' under a subpath
export const withBase = (p: string) => BASE + p;
export const stripBase = (pathname: string) => (BASE && pathname.startsWith(BASE) ? pathname.slice(BASE.length) || '/' : pathname);

export const folderOf = (p: Post) => p.id.split('/').slice(0, -1).join('/');
export const slugOf = (p: Post) => p.id.split('/').pop() as string;
export const postUrl = (p: Post) => withBase(`/posts/${p.id}/`);

// site.config.json/advertiser.json keep the banner URL clean (no UTM) so check_advertiser.py's
// competitor/URL-match checks run against the real destination; UTM is added only at render time.
const utm = `utm_source=${site.slug}&utm_medium=blog`;
export const bannerHref = (url: string) => url + (url.includes('?') ? '&' : '?') + utm;

// advertiser.json lives outside this repo (workspace root, gitignored here), so it isn't checked
// out in CI and can't be read at build time -- these represent the site itself as publisher.
export const orgJsonLd = (origin: string | URL) => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: site.name,
  url: new URL(withBase('/'), origin).href,
});

export const articleJsonLd = (post: Post) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: post.data.title,
  description: post.data.description,
  datePublished: post.data.date.toISOString(),
  author: { '@type': 'Organization', name: site.name },
  publisher: { '@type': 'Organization', name: site.name },
});

export async function getPosts(): Promise<Post[]> {
  const all = await getCollection('posts');
  return all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id));
}

export function countBy(posts: Post[], key: (p: Post) => string): [string, number][] {
  const m = new Map<string, number>();
  for (const p of posts) m.set(key(p), (m.get(key(p)) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });

export const readingTime = (p: Post) => Math.max(1, Math.round((p.body ?? '').split(/\s+/).filter(Boolean).length / 220));
export const rawUrl = (p: Post) => withBase(`/posts/${p.id}.md`);

export const catLabel = (c: string) => {
  const t = c.replace(/-/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

// This blog's three categories map directly to the sourcing / usage / general-info split.
const CAT_BLURB: Record<string, string> = {
  sourcing: 'Where UK buyers actually get retatrutide and tirzepatide, and what to check first.',
  usage: 'Titration ladders, injection weeks and what to expect at each step.',
  'general-info': 'How these peptides work, in plain terms.',
};
const CAT_SHORT: Record<string, string> = { 'general-info': 'Basics' };
export const catShort = (c: string) => CAT_SHORT[c] ?? catLabel(c);

export const catBlurb = (c: string) => CAT_BLURB[c] ?? 'Guides from the archive.';

// Dose-ladder tones: usage is the clinical-red "active dose" step, sourcing is steel-slate,
// general-info is a dull ochre ink -- deliberately not blog-1's amber.
const TONES = ['red', 'slate', 'ochre'] as const;
const CAT_TONE: Record<string, (typeof TONES)[number]> = { usage: 'red', sourcing: 'slate', 'general-info': 'ochre' };
export const catTone = (c: string) => CAT_TONE[c] ?? TONES[[...c].reduce((n, ch) => n + ch.charCodeAt(0), 0) % TONES.length];

// A dose-step tile ("0.5", "1.0", "2.0") stands in for blog-1's element-letter device --
// this blog's motif is the titration ladder, not the periodic table.
const CAT_STEP: Record<string, string> = { sourcing: 'Rx', usage: '1.0', 'general-info': 'Ø' };
export const catSymbol = (c: string) => {
  if (CAT_STEP[c]) return CAT_STEP[c];
  const l = c.replace(/[^a-z]/gi, '');
  return l.charAt(0).toUpperCase() + l.charAt(1).toLowerCase();
};
