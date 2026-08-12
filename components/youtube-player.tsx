"use client";

import { useEffect, useRef } from "react";

export type YouTubeLifecycle =
  | "idle"
  | "api-loading"
  | "creating-player"
  | "player-ready"
  | "loading-video"
  | "video-ready"
  | "playing"
  | "paused"
  | "ended"
  | "error";

type YouTubePlayerProps = {
  videoId: string | null;
  autoplay: boolean;
  onPlayerChange: (player: YTPlayerInstance | null) => void;
  onLifecycleChange: (lifecycle: YouTubeLifecycle) => void;
  onStateChange: (state: number, videoId: string | null) => void;
  onError: (code: number, videoId: string | null) => void;
};

const YOUTUBE_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

let apiPromise: Promise<YouTubeNamespace> | null = null;

function loadYouTubeApi(): Promise<YouTubeNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    const script = existingScript ?? document.createElement("script");
    let timeoutId: number | undefined;

    const handleError = () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      apiPromise = null;
      script.remove();
      reject(new Error("The YouTube IFrame API failed to load."));
    };

    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      script.removeEventListener("error", handleError);
      if (window.YT?.Player) resolve(window.YT);
      else handleError();
    };

    script.addEventListener("error", handleError, { once: true });

    if (!existingScript) {
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    }

    timeoutId = window.setTimeout(handleError, 10_000);
  });

  return apiPromise;
}

export function YouTubePlayer({
  videoId,
  autoplay,
  onPlayerChange,
  onLifecycleChange,
  onStateChange,
  onError,
}: YouTubePlayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const pendingPlayerRef = useRef<YTPlayerInstance | null>(null);
  const loadedVideoIdRef = useRef<string | null>(null);
  const videoIdRef = useRef(videoId);
  const autoplayRef = useRef(autoplay);
  const initializingRef = useRef(false);
  const generationRef = useRef(0);
  const callbacksRef = useRef({ onPlayerChange, onLifecycleChange, onStateChange, onError });

  useEffect(() => {
    callbacksRef.current = { onPlayerChange, onLifecycleChange, onStateChange, onError };
  }, [onPlayerChange, onLifecycleChange, onStateChange, onError]);

  useEffect(() => {
    videoIdRef.current = videoId;
    autoplayRef.current = autoplay;

    const destroyPlayer = () => {
      generationRef.current += 1;
      initializingRef.current = false;
      playerRef.current?.destroy();
      if (pendingPlayerRef.current !== playerRef.current) pendingPlayerRef.current?.destroy();
      playerRef.current = null;
      pendingPlayerRef.current = null;
      loadedVideoIdRef.current = null;
      hostRef.current?.replaceChildren();
      callbacksRef.current.onPlayerChange(null);
      callbacksRef.current.onLifecycleChange("idle");
    };

    if (!videoId) {
      destroyPlayer();
      if (process.env.NODE_ENV === "development") {
        console.info(
          "[Pahadi Radio] This track has no approved YouTube videoId. Add one in data/playlists.ts or use NEXT_PUBLIC_YOUTUBE_TEST_VIDEO_ID for local testing.",
        );
      }
      return;
    }

    const existingPlayer = playerRef.current;
    if (existingPlayer) {
      if (loadedVideoIdRef.current !== videoId) {
        loadedVideoIdRef.current = videoId;
        callbacksRef.current.onLifecycleChange("loading-video");
        if (autoplay) existingPlayer.loadVideoById(videoId);
        else existingPlayer.cueVideoById(videoId);
      } else if (autoplay) {
        existingPlayer.playVideo();
      }
      return;
    }

    if (initializingRef.current || !hostRef.current) return;

    initializingRef.current = true;
    const generation = ++generationRef.current;
    callbacksRef.current.onLifecycleChange("api-loading");

    loadYouTubeApi()
      .then((YT) => {
        const currentVideoId = videoIdRef.current;
        const host = hostRef.current;
        if (generation !== generationRef.current || !currentVideoId || !host) return;

        host.replaceChildren();
        callbacksRef.current.onLifecycleChange("creating-player");
        const mount = document.createElement("div");
        mount.className = "size-full";
        host.appendChild(mount);

        const player = new YT.Player(mount, {
          videoId: currentVideoId,
          width: "100%",
          height: "100%",
          playerVars: {
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: (event) => {
              if (generation !== generationRef.current) {
                event.target.destroy();
                if (pendingPlayerRef.current === event.target) pendingPlayerRef.current = null;
                return;
              }

              initializingRef.current = false;
              pendingPlayerRef.current = null;
              playerRef.current = event.target;
              callbacksRef.current.onPlayerChange(event.target);
              callbacksRef.current.onLifecycleChange("player-ready");

              const latestVideoId = videoIdRef.current;
              if (!latestVideoId) {
                destroyPlayer();
                return;
              }

              if (loadedVideoIdRef.current !== latestVideoId) {
                loadedVideoIdRef.current = latestVideoId;
                callbacksRef.current.onLifecycleChange("loading-video");
                if (autoplayRef.current) event.target.loadVideoById(latestVideoId);
                else event.target.cueVideoById(latestVideoId);
              } else if (autoplayRef.current) {
                event.target.playVideo();
              }
            },
            onStateChange: (event) => {
              const eventVideoId = event.target.getVideoData().video_id ?? loadedVideoIdRef.current;
              if (event.data === YOUTUBE_STATE.PLAYING) {
                callbacksRef.current.onLifecycleChange("playing");
              } else if (event.data === YOUTUBE_STATE.PAUSED) {
                callbacksRef.current.onLifecycleChange("paused");
              } else if (event.data === YOUTUBE_STATE.ENDED) {
                callbacksRef.current.onLifecycleChange("ended");
              } else if (event.data === YOUTUBE_STATE.CUED) {
                callbacksRef.current.onLifecycleChange("video-ready");
              } else if (
                event.data === YOUTUBE_STATE.UNSTARTED ||
                event.data === YOUTUBE_STATE.BUFFERING
              ) {
                callbacksRef.current.onLifecycleChange("loading-video");
              }
              callbacksRef.current.onStateChange(event.data, eventVideoId);
            },
            onError: (event) => {
              const eventVideoId = event.target.getVideoData().video_id ?? loadedVideoIdRef.current;
              callbacksRef.current.onLifecycleChange("error");
              callbacksRef.current.onError(event.data, eventVideoId);
            },
          },
        });

        pendingPlayerRef.current = player;
        loadedVideoIdRef.current = currentVideoId;
      })
      .catch((error: unknown) => {
        if (generation !== generationRef.current) return;
        initializingRef.current = false;
        console.error("[Pahadi Radio] YouTube API initialization failed.", error);
        callbacksRef.current.onLifecycleChange("error");
        callbacksRef.current.onError(-1, videoIdRef.current);
      });
  }, [autoplay, videoId]);

  useEffect(() => {
    return () => {
      generationRef.current += 1;
      initializingRef.current = false;
      playerRef.current?.destroy();
      if (pendingPlayerRef.current !== playerRef.current) pendingPlayerRef.current?.destroy();
      playerRef.current = null;
      pendingPlayerRef.current = null;
      loadedVideoIdRef.current = null;
    };
  }, []);

  return (
    <div className="video-shell">
      <div ref={hostRef} className="absolute inset-0" aria-label={videoId ? "Visible YouTube video player" : undefined} />
      {!videoId && (
        <div className="relative flex size-full flex-col items-center justify-center gap-2 px-8 text-center">
          <span className="radio-waves" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          <p className="font-serif text-[15px] tracking-wide text-white/75">
            Waiting for an approved broadcast
          </p>
          <p className="max-w-64 text-[10px] leading-relaxed tracking-[0.12em] text-white/40 uppercase">
            Add an eligible rights-holder video ID to begin
          </p>
        </div>
      )}
    </div>
  );
}
