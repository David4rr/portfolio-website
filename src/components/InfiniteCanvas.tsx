import { useState, useEffect, useMemo, useRef } from 'preact/hooks';
import anime from 'animejs';
import {
  type Project,
  type PlacedProject,
  computeCanvasLayout,
  optimizeCanvasImageUrl,
  bindCanvasGestures,
} from '../lib/canvas-layout';
import {
  CanvasCenterNode,
  CanvasProjectCard,
  CanvasLoaderOverlay,
} from './CanvasElements';

export type { Project };

export default function InfiniteCanvas({ projects }: { projects: Project[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});
  const [sizesLoaded, setSizesLoaded] = useState(false);
  const [exploreOrigin, setExploreOrigin] = useState<string | null>(null);

  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const from = urlParams.get('from');
      if (from === 'writing' || from === 'projects') {
        sessionStorage.setItem('explore_origin', from);
        setExploreOrigin(from);
      } else {
        const stored = sessionStorage.getItem('explore_origin');
        if (stored) setExploreOrigin(stored);
      }
    } catch {}
  }, []);

  const [readingHistory, setReadingHistory] = useState<Record<string, number>>({});
  const lastRawReadingRef = useRef<string | null>(null);

  const updateReading = () => {
    try {
      const raw = localStorage.getItem('omp_reading_history');
      if (raw && raw !== lastRawReadingRef.current) {
        lastRawReadingRef.current = raw;
        setReadingHistory(JSON.parse(raw));
      }
    } catch {}
  };

  useEffect(() => {
    updateReading();
    window.addEventListener('pageshow', updateReading);
    window.addEventListener('storage', updateReading);
    window.addEventListener('focus', updateReading);
    return () => {
      window.removeEventListener('pageshow', updateReading);
      window.removeEventListener('storage', updateReading);
      window.removeEventListener('focus', updateReading);
    };
  }, []);

  useEffect(() => {
    const ratios = new Map<string, number>();
    let loadedCount = 0;
    const realProjects = projects.filter((p) => p.isReal && p.image);

    if (realProjects.length === 0) {
      setSizesLoaded(true);
      return;
    }

    realProjects.forEach((p) => {
      const img = new window.Image();
      img.onload = () => {
        ratios.set(p.id, img.naturalWidth / img.naturalHeight);
        loadedCount++;
        if (loadedCount === realProjects.length) {
          setAspectRatios(Object.fromEntries(ratios));
          setSizesLoaded(true);
        }
      };
      img.onerror = () => {
        ratios.set(p.id, 16 / 9);
        loadedCount++;
        if (loadedCount === realProjects.length) {
          setAspectRatios(Object.fromEntries(ratios));
          setSizesLoaded(true);
        }
      };
      img.src = optimizeCanvasImageUrl(p.image);
    });
  }, [projects]);

  useEffect(() => {
    if (sizesLoaded) {
      const t = setTimeout(() => setIsLoading(false), 150);
      return () => clearTimeout(t);
    }
    const fallback = setTimeout(() => {
      setSizesLoaded(true);
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(fallback);
  }, [sizesLoaded]);

  const laidOutProjects = useMemo(() => {
    if (!sizesLoaded) return [];
    return computeCanvasLayout(projects, aspectRatios);
  }, [projects, sizesLoaded, aspectRatios]);

  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);
  const committedScaleRef = useRef(1);

  const [pos, setPos] = useState(() => {
    const cx = typeof window !== 'undefined' ? window.innerWidth / 2 : 500;
    const cy = typeof window !== 'undefined' ? window.innerHeight / 2 : 500;
    return { x: cx, y: cy };
  });
  const posRef = useRef(pos);
  const committedPosRef = useRef(pos);

  const applyWorldTransform = (
    nextPos: { x: number; y: number },
    nextScale: number,
    forceCommit = false
  ) => {
    posRef.current = nextPos;
    scaleRef.current = nextScale;
    if (worldRef.current) {
      worldRef.current.style.transform = `translate3d(${nextPos.x}px, ${nextPos.y}px, 0) scale(${nextScale})`;
    }
    const movedDist = Math.hypot(
      nextPos.x - committedPosRef.current.x,
      nextPos.y - committedPosRef.current.y
    );
    const scaleDiff = Math.abs(nextScale - committedScaleRef.current);
    if (forceCommit || movedDist > 250 || scaleDiff > 0.08) {
      committedPosRef.current = nextPos;
      committedScaleRef.current = nextScale;
      setPos(nextPos);
      setScale(nextScale);
    }
  };

  const hasCentered = useRef(false);
  const hasDraggedRef = useRef(false);

  useEffect(() => {
    if (laidOutProjects.length > 0 && !hasCentered.current && typeof window !== 'undefined') {
      const centerProj = laidOutProjects.find((p) => p.id === 'center-poetry');
      if (centerProj) {
        const nextPos = {
          x: window.innerWidth / 2 - centerProj.x * scaleRef.current,
          y: window.innerHeight / 2 - centerProj.y * scaleRef.current,
        };
        applyWorldTransform(nextPos, scaleRef.current, true);
        hasCentered.current = true;
      }
    }
  }, [laidOutProjects]);

  const [viewport, setViewport] = useState({ w: 1000, h: 1000 });
  useEffect(() => {
    const updateSize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    return bindCanvasGestures(container, { posRef, scaleRef, hasDraggedRef, applyWorldTransform });
  }, []);

  const visibleProjects = useMemo(() => {
    const margin = Math.max(1200, 1200 / scale);
    const minX = -pos.x / scale - margin;
    const maxX = (viewport.w - pos.x) / scale + margin;
    const minY = -pos.y / scale - margin;
    const maxY = (viewport.h - pos.y) / scale + margin;
    return laidOutProjects.filter(
      (p) => p.x + p.w / 2 > minX && p.x - p.w / 2 < maxX && p.y + p.h / 2 > minY && p.y - p.h / 2 < maxY
    );
  }, [laidOutProjects, pos, viewport, scale]);

  const animMap = useRef(new Map<string, anime.AnimeTimelineInstance>());
  const stateMap = useRef(new Map<string, { rotateY: number; lift: number }>());
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      animMap.current.forEach((anim) => anim.pause());
      animMap.current.clear();
      stateMap.current.clear();
    };
  }, []);

  const animateCardFlip = (p: PlacedProject, forward: boolean) => {
    const id = p.id;
    if (animMap.current.has(id)) animMap.current.get(id).pause();

    const state = stateMap.current.get(id) || { rotateY: forward ? 0 : Math.PI, lift: 0 };
    stateMap.current.set(id, state);

    const containerEl = document.getElementById(`card-inner-${id}`);
    const frontEl = document.getElementById(`card-front-${id}`);
    const backEl = document.getElementById(`card-back-${id}`);
    if (!containerEl || !frontEl || !backEl) return;

    const timeline = anime.timeline({ autoplay: true }).add(
      {
        targets: state,
        rotateY: forward ? Math.PI : 0,
        lift: [
          { value: 1, duration: forward ? 400 : 300, easing: 'easeOutQuad' },
          { value: 0, duration: forward ? 600 : 500, easing: 'easeInQuad' },
        ],
        duration: forward ? 1000 : 800,
        easing: 'easeOutCubic',
        update: () => {
          const ty = state.lift * -30;
          const s = 1 + state.lift * 0.05;
          containerEl.style.transform = `translateY(${ty}px) scale(${s}) rotateY(${state.rotateY}rad)`;
          const showBack = state.rotateY >= Math.PI / 2;
          frontEl.style.opacity = showBack ? '0' : '1';
          backEl.style.opacity = showBack ? '1' : '0';
        },
      },
      0
    );

    animMap.current.set(id, timeline);
  };

  const handleCardClick = (e: MouseEvent, p: PlacedProject) => {
    if (hasDraggedRef.current) {
      e.preventDefault();
      return;
    }
    updateReading();
    setFlippedCards((prev) => {
      const next = new Set(prev);
      if (next.has(p.id)) {
        next.delete(p.id);
        animateCardFlip(p, false);
      } else {
        next.add(p.id);
        animateCardFlip(p, true);
      }
      return next;
    });
  };

  const firstRealId = useMemo(() => projects.find((r) => r.isReal)?.id || 'hello-world', [projects]);

  return (
    <div
      ref={containerRef}
      class="w-full h-full cursor-grab active:cursor-grabbing touch-none overflow-hidden bg-bg relative"
    >
      <div
        ref={worldRef}
        class="absolute top-0 left-0 will-change-transform"
        style={{
          transform: `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0) scale(${scaleRef.current})`,
          transformOrigin: '0 0',
        }}
      >
        {visibleProjects.map((p) =>
          p.type === 'center' ? (
            <CanvasCenterNode key={p.id} project={p} />
          ) : (
            <CanvasProjectCard
              key={p.id}
              project={p}
              isFlipped={flippedCards.has(p.id)}
              exploreOrigin={exploreOrigin}
              firstRealId={firstRealId}
              readingHistory={readingHistory}
              onCardClick={handleCardClick}
            />
          )
        )}
      </div>

      <CanvasLoaderOverlay isLoading={isLoading} />
    </div>
  );
}
