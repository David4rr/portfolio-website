import type { TocItem } from '../components/TableOfContents.astro';
import { optimizeImageUrl } from './detail-helpers';

function createHeadingSlug(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return base || 'section';
}

export function transformBloggerArticleContent(
  rawContent: string,
  fallbackTitle: string
): { sanitizedContent: string; toc: TocItem[] } {
  let imageCount = 0;
  let sanitizedContent = rawContent || '';

  // Step 1: Convert tr-caption-container tables to semantic <figure>
  sanitizedContent = sanitizedContent.replace(
    /<table[^>]*?class=["'][^"']*?tr-caption-container[^"']*?["'][^>]*?>[\s\S]*?<\/table>/gi,
    (tableMatch) => {
      const srcMatch = tableMatch.match(/<img[^>]+src=["']([^"']+)["']/i);
      const altMatch = tableMatch.match(/<img[^>]+alt=["']([^"']+)["']/i);
      const captionMatch = tableMatch.match(
        /<td[^>]*?class=["'][^"']*?tr-caption[^"']*?["'][^>]*?>([\s\S]*?)<\/td>/i
      );

      if (!srcMatch) return tableMatch;

      const rawSrc = srcMatch[1];
      const alt = (altMatch && altMatch[1].trim()) || fallbackTitle;
      const caption = captionMatch ? captionMatch[1].trim() : '';
      const optimizedSrc = optimizeImageUrl(rawSrc, 1200);

      const isFirst = imageCount === 0;
      imageCount++;
      const loading = isFirst ? 'eager' : 'lazy';
      const captionHtml = caption
        ? '<figcaption class="text-xs text-text-muted/80 mt-3 font-serif italic">' +
          caption +
          '</figcaption>'
        : '';

      return (
        '<figure class="my-10 text-center"><img src="' +
        optimizedSrc +
        '" alt="' +
        alt +
        '" loading="' +
        loading +
        '" decoding="async" data-image-component="" data-processed="true" class="rounded-sm shadow-xl border border-border-subtle/40 mx-auto max-w-full h-auto object-cover" />' +
        captionHtml +
        '</figure>'
      );
    }
  );

  // Step 2: Unwrap any remaining standalone <a href="..."><img ...></a> pointing to images
  sanitizedContent = sanitizedContent.replace(
    /<a\b[^>]*?href=["'][^"']*?(?:googleusercontent|blogger|\.jpg|\.png|\.webp|\.jpeg)[^"']*?["'][^>]*?>\s*(<img\b[^>]*?>)\s*<\/a>/gi,
    '$1'
  );

  // Step 3: Optimize only unprocessed standalone <img> tags
  sanitizedContent = sanitizedContent.replace(/<img\b([^>]*?)>/gi, (imgTag, attrs) => {
    if (attrs.includes('data-processed="true"')) {
      return imgTag.replace(' data-processed="true"', '');
    }

    const srcMatch = imgTag.match(/\bsrc=["']([^"']+)["']/i);
    const altMatch = imgTag.match(/\balt=["']([^"']+)["']/i);
    const titleMatch = imgTag.match(/\btitle=["']([^"']*)["']/i);

    const rawSrc = srcMatch ? srcMatch[1] : '';
    const altText = (altMatch && altMatch[1].trim()) || fallbackTitle;
    const titleText = titleMatch ? ' title="' + titleMatch[1] + '"' : '';
    const optimizedSrc = optimizeImageUrl(rawSrc, 1200);

    const isFirst = imageCount === 0;
    imageCount++;
    const loading = isFirst ? 'eager' : 'lazy';

    return (
      '<img src="' +
      optimizedSrc +
      '" alt="' +
      altText +
      '"' +
      titleText +
      ' loading="' +
      loading +
      '" decoding="async" data-image-component="" class="rounded-sm shadow-xl border border-border-subtle/40 mx-auto my-10 max-w-full h-auto" />'
    );
  });

  // Step 4: Extract Headings and Inject Anchors into sanitizedContent for dynamic Table of Contents
  const toc: TocItem[] = [];
  const usedIds = new Map<string, number>();

  sanitizedContent = sanitizedContent.replace(
    /<(h[2-4])\b([^>]*)>([\s\S]*?)<\/\1>/gi,
    (fullMatch, tag, attrs, innerHtml) => {
      const cleanText = innerHtml.replace(/<[^>]*>/g, '').trim();
      if (!cleanText) return fullMatch;

      const baseSlug = createHeadingSlug(cleanText);
      const count = (usedIds.get(baseSlug) || 0) + 1;
      usedIds.set(baseSlug, count);
      const id = count === 1 ? baseSlug : `${baseSlug}-${count}`;

      const level = parseInt(tag[1], 10);
      toc.push({ id, text: cleanText, level });

      let updatedAttrs = attrs;
      if (/id=["'][^"']*["']/i.test(updatedAttrs)) {
        updatedAttrs = updatedAttrs.replace(/id=["'][^"']*["']/i, `id="${id}"`);
      } else {
        updatedAttrs = ` id="${id}"` + updatedAttrs;
      }

      const scrollClass = 'scroll-mt-28 group relative';
      if (/class=["'][^"']*["']/i.test(updatedAttrs)) {
        updatedAttrs = updatedAttrs.replace(
          /class=["']([^"']*)["']/i,
          `class="$1 ${scrollClass}"`
        );
      } else {
        updatedAttrs = ` class="${scrollClass}"` + updatedAttrs;
      }

      return `<${tag}${updatedAttrs}>${innerHtml}</${tag}>`;
    }
  );

  // Step 5: Remove hardcoded Blogger inline style tags that conflict with theme
  sanitizedContent = sanitizedContent.replace(/<style[\s\S]*?<\/style>/gi, '');

  // Step 6: Transform code blocks into theme-matched macOS terminal cards
  sanitizedContent = sanitizedContent.replace(
    /<pre\b([^>]*)>([\s\S]*?)<\/pre>/gi,
    (_match, _attrs, code) => {
      const rawText = code.replace(/<[^>]*>/g, '').trim();
      let title = 'terminal';
      if (rawText.startsWith('{') || rawText.startsWith('[')) title = 'config.json';
      else if (rawText.includes('├──') || rawText.includes('└──')) title = 'structure';
      else if (rawText.startsWith('---')) title = 'frontmatter.md';
      else if (
        rawText.startsWith('mkdir') ||
        rawText.startsWith('cat') ||
        rawText.startsWith('npm') ||
        rawText.startsWith('git') ||
        rawText.startsWith('ln -s') ||
        rawText.startsWith('curl')
      )
        title = 'bash';

      return `<div class="terminal-card relative my-8 rounded-xl overflow-hidden border border-border-subtle/60 shadow-lg shadow-black/5 bg-bg-subtle/40 transition-colors duration-200">
    <div class="terminal-header flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 bg-bg-subtle/60 border-b border-border-subtle/50 select-none gap-2">
      <div class="flex items-center gap-1.5 sm:gap-2 min-w-0">
        <span class="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#FF5F56]/80 border border-[#E0443E]/40 shrink-0"></span>
        <span class="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#FFBD2E]/80 border border-[#DEA123]/40 shrink-0"></span>
        <span class="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#27C93F]/80 border border-[#1AAB29]/40 shrink-0"></span>
        <span class="ml-1 sm:ml-2 font-mono text-[10px] md:text-[11px] uppercase tracking-[0.15em] sm:tracking-[0.2em] text-text-muted font-medium flex items-center gap-1.5 truncate">
          <svg class="w-3 h-3 text-accent shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
          <span class="truncate">${title}</span>
        </span>
      </div>
      <button type="button" class="copy-terminal-btn shrink-0 group flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded text-[10px] md:text-[11px] font-mono uppercase tracking-wider text-text-muted hover:text-accent hover:bg-bg-subtle border border-transparent hover:border-border-subtle/50 transition-colors cursor-pointer" aria-label="Copy code">
        <svg class="w-3.5 h-3.5 copy-icon transition-transform duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        <span class="copy-label">Copy</span>
      </button>
    </div>
    <pre class="terminal-body font-mono text-xs sm:text-[13px] md:text-sm text-text-main bg-bg-subtle/20 p-3.5 sm:p-4 md:p-5 overflow-x-auto leading-relaxed selection:bg-accent/20" data-lenis-prevent-horizontal="true"><code>${code}</code></pre>
  </div>`;
    }
  );

  // Step 7: Transform non-caption tables into responsive theme-styled tables
  sanitizedContent = sanitizedContent.replace(
    /<table\b([^>]*)>([\s\S]*?)<\/table>/gi,
    (match, attrs, inner) => {
      if (attrs.includes('tr-caption-container')) return match;
      const cleanInner = inner.replace(
        /\bstyle=["'][^"']*?\bwidth\s*:\s*[^;"']+;?[^"']*?["']/gi,
        (styleAttr: string) => styleAttr.replace(/\bwidth\s*:\s*[^;"']+;?/gi, '')
      );
      return `<div class="table-container relative my-8 rounded-xl overflow-hidden border border-border-subtle/60 shadow-lg shadow-black/5 bg-bg-subtle/40">
    <div class="table-wrapper overflow-x-auto" data-lenis-prevent-horizontal="true">
      <table class="theme-table w-full border-collapse text-left text-sm md:text-base">${cleanInner}</table>
    </div>
  </div>`;
    }
  );

  return { sanitizedContent, toc };
}
