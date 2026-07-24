import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Disc3,
  Repeat,
  Repeat1,
  Shuffle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Equalizer } from "./Equalizer";
import { usePlayer, formatTime } from "@/hooks/use-player";
import { useJellyfin } from "@/hooks/use-jellyfin";
import { RubberBandSlider } from "@/components/ui/RubberBandSlider";

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
    repeatMode,
    toggleRepeat,
    isShuffled,
    toggleShuffle,
  } = usePlayer();

  if (!currentTrack) {
    return (
      <div className="h-20 glass rounded-2xl md:rounded-3xl border border-white/[0.04] flex items-center px-4 md:px-6 shadow-2xl shadow-black/30">
        <div className="flex items-center gap-3 text-muted-foreground/50">
          <Disc3 className="w-5 h-5 animate-spin-slow" />
          <span className="text-sm">Nenhuma música selecionada</span>
        </div>
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const imageUrl = currentTrack.imageUrl || (currentTrack.albumId ? getImageUrl(currentTrack.albumId, { height: 80, width: 80, quality: 90 }) : undefined);

  return (
    <div className="h-20 glass rounded-2xl md:rounded-3xl border border-white/[0.04] flex items-center px-4 md:px-6 relative z-50 shadow-2xl shadow-black/40">
      <div className="flex items-center gap-3 w-72 min-w-0">
        <div className="w-12 h-12 rounded-xl shrink-0 bg-primary/10 border border-primary/20 flex items-center justify-center relative overflow-hidden">
          <Equalizer
            barsCount={5}
            isPlaying={isPlaying}
            className="h-6 gap-[3px]"
            barClassName="w-[3px] bg-primary"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate text-foreground leading-tight">
            {currentTrack.name}
          </p>
          <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
            {currentTrack.artist}
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center gap-1 max-w-xl mx-auto">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleShuffle}
            aria-label={isShuffled ? "Desativar embaralhamento" : "Ativar embaralhamento"}
            aria-pressed={isShuffled}
            className={cn(
              "p-1.5 rounded-full transition-colors",
              isShuffled
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={previous}
            aria-label="Faixa anterior"
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            disabled={isLoading}
            aria-label={isPlaying ? "Pausar" : "Reproduzir"}
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
            aria-label="Próxima faixa"
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={toggleRepeat}
            aria-label={
              repeatMode === "off"
                ? "Ativar repetição de tudo"
                : repeatMode === "all"
                  ? "Ativar repetição de uma faixa"
                  : "Desativar repetição"
            }
            aria-pressed={repeatMode !== "off"}
            className={cn(
              "p-1.5 rounded-full transition-colors",
              repeatMode !== "off"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {repeatMode === "one" ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="w-full flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground/60 tabular-nums w-8 text-right">
            {formatTime(currentTime)}
          </span>
          <div className="flex-1">
            <RubberBandSlider
              min={0}
              max={duration || 100}
              step={1}
              value={currentTime}
              onChange={(v) => seek(v)}
            />
          </div>
          <span className="text-[10px] text-muted-foreground/60 tabular-nums w-8">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 w-36 justify-end">
        <div className="flex items-center gap-1.5 group/vol">
          <button
            onClick={toggleMute}
            aria-label={isMuted || volume === 0 ? "Reativar som" : "Silenciar"}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <RubberBandSlider
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(v) => setVolume(v)}
            className="w-20"
          />
        </div>
      </div>
    </div>
  );
}
