import { createContext, useContext, useState, useRef, useCallback, useEffect, type ReactNode } from "react";
import { jellyfinClient } from "@/lib/jellyfin";

export interface TrackInfo {
  id: string;
  name: string;
  album?: string;
  albumId?: string;
  artist?: string;
  artistId?: string;
  duration: number; // in seconds
  index: number;
  imageUrl?: string;
}

interface PlayerContextType {
  currentTrack: TrackInfo | null;
  queue: TrackInfo[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isLoading: boolean;
  error: string | null;
  play: (track: TrackInfo) => void;
  playQueue: (tracks: TrackInfo[], startIndex?: number) => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  next: () => void;
  previous: () => void;
  addToQueue: (track: TrackInfo) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  setQueue: (tracks: TrackInfo[]) => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

function formatDuration(ticks: number): number {
  // Jellyfin ticks = 10,000,000 per second
  return Math.floor(ticks / 10000000);
}

export function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function trackFromJellyfinItem(item: any, imageUrl?: string): TrackInfo {
  return {
    id: item.Id,
    name: item.Name,
    album: item.Album,
    albumId: item.AlbumId,
    artist: item.AlbumArtist || item.Artists?.[0] || item.ArtistItems?.[0]?.Name || "Unknown Artist",
    artistId: item.AlbumArtistId || item.ArtistItems?.[0]?.Id,
    duration: formatDuration(item.RunTimeTicks || 0),
    index: item.IndexNumber || 0,
    imageUrl,
  };
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState<TrackInfo | null>(null);
  const [queue, setQueueState] = useState<TrackInfo[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem("player_volume");
    return saved ? parseFloat(saved) : 0.8;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentIndexRef = useRef(-1);

  // Refs to hold latest values for event listeners (avoids stale closures)
  const queueRef = useRef<TrackInfo[]>([]);
  const playTrackRef = useRef<(index: number, tracks: TrackInfo[]) => void>(() => {});

  // Keep queue ref in sync (runs every render)
  queueRef.current = queue;

  // Define playTrackAtIndex as a regular function declaration (hoisted)
  // so it can be referenced by the ref assignment before its definition.
  function playTrackFn(index: number, tracks: TrackInfo[]) {
    const audio = audioRef.current;
    if (!audio || index < 0 || index >= tracks.length) return;

    const track = tracks[index];
    currentIndexRef.current = index;
    const streamUrl = jellyfinClient.getStreamUrl(track.id);
    const transcodedUrl = jellyfinClient.getStreamUrlTranscoded(track.id);

    setCurrentTrack(track);
    setError(null);
    setIsLoading(true);

    // Try direct stream first, fall back to transcoded
    audio.src = streamUrl;
    audio.play().catch(() => {
      // Fallback to transcoded
      audio.src = transcodedUrl;
      audio.play().catch((e) => {
        setError("Failed to play audio: " + e.message);
        setIsLoading(false);
      });
    });
  }

  // Sync the ref immediately during render (function is hoisted so no TDZ)
  playTrackRef.current = playTrackFn;

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onEnded = () => {
      // Auto-next using refs to avoid stale closures
      const nextIndex = currentIndexRef.current + 1;
      const q = queueRef.current;
      if (nextIndex < q.length) {
        playTrackRef.current(nextIndex, q);
      } else {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };
    const onError = () => {
      setIsLoading(false);
      setError("Failed to load audio stream");
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.pause();
      audio.src = "";
    };
  }, []);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
    localStorage.setItem("player_volume", String(volume));
  }, [volume, isMuted]);

  const play = useCallback((track: TrackInfo) => {
    const tracks = [track];
    setQueueState(tracks);
    currentIndexRef.current = 0;
    playTrackFn(0, tracks);
  }, []);

  const playQueue = useCallback((tracks: TrackInfo[], startIndex: number = 0) => {
    setQueueState(tracks);
    currentIndexRef.current = startIndex;
    playTrackFn(startIndex, tracks);
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    const audio = audioRef.current;
    if (audio && currentTrack) {
      audio.play().catch((e) => setError("Failed to resume: " + e.message));
    }
  }, [currentTrack]);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause();
    else resume();
  }, [isPlaying, pause, resume]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(Math.max(0, Math.min(1, v)));
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((m) => !m);
  }, []);

  const next = useCallback(() => {
    const nextIndex = currentIndexRef.current + 1;
    if (nextIndex < queue.length) {
      playTrackFn(nextIndex, queue);
    }
  }, [queue]);

  const previous = useCallback(() => {
    const prevIndex = currentIndexRef.current - 1;
    if (prevIndex >= 0) {
      playTrackFn(prevIndex, queue);
    } else {
      // Restart current
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
      }
    }
  }, [queue]);

  const addToQueue = useCallback((track: TrackInfo) => {
    setQueueState((prev) => [...prev, track]);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueueState((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueueState([]);
  }, []);

  const setQueue = useCallback((tracks: TrackInfo[]) => {
    setQueueState(tracks);
  }, []);

  // Playback reporting to Jellyfin
  const lastTrackIdRef = useRef<string | null>(null);
  const lastReportedTimeRef = useRef<number>(0);
  const lastProgressReportTimeRef = useRef<number>(0);
  const lastIsPlayingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!currentTrack) {
      // If we had a track playing and now we don't, report stopped
      if (lastTrackIdRef.current) {
        jellyfinClient.reportPlaybackStopped(
          lastTrackIdRef.current,
          lastReportedTimeRef.current * 10000000
        );
        lastTrackIdRef.current = null;
      }
      return;
    }

    const trackId = currentTrack.id;
    const ticks = currentTime * 10000000;

    // Track changed!
    if (lastTrackIdRef.current !== trackId) {
      // Report stop for the previous track
      if (lastTrackIdRef.current) {
        jellyfinClient.reportPlaybackStopped(
          lastTrackIdRef.current,
          lastReportedTimeRef.current * 10000000
        );
      }
      
      // Report start for the new track
      jellyfinClient.reportPlaybackStart(trackId, ticks);
      lastTrackIdRef.current = trackId;
      lastReportedTimeRef.current = currentTime;
      lastIsPlayingRef.current = isPlaying;
      lastProgressReportTimeRef.current = Date.now();
      return;
    }

    lastReportedTimeRef.current = currentTime;

    const now = Date.now();
    const timeSinceLastReport = now - lastProgressReportTimeRef.current;
    const playStateChanged = lastIsPlayingRef.current !== isPlaying;

    // Report progress if state changed or 8 seconds passed
    if (playStateChanged || timeSinceLastReport >= 8000) {
      jellyfinClient.reportPlaybackProgress(trackId, ticks, !isPlaying);
      lastIsPlayingRef.current = isPlaying;
      lastProgressReportTimeRef.current = now;
    }
  }, [currentTrack, currentTime, isPlaying]);

  useEffect(() => {
    return () => {
      if (lastTrackIdRef.current) {
        jellyfinClient.reportPlaybackStopped(
          lastTrackIdRef.current,
          lastReportedTimeRef.current * 10000000
        );
      }
    };
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        queue,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        isLoading,
        error,
        play,
        playQueue,
        pause,
        resume,
        togglePlay,
        seek,
        setVolume,
        toggleMute,
        next,
        previous,
        addToQueue,
        removeFromQueue,
        clearQueue,
        setQueue,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextType {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
