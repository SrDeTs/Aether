import { useMemo } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Music, Disc3 } from "lucide-react";
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

function TrackSkeletonRow({ index, style }: { index: number; style: React.CSSProperties }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      className="flex items-center gap-3 p-3 rounded-lg"
      style={style}
    >
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/5 rounded-md bg-white/[0.06]" />
        <Skeleton className="h-3 w-2/5 rounded-md bg-white/[0.04]" />
      </div>
      <Skeleton className="h-3 w-10 rounded-md bg-white/[0.04]" />
    </motion.div>
  );
}

export function TrackList({ tracks, isLoading, albumId, albumName, albumArtist }: TrackListProps) {
  const { getImageUrl } = useJellyfin();
  const { playQueue, currentTrack, isPlaying } = usePlayer();

  // Ordena músicas em ordem alfabética por nome
  const sortedTracks = useMemo(() => {
    const cleanForSort = (str: string) => {
      if (!str) return "";
      return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents/diacritics
        .toLowerCase()
        .replace(/^[^a-z0-9]+/, "") // remove leading symbols, punctuation, non-alphanumeric characters
        .trim();
    };

    return [...tracks].sort((a, b) => {
      const nameA = a.Name || "";
      const nameB = b.Name || "";
      const cleanA = cleanForSort(nameA);
      const cleanB = cleanForSort(nameB);
      
      if (cleanA && cleanB) {
        return cleanA.localeCompare(cleanB, "pt-BR");
      }
      return nameA.toLowerCase().localeCompare(nameB.toLowerCase(), "pt-BR");
    });
  }, [tracks]);

  const trackItems = useMemo(() => {
    const imageUrl = albumId ? getImageUrl(albumId, { height: 60, width: 60, quality: 90 }) : undefined;
    return sortedTracks.map((item) =>
      trackFromJellyfinItem({
        ...item,
        Album: item.Album || albumName,
        AlbumArtist: item.AlbumArtist || item.Artists?.[0] || albumArtist,
        AlbumId: item.AlbumId || albumId,
      }, imageUrl)
    );
  }, [sortedTracks, albumId, albumName, albumArtist, getImageUrl]);

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
        {/* Linhas de skeleton com staggered delay */}
        {Array.from({ length: 10 }).map((_, i) => (
          <TrackSkeletonRow
            key={i}
            index={i}
            style={{
              animationDelay: `${i * 40}ms`,
            }}
          />
        ))}
        {/* Gradiente de fade no final */}
        <div className="h-16 bg-gradient-to-t from-background/80 to-transparent relative -mt-16 pointer-events-none" />
      </div>
    );
  }

  if (!sortedTracks.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="glass-strong rounded-full p-5">
          <Music className="w-10 h-10 text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground">Nenhuma música encontrada</p>
      </div>
    );
  }

  return (
    <div>
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
                "w-full flex items-center gap-4 px-3.5 py-2.5 rounded-lg group transition-all duration-200",
                isCurrentTrack
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-white/[0.04] border border-transparent"
              )}
            >
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2">
                  {isCurrentTrack && isPlaying && (
                    <div className="flex items-end gap-[2px] h-3.5 shrink-0 pb-0.5">
                      <span className="w-[2px] h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                      <span className="w-[2px] h-3.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
                      <span className="w-[2px] h-2.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
                    </div>
                  )}
                  <p className={cn(
                    "text-sm truncate leading-tight",
                    isCurrentTrack ? "text-primary font-medium" : "text-foreground"
                  )}>
                    {track.name}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-1">
                  {track.artist}
                </p>
              </div>

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
