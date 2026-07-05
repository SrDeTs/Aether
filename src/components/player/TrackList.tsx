import { useMemo } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Clock, Music, Disc3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useJellyfin } from "@/hooks/use-jellyfin";
import { usePlayer, formatTime, trackFromJellyfinItem } from "@/hooks/use-player";
import { Skeleton } from "@/components/ui/skeleton";
import type { JellyfinItem } from "@/lib/jellyfin";

interface TrackListProps {
  tracks: JellyfinItem[];
  isLoading: boolean;
  albumId?: string;
  albumName?: string;
  albumArtist?: string;
}

export function TrackList({ tracks, isLoading, albumId, albumName, albumArtist }: TrackListProps) {
  const { getImageUrl } = useJellyfin();
  const { play, playQueue, currentTrack, isPlaying, togglePlay } = usePlayer();

  const trackItems = useMemo(() => {
    const imageUrl = albumId ? getImageUrl(albumId, { height: 60, width: 60, quality: 90 }) : undefined;
    return tracks.map((item) =>
      trackFromJellyfinItem({
        ...item,
        Album: item.Album || albumName,
        AlbumArtist: item.AlbumArtist || item.Artists?.[0] || albumArtist,
        AlbumId: item.AlbumId || albumId,
      }, imageUrl)
    );
  }, [tracks, albumId, albumName, albumArtist, getImageUrl]);

  const handlePlayAll = () => {
    if (trackItems.length > 0) {
      playQueue(trackItems, 0);
    }
  };

  const handleTrackClick = (index: number) => {
    playQueue(trackItems, index);
  };

  if (isLoading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
            <Skeleton className="w-5 h-5 shrink-0 bg-white/5" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/5 bg-white/5" />
              <Skeleton className="h-3 w-2/5 bg-white/5" />
            </div>
            <Skeleton className="h-3 w-10 bg-white/5" />
          </div>
        ))}
      </div>
    );
  }

  if (!tracks.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="glass-strong rounded-full p-5">
          <Music className="w-10 h-10 text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground">No tracks found</p>
      </div>
    );
  }

  return (
    <div>
      {/* Play all button */}
      <button
        onClick={handlePlayAll}
        className="glass-card rounded-xl px-5 py-3 mb-4 flex items-center gap-3 hover:bg-white/[0.06] transition-all duration-200 group w-full"
      >
        <div className="rounded-full bg-primary/20 p-2.5 group-hover:bg-primary/30 transition-colors">
          <Play className="w-5 h-5 text-primary fill-primary" />
        </div>
        <span className="text-sm font-medium">Play All</span>
        <span className="text-xs text-muted-foreground ml-auto">{tracks.length} tracks</span>
      </button>

      {/* Track list */}
      <div className="space-y-0.5">
        {trackItems.map((track, index) => {
          const isCurrentTrack = currentTrack?.id === track.id;
          return (
            <motion.button
              key={track.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: index * 0.02 }}
              onClick={() => handleTrackClick(index)}
              className={cn(
                "w-full flex items-center gap-3 p-2.5 rounded-lg group transition-all duration-200",
                isCurrentTrack
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-white/[0.04] border border-transparent"
              )}
            >
              {/* Track number or play icon */}
              <div className="w-8 h-8 flex items-center justify-center shrink-0">
                {isCurrentTrack && isPlaying ? (
                  <div className="flex items-end gap-[2px] h-4">
                    <span className="w-[3px] bg-primary rounded-full animate-pulse" style={{ height: '60%', animationDelay: '0ms' }} />
                    <span className="w-[3px] bg-primary rounded-full animate-pulse" style={{ height: '100%', animationDelay: '200ms' }} />
                    <span className="w-[3px] bg-primary rounded-full animate-pulse" style={{ height: '40%', animationDelay: '400ms' }} />
                  </div>
                ) : (
                  <>
                    <span className="text-sm text-muted-foreground group-hover:hidden">
                      {track.index}
                    </span>
                    <Play className="w-3.5 h-3.5 text-foreground hidden group-hover:block fill-foreground" />
                  </>
                )}
              </div>

              {/* Track info */}
              <div className="flex-1 text-left min-w-0">
                <p className={cn(
                  "text-sm truncate leading-tight",
                  isCurrentTrack ? "text-primary font-medium" : "text-foreground"
                )}>
                  {track.name}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {track.artist}
                </p>
              </div>

              {/* Duration */}
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                {formatTime(track.duration)}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
