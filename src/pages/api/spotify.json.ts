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
      const rawTrack = data?.recenttracks?.track;
      const track = Array.isArray(rawTrack) ? rawTrack[0] : rawTrack;

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

        const payload: TelemetryTrack = {
          configured: true,
          isPlaying,
          title: track.name || "Unknown Track",
          artist:
            track.artist?.["#text"] ||
            track.artist?.name ||
            "Unknown Artist",
          album: track.album?.["#text"] || "",
          albumImageUrl: albumImg,
          songUrl: track.url || "",
          playedAt: track.date?.uts,
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
