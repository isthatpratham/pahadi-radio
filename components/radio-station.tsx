"use client";

import { track as trackEvent } from "@vercel/analytics";
import {
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { playlists } from "@/data/playlists";
import type { Playlist, Track } from "@/types/music";
import { YouTubePlayer, type YouTubeLifecycle } from "./youtube-player";

const CLOCK_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

type PlaybackState = {
  elapsed: number;
  duration: number;
  playing: boolean;
};

type PlayerViewProps = PlaybackState & {
  track: Track;
  canPlay: boolean;
  canSeek: boolean;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
};

const YOUTUBE_STATE = {
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
} as const;

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function firstPlayableIndex(playlist: Playlist, unavailableVideoIds: ReadonlySet<string>) {
  const index = playlist.tracks.findIndex(
    (track) => track.videoId && !unavailableVideoIds.has(track.videoId),
  );
  return index === -1 ? 0 : index;
}

function Clock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => setTime(CLOCK_FORMATTER.format(new Date()));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const [hour = "", period = ""] = time.split(" ");
  const [hours = "", minutes = ""] = hour.split(":");

  return (
    <div className="top-corner top-left" aria-label={`India time ${time}`}>
      <p className="top-label">India / IST</p>
      <p className="mt-1 font-serif text-[15px] tracking-[0.06em] text-white/90">
        {hours}
        <span className="clock-colon">:</span>
        {minutes} <span className="text-[10px] text-white/60">{period}</span>
      </p>
    </div>
  );
}

function ListenerCount() {
  const [listeners, setListeners] = useState(27);

  useEffect(() => {
    const seed = new Date().getHours() + new Date().getDate();
    setListeners(18 + (seed % 17));
  }, []);

  return (
    <div className="top-center" aria-label={`${listeners} fictional listeners`}>
      <span className="size-1.5 rounded-full bg-amber-300/80 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
      <span>{listeners} listening</span>
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 .7a11.5 11.5 0 0 0-3.64 22.4c.58.1.79-.25.79-.56v-2.23c-3.22.7-3.9-1.37-3.9-1.37-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.57-.29-5.27-1.29-5.27-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.47.11-3.05 0 0 .97-.31 3.16 1.18A10.9 10.9 0 0 1 12 6.1c.98 0 1.95.13 2.86.38 2.2-1.49 3.16-1.18 3.16-1.18.63 1.58.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.41-2.71 5.39-5.29 5.68.42.36.79 1.07.79 2.16v3.26c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z"
      />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        d="M8 2.8h8A5.2 5.2 0 0 1 21.2 8v8a5.2 5.2 0 0 1-5.2 5.2H8A5.2 5.2 0 0 1 2.8 16V8A5.2 5.2 0 0 1 8 2.8Zm8.5 3.7h.01M16.2 12a4.2 4.2 0 1 1-8.4 0 4.2 4.2 0 0 1 8.4 0Z"
      />
    </svg>
  );
}

function SocialLinks() {
  return (
    <nav className="top-corner top-right flex items-center gap-1" aria-label="Social links">
      <a
        className="social-link"
        href="https://github.com/isthatpratham/pahadi-radio"
        target="_blank"
        rel="noreferrer"
        aria-label="Pahadi Radio on GitHub"
      >
        <GitHubIcon />
      </a>
      <a
        className="social-link"
        href="https://www.instagram.com/prathamfrsure/"
        target="_blank"
        rel="noreferrer"
        aria-label="Pratham on Instagram"
      >
        <InstagramIcon />
      </a>
    </nav>
  );
}

function Vinyl({ playing, size }: { playing: boolean; size: "desktop" | "mobile" }) {
  return (
    <div
      className={`vinyl shrink-0 ${size === "desktop" ? "size-20" : "size-16"}`}
      style={{ animationPlayState: playing ? "running" : "paused" }}
      aria-hidden="true"
    >
      <div className="vinyl-label">
        <span className="vinyl-mark">PR</span>
      </div>
      <span className="vinyl-hole" />
    </div>
  );
}

function SeekBar({
  elapsed,
  duration,
  disabled,
  onSeek,
}: {
  elapsed: number;
  duration: number;
  disabled: boolean;
  onSeek: (seconds: number) => void;
}) {
  const percentage = duration > 0 ? Math.min((elapsed / duration) * 100, 100) : 0;

  const seekFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || duration <= 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    onSeek(ratio * duration);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    seekFromPointer(event);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) seekFromPointer(event);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || duration <= 0) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const delta = event.key === "ArrowRight" ? 5 : -5;
      onSeek(Math.max(0, Math.min(duration, elapsed + delta)));
    }
  };

  return (
    <div
      className="seek group touch-none"
      role="slider"
      aria-label="Seek through track"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(elapsed)}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onKeyDown={onKeyDown}
    >
      <div className="seek-rail">
        <div className="seek-fill" style={{ width: `${percentage}%` }}>
          <span className="seek-knob" />
        </div>
      </div>
    </div>
  );
}

function PreviousIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M6 5h2v14H6V5Zm3.5 7L19 5.8v12.4L9.5 12Z" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M16 5h2v14h-2V5Zm-1.5 7L5 18.2V5.8l9.5 6.2Z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="m8 5 11 7-11 7V5Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M7 5h3v14H7V5Zm7 0h3v14h-3V5Z" />
    </svg>
  );
}

function TransportControls({
  playing,
  canPlay,
  mobile = false,
  onPlayPause,
  onPrevious,
  onNext,
}: {
  playing: boolean;
  canPlay: boolean;
  mobile?: boolean;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1">
      <button className="transport-button" onClick={onPrevious} aria-label="Previous track">
        <PreviousIcon />
      </button>
      <button
        className={`play-button ${mobile ? "size-[52px]" : "size-11"}`}
        onClick={onPlayPause}
        disabled={!canPlay}
        aria-label={playing ? "Pause track" : "Play track"}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button className="transport-button" onClick={onNext} aria-label="Next track">
        <NextIcon />
      </button>
    </div>
  );
}

function TrackDetails({ track }: { track: Track }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[15px] leading-tight font-semibold tracking-[-0.01em] text-white">
        {track.title}
      </p>
      <p className="mt-1 truncate text-[12.5px] leading-tight text-white/70">{track.artist}</p>
    </div>
  );
}

function DesktopPlayer(props: PlayerViewProps) {
  return (
    <div className="player-controls hidden min-w-0 items-center gap-3 rounded-full p-3 pr-5 sm:flex">
      <Vinyl playing={props.playing} size="desktop" />
      <div className="min-w-0 flex-1">
        <TrackDetails track={props.track} />
        <SeekBar
          elapsed={props.elapsed}
          duration={props.duration}
          disabled={!props.canSeek}
          onSeek={props.onSeek}
        />
        <div className="flex items-center justify-between gap-3 text-[10.5px] text-white/50 tabular-nums">
          <span>{formatTime(props.elapsed)} / {formatTime(props.duration)}</span>
          {!props.track.videoId && <span className="truncate">Not yet on air</span>}
        </div>
      </div>
      <TransportControls
        playing={props.playing}
        canPlay={props.canPlay}
        onPlayPause={props.onPlayPause}
        onPrevious={props.onPrevious}
        onNext={props.onNext}
      />
    </div>
  );
}

function MobilePlayer(props: PlayerViewProps) {
  return (
    <div className="player-controls rounded-[26px] p-4 sm:hidden">
      <div className="flex items-center gap-3.5">
        <Vinyl playing={props.playing} size="mobile" />
        <div className="min-w-0 flex-1">
          <TrackDetails track={props.track} />
          {!props.track.videoId && (
            <p className="mt-1.5 text-[9px] tracking-[0.12em] text-white/40 uppercase">Not yet on air</p>
          )}
        </div>
      </div>
      <div className="mt-3">
        <SeekBar
          elapsed={props.elapsed}
          duration={props.duration}
          disabled={!props.canSeek}
          onSeek={props.onSeek}
        />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center">
        <span className="text-[10.5px] text-white/55 tabular-nums">
          {formatTime(props.elapsed)} / {formatTime(props.duration)}
        </span>
        <TransportControls
          playing={props.playing}
          canPlay={props.canPlay}
          mobile
          onPlayPause={props.onPlayPause}
          onPrevious={props.onPrevious}
          onNext={props.onNext}
        />
        <span />
      </div>
    </div>
  );
}

function PlaylistSelector({
  activeId,
  onChange,
}: {
  activeId: string;
  onChange: (index: number) => void;
}) {
  return (
    <div className="playlist-selector" role="radiogroup" aria-label="Choose a broadcast">
      {playlists.map((playlist, index) => (
        <button
          key={playlist.id}
          type="button"
          role="radio"
          aria-checked={activeId === playlist.id}
          className={activeId === playlist.id ? "playlist-active" : ""}
          onClick={() => onChange(index)}
        >
          <span>{playlist.number}</span>
          <span className="hidden min-[390px]:inline">{playlist.name}</span>
        </button>
      ))}
    </div>
  );
}

export function RadioStation() {
  const [playlistIndex, setPlaylistIndex] = useState(0);
  const [trackIndex, setTrackIndex] = useState(() =>
    firstPlayableIndex(playlists[0], new Set<string>()),
  );
  const [autoplay, setAutoplay] = useState(false);
  const [playerLifecycle, setPlayerLifecycle] = useState<YouTubeLifecycle>("idle");
  const [playback, setPlayback] = useState<PlaybackState>({
    elapsed: 0,
    duration: 0,
    playing: false,
  });
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const lastYouTubeState = useRef<number | null>(null);
  const failedVideoIds = useRef(new Set<string>());
  const wasPlayingRef = useRef(false);

  const playlist = playlists[playlistIndex];
  const currentTrack = playlist.tracks[trackIndex] ?? playlist.tracks[0];
  const canPlay = Boolean(currentTrack.videoId);
  const canSeek =
    canPlay &&
    playback.duration > 0 &&
    playerLifecycle !== "idle" &&
    playerLifecycle !== "api-loading" &&
    playerLifecycle !== "creating-player" &&
    playerLifecycle !== "error";

  const findPlayableSibling = useCallback(
    (direction: 1 | -1) => {
      for (let step = 1; step <= playlist.tracks.length; step += 1) {
        const index = (trackIndex + direction * step + playlist.tracks.length) % playlist.tracks.length;
        const videoId = playlist.tracks[index].videoId;
        if (videoId && !failedVideoIds.current.has(videoId)) return index;
      }
      return null;
    },
    [playlist, trackIndex],
  );

  const selectTrack = useCallback((index: number, shouldAutoplay: boolean) => {
    lastYouTubeState.current = null;
    wasPlayingRef.current = false;
    setAutoplay(shouldAutoplay);
    setTrackIndex(index);
    setPlayback({ elapsed: 0, duration: 0, playing: false });
  }, []);

  const advanceToPlayable = useCallback(
    () => {
      const index = findPlayableSibling(1);
      if (index === null) {
        setAutoplay(false);
        setPlayback((state) => ({ ...state, playing: false }));
        return;
      }
      selectTrack(index, true);
    },
    [findPlayableSibling, selectTrack],
  );

  const next = useCallback(() => {
    trackEvent("track_next", { trackId: currentTrack.id });
    const index = findPlayableSibling(1);
    if (index !== null) selectTrack(index, true);
  }, [currentTrack.id, findPlayableSibling, selectTrack]);

  const previous = useCallback(() => {
    trackEvent("track_previous", { trackId: currentTrack.id });
    const index = findPlayableSibling(-1);
    if (index !== null) selectTrack(index, true);
  }, [currentTrack.id, findPlayableSibling, selectTrack]);

  const onPlayerChange = useCallback((player: YTPlayerInstance | null) => {
    playerRef.current = player;
    if (player) {
      setPlayback((state) => ({ ...state, duration: player.getDuration() || 0 }));
    }
  }, []);

  const onStateChange = useCallback(
    (state: number, eventVideoId: string | null) => {
      if (eventVideoId && eventVideoId !== currentTrack.videoId) return;
      if (lastYouTubeState.current === state) return;
      lastYouTubeState.current = state;

      if (state === YOUTUBE_STATE.PLAYING) {
        const shouldTrackPlay = !wasPlayingRef.current;
        if (currentTrack.videoId) failedVideoIds.current.delete(currentTrack.videoId);
        wasPlayingRef.current = true;
        setAutoplay(false);
        setPlayback((value) => ({ ...value, playing: true }));
        if (shouldTrackPlay) {
          trackEvent("track_play", { trackId: currentTrack.id, videoId: currentTrack.videoId ?? "" });
        }
      } else if (state === YOUTUBE_STATE.PAUSED) {
        const shouldTrackPause = wasPlayingRef.current;
        wasPlayingRef.current = false;
        setAutoplay(false);
        setPlayback((value) => ({ ...value, playing: false }));
        if (shouldTrackPause) {
          trackEvent("track_pause", { trackId: currentTrack.id, videoId: currentTrack.videoId ?? "" });
        }
      } else if (state === YOUTUBE_STATE.ENDED) {
        wasPlayingRef.current = false;
        setPlayback((value) => ({ ...value, playing: false }));
        trackEvent("track_ended", { trackId: currentTrack.id, videoId: currentTrack.videoId ?? "" });
        advanceToPlayable();
      } else {
        const player = playerRef.current;
        if (player) {
          setPlayback((value) => ({
            ...value,
            duration: player.getDuration() || value.duration,
          }));
        }
      }
    },
    [advanceToPlayable, currentTrack.id, currentTrack.videoId],
  );

  const onError = useCallback(
    (code: number, eventVideoId: string | null) => {
      const failedVideoId = eventVideoId ?? currentTrack.videoId;
      if (failedVideoId) failedVideoIds.current.add(failedVideoId);
      const failedTrack = playlist.tracks.find((track) => track.videoId === failedVideoId);
      const isCurrentTrack = !failedVideoId || failedVideoId === currentTrack.videoId;

      trackEvent("youtube_error", {
        code,
        trackId: failedTrack?.id ?? currentTrack.id,
        videoId: failedVideoId ?? "",
      });
      if (isCurrentTrack) {
        wasPlayingRef.current = false;
        setPlayback((value) => ({ ...value, playing: false }));
        advanceToPlayable();
      }
    },
    [advanceToPlayable, currentTrack.id, currentTrack.videoId, playlist.tracks],
  );

  useEffect(() => {
    if (!playback.playing) return;
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      try {
        const playerState = player.getPlayerState();
        setPlayback((state) => ({
          elapsed: player.getCurrentTime() || 0,
          duration: player.getDuration() || 0,
          playing:
            playerState === YOUTUBE_STATE.PLAYING
              ? true
              : playerState === YOUTUBE_STATE.PAUSED || playerState === YOUTUBE_STATE.ENDED
                ? false
                : state.playing,
        }));
      } catch {
        playerRef.current = null;
        wasPlayingRef.current = false;
        setPlayback((state) => ({ ...state, playing: false }));
      }
    }, 400);
    return () => window.clearInterval(timer);
  }, [playback.playing]);

  const onPlayPause = useCallback(() => {
    if (!currentTrack.videoId) return;
    const player = playerRef.current;
    if (playback.playing) {
      player?.pauseVideo();
      return;
    }
    if (player) {
      player.playVideo();
    } else {
      setAutoplay(true);
    }
  }, [currentTrack.videoId, playback.playing]);

  const onSeek = useCallback((seconds: number) => {
    const player = playerRef.current;
    if (!player) return;
    player.seekTo(seconds, true);
    setPlayback((state) => ({ ...state, elapsed: seconds }));
  }, []);

  const changePlaylist = useCallback((index: number) => {
    if (index === playlistIndex) return;
    const selected = playlists[index];
    const firstPlayable = firstPlayableIndex(selected, failedVideoIds.current);
    setPlaylistIndex(index);
    setTrackIndex(firstPlayable);
    setAutoplay(false);
    setPlayback({ elapsed: 0, duration: 0, playing: false });
    lastYouTubeState.current = null;
    wasPlayingRef.current = false;
    trackEvent("playlist_change", { playlist: selected.id });
  }, [playlistIndex]);

  const playerProps = useMemo<PlayerViewProps>(
    () => ({
      track: currentTrack,
      canPlay,
      canSeek,
      ...playback,
      onPlayPause,
      onPrevious: previous,
      onNext: next,
      onSeek,
    }),
    [canPlay, canSeek, currentTrack, next, onPlayPause, onSeek, playback, previous],
  );

  return (
    <>
      <Clock />
      <ListenerCount />
      <SocialLinks />

      <section className="station-panel" aria-label="Pahadi Radio player">
        <div className="mb-2.5 flex items-end justify-between px-1">
          <div>
            <p className="station-kicker">Broadcasting from nowhere in particular</p>
            <h1 className="font-serif text-[19px] tracking-[0.05em] text-white/90">Pahadi Radio</h1>
          </div>
          <span className="hidden text-[9px] tracking-[0.18em] text-white/35 uppercase sm:block">Est. after midnight</span>
        </div>

        <div className="mt-2.5">
          <PlaylistSelector activeId={playlist.id} onChange={changePlaylist} />
        </div>
        <div className="integrated-player-card glass-player mt-2.5">
          <YouTubePlayer
            videoId={currentTrack.videoId}
            autoplay={autoplay}
            onPlayerChange={onPlayerChange}
            onLifecycleChange={setPlayerLifecycle}
            onStateChange={onStateChange}
            onError={onError}
          />
          <DesktopPlayer {...playerProps} />
          <MobilePlayer {...playerProps} />
        </div>
      </section>
    </>
  );
}
