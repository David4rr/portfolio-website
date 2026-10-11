import anime from 'animejs';

interface ArtistInfo {
  tags?: string[];
  bio?: string;
  listeners?: number;
  url?: string;
}

interface SpotifyTelemetryData {
  isPlaying?: boolean;
  title?: string;
  artist?: string;
  album?: string;
  albumImageUrl?: string;
  playedAt?: string | number;
  songUrl?: string;
  artistInfo?: ArtistInfo;
}

let spotifyInterval: number | undefined;
let isFetching = false;
let latestTelemetryData: SpotifyTelemetryData | null = null;
let activeTriggerEl: HTMLElement | null = null;
let isMorphing = false;

function formatRelativeTime(uts: string | number) {
  if (!uts) return 'Recently Played';
  const timestamp = typeof uts === 'string' ? parseInt(uts, 10) * 1000 : uts * 1000;
  if (isNaN(timestamp)) return 'Recently Played';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Scrobbled just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Scrobbled ${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `Scrobbled ${diffHour}h ago`;
  return `Scrobbled ${Math.floor(diffHour / 24)}d ago`;
}

function formatCount(num?: number) {
  if (num === undefined || num === null) return '--';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

function ensureSingleModal() {
  const modals = document.querySelectorAll('#lastfm-expand-modal');
  for (let i = 1; i < modals.length; i++) modals[i].remove();
  const modal = document.getElementById('lastfm-expand-modal');
  if (modal && modal.parentNode !== document.body) document.body.appendChild(modal);
  return modal;
}

function setText(id: string, text: string) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setLinkState(id: string, href: string | null | undefined) {
  const el = document.getElementById(id) as HTMLAnchorElement | null;
  if (!el) return;
  if (href) {
    el.setAttribute('href', href);
    el.classList.remove('pointer-events-none', 'opacity-40');
  } else {
    el.removeAttribute('href');
    el.classList.add('pointer-events-none', 'opacity-40');
  }
}
function formatBioExcerpt(rawBio: string | undefined, artistText: string): string {
  if (!rawBio) return `Liner notes archived for ${artistText}. Streamed via Last.fm broadcast.`;
  const bio = rawBio
    .replace(/\(\s*\/[^)]+\/\s*[^)]*\)/g, '')
    .replace(/\(\s*(?:[^)]*;\s*)?born\s+[^)]+\)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:])/g, '$1')
    .trim();
  const sentences = bio.match(/[^.!?]+[.!?]+/g) || [bio];
  let note = sentences[0]?.trim() || '';
  if (note.length < 60 && sentences[1]) {
    const combined = `${note} ${sentences[1].trim()}`;
    if (combined.length <= 160) note = combined;
  }
  if (note.length > 160) {
    const cut = note.slice(0, 155);
    const lastSpace = cut.lastIndexOf(' ');
    note = `${lastSpace > 100 ? cut.slice(0, lastSpace) : cut}…`;
  }
  return note.trim();
}

function populateModal(data: SpotifyTelemetryData | null) {
  if (!data) return;
  const isLive = Boolean(data.isPlaying);
  const titleText = data.title || 'Chamber Silence';
  const artistText = data.artist || (isLive ? 'Unknown Artist' : 'Awaiting transmission...');
  const artistInfo = data.artistInfo;

  setText('lastfm-modal-title', titleText);
  setText('lastfm-modal-artist', artistText);

  const modalAlbum = document.getElementById('lastfm-modal-album');
  if (modalAlbum) {
    modalAlbum.textContent = data.album ? `Album: ${data.album}` : '';
    modalAlbum.style.display = data.album ? 'block' : 'none';
  }

  const modalArt = document.getElementById('lastfm-modal-art');
  if (modalArt && data.albumImageUrl) modalArt.style.backgroundImage = `url("${data.albumImageUrl}")`;

  document.getElementById('lastfm-player-eq')?.classList.toggle('opacity-40', !isLive);
  const playerRail = document.getElementById('lastfm-player-rail');
  if (playerRail) playerRail.style.width = isLive ? '75%' : '100%';
  setText('lastfm-player-label', isLive ? 'Live Stream' : 'Playback Finished');

  const artistTags = document.getElementById('lastfm-artist-tags');
  if (artistTags) {
    const hasTags = Boolean(artistInfo?.tags?.length);
    artistTags.textContent = hasTags ? artistInfo!.tags!.slice(0, 2).join(' • ') : '';
    artistTags.style.display = hasTags ? 'inline' : 'none';
  }
  const artistBio = document.getElementById('lastfm-artist-bio');
  if (artistBio) {
    artistBio.textContent = formatBioExcerpt(artistInfo?.bio, artistText);
    artistBio.style.display = 'block';
  }
  setText('lastfm-artist-listeners', artistInfo?.listeners && artistInfo.listeners > 0 ? `${formatCount(artistInfo.listeners)} listeners` : 'Audio Archive');

  const modalStatus = document.getElementById('lastfm-modal-status');
  const statusDot = document.getElementById('lastfm-status-dot');
  if (modalStatus && statusDot) {
    modalStatus.textContent = isLive ? 'Live Broadcast' : data.playedAt ? formatRelativeTime(data.playedAt) : 'Resonance Idle';
    modalStatus.classList.toggle('text-accent', isLive);
    modalStatus.classList.toggle('text-text-muted', !isLive);
    statusDot.className = isLive ? 'w-1.5 h-1.5 rounded-full bg-accent animate-pulse' : 'w-1.5 h-1.5 rounded-full bg-text-muted/60';
  }

  setLinkState('lastfm-song-link', data.songUrl);
  setLinkState('lastfm-artist-link', artistInfo?.url || (data.artist ? `https://www.last.fm/music/${encodeURIComponent(data.artist)}` : null));
}

function isMobileOrCenteredTrigger(triggerEl: HTMLElement | null) {
  return window.innerWidth < 768 || Boolean(triggerEl?.closest('.spotify-resonance-root')?.classList.contains('items-center'));
}

function positionSlip(triggerEl: HTMLElement) {
  const card = document.getElementById('lastfm-modal-card');
  if (!card) return;
  const tR = triggerEl.getBoundingClientRect();
  const centered = isMobileOrCenteredTrigger(triggerEl);
  card.style.left = centered ? '50%' : 'auto';
  card.style.right = centered ? 'auto' : `${Math.max(16, window.innerWidth - tR.right)}px`;
  card.style.top = 'auto';
  card.style.bottom = centered ? `${Math.max(16, window.innerHeight - tR.top + 10)}px` : `${Math.max(16, window.innerHeight - tR.bottom - 8)}px`;
  card.style.transformOrigin = centered ? 'bottom center' : 'bottom right';
}

function morphLastFmModal(open: boolean, triggerEl?: HTMLElement | null) {
  if (isMorphing) return;
  const modal = open ? ensureSingleModal() : document.getElementById('lastfm-expand-modal');
  const card = document.getElementById('lastfm-modal-card');
  if (!modal || !card || (!open && modal.classList.contains('opacity-0'))) return;

  if (open) {
    activeTriggerEl =
      triggerEl ||
      document.querySelector<HTMLElement>('.spotify-trigger:not([style*="display: none"])') ||
      document.querySelector<HTMLElement>('.spotify-trigger');
    if (latestTelemetryData) populateModal(latestTelemetryData);
    if (activeTriggerEl) positionSlip(activeTriggerEl);
  }

  isMorphing = true;
  anime.remove(card);
  anime.remove(modal);
  if (activeTriggerEl) anime.remove(activeTriggerEl);

  if (open) {
    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.classList.add('opacity-100', 'pointer-events-auto');
    if (activeTriggerEl) anime({ targets: activeTriggerEl, opacity: [1, 0], duration: 150, easing: 'easeOutQuad' });
  }

  anime({
    targets: card,
    opacity: open ? [0, 1] : [1, 0],
    scale: open ? [0.93, 1] : [1, 0.93],
    translateY: open ? [8, 0] : [0, 8],
    ...(isMobileOrCenteredTrigger(activeTriggerEl) ? { translateX: ['-50%', '-50%'] } : {}),
    duration: open ? 320 : 220,
    easing: open ? 'cubicBezier(0.16, 1, 0.3, 1)' : 'cubicBezier(0.25, 1, 0.5, 1)',
    complete: () => {
      if (!open) {
        modal.classList.add('opacity-0', 'pointer-events-none');
        modal.classList.remove('opacity-100', 'pointer-events-auto');
        if (activeTriggerEl) anime({ targets: activeTriggerEl, opacity: [0, 1], duration: 200, easing: 'easeOutQuad' });
      }
      isMorphing = false;
    },
  });
}

async function updateSpotify() {
  if (isFetching || document.visibilityState === 'hidden') return;
  isFetching = true;

  try {
    const res = await fetch('/api/spotify.json');
    if (!res.ok) return;
    const data = (await res.json()) as SpotifyTelemetryData;
    latestTelemetryData = data;

    const isLive = Boolean(data.isPlaying);
    const tagLabel = isLive
      ? 'Resonance • Live'
      : data.title && data.title !== 'Chamber Silence'
        ? 'Resonance • Recent'
        : 'Resonance';
    const titleText = data.title || 'Chamber Silence';
    const artistText = data.artist || (isLive ? 'Unknown Artist' : 'Awaiting transmission...');

    document.querySelectorAll('.spotify-eq').forEach((eq) => eq.classList.toggle('eq-playing', isLive));
    document.querySelectorAll('.spotify-tag').forEach((tag) => {
      tag.textContent = tagLabel;
      tag.classList.toggle('text-accent', isLive);
      tag.classList.toggle('text-text-muted/70', !isLive);
    });
    document.querySelectorAll('.spotify-title').forEach((el) => { el.textContent = titleText; });
    document.querySelectorAll('.spotify-artist').forEach((el) => { el.textContent = artistText; });

    const artWrapElements = document.querySelectorAll('.spotify-art-wrap');
    if (data.albumImageUrl) {
      document.querySelectorAll<HTMLElement>('.spotify-art').forEach((art) => {
        art.style.backgroundImage = `url("${data.albumImageUrl}")`;
      });
      artWrapElements.forEach((wrap) => wrap.classList.remove('hidden'));
    } else {
      artWrapElements.forEach((wrap) => wrap.classList.add('hidden'));
    }

    populateModal(data);
  } catch {
    // Graceful silence on network hiccups
  } finally {
    isFetching = false;
  }
}

function initListeners() {
  document.querySelectorAll<HTMLElement>('.spotify-trigger').forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      morphLastFmModal(true, trigger);
    });
  });
  for (const id of ['lastfm-modal-close', 'lastfm-backdrop']) {
    document.getElementById(id)?.addEventListener('click', (e) => {
      e.preventDefault();
      morphLastFmModal(false);
    });
  }
  const modal = document.getElementById('lastfm-expand-modal');
  modal?.addEventListener('click', (e) => { if (e.target === modal) morphLastFmModal(false); });
}

function startPolling() {
  clearInterval(spotifyInterval);
  if (document.visibilityState === 'visible') spotifyInterval = window.setInterval(updateSpotify, 20000);
}

function initSpotify() {
  ensureSingleModal();
  initListeners();
  updateSpotify();
  startPolling();
}

window.addEventListener('keydown', (e) => { if (e.key === 'Escape') morphLastFmModal(false); });
document.addEventListener('astro:page-load', initSpotify);
document.addEventListener('astro:before-preparation', () => {
  clearInterval(spotifyInterval);
  spotifyInterval = undefined;
  morphLastFmModal(false);
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    updateSpotify();
    startPolling();
  } else {
    clearInterval(spotifyInterval);
    spotifyInterval = undefined;
  }
});
