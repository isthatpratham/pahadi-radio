declare global {
  type YTPlayerInstance = {
    destroy(): void;
    getCurrentTime(): number;
    getDuration(): number;
    loadVideoById(videoId: string): void;
    pauseVideo(): void;
    playVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
  };

  type YouTubeEvent = {
    data: number;
    target: YTPlayerInstance;
  };

  type YouTubeErrorEvent = {
    data: number;
    target: YTPlayerInstance;
  };

  type YouTubeNamespace = {
    Player: new (
      element: HTMLElement,
      options: {
        videoId: string;
        width?: string | number;
        height?: string | number;
        playerVars?: Record<string, string | number>;
        events?: {
          onReady?: (event: YouTubeEvent) => void;
          onStateChange?: (event: YouTubeEvent) => void;
          onError?: (event: YouTubeErrorEvent) => void;
        };
      },
    ) => YTPlayerInstance;
    PlayerState: {
      PLAYING: number;
      PAUSED: number;
      ENDED: number;
    };
  };

  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export {};
