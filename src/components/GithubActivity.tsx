import { useState, useEffect } from 'preact/hooks';

interface GithubActivityProps {
  username: string;
}

interface Event {
  type: string;
  created_at: string;
  repo: { name: string };
}

export default function GithubActivity({ username }: GithubActivityProps) {
  const [events, setEvents] = useState<Event[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch(`https://api.github.com/users/${username}/events/public`);
        if (!res.ok) {
          setError(true);
          return;
        }
        const data = await res.json();
        
        const filtered = data
          .filter((ev: any) =>
            [
              "PushEvent",
              "WatchEvent",
              "CreateEvent",
              "PullRequestEvent",
              "IssuesEvent",
            ].includes(ev.type),
          )
          .slice(0, 3);
          
        setEvents(filtered);
        setError(false);
      } catch (e) {
        console.error("Failed to load GitHub activity:", e);
        setError(true);
      }
    }
    fetchActivity();
    
    // Refresh tiap 10 menit (menghindari rate limit 60 req/jam)
    const interval = setInterval(fetchActivity, 600000);
    
    return () => {
      clearInterval(interval);
    };
  }, [username]);

  function getTimeString(createdAt: string) {
    const diff = Date.now() - new Date(createdAt).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) return 'just now';
    if (hours >= 24 && hours < 48) return 'yesterday';
    if (hours >= 48) return `${Math.floor(hours / 24)}d ago`;
    return `${hours}h ago`;
  }

  function getActionString(type: string) {
    if (type === "PushEvent") return "Pushed to";
    if (type === "WatchEvent") return "Starred";
    if (type === "CreateEvent") return "Created";
    if (type === "PullRequestEvent") return "Opened PR on";
    if (type === "IssuesEvent") return "Opened issue on";
    return "Contributed to";
  }

  return (
    <div class="w-full max-w-lg border-t border-border-subtle pt-4 animate-slide-up" style={{ animationDelay: '0.5s' }}>
      <h3 class="font-sans uppercase tracking-[0.2em] text-[9px] text-text-muted/60 mb-2 text-center">
        Live Telegraph
      </h3>
      <ul class="flex flex-col gap-1 font-serif text-[clamp(0.8rem,1vw,0.9rem)] text-text-muted text-left">
        {!events && !error && (
          <li class="flex items-center justify-between">
            <span class="flex items-center gap-3">
              <span class="text-[9px] text-accent/50">◍</span> Awaiting transmission...
            </span>
          </li>
        )}
        
        {error && (
          <li class="flex items-center justify-between border-b border-border-subtle/50 pb-1 last:border-0 last:pb-0">
            <span class="flex items-center gap-3">
              <span class="text-[10px]">◍</span> Error receiving transmission.
            </span>
          </li>
        )}

        {events && events.length === 0 && (
          <li class="flex items-center justify-between border-b border-border-subtle/50 pb-1 last:border-0 last:pb-0">
            <span class="flex items-center gap-3">
              <span class="text-[10px]">◍</span> No recent activity found.
            </span>
          </li>
        )}

        {events && events.map((ev, i) => (
          <li key={i} class="flex items-center justify-between border-b border-border-subtle/50 pb-1 last:border-0 last:pb-0">
            <span class="flex items-center gap-3">
              <span class="text-[10px]">◍</span> {getActionString(ev.type)} {ev.repo.name}
            </span>
            <span class="opacity-60 text-sm">· {getTimeString(ev.created_at)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
