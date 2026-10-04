import type { APIRoute } from "astro";
import { getRuntimeEnv } from "../../lib/env";

export const prerender = false;

interface SpotifyTrack {
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
    // 0. Priority: Last.fm (100% free, works with Spotify Free accounts)
    const lastfmApiKey =
      (await getRuntimeEnv("LASTFM_API_KEY")) ||
      (await getRuntimeEnv("PUBLIC_LASTFM_API_KEY"));
    const lastfmUser =
      (await getRuntimeEnv("LASTFM_USERNAME")) ||
      (await getRuntimeEnv("PUBLIC_LASTFM_USERNAME"));

    if (lastfmApiKey && lastfmUser) {
      const lfmRes = await fetch(
        `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(
          lastfmUser
        )}&api_key=${encodeURIComponent(lastfmApiKey)}&format=json&limit=1`
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

          const payload: SpotifyTrack = {
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
          };

          return new Response(JSON.stringify(payload), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, s-maxage=5, stale-while-revalidate=15",
            },
          });
        }
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
    }

    const clientId =
      (await getRuntimeEnv("SPOTIFY_CLIENT_ID")) ||
      (await getRuntimeEnv("PUBLIC_SPOTIFY_CLIENT_ID"));
    const clientSecret =
      (await getRuntimeEnv("SPOTIFY_CLIENT_SECRET")) ||
      (await getRuntimeEnv("PUBLIC_SPOTIFY_CLIENT_SECRET"));
    const refreshToken =
      (await getRuntimeEnv("SPOTIFY_REFRESH_TOKEN")) ||
      (await getRuntimeEnv("PUBLIC_REFRESH_TOKEN"));

    if (!clientId || !clientSecret || !refreshToken) {
      const fallback: SpotifyTrack = {
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
    // 1. Request access token using refresh token
    const basicAuth = btoa(`${clientId}:${clientSecret}`);
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!tokenResponse.ok) {
      console.error("Spotify token refresh failed:", await tokenResponse.text());
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
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch currently playing track
    const nowPlayingRes = await fetch(
      "https://api.spotify.com/v1/me/player/currently-playing",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // If currently playing returns content
    if (nowPlayingRes.status === 200) {
      const nowPlayingData = await nowPlayingRes.json();
      if (nowPlayingData && nowPlayingData.item && nowPlayingData.is_playing) {
        const item = nowPlayingData.item;
        const track: SpotifyTrack = {
          configured: true,
          isPlaying: true,
          title: item.name,
          artist: (item.artists || []).map((a: { name: string }) => a.name).join(", "),
          album: item.album?.name || "",
          albumImageUrl: item.album?.images?.[0]?.url || "",
          songUrl: item.external_urls?.spotify || "",
        };

        return new Response(JSON.stringify(track), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
          },
        });
      }
    }

    // 3. Fallback to recently played track if not currently playing
    const recentlyPlayedRes = await fetch(
      "https://api.spotify.com/v1/me/player/recently-played?limit=1",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (recentlyPlayedRes.status === 200) {
      const recentData = await recentlyPlayedRes.json();
      const firstItem = recentData?.items?.[0];
      if (firstItem && firstItem.track) {
        const item = firstItem.track;
        const track: SpotifyTrack = {
          configured: true,
          isPlaying: false,
          title: item.name,
          artist: (item.artists || []).map((a: { name: string }) => a.name).join(", "),
          album: item.album?.name || "",
          albumImageUrl: item.album?.images?.[0]?.url || "",
          songUrl: item.external_urls?.spotify || "",
          playedAt: firstItem.played_at,
        };

        return new Response(JSON.stringify(track), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
          },
        });
      }
    }

    // 4. Default resting state if no recent track found
    return new Response(
      JSON.stringify({
        configured: true,
        isPlaying: false,
        title: "Chamber Silence",
        artist: "Currently at rest",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
        },
      }
    );
  } catch (error) {
    console.error("Error in spotify API route:", error);
    return new Response(
      JSON.stringify({
        configured: false,
        isPlaying: false,
        title: "Chamber Silence",
        artist: "Offline",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
