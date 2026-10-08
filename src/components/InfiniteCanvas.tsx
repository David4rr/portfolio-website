import { useState, useEffect, useMemo, useRef } from 'preact/hooks';
import anime from 'animejs/lib/anime.es.js';
export interface Project {
  id: string;
  title: string;
  description: string;
  image: string;
  type: 'mobile' | 'web' | 'center' | 'blog';
  isReal: boolean;
  date?: string;
}

interface PlacedProject extends Project {
  x: number;
  y: number;
  w: number;
  h: number;
}

const ImageWithLoader = ({ src, alt }: { src: string, alt: string }) => {
  const [loaded, setLoaded] = useState(false);
  const isGoogleCdn = src.includes('googleusercontent.com') || src.includes('blogger.com');
  const optimizedSrc = isGoogleCdn
    ? src
    : (src.startsWith('http') ? `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=800&output=webp` : src);

  return (
    <div class="relative w-full h-full bg-bg-elevated overflow-hidden">
      <div class={`absolute inset-0 flex items-center justify-center transition-opacity duration-1000 ${loaded ? 'opacity-0' : 'opacity-100'}`}>
         <div class="font-serif text-accent/40 text-xl animate-pulse">
           ✧
         </div>
      </div>
      <img 
        src={optimizedSrc} 
        alt={alt}
        width={800}
        height={800}
        onLoad={() => setLoaded(true)}
        class={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-[1500ms] ease-out ${loaded ? 'opacity-100' : 'opacity-0'}`}
        loading="eager"
        decoding="async"
        fetchPriority="high"
        data-image-component=""
        draggable={false}
      />
    </div>
  );
};

export default function InfiniteCanvas({ projects }: { projects: Project[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem('omp_reading_history');
      if (raw) {
        setReadingHistory(JSON.parse(raw));
      }
    } catch {}
  }, []);

  const getRelativeLastRead = (slug: string): string | null => {
    const time = readingHistory[slug];
    if (!time) return null;
    const diffSec = Math.floor((Date.now() - time) / 1000);
    if (diffSec < 60) return 'just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 172800) return 'yesterday';
    return `${Math.floor(diffSec / 86400)}d ago`;
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Load image aspect ratios to make cards perfectly fit the uploaded images
  useEffect(() => {
    const ratios: Record<string, number> = {};
    let loadedCount = 0;
    const realProjects = projects.filter(p => p.isReal && p.image);
    
    if (realProjects.length === 0) {
      setSizesLoaded(true);
      return;
    }

    realProjects.forEach(p => {
      const img = new window.Image();
      const isGoogleCdn = p.image.includes('googleusercontent.com') || p.image.includes('blogger.com');
      const optSrc = isGoogleCdn
        ? p.image
        : (p.image.startsWith('http') ? `https://wsrv.nl/?url=${encodeURIComponent(p.image)}&w=800&output=webp` : p.image);
      img.onload = () => {
        ratios[p.id] = img.naturalWidth / img.naturalHeight;
        loadedCount++;
        if (loadedCount === realProjects.length) {
          setAspectRatios({...ratios});
          setSizesLoaded(true);
        }
      };
      img.onerror = () => {
        ratios[p.id] = 16/9; // fallback
        loadedCount++;
        if (loadedCount === realProjects.length) {
          setAspectRatios({...ratios});
          setSizesLoaded(true);
        }
      };
      img.src = optSrc;
    });
  }, [projects]);

  // Artificial delay to show the loader
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2200); 
    return () => clearTimeout(timer);
  }, []);

  // 1. Calculate Layout (Dense Grid Oval Packing with Dynamic Irregular Aspect Ratios)
  const laidOutProjects = useMemo(() => {
    if (!sizesLoaded) return [];

    const CELL = 65;
    const GAP = 10; 

    // Generate grid coordinates and sort by oval distance
    const coords: { x: number, y: number }[] = [];
    const radius = 60; // Larger radius for finer grid
    for (let x = -radius; x <= radius; x++) {
      for (let y = -radius; y <= radius; y++) {
        coords.push({ x, y });
      }
    }
    coords.sort((a, b) => {
      const distA = Math.sqrt(a.x * a.x + (a.y * 1.5) * (a.y * 1.5));
      const distB = Math.sqrt(b.x * b.x + (b.y * 1.5) * (b.y * 1.5));
      return distA - distB;
    });

    const result: PlacedProject[] = [];
    const occupied = new Set<string>();

    const checkFit = (startX: number, startY: number, w: number, h: number) => {
      for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
          if (occupied.has(`${startX + x},${startY + y}`)) return false;
        }
      }
      return true;
    };

    const markOccupied = (startX: number, startY: number, w: number, h: number) => {
      for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
          occupied.add(`${startX + x},${startY + y}`);
        }
      }
    };

    const sorted = [...projects].sort((a, b) => {
      if (a.id === 'center-poetry') return -1;
      if (b.id === 'center-poetry') return 1;
      return 0; 
    });

    sorted.forEach((p, index) => {
      let gw = 3;
      let gh = 3;
      let exactW = 0;
      let exactH = 0;
      
      if (p.type === 'center') {
        gw = 5;
        gh = 5; 
        exactW = gw * CELL + (gw - 1) * GAP;
        exactH = gh * CELL + (gh - 1) * GAP;
      } else if (!p.isReal) {
        gw = index % 3 === 0 ? 4 : 3;
        gh = gw === 4 ? 3 : 4;
        exactW = gw * CELL + (gw - 1) * GAP;
        exactH = gh * CELL + (gh - 1) * GAP;
      } else {
        const ratio = aspectRatios[p.id] || (p.type === 'mobile' ? 0.5 : p.type === 'blog' ? 1.4 : 1.77);
        // Target an area of roughly 24-28 cells to guarantee readable card content
        gh = Math.round(Math.sqrt(28 / ratio));
        gh = Math.max(4, Math.min(gh, 8));
        
        exactH = gh * CELL + (gh - 1) * GAP;
        exactW = exactH * ratio;
        
        // Calculate how many grid columns are needed to safely enclose this width
        gw = Math.ceil((exactW + GAP) / (CELL + GAP));
        gw = Math.max(2, Math.min(gw, 12));
      }

      for (const c of coords) {
        if (checkFit(c.x, c.y, gw, gh)) {
          markOccupied(c.x, c.y, gw, gh);
          result.push({
            ...p,
            // x and y represent the absolute center of the reserved grid space
            x: c.x * (CELL + GAP) + ((gw - 1) * (CELL + GAP)) / 2,
            y: c.y * (CELL + GAP) + ((gh - 1) * (CELL + GAP)) / 2,
            // The card itself gets the exact pixel dimensions to avoid any cropping!
            w: exactW,
            h: exactH,
          });
          break;
        }
      }
    });
    
    return result;
  }, [projects, sizesLoaded, aspectRatios]);

  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);

  const [pos, setPos] = useState(() => {
    const cx = typeof window !== 'undefined' ? window.innerWidth / 2 : 500;
    const cy = typeof window !== 'undefined' ? window.innerHeight / 2 : 500;
    return { x: cx, y: cy }; 
  });
  const posRef = useRef(pos);

  useEffect(() => {
    posRef.current = pos;
  }, [pos]);
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);
  
  const hasCentered = useRef(false);

  // Scale boundaries
  const MIN_SCALE = 0.25;
  const MAX_SCALE = 3.0;

  // Focal-point invariant zoom around screen coordinate (clientX, clientY)
  const zoomAt = (clientX: number, clientY: number, factor: number) => {
    const curScale = scaleRef.current;
    const curPos = posRef.current;
    
    const targetScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, curScale * factor));
    if (Math.abs(targetScale - curScale) < 0.0001) return;
    
    const scaleRatio = targetScale / curScale;
    const newX = clientX - (clientX - curPos.x) * scaleRatio;
    const newY = clientY - (clientY - curPos.y) * scaleRatio;
    
    scaleRef.current = targetScale;
    posRef.current = { x: newX, y: newY };
    
    setScale(targetScale);
    setPos({ x: newX, y: newY });
  };

  // Smooth animated zoom (e.g. for double-click)
  const animateZoomTo = (clientX: number, clientY: number, targetScale: number, duration = 280) => {
    const startScale = scaleRef.current;
    const startPos = posRef.current;
    const clampedTarget = Math.min(MAX_SCALE, Math.max(MIN_SCALE, targetScale));
    if (Math.abs(clampedTarget - startScale) < 0.0001) return;

    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      
      const curScale = startScale + (clampedTarget - startScale) * ease;
      const wx = (clientX - startPos.x) / startScale;
      const wy = (clientY - startPos.y) / startScale;
      const curPos = {
        x: clientX - wx * curScale,
        y: clientY - wy * curScale
      };
      
      scaleRef.current = curScale;
      posRef.current = curPos;
      setScale(curScale);
      setPos(curPos);
      
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  };

  // Automatically center the canvas on the main 'center-poetry' node after layout
  useEffect(() => {
    if (laidOutProjects.length > 0 && !hasCentered.current && typeof window !== 'undefined') {
      const centerProj = laidOutProjects.find(p => p.id === 'center-poetry');
      if (centerProj) {
        const nextPos = {
          x: window.innerWidth / 2 - centerProj.x * scaleRef.current,
          y: window.innerHeight / 2 - centerProj.y * scaleRef.current
        };
        posRef.current = nextPos;
        setPos(nextPos);
        hasCentered.current = true;
      }
    }
  }, [laidOutProjects]);

  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);

  // 2. Setup initial window size
  const [viewport, setViewport] = useState({ w: 1000, h: 1000 });
  useEffect(() => {
    const updateSize = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // 3. Pan, Drag, and Buttonless Zoom Logic
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      isDraggingRef.current = true;
      setIsDragging(true);
      hasDraggedRef.current = false;
      lastPos.current = { x: e.clientX, y: e.clientY };
      startPos.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      
      const totalDx = Math.abs(e.clientX - startPos.current.x);
      const totalDy = Math.abs(e.clientY - startPos.current.y);
      if (!hasDraggedRef.current && (totalDx > 3 || totalDy > 3)) {
        hasDraggedRef.current = true;
        try {
          container.setPointerCapture(e.pointerId);
        } catch {}
      }
      
      const nextPos = { x: posRef.current.x + dx, y: posRef.current.y + dy };
      posRef.current = nextPos;
      setPos(nextPos);
      lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      isDraggingRef.current = false;
      setIsDragging(false);
      if (hasDraggedRef.current) {
        try {
          container.releasePointerCapture(e.pointerId);
        } catch {}
      }
    };

    // Buttonless Zoom via Wheel, Trackpad Pinch, and Continuous Pan
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      // 1. Trackpad pinch (macOS/Windows precision) or Ctrl/Cmd + wheel zoom
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * 0.008);
        zoomAt(e.clientX, e.clientY, factor);
        return;
      }

      // 2. Physical mouse wheel detection (distinct discrete notches, no horizontal delta)
      const isPhysicalMouseWheel = (e.deltaMode !== 0 || Math.abs(e.deltaY) >= 40) && e.deltaX === 0;
      if (isPhysicalMouseWheel) {
        const factor = Math.exp(-e.deltaY * 0.003);
        zoomAt(e.clientX, e.clientY, factor);
        return;
      }

      // 3. Trackpad 2-finger continuous pan
      const nextPos = { x: posRef.current.x - e.deltaX, y: posRef.current.y - e.deltaY };
      posRef.current = nextPos;
      setPos(nextPos);
    };

    // Touch Screen Multi-Touch Pinch-to-Zoom & Two-Finger Pan
    let touchStartDist = 0;
    let touchStartScale = 1;
    let touchStartMidpoint = { x: 0, y: 0 };
    let touchStartPos = { x: 0, y: 0 };
    let isPinching = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        isPinching = true;
        hasDraggedRef.current = true;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        touchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        touchStartScale = scaleRef.current;
        touchStartMidpoint = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2
        };
        touchStartPos = { ...posRef.current };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isPinching && e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const currentMidpoint = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2
        };

        if (touchStartDist > 0) {
          const rawScale = touchStartScale * (currentDist / touchStartDist);
          const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, rawScale));

          const wx = (touchStartMidpoint.x - touchStartPos.x) / touchStartScale;
          const wy = (touchStartMidpoint.y - touchStartPos.y) / touchStartScale;
          const newPos = {
            x: currentMidpoint.x - wx * newScale,
            y: currentMidpoint.y - wy * newScale
          };

          scaleRef.current = newScale;
          posRef.current = newPos;
          setScale(newScale);
          setPos(newPos);
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        isPinching = false;
        touchStartDist = 0;
      }
    };

    // Double-click to zoom in, Shift + Double-click to zoom out
    const onDblClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('a') || target.closest('button')) return;
      const targetScale = e.shiftKey ? scaleRef.current / 1.6 : scaleRef.current * 1.6;
      animateZoomTo(e.clientX, e.clientY, targetScale, 300);
    };

    const onClick = (e: MouseEvent) => {
      if (hasDraggedRef.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerUp);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: true });
    container.addEventListener('touchcancel', onTouchEnd, { passive: true });
    container.addEventListener('dblclick', onDblClick);
    container.addEventListener('click', onClick, { capture: true });

    return () => {
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerUp);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
      container.removeEventListener('dblclick', onDblClick);
      container.removeEventListener('click', onClick, { capture: true });
    };
  }, []);

  // 4. Virtualization with Scale-aware Bounding Box
  const visibleProjects = useMemo(() => {
    const curScale = scale;
    const margin = Math.max(1200, 1200 / curScale);
    
    // Viewport bounding box (in canvas coordinates)
    const minX = -pos.x / curScale - margin;
    const maxX = (viewport.w - pos.x) / curScale + margin;
    const minY = -pos.y / curScale - margin;
    const maxY = (viewport.h - pos.y) / curScale + margin;

    return laidOutProjects.filter(p => {
      return (p.x + p.w/2) > minX && (p.x - p.w/2) < maxX &&
             (p.y + p.h/2) > minY && (p.y - p.h/2) < maxY;
    });
  }, [laidOutProjects, pos, viewport, scale]);
  // 5. Flip State & Anime.js Sequences
  const animMap = useRef(new Map<string, any>());
  const stateMap = useRef(new Map<string, any>());
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      animMap.current.forEach(anim => anim.pause());
      animMap.current.clear();
      stateMap.current.clear();
    };
  }, []);

  const playFlipForward = (p: PlacedProject) => {
    const id = p.id;
    if (animMap.current.has(id)) animMap.current.get(id).pause();

    const state = stateMap.current.get(id) || { rotateY: 0, lift: 0 };
    stateMap.current.set(id, state);

    const containerEl = document.getElementById(`card-inner-${id}`);
    const frontEl = document.getElementById(`card-front-${id}`);
    const backEl = document.getElementById(`card-back-${id}`);
    
    if (containerEl && frontEl && backEl) {
      const timeline = anime.timeline({ autoplay: true });

      timeline.add({
        targets: state,
        rotateY: Math.PI,
        lift: [
          { value: 1, duration: 400, easing: 'easeOutQuad' },
          { value: 0, duration: 600, easing: 'easeInQuad' }
        ],
        duration: 1000,
        easing: 'easeOutCubic',
        update: () => {
          const ty = state.lift * -30;
          const scale = 1 + (state.lift * 0.05);
          containerEl.style.transform = `translateY(${ty}px) scale(${scale}) rotateY(${state.rotateY}rad)`;
          
          if (state.rotateY >= Math.PI / 2) {
             frontEl.style.opacity = '0';
             backEl.style.opacity = '1';
          } else {
             frontEl.style.opacity = '1';
             backEl.style.opacity = '0';
          }
        }
      }, 0);
      
      animMap.current.set(id, timeline);
    }
  };

  const playFlipBack = (p: PlacedProject) => {
    const id = p.id;
    if (animMap.current.has(id)) animMap.current.get(id).pause();

    const state = stateMap.current.get(id) || { rotateY: Math.PI, lift: 0 };
    const containerEl = document.getElementById(`card-inner-${id}`);
    const frontEl = document.getElementById(`card-front-${id}`);
    const backEl = document.getElementById(`card-back-${id}`);
    
    if (containerEl && frontEl && backEl) {
      const timeline = anime.timeline({ autoplay: true });

      timeline.add({
        targets: state,
        rotateY: 0,
        lift: [
          { value: 1, duration: 300, easing: 'easeOutQuad' },
          { value: 0, duration: 500, easing: 'easeInQuad' }
        ],
        duration: 800,
        easing: 'easeOutCubic',
        update: () => {
          const ty = state.lift * -30;
          const scale = 1 + (state.lift * 0.05);
          containerEl.style.transform = `translateY(${ty}px) scale(${scale}) rotateY(${state.rotateY}rad)`;
          
          if (state.rotateY >= Math.PI / 2) {
             frontEl.style.opacity = '0';
             backEl.style.opacity = '1';
          } else {
             frontEl.style.opacity = '1';
             backEl.style.opacity = '0';
          }
        }
      }, 0);

      animMap.current.set(id, timeline);
    }
  };

  const handleCardClick = (e: MouseEvent, p: PlacedProject) => {
    if (hasDraggedRef.current) {
      e.preventDefault();
      return;
    }

    setFlippedCards(prev => {
      const next = new Set(prev);
      if (next.has(p.id)) {
        next.delete(p.id);
        playFlipBack(p);
      } else {
        next.add(p.id);
        playFlipForward(p);
      }
      return next;
    });
  };

  return (
    <div 
      ref={containerRef}
      class="w-full h-full cursor-grab active:cursor-grabbing touch-none overflow-hidden bg-bg relative"
    >
      <div 
        class="absolute top-0 left-0 will-change-transform"
        style={{ 
          transform: `translate3d(${pos.x}px, ${pos.y}px, 0) scale(${scale})`,
          transformOrigin: '0 0'
        }}
      >
        {visibleProjects.map(p => {
          if (p.type === 'center') {
            return (
              <div
                key={p.id}
                class="absolute flex flex-col items-center justify-center p-8 md:p-12 text-center border border-border-subtle/20 bg-bg-elevated/10 z-0"
                style={{ 
                  width: `${p.w}px`, 
                  height: `${p.h}px`,
                  transform: `translate3d(${p.x - p.w/2}px, ${p.y - p.h/2}px, 0)` 
                }}
              >
                <div class="absolute inset-4 md:inset-8 border border-border-subtle/40 pointer-events-none"></div>
                <h2 class="font-serif text-2xl md:text-4xl text-text-main mb-6 md:mb-10 leading-relaxed italic">
                  "A culmination of thought,<br/>forged into reality."
                </h2>
                <div class="w-14 h-[1px] bg-accent/40 mb-6 md:mb-10"></div>
                <p class="text-text-muted font-sans text-[9px] md:text-[11px] tracking-[0.25em] uppercase leading-loose">
                  Pan, drag, and click<br/>to explore the archive.
                </p>
              </div>
            );
          }

          const isBlog = p.type === 'blog';
          const firstReal = projects.find(r => r.isReal)?.id || 'hello-world';
          const originQuery = exploreOrigin === 'writing' ? '&origin=writing' : exploreOrigin === 'projects' ? '&origin=projects' : '';
          const targetHref = isBlog
            ? `/writing/${p.id}?from=explore${originQuery}`
            : p.isReal
              ? `/projects/${p.id}?from=explore${originQuery}`
              : `/projects/${firstReal}?from=explore${originQuery}`;
          const actionLabel = isBlog ? 'Read Article' : 'View Details';
          const postDate = isBlog && p.date ? formatDate(p.date) : '';
          const lastRead = isBlog ? getRelativeLastRead(p.id) : null;
          return (
          <div
            key={p.id}
            class={`absolute will-change-transform ${flippedCards.has(p.id) ? 'z-50' : 'z-0 hover:z-10'} [perspective:1500px]`}
            style={{ 
              width: `${p.w}px`, 
              height: `${p.h}px`,
              transform: `translate3d(${p.x - p.w/2}px, ${p.y - p.h/2}px, 0)` 
            }}
          >
            <div
              class="block w-full h-full relative cursor-pointer group"
              onClick={(e) => handleCardClick(e, p)}
            >
              <div 
                id={`card-inner-${p.id}`} 
                class="w-full h-full relative" 
                style={{ 
                  transformStyle: 'preserve-3d', 
                  WebkitTransformStyle: 'preserve-3d'
                }}
              >
                {/* FRONT FACE (DOM Image - acts as placeholder when WebGL is active) */}
                <div id={`card-front-${p.id}`} class="absolute inset-0 w-full h-full overflow-hidden bg-bg border border-border-subtle opacity-100" style={{ transform: 'rotateY(0deg) translateZ(1px)' }}>
                  {p.image ? (
                    <ImageWithLoader src={p.image} alt={p.title} />
                  ) : (
                    <div class="w-full h-full flex flex-col justify-between p-6 bg-bg-elevated border border-border-subtle select-none">
                      <div class="font-serif italic text-accent/60 text-xs tracking-widest uppercase">
                        {isBlog ? 'Writing // Article' : 'Writing // Note'}
                      </div>
                      <h3 class="font-serif text-lg text-text-main line-clamp-3">{p.title}</h3>
                      <div class="font-sans text-[10px] text-text-muted tracking-widest uppercase">Click to flip</div>
                    </div>
                  )}
                </div>

                {/* BACK FACE (Poetry / Details) */}
                <div 
                  id={`card-back-${p.id}`} 
                  class="absolute inset-0 w-full h-full overflow-hidden bg-bg-elevated border border-accent flex flex-col items-center justify-between p-5 md:p-6 text-center opacity-0 select-none" 
                  style={{ transform: 'rotateY(180deg) translateZ(1px)' }}
                >
                  {/* Inner Manuscript Border */}
                  <div class="absolute inset-3 border border-border-subtle/50 pointer-events-none"></div>

                  {/* Top: Metadata & Title & Divider */}
                  <div class="flex flex-col items-center w-full mt-auto mb-2 flex-shrink-0 z-10">
                    {isBlog && (postDate || lastRead) && (
                      <div class="flex items-center justify-center gap-2 font-mono text-[9px] md:text-[10px] uppercase tracking-wider text-text-muted/80 mb-2 px-2">
                        <span>{postDate}</span>
                        {lastRead && <span class="text-accent font-medium">• Read {lastRead}</span>}
                      </div>
                    )}
                    <h3 class="font-serif text-[clamp(1rem,1.3vw,1.5rem)] leading-snug font-normal text-text-main mb-2.5 px-3">
                      {p.title}
                    </h3>
                    <div class="w-8 h-[1px] bg-accent/40 mb-2"></div>
                  </div>

                  {/* Middle: Description */}
                  <div class="overflow-hidden px-4 my-auto z-10 flex-shrink min-h-0">
                    <p class="text-text-muted text-[11px] md:text-[12px] font-serif tracking-wide leading-relaxed line-clamp-3 italic pointer-events-none">
                      "{p.description}"
                    </p>
                  </div>

                  {/* Bottom: Action Button */}
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
                  {/* Footnote */}
                  {!p.isReal && (
                    <div class="absolute top-4 right-5 text-accent/40 font-serif text-2xl pointer-events-none" aria-label="Concept Note">
                      *
                    </div>
                  )}
                </div>
              </div>
              
            </div>
          </div>
          );
        })}
      </div>

      <div 
        class={`absolute inset-0 z-50 flex items-center justify-center bg-bg transition-opacity duration-1000 pointer-events-none ${isLoading ? 'opacity-100' : 'opacity-0'}`}
      >
        <div class="flex flex-col items-center justify-center space-y-6">
          <svg 
            viewBox="-60 0 180 60" 
            class="w-64 h-24 overflow-visible animate-rocket-hover -rotate-12"
          >
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
    </div>
  );
}
