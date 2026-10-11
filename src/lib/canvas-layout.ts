export interface Project {
  id: string;
  title: string;
  description: string;
  image: string;
  type: 'mobile' | 'web' | 'center' | 'blog';
  isReal: boolean;
  date?: string;
}

export interface PlacedProject extends Project {
  x: number;
  y: number;
  w: number;
  h: number;
}

const GRID_RADIUS = 36;
const SORTED_GRID_COORDS: ReadonlyArray<{ x: number; y: number }> = (() => {
  const coords: { x: number; y: number }[] = [];
  for (let x = -GRID_RADIUS; x <= GRID_RADIUS; x++) {
    for (let y = -GRID_RADIUS; y <= GRID_RADIUS; y++) {
      coords.push({ x, y });
    }
  }
  coords.sort((a, b) => {
    const distSqA = a.x * a.x + a.y * 1.5 * (a.y * 1.5);
    const distSqB = b.x * b.x + b.y * 1.5 * (b.y * 1.5);
    return distSqA - distSqB;
  });
  return coords;
})();

export function optimizeCanvasImageUrl(src: string): string {
  const isGoogleCdn = src.includes('googleusercontent.com') || src.includes('blogger.com');
  if (isGoogleCdn) return src;
  return src.startsWith('http')
    ? `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=800&output=webp`
    : src;
}

export function getRelativeLastRead(readingHistory: Record<string, number>, slug: string): string | null {
  const time = readingHistory[slug];
  if (!time) return null;
  const diffSec = Math.floor((Date.now() - time) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return 'yesterday';
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export function formatCanvasDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function computeCanvasLayout(
  projects: Project[],
  aspectRatios: Record<string, number>
): PlacedProject[] {
  const CELL = 65;
  const GAP = 10;
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
      const ratio =
        aspectRatios[p.id] || (p.type === 'mobile' ? 0.5 : p.type === 'blog' ? 1.4 : 1.77);
      gh = Math.round(Math.sqrt(28 / ratio));
      gh = Math.max(4, Math.min(gh, 8));

      exactH = gh * CELL + (gh - 1) * GAP;
      exactW = exactH * ratio;

      gw = Math.ceil((exactW + GAP) / (CELL + GAP));
      gw = Math.max(2, Math.min(gw, 12));
    }

    for (const c of SORTED_GRID_COORDS) {
      if (checkFit(c.x, c.y, gw, gh)) {
        markOccupied(c.x, c.y, gw, gh);
        result.push({
          ...p,
          x: c.x * (CELL + GAP) + ((gw - 1) * (CELL + GAP)) / 2,
          y: c.y * (CELL + GAP) + ((gh - 1) * (CELL + GAP)) / 2,
          w: exactW,
          h: exactH,
        });
        break;
      }
    }
  });

  return result;
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 3.0;

export interface CanvasGestureDeps {
  posRef: { current: { x: number; y: number } };
  scaleRef: { current: number };
  hasDraggedRef: { current: boolean };
  applyWorldTransform: (nextPos: { x: number; y: number }, nextScale: number, forceCommit?: boolean) => void;
}

export function bindCanvasGestures(container: HTMLElement, deps: CanvasGestureDeps): () => void {
  const { posRef, scaleRef, hasDraggedRef, applyWorldTransform } = deps;
  const controller = new AbortController();
  const { signal } = controller;

  let isDragging = false;
  let lastPos = { x: 0, y: 0 };
  let startPos = { x: 0, y: 0 };

  const zoomAt = (clientX: number, clientY: number, factor: number) => {
    const curScale = scaleRef.current;
    const curPos = posRef.current;
    const targetScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, curScale * factor));
    if (Math.abs(targetScale - curScale) < 0.0001) return;
    const scaleRatio = targetScale / curScale;
    applyWorldTransform(
      { x: clientX - (clientX - curPos.x) * scaleRatio, y: clientY - (clientY - curPos.y) * scaleRatio },
      targetScale
    );
  };

  const animateZoomTo = (clientX: number, clientY: number, targetScale: number, duration = 280) => {
    const startScale = scaleRef.current;
    const startOrigin = posRef.current;
    const clampedTarget = Math.min(MAX_SCALE, Math.max(MIN_SCALE, targetScale));
    if (Math.abs(clampedTarget - startScale) < 0.0001) return;
    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      const curScale = startScale + (clampedTarget - startScale) * ease;
      const wx = (clientX - startOrigin.x) / startScale;
      const wy = (clientY - startOrigin.y) / startScale;
      applyWorldTransform({ x: clientX - wx * curScale, y: clientY - wy * curScale }, curScale, progress >= 1);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  container.addEventListener('pointerdown', (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    isDragging = true;
    hasDraggedRef.current = false;
    lastPos = { x: e.clientX, y: e.clientY };
    startPos = { x: e.clientX, y: e.clientY };
  }, { signal });

  container.addEventListener('pointermove', (e: PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastPos.x;
    const dy = e.clientY - lastPos.y;
    if (!hasDraggedRef.current && (Math.abs(e.clientX - startPos.x) > 3 || Math.abs(e.clientY - startPos.y) > 3)) {
      hasDraggedRef.current = true;
      try { container.setPointerCapture(e.pointerId); } catch {}
    }
    applyWorldTransform({ x: posRef.current.x + dx, y: posRef.current.y + dy }, scaleRef.current);
    lastPos = { x: e.clientX, y: e.clientY };
  }, { signal });

  const onPointerUp = (e: PointerEvent) => {
    isDragging = false;
    applyWorldTransform(posRef.current, scaleRef.current, true);
    if (hasDraggedRef.current) {
      try { container.releasePointerCapture(e.pointerId); } catch {}
    }
  };
  container.addEventListener('pointerup', onPointerUp, { signal });
  container.addEventListener('pointercancel', onPointerUp, { signal });

  container.addEventListener('wheel', (e: WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.008));
      return;
    }
    if ((e.deltaMode !== 0 || Math.abs(e.deltaY) >= 40) && e.deltaX === 0) {
      zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.003));
      return;
    }
    applyWorldTransform({ x: posRef.current.x - e.deltaX, y: posRef.current.y - e.deltaY }, scaleRef.current);
  }, { passive: false, signal });

  let touchStartDist = 0;
  let touchStartScale = 1;
  let touchStartMidpoint = { x: 0, y: 0 };
  let touchStartPos = { x: 0, y: 0 };
  let isPinching = false;

  container.addEventListener('touchstart', (e: TouchEvent) => {
    if (e.touches.length === 2) {
      isPinching = true;
      hasDraggedRef.current = true;
      const [t1, t2] = [e.touches[0], e.touches[1]];
      touchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      touchStartScale = scaleRef.current;
      touchStartMidpoint = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
      touchStartPos = { ...posRef.current };
    }
  }, { passive: true, signal });

  container.addEventListener('touchmove', (e: TouchEvent) => {
    if (isPinching && e.touches.length === 2 && touchStartDist > 0) {
      e.preventDefault();
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const currentMidpoint = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, touchStartScale * (currentDist / touchStartDist)));
      const wx = (touchStartMidpoint.x - touchStartPos.x) / touchStartScale;
      const wy = (touchStartMidpoint.y - touchStartPos.y) / touchStartScale;
      applyWorldTransform({ x: currentMidpoint.x - wx * newScale, y: currentMidpoint.y - wy * newScale }, newScale);
    }
  }, { passive: false, signal });

  const onTouchEnd = (e: TouchEvent) => {
    if (e.touches.length < 2) {
      isPinching = false;
      touchStartDist = 0;
      applyWorldTransform(posRef.current, scaleRef.current, true);
    }
  };
  container.addEventListener('touchend', onTouchEnd, { passive: true, signal });
  container.addEventListener('touchcancel', onTouchEnd, { passive: true, signal });

  container.addEventListener('dblclick', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('a') || target.closest('button')) return;
    animateZoomTo(e.clientX, e.clientY, e.shiftKey ? scaleRef.current / 1.6 : scaleRef.current * 1.6, 300);
  }, { signal });

  container.addEventListener('click', (e: MouseEvent) => {
    if (hasDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, { capture: true, signal });

  return () => controller.abort();
}
