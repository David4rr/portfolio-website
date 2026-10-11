import { useState } from 'preact/hooks';
import {
  type PlacedProject,
  optimizeCanvasImageUrl,
  formatCanvasDate,
  getRelativeLastRead,
} from '../lib/canvas-layout';

const ImageWithLoader = ({ src, alt }: { src: string; alt: string }) => {
  const [loaded, setLoaded] = useState(false);
  const optimizedSrc = optimizeCanvasImageUrl(src);

  return (
    <div class="relative w-full h-full bg-bg-elevated overflow-hidden">
      <div
        class={`absolute inset-0 flex items-center justify-center transition-opacity duration-1000 ${
          loaded ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div class="font-serif text-accent/40 text-xl animate-pulse">✧</div>
      </div>
      <img
        src={optimizedSrc}
        alt={alt}
        width={800}
        height={800}
        onLoad={() => setLoaded(true)}
        class={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-[1500ms] ease-out ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        loading="eager"
        decoding="async"
        fetchPriority="high"
        data-image-component=""
        draggable={false}
      />
    </div>
  );
};

export const CanvasCenterNode = ({ project: p }: { project: PlacedProject }) => (
  <div
    key={p.id}
    class="absolute flex flex-col items-center justify-center p-8 md:p-12 text-center border border-border-subtle/20 bg-bg-elevated/10 z-0"
    style={{
      width: `${p.w}px`,
      height: `${p.h}px`,
      transform: `translate3d(${p.x - p.w / 2}px, ${p.y - p.h / 2}px, 0)`,
    }}
  >
    <div class="absolute inset-4 md:inset-8 border border-border-subtle/40 pointer-events-none"></div>
    <h2 class="font-serif text-2xl md:text-4xl text-text-main mb-6 md:mb-10 leading-relaxed italic">
      "A culmination of thought,<br />forged into reality."
    </h2>
    <div class="w-14 h-[1px] bg-accent/40 mb-6 md:mb-10"></div>
    <p class="text-text-muted font-sans text-[9px] md:text-[11px] tracking-[0.25em] uppercase leading-loose">
      Pan, drag, and click<br />to explore the archive.
    </p>
  </div>
);

interface CanvasProjectCardProps {
  project: PlacedProject;
  isFlipped: boolean;
  exploreOrigin: string | null;
  firstRealId: string;
  readingHistory: Record<string, number>;
  onCardClick: (e: MouseEvent, p: PlacedProject) => void;
}

export const CanvasProjectCard = ({
  project: p,
  isFlipped,
  exploreOrigin,
  firstRealId,
  readingHistory,
  onCardClick,
}: CanvasProjectCardProps) => {
  const isBlog = p.type === 'blog';
  const originQuery =
    exploreOrigin === 'writing'
      ? '&origin=writing'
      : exploreOrigin === 'projects'
        ? '&origin=projects'
        : '';
  const targetHref = isBlog
    ? `/writing/${p.id}?from=explore${originQuery}`
    : p.isReal
      ? `/projects/${p.id}?from=explore${originQuery}`
      : `/projects/${firstRealId}?from=explore${originQuery}`;
  const actionLabel = isBlog ? 'Read Article' : 'View Details';
  const postDate = isBlog && p.date ? formatCanvasDate(p.date) : '';
  const lastRead = isBlog ? getRelativeLastRead(readingHistory, p.id) : null;

  return (
    <div
      key={p.id}
      class={`absolute will-change-transform ${
        isFlipped ? 'z-50' : 'z-0 hover:z-10'
      } [perspective:1500px]`}
      style={{
        width: `${p.w}px`,
        height: `${p.h}px`,
        transform: `translate3d(${p.x - p.w / 2}px, ${p.y - p.h / 2}px, 0)`,
      }}
    >
      <div class="block w-full h-full relative cursor-pointer group" onClick={(e) => onCardClick(e, p)}>
        <div
          id={`card-inner-${p.id}`}
          class="w-full h-full relative"
          style={{
            transformStyle: 'preserve-3d',
            WebkitTransformStyle: 'preserve-3d',
          }}
        >
          {/* FRONT FACE */}
          <div
            id={`card-front-${p.id}`}
            class="absolute inset-0 w-full h-full overflow-hidden bg-bg border border-border-subtle opacity-100"
            style={{ transform: 'rotateY(0deg) translateZ(1px)' }}
          >
            {p.image ? (
              <ImageWithLoader src={p.image} alt={p.title} />
            ) : (
              <div class="w-full h-full flex flex-col justify-between p-6 bg-bg-elevated border border-border-subtle select-none">
                <div class="font-serif italic text-accent/60 text-xs tracking-widest uppercase">
                  {isBlog ? 'Writing // Article' : 'Writing // Note'}
                </div>
                <h3 class="font-serif text-lg text-text-main line-clamp-3">{p.title}</h3>
                <div class="font-sans text-[10px] text-text-muted tracking-widest uppercase">
                  Click to flip
                </div>
              </div>
            )}
          </div>

          {/* BACK FACE */}
          <div
            id={`card-back-${p.id}`}
            class="absolute inset-0 w-full h-full overflow-hidden bg-bg-elevated border border-accent flex flex-col items-center justify-between p-5 md:p-6 text-center opacity-0 select-none"
            style={{ transform: 'rotateY(180deg) translateZ(1px)' }}
          >
            <div class="absolute inset-3 border border-border-subtle/50 pointer-events-none"></div>

            <div class="flex flex-col items-center w-full mt-auto mb-2 flex-shrink-0 z-10">
              {isBlog && (postDate || lastRead) && (
                <div class="flex items-center justify-center gap-2 font-mono text-[9px] md:text-[10px] uppercase tracking-wider text-text-muted/80 mb-2 px-2">
                  <span>{postDate}</span>
                  {lastRead && <span class="text-accent font-medium">• last read {lastRead}</span>}
                </div>
              )}
              <h3 class="font-serif text-[clamp(1rem,1.3vw,1.5rem)] leading-snug font-normal text-text-main mb-2.5 px-3">
                {p.title}
              </h3>
              <div class="w-8 h-[1px] bg-accent/40 mb-2"></div>
            </div>

            <div class="overflow-hidden px-4 my-auto z-10 flex-shrink min-h-0">
              <p class="text-text-muted text-[11px] md:text-[12px] font-serif tracking-wide leading-relaxed line-clamp-3 italic pointer-events-none">
                "{p.description}"
              </p>
            </div>

            <div class="mt-auto mb-2 z-10 flex-shrink-0">
              <a
                href={targetHref}
                data-astro-reload
                onClick={(e) => e.stopPropagation()}
                class="inline-flex items-center gap-3 border border-text-main/20 text-text-main font-sans uppercase tracking-[0.2em] text-[9px] px-6 py-2.5 rounded-full hover:bg-text-main hover:text-bg transition-all duration-500 cursor-pointer flex-shrink-0"
              >
                {actionLabel}
              </a>
            </div>

            {!p.isReal && (
              <div
                class="absolute top-4 right-5 text-accent/40 font-serif text-2xl pointer-events-none"
                aria-label="Concept Note"
              >
                *
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const CanvasLoaderOverlay = ({ isLoading }: { isLoading: boolean }) => (
  <div
    class={`absolute inset-0 z-50 flex items-center justify-center bg-bg transition-opacity duration-1000 pointer-events-none ${
      isLoading ? 'opacity-100' : 'opacity-0'
    }`}
  >
    <div class="flex flex-col items-center justify-center space-y-6">
      <svg viewBox="-60 0 180 60" class="w-64 h-24 overflow-visible animate-rocket-hover -rotate-12">
        <g class="stroke-text-muted/30 stroke-[1px]">
          <line x1="120" y1="10" x2="140" y2="10" class="animate-seq-speed" style={{ animationDelay: '1.2s' }} />
          <line x1="80" y1="50" x2="110" y2="50" class="animate-seq-speed" style={{ animationDelay: '1.25s' }} />
          <line x1="50" y1="60" x2="90" y2="60" class="animate-seq-speed" style={{ animationDelay: '1.3s' }} />
        </g>
        <g class="animate-seq-flame origin-[20px_30px]">
          <path d="M 16 12 L -50 30 L 16 48" class="fill-accent/30 stroke-none" />
          <path d="M 16 18 L -25 30 L 16 42" class="fill-accent/60 stroke-none" />
          <path d="M 16 24 L -5 30 L 16 36" class="fill-bg-elevated stroke-none" />
        </g>
        <path d="M 12 6 Q 18 6 18 10 L 18 50 Q 18 54 12 54" class="stroke-text-main animate-seq-ai fill-none" stroke-width="4.5" stroke-linecap="round" />
        <path d="M 24 6 Q 18 6 18 10 M 24 54 Q 18 54 18 50" class="stroke-text-main animate-seq-ai fill-none" stroke-width="4.5" stroke-linecap="round" />
        <path d="M 28 10 Q 75 15 115 30 Q 75 45 28 50" class="stroke-text-main animate-seq-ai fill-none" stroke-width="4" stroke-linecap="round" />
        <path d="M 50 14 Q 65 30 50 46" class="stroke-text-main animate-seq-ai fill-none" stroke-width="3" stroke-linecap="round" />
        <path d="M 36 40 Q 36 24 40 24 Q 44 24 44 32 Q 44 24 48 24 Q 52 24 52 40" class="stroke-accent fill-none animate-seq-me" stroke-width="2" stroke-linecap="round" />
        <path d="M 76 22 Q 68 30 76 38" class="stroke-accent fill-none animate-seq-me" stroke-width="2" stroke-linecap="round" />
        <path d="M 74 22 Q 95 25 115 30" class="stroke-accent fill-none animate-seq-me" stroke-width="2" stroke-linecap="round" />
        <path d="M 71 30 Q 85 30 95 30" class="stroke-accent fill-none animate-seq-me" stroke-width="2" stroke-linecap="round" />
        <path d="M 74 38 Q 95 35 115 30" class="stroke-accent fill-none animate-seq-me" stroke-width="2" stroke-linecap="round" />
      </svg>
      <div class="font-serif italic text-text-muted text-sm md:text-base tracking-wide animate-pulse mt-4">
        Igniting...
      </div>
    </div>
  </div>
);
