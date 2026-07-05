import { useState } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ListMusic,
  Disc3,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlayer, formatTime } from "@/hooks/use-player";
import { useJellyfin } from "@/hooks/use-jellyfin";
import { Slider } from "@/components/ui/slider";

export function NowPlayingBar() {
  const { getImageUrl } = useJellyfin();
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isLoading,
    togglePlay,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    queue,
  } = usePlayer();

  const [showQueue, setShowQueue] = useState(false);
  const [showVolume, setShowVolume] = useState(false);

  if (!currentTrack) {
    return (
      <div className="h-20 glass border-t border-white/[0.04] flex items-center px-4">
        <div className="flex items-center gap-3 text-muted-foreground/50">
          <Disc3 className="w-5 h-5" />
          <span className="text-sm">No track selected</span>
        </div>
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const imageUrl = currentTrack.imageUrl || (currentTrack.albumId ? getImageUrl(currentTrack.albumId, { height: 80, width: 80, quality: 90 }) : undefined);

  return (
    <div className="h-20 glass border-t border-white/[0.04] flex items-center px-4 relative z-50">
      {/* Track info - left */}
      <div className="flex items-center gap-3 w-72 min-w-0">
        <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-white/5">
          {imageUrl ? (
            <img src={imageUrl} alt={currentTrack.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Disc3 className="w-5 h-5 text-white/20" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate text-foreground leading-tight">
            {currentTrack.name}
          </p>
          <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
            {currentTrack.artist}
          </p>
        </div>
      </div>

      {/* Player controls - center */}
      <div className="flex-1 flex flex-col items-center gap-1 max-w-xl mx-auto">
        <div className="flex items-center gap-3">
          <button
            onClick={previous}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            disabled={isLoading}
            className={cn(
              "rounded-full p-2.5 transition-all duration-200",
              isPlaying
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "bg-white/10 text-foreground hover:bg-white/20"
            )}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={next}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground/60 tabular-nums w-8 text-right">
            {formatTime(currentTime)}
          </span>
          <div className="flex-1 relative group">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="w-full h-1 appearance-none bg-white/[0.08] rounded-full cursor-pointer
                [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-white/[0.08] [&::-webkit-slider-runnable-track]:rounded-full
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-primary/30
                [&::-webkit-slider-thumb]:opacity-0 [&::-webkit-slider-thumb]:group-hover:opacity-100 [&::-webkit-slider-thumb]:transition-opacity
                [&::-moz-range-track]:h-1 [&::-moz-range-track]:bg-white/[0.08] [&::-moz-range-track]:rounded-full
                [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0"
            />
            {/* Progress fill */}
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-primary/80 to-primary rounded-full pointer-events-none"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground/60 tabular-nums w-8">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Volume & Queue - right */}
      <div className="flex items-center gap-2 w-36 justify-end">
        <button
          onClick={() => setShowQueue(!showQueue)}
          className={cn(
            "p-2 rounded-lg transition-colors",
            showQueue ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
          )}
          title="Queue"
        >
          <ListMusic className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5 group/vol">
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-20 h-1 appearance-none bg-white/[0.08] rounded-full cursor-pointer
              [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-white/[0.08] [&::-webkit-slider-runnable-track]:rounded-full
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg"
          />
        </div>
      </div>
    </div>
  );
}
