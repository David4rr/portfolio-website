import { getRuntimeEnv } from './env';

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  published: string;
  url: string;
  labels: string[];
  image?: string;
}

interface BloggerV3Item {
  id?: string;
  url?: string;
  title?: string;
  content?: string;
  published?: string;
  labels?: string[];
  images?: Array<{ url?: string }>;
}

interface BloggerV3Response {
  items?: BloggerV3Item[];
}

interface BloggerFeedEntry {
  id?: { $t?: string };
  title?: { $t?: string };
  content?: { $t?: string };
  summary?: { $t?: string };
  published?: { $t?: string };
  link?: Array<{ rel?: string; href?: string }>;
  category?: Array<{ term?: string }>;
  media$thumbnail?: { url?: string };
}

interface BloggerFeedResponse {
  feed?: {
    entry?: BloggerFeedEntry[];
  };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function cleanExcerpt(content: string, length = 180): string {
  if (!content) return '';
  let text = content
    .replace(/<figcaption[\s\S]*?<\/figcaption>/gi, ' ')
    .replace(/<table[\s\S]*?<\/table>/gi, ' ')
    .replace(/Photo\s+by\s+[^.]+?on\s+Unsplash/gi, ' ')
    .replace(/Foto\s+oleh\s+[^.]+?di\s+Unsplash/gi, ' ')
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

function optimizeBloggerImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  // Upgrade Blogger CDN thumbnails (e.g. /s72-c/, /s72-w640-h322-c/, /w640-h322/) to high-resolution /s1600/
  return url
    .replace(/\/s\d+(-[a-zA-Z0-9_-]+)?\//, '/s1600/')
    .replace(/\/w\d+-h\d+(\-c)?\//, '/s1600/');
}

function extractFirstImage(content: string): string | undefined {
  if (!content) return undefined;
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? optimizeBloggerImageUrl(match[1]) : undefined;
}

const DEFAULT_BLOGGER_URL = 'https://david4rr-catatan-kesehatan-kita.blogspot.com';

export async function getBlogPosts(): Promise<BlogPost[]> {
  const blogId = await getRuntimeEnv('BLOGGER_BLOG_ID') || '8125961202841336272';
  const apiKey = await getRuntimeEnv('BLOGGER_API_KEY');
  const bloggerUrl = await getRuntimeEnv('BLOGGER_URL') || DEFAULT_BLOGGER_URL;

  // Option 1: Official Google Blogger API v3 (if API key is present)
  if (blogId && apiKey) {
    try {
      const endpoint = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?key=${apiKey}&maxResults=50`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = (await res.json()) as BloggerV3Response;
        const items = data.items || [];
        if (items.length > 0) {
          return items.map((item) => {
            const rawTitle = item.title || 'Untitled';
            const rawContent = item.content || '';
            const pathSlug = item.url
              ? item.url.split('/').pop()?.replace('.html', '') || slugify(rawTitle)
              : slugify(rawTitle);
            const coverImage = optimizeBloggerImageUrl(item.images?.[0]?.url) || extractFirstImage(rawContent);

            return {
              id: item.id || pathSlug,
              slug: pathSlug,
              title: rawTitle,
              content: rawContent,
              excerpt: cleanExcerpt(rawContent),
              published: item.published || new Date().toISOString(),
              url: item.url || `/blog/${pathSlug}`,
              labels: item.labels || [],
              image: coverImage,
            };
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch from Blogger API v3:', err);
    }
  }

  // Option 2: Public Feed JSON (no API key required, reads live blog feed directly)
  try {
    const targetUrl = (bloggerUrl || DEFAULT_BLOGGER_URL).replace(/\/+$/, '');
    const feedEndpoint = `${targetUrl}/feeds/posts/default?alt=json&max-results=50`;
    const res = await fetch(feedEndpoint);
    if (res.ok) {
      const data = (await res.json()) as BloggerFeedResponse;
      const entries = data.feed?.entry || [];
      if (entries.length > 0) {
        return entries.map((entry) => {
          const title = entry.title?.$t || 'Untitled';
          const rawContent = entry.content?.$t || entry.summary?.$t || '';
          const altLink = entry.link?.find((l) => l.rel === 'alternate')?.href || '';
          const pathSlug = altLink
            ? altLink.split('/').pop()?.replace('.html', '') || slugify(title)
            : slugify(title);
          
          const rawThumb = entry.media$thumbnail?.url;
          const coverImage = extractFirstImage(rawContent) || optimizeBloggerImageUrl(rawThumb);

          const labels = (entry.category || [])
            .map((cat) => cat.term)
            .filter((term): term is string => typeof term === 'string' && term.length > 0);

          return {
            id: entry.id?.$t || pathSlug,
            slug: pathSlug,
            title,
            content: rawContent,
            excerpt: cleanExcerpt(rawContent),
            published: entry.published?.$t || new Date().toISOString(),
            url: altLink || `/blog/${pathSlug}`,
            labels,
            image: coverImage,
          };
        });
      }
    }
  } catch (err) {
    console.error('Failed to fetch from Blogger Public Feed:', err);
  }

  return [];
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
  const posts = await getBlogPosts();
  return posts.find((p) => p.slug === slug || p.id === slug);
}
