export function initHeatmap() {
  const root = document.getElementById("github-heatmap-root");
  if (!root || root.dataset.initialized === "true") return;
  root.dataset.initialized = "true";

  const username = root.dataset.username || "David4rr";
  const totalCountEl = document.getElementById("gh-heatmap-total-count");
  const gridEl = document.getElementById("gh-heatmap-grid");
  const scrollContainer = document.getElementById("gh-heatmap-scroll-container");
  const tooltip = document.getElementById("gh-heatmap-tooltip");
  const tooltipText = document.getElementById("gh-heatmap-tooltip-text");

  if (!gridEl) return;

  const cells = Array.from(gridEl.querySelectorAll(".heatmap-cell")) as HTMLElement[];

  // --- Auto-scroll to latest commits (aligns to far-right on mobile & overflowing screens) ---
  let userScrolledHorizontally = false;
  let touchStartX = 0;
  let touchStartY = 0;

  const scrollToLatest = () => {
    if (!scrollContainer || userScrolledHorizontally) return;
    const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
    if (maxScroll > 0) {
      scrollContainer.scrollLeft = maxScroll;
    }
  };

  // Immediate positioning across layout passes
  scrollToLatest();
  requestAnimationFrame(scrollToLatest);
  // Detect explicit user horizontal scrolling so we don't fight intentional history review
  scrollContainer?.addEventListener("touchstart", (e) => {
    if (e.touches[0]) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  scrollContainer?.addEventListener("touchmove", (e) => {
    if (e.touches[0]) {
      const dx = Math.abs(e.touches[0].clientX - touchStartX);
      const dy = Math.abs(e.touches[0].clientY - touchStartY);
      if (dx > dy && dx > 8) {
        userScrolledHorizontally = true;
      }
    }
  }, { passive: true });

  scrollContainer?.addEventListener("mousedown", () => {
    userScrolledHorizontally = true;
  }, { passive: true });

  scrollContainer?.addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaX) > 5) {
      userScrolledHorizontally = true;
    }
  }, { passive: true });

  let resizeTimer: number | undefined;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      requestAnimationFrame(scrollToLatest);
    }, 100);
  };

  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("orientationchange", onResize, { passive: true });

  // --- Tooltip handlers ---
  gridEl.addEventListener("mouseover", (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    const cell = target?.closest(".heatmap-cell") as HTMLElement | null;
    if (!cell) return;

    const count = cell.getAttribute("data-count");
    const date = cell.getAttribute("data-date");
    if (!date || !tooltip || !tooltipText) return;

    const countNum = parseInt(count || "0", 10);
    const formattedDate = formatDateString(date);
    tooltipText.textContent = `${countNum === 0 ? "No" : countNum} ${countNum === 1 ? "contribution" : "contributions"} on ${formattedDate}`;

    const rootRect = root.getBoundingClientRect();
    const rect = cell.getBoundingClientRect();
    const tooltipWidth = tooltip.offsetWidth || 180;

    const targetLeft = rect.left - rootRect.left + rect.width / 2;
    const minLeft = tooltipWidth / 2 + 24;
    const maxLeft = rootRect.width - tooltipWidth / 2 - 24;
    const clampedLeft = Math.max(minLeft, Math.min(targetLeft, maxLeft));

    tooltip.style.left = `${clampedLeft}px`;
    tooltip.style.top = `${rect.top - rootRect.top - 8}px`;
    tooltip.style.opacity = "1";
  });

  gridEl.addEventListener("mouseout", (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    const cell = target?.closest(".heatmap-cell");
    if (!cell || !tooltip) return;
    tooltip.style.opacity = "0";
  });

  function formatDateString(isoStr: string): string {
    try {
      const [y, m, d] = isoStr.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return isoStr;
    }
  }

  function animateCount(target: number, el: HTMLElement, duration = 800) {
    el.classList.remove("animate-pulse");
    const startTime = performance.now();
    function update(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(target * eased);
      el.textContent = `${current}+`;
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = `${target}+`;
      }
    }
    requestAnimationFrame(update);
  }

  async function loadContributions() {
    try {
      const res = await fetch(`https://github-contributions-api.jogruber.de/v4/${username}?y=last`);
      if (!res.ok) throw new Error("Failed to fetch contribution data");
      const data = await res.json();

      if (data.total && typeof data.total.lastYear === "number" && totalCountEl) {
        animateCount(data.total.lastYear, totalCountEl);
      } else if (totalCountEl) {
        totalCountEl.classList.remove("animate-pulse");
      }

      const contributions: Array<{ date: string; count: number; level: number }> =
        data.contributions || [];

      if (contributions.length === 0) {
        gridEl?.classList.remove("is-loading");
        return;
      }

      const totalCells = cells.length;
      const contribLen = contributions.length;
      const offset = totalCells - contribLen;

      gridEl?.classList.remove("is-loading");
      contributions.forEach((day, i) => {
        const cellIdx = offset >= 0 ? offset + i : i;
        if (cellIdx >= 0 && cellIdx < totalCells) {
          const cell = cells[cellIdx];
          cell.setAttribute("data-level", String(day.level));
          cell.setAttribute("data-count", String(day.count));
          cell.setAttribute("data-date", day.date);
        }
      });
      scrollToLatest();
    } catch (err) {
      gridEl?.classList.remove("is-loading");
      if (totalCountEl) totalCountEl.classList.remove("animate-pulse");
      console.warn("GitHub heatmap live fetch error, fallback active:", err);
    }
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        scrollToLatest();
        loadContributions();
        observer.disconnect();
      }
    });
  }, { rootMargin: "250px" });

  observer.observe(root);
  document.addEventListener(
    "astro:before-preparation",
    () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      observer.disconnect();
      delete root.dataset.initialized;
    },
    { once: true }
  );
}
