"use client";

import { useEffect, useRef } from "react";

type YouTubePlayerProps = {
  videoId: string | null;
  onReady: (player: YTPlayerInstance) => void;
  onStateChange: (state: number) => void;
  onError: (code: number) => void;
};

let apiPromise: Promise<YouTubeNamespace> | null = null;

function loadYouTubeApi(): Promise<YouTubeNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      if (window.YT) resolve(window.YT);
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return apiPromise;
}

export function YouTubePlayer({
  videoId,
  onReady,
  onStateChange,
  onError,
}: YouTubePlayerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const callbacksRef = useRef({ onReady, onStateChange, onError });

  useEffect(() => {
    callbacksRef.current = { onReady, onStateChange, onError };
  }, [onReady, onStateChange, onError]);

  useEffect(() => {
    if (!videoId || !mountRef.current) {
      playerRef.current?.destroy();
      playerRef.current = null;
      return;
    }

    let cancelled = false;
    let localPlayer: YTPlayerInstance | null = null;

    loadYouTubeApi().then((YT) => {
      if (cancelled || !mountRef.current) return;

      localPlayer = new YT.Player(mountRef.current, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: (event) => {
            playerRef.current = event.target;
            callbacksRef.current.onReady(event.target);
          },
          onStateChange: (event) => callbacksRef.current.onStateChange(event.data),
          onError: (event) => callbacksRef.current.onError(event.data),
        },
      });
    });

    return () => {
      cancelled = true;
      localPlayer?.destroy();
      if (playerRef.current === localPlayer) playerRef.current = null;
    };
  }, [videoId]);

  return (
    <div className="video-shell">
      {videoId ? (
        <div
          ref={mountRef}
          className="size-full"
          aria-label="Visible YouTube video player"
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 px-8 text-center">
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
