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
  
  // Equalizer & Audio FX
  eqEnabled: boolean;
  setEqEnabled: (enabled: boolean) => void;
  eqPreamp: number;
  setEqPreamp: (gain: number) => void;
  eqGains: number[];
  setEqGain: (bandIndex: number, gain: number) => void;
  eqBassBoost: number;
  setEqBassBoost: (val: number) => void;
  eqVocalBoost: number;
  setEqVocalBoost: (val: number) => void;
  eqReverb: number;
  setEqReverb: (val: number) => void;
  eqPreset: string;
  applyEqPreset: (presetId: string) => void;
  getAnalyserData: () => { analyser: AnalyserNode | null; sampleRate: number };
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

  // Equalizer & Audio FX States
  const [eqEnabled, setEqEnabledState] = useState(() => {
    const saved = localStorage.getItem("player_eq_enabled");
    return saved === "true";
  });
  const [eqPreamp, setEqPreampState] = useState(() => {
    const saved = localStorage.getItem("player_eq_preamp");
    return saved ? parseFloat(saved) : 0;
  });
  const [eqGains, setEqGainsState] = useState<number[]>(() => {
    const saved = localStorage.getItem("player_eq_gains");
    return saved ? JSON.parse(saved) : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  });
  const [eqBassBoost, setEqBassBoostState] = useState(() => {
    const saved = localStorage.getItem("player_eq_bass_boost");
    return saved ? parseFloat(saved) : 0;
  });
  const [eqVocalBoost, setEqVocalBoostState] = useState(() => {
    const saved = localStorage.getItem("player_eq_vocal_boost");
    return saved ? parseFloat(saved) : 0;
  });
  const [eqReverb, setEqReverbState] = useState(() => {
    const saved = localStorage.getItem("player_eq_reverb");
    return saved ? parseFloat(saved) : 0;
  });
  const [eqPreset, setEqPresetState] = useState(() => {
    const saved = localStorage.getItem("player_eq_preset");
    return saved || "Flat";
  });

  // Web Audio API Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const preAmpGainNodeRef = useRef<GainNode | null>(null);
  const filterNodesRef = useRef<BiquadFilterNode[]>([]);
  const bassBoostFilterRef = useRef<BiquadFilterNode | null>(null);
  const vocalBoostFilterRef = useRef<BiquadFilterNode | null>(null);
  const delayNodeRef = useRef<DelayNode | null>(null);
  const delayGainNodeRef = useRef<GainNode | null>(null);

  // Web Audio Equalizer graph initialization
  const initAudioContext = useCallback(() => {
    if (audioContextRef.current || !audioRef.current) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      // 1. Create source
      const source = ctx.createMediaElementSource(audioRef.current);
      sourceNodeRef.current = source;

      // 2. Pre-amp gain node
      const preAmp = ctx.createGain();
      // eqPreamp is in dB. linear = 10^(db/20)
      const initialPreampDb = eqEnabled ? eqPreamp : 0;
      preAmp.gain.value = Math.pow(10, initialPreampDb / 20);
      preAmpGainNodeRef.current = preAmp;

      // 3. 10 Equalizer band filters (Standard ISO bands)
      const freqs = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
      const filters = freqs.map((freq, idx) => {
        const filter = ctx.createBiquadFilter();
        filter.type = "peaking";
        filter.frequency.value = freq;
        filter.Q.value = 1.0; // Q = 1.0 represents roughly one octave bandwidth
        filter.gain.value = eqEnabled ? (eqGains[idx] ?? 0) : 0;
        return filter;
      });
      filterNodesRef.current = filters;

      // 4. Bass Boost shelf filter
      const bassFilter = ctx.createBiquadFilter();
      bassFilter.type = "lowshelf";
      bassFilter.frequency.value = 100;
      bassFilter.gain.value = eqEnabled ? eqBassBoost : 0;
      bassBoostFilterRef.current = bassFilter;

      // 5. Vocal Boost (High-mid peaking filter)
      const vocalFilter = ctx.createBiquadFilter();
      vocalFilter.type = "peaking";
      vocalFilter.frequency.value = 3000;
      vocalFilter.Q.value = 0.8;
      vocalFilter.gain.value = eqEnabled ? eqVocalBoost : 0;
      vocalBoostFilterRef.current = vocalFilter;

      // 6. 3D Reverb / Spatialization (Feedback delay loop)
      const delay = ctx.createDelay(1.0);
      delay.delayTime.value = 0.15; // 150ms delay
      delayNodeRef.current = delay;

      const delayFeedback = ctx.createGain();
      delayFeedback.gain.value = 0.4; // feedback decay

      const delayMix = ctx.createGain();
      const wet = eqEnabled ? (eqReverb / 100) * 0.7 : 0;
      delayMix.gain.value = wet;
      delayGainNodeRef.current = delayMix;

      // Wire up delay feedback: delay -> delayFeedback -> delay
      delay.connect(delayFeedback);
      delayFeedback.connect(delay);

      // 7. Analyser node for the dynamic visualizer
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      // Connect in series:
      // source -> preAmp -> bassFilter -> vocalFilter -> filters[0..9] -> output & analyser
      let lastNode: AudioNode = source;
      lastNode.connect(preAmp);
      lastNode = preAmp;

      lastNode.connect(bassFilter);
      lastNode = bassFilter;

      lastNode.connect(vocalFilter);
      lastNode = vocalFilter;

      for (const filter of filters) {
        lastNode.connect(filter);
        lastNode = filter;
      }

      // Reverb path: lastNode -> delay -> delayMix -> destination
      lastNode.connect(delay);
      delay.connect(delayMix);
      delayMix.connect(ctx.destination);

      // Direct dry path: lastNode -> analyser -> destination
      lastNode.connect(analyser);
      analyser.connect(ctx.destination);
    } catch (err) {
      console.error("Failed to initialize Web Audio Equalizer:", err);
    }
  }, [eqEnabled, eqPreamp, eqGains, eqBassBoost, eqVocalBoost, eqReverb]);

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

    // Initialize Web Audio API if needed and resume
    if (!audioContextRef.current) {
      initAudioContext();
    }
    if (audioContextRef.current && audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume().catch((err) => console.error("Could not resume AudioContext:", err));
    }

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
    audio.crossOrigin = "anonymous";
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
      if (!audioContextRef.current) {
        initAudioContext();
      }
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume().catch((err) => console.error("Could not resume AudioContext:", err));
      }
      audio.play().catch((e) => setError("Failed to resume: " + e.message));
    }
  }, [currentTrack, initAudioContext]);

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

  // --- Equalizer & Audio FX Callbacks & Effects ---
  
  // Apply Eq / Preamp / Boosts / Reverb whenever they change or when AudioContext is initialized
  useEffect(() => {
    if (!audioContextRef.current) return;

    const ctx = audioContextRef.current;

    // 1. Preamp
    if (preAmpGainNodeRef.current) {
      const db = eqEnabled ? eqPreamp : 0;
      preAmpGainNodeRef.current.gain.setTargetAtTime(Math.pow(10, db / 20), ctx.currentTime, 0.01);
    }

    // 2. 10 Bands
    filterNodesRef.current.forEach((filter, idx) => {
      const db = eqEnabled ? (eqGains[idx] ?? 0) : 0;
      filter.gain.setTargetAtTime(db, ctx.currentTime, 0.01);
    });

    // 3. Bass Boost
    if (bassBoostFilterRef.current) {
      const db = eqEnabled ? eqBassBoost : 0;
      bassBoostFilterRef.current.gain.setTargetAtTime(db, ctx.currentTime, 0.01);
    }

    // 4. Vocal Boost
    if (vocalBoostFilterRef.current) {
      const db = eqEnabled ? eqVocalBoost : 0;
      vocalBoostFilterRef.current.gain.setTargetAtTime(db, ctx.currentTime, 0.01);
    }

    // 5. Reverb
    if (delayGainNodeRef.current) {
      const wet = eqEnabled ? (eqReverb / 100) * 0.7 : 0;
      delayGainNodeRef.current.gain.setTargetAtTime(wet, ctx.currentTime, 0.01);
    }
  }, [eqEnabled, eqPreamp, eqGains, eqBassBoost, eqVocalBoost, eqReverb]);

  // Persist Equalizer parameters
  useEffect(() => {
    localStorage.setItem("player_eq_enabled", String(eqEnabled));
  }, [eqEnabled]);

  useEffect(() => {
    localStorage.setItem("player_eq_preamp", String(eqPreamp));
  }, [eqPreamp]);

  useEffect(() => {
    localStorage.setItem("player_eq_gains", JSON.stringify(eqGains));
  }, [eqGains]);

  useEffect(() => {
    localStorage.setItem("player_eq_bass_boost", String(eqBassBoost));
  }, [eqBassBoost]);

  useEffect(() => {
    localStorage.setItem("player_eq_vocal_boost", String(eqVocalBoost));
  }, [eqVocalBoost]);

  useEffect(() => {
    localStorage.setItem("player_eq_reverb", String(eqReverb));
  }, [eqReverb]);

  useEffect(() => {
    localStorage.setItem("player_eq_preset", eqPreset);
  }, [eqPreset]);

  // Action setters
  const setEqEnabled = useCallback((enabled: boolean) => {
    setEqEnabledState(enabled);
  }, []);

  const setEqPreamp = useCallback((val: number) => {
    setEqPreampState(val);
    setEqPresetState("Personalizado");
  }, []);

  const setEqGain = useCallback((bandIndex: number, val: number) => {
    setEqGainsState((prev) => {
      const next = [...prev];
      next[bandIndex] = val;
      return next;
    });
    setEqPresetState("Personalizado");
  }, []);

  const setEqBassBoost = useCallback((val: number) => {
    setEqBassBoostState(val);
    setEqPresetState("Personalizado");
  }, []);

  const setEqVocalBoost = useCallback((val: number) => {
    setEqVocalBoostState(val);
    setEqPresetState("Personalizado");
  }, []);

  const setEqReverb = useCallback((val: number) => {
    setEqReverbState(val);
    setEqPresetState("Personalizado");
  }, []);

  const applyEqPreset = useCallback((presetName: string) => {
    setEqPresetState(presetName);
    const presets: Record<string, number[]> = {
      "Flat": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      "Bass Booster": [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
      "Bass Reducer": [-6, -5, -4, -2, 0, 0, 0, 0, 0, 0],
      "Treble Booster": [0, 0, 0, 0, 0, 1, 2, 4, 5, 6],
      "Treble Reducer": [0, 0, 0, 0, 0, -1, -2, -4, -5, -6],
      "Pop": [-2, -1, 0, 2, 4, 4, 2, 0, -1, -2],
      "Rock": [4, 3, 2, -1, -2, -1, 2, 3, 4, 5],
      "Jazz": [3, 2, 1, 2, -1, -1, 0, 1, 2, 3],
      "Classical": [3, 2, 2, 2, 0, 0, -1, -1, 1, 3],
      "Dance": [5, 4, 1, 0, -2, 2, 1, 1, 4, 5],
      "Vocal Booster": [-3, -2, -1, 1, 3, 4, 4, 3, 1, -1]
    };
    const gains = presets[presetName];
    if (gains) {
      setEqGainsState(gains);
    }
  }, []);

  const getAnalyserData = useCallback(() => {
    return {
      analyser: analyserRef.current,
      sampleRate: audioContextRef.current?.sampleRate || 44100
    };
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
        eqEnabled,
        setEqEnabled,
        eqPreamp,
        setEqPreamp,
        eqGains,
        setEqGain,
        eqBassBoost,
        setEqBassBoost,
        eqVocalBoost,
        setEqVocalBoost,
        eqReverb,
        setEqReverb,
        eqPreset,
        applyEqPreset,
        getAnalyserData,
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
