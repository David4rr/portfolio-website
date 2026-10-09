import type { APIRoute } from "astro";
import { getRuntimeEnv } from "../../lib/env";

export const prerender = false;

interface TelemetryTrack {
  configured: boolean;
  isPlaying: boolean;
  title: string;
  artist: string;
  album?: string;
  albumImageUrl?: string;
  songUrl?: string;
  playedAt?: string;
  username?: string;
  artistInfo?: {
    name: string;
    bio?: string;
    tags?: string[];
    listeners?: number;
    playcount?: number;
    userPlaycount?: number;
    url?: string;
  };
}

export const GET: APIRoute = async () => {
  try {
    const apiKey =
      (await getRuntimeEnv("LASTFM_API_KEY")) ||
      (await getRuntimeEnv("PUBLIC_LASTFM_API_KEY"));
    const username =
      (await getRuntimeEnv("LASTFM_USERNAME")) ||
      (await getRuntimeEnv("PUBLIC_LASTFM_USERNAME"));

    if (!apiKey || !username) {
      const fallback: TelemetryTrack = {
        configured: false,
        isPlaying: false,
        title: "Chamber Silence",
        artist: "Awaiting Transmission",
      };
      return new Response(JSON.stringify(fallback), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
        },
      });
    }

    const lfmRes = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(
        username
      )}&api_key=${encodeURIComponent(apiKey)}&format=json&limit=1`
    );

    if (lfmRes.ok) {
      const data = await lfmRes.json();
      const rawTracks = data?.recenttracks?.track;
      const tracks = Array.isArray(rawTracks) ? rawTracks : rawTracks ? [rawTracks] : [];
      const track = tracks[0];

      if (track) {
        const isPlaying = track["@attr"]?.nowplaying === "true";
        const images = track.image || [];
        const albumImg =
          images.find(
            (img: { size: string; "#text": string }) =>
              img.size === "extralarge" || img.size === "large"
          )?.["#text"] ||
          images[0]?.["#text"] ||
          "";

        const trackName = track.name;
        const artistName = track.artist?.["#text"] || track.artist?.name;
        let artistInfo: TelemetryTrack["artistInfo"] = undefined;

        if (artistName) {
          try {
            const aInfoRes = await fetch(
              `https://ws.audioscrobbler.com/2.0/?method=artist.getInfo&api_key=${encodeURIComponent(
                apiKey
              )}&artist=${encodeURIComponent(artistName)}&username=${encodeURIComponent(
                username
              )}&format=json`,
              { signal: AbortSignal.timeout(1500) }
            );
            if (aInfoRes.ok) {
              const aData = await aInfoRes.json();
              const aObj = aData?.artist;
              if (aObj) {
                let bio = aObj.bio?.summary || "";
                bio = bio.replace(/<a[\s\S]*$/i, "").replace(/<[^>]+>/g, "").trim();
                bio = bio.replace(/\(\s*\/[^)]+\/\s*[^)]*\)/g, "");
                bio = bio.replace(/\(\s*born\s+[^)]+\)/gi, "");
                bio = bio.replace(/\(\s*[^)]*;\s*born\s+[^)]+\)/gi, "");
                bio = bio.replace(/\s{2,}/g, " ").replace(/\s+([.,;:])/g, "$1").trim();

                const sentences = bio.match(/[^.!?]+[.!?]+/g) || [bio];
                let note = sentences[0]?.trim() || "";
                if (note.length < 60 && sentences[1]) {
                  const combined = note + " " + sentences[1].trim();
                  if (combined.length <= 160) {
                    note = combined;
                  }
                }
                if (note.length > 160) {
                  const cut = note.slice(0, 155);
                  const lastSpace = cut.lastIndexOf(" ");
                  note = (lastSpace > 100 ? cut.slice(0, lastSpace) : cut) + "…";
                }
                bio = note.trim();

                const tags = (aObj.tags?.tag || [])
                  .map((t: { name: string }) => t.name)
                  .slice(0, 3);
                const listeners = aObj.stats?.listeners
                  ? parseInt(aObj.stats.listeners, 10)
                  : undefined;
                const playcount = aObj.stats?.playcount
                  ? parseInt(aObj.stats.playcount, 10)
                  : undefined;
                const userPlaycount = aObj.stats?.userplaycount
                  ? parseInt(aObj.stats.userplaycount, 10)
                  : undefined;

                artistInfo = {
                  name: aObj.name || artistName,
                  bio: bio || undefined,
                  tags: tags.length > 0 ? tags : undefined,
                  listeners,
                  playcount,
                  userPlaycount,
                  url: aObj.url || undefined,
                };
              }
            }
          } catch {
            // Non-blocking artist enrichment
          }
        }

        const payload: TelemetryTrack = {
          configured: true,
          isPlaying,
          title: trackName || "Unknown Track",
          artist: artistName || "Unknown Artist",
          album: track.album?.["#text"] || "",
          albumImageUrl: albumImg,
          songUrl: track.url || "",
          playedAt: track.date?.uts,
          username,
          artistInfo,
        };

        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, s-maxage=5, stale-while-revalidate=15",
          },
        });
      }

      // Configured but no tracks scrobbled yet
      return new Response(
        JSON.stringify({
          configured: true,
          isPlaying: false,
          title: "Chamber Silence",
          artist: "Awaiting transmission...",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, s-maxage=5, stale-while-revalidate=15",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        configured: true,
        isPlaying: false,
        title: "Chamber Silence",
        artist: "Connection Resting",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Last.fm telemetry error:", error);
    return new Response(
      JSON.stringify({
        configured: false,
        isPlaying: false,
        title: "Chamber Silence",
        artist: "Telemetry Offline",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
