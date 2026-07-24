import { useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Music } from "lucide-react";
import { useJellyfin } from "@/hooks/use-jellyfin";
import { usePlayer, trackFromJellyfinItem } from "@/hooks/use-player";
import { Skeleton } from "@/components/ui/skeleton";
import type { JellyfinItem } from "@/lib/jellyfin";
import { compareItemNames } from "@/lib/utils";
import OptionWheel from "@/components/ui/OptionWheel";

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
  const { playQueue, currentTrack } = usePlayer();

  // Ordena músicas em ordem alfabética por nome
  const sortedTracks = useMemo(() => {
    return [...tracks].sort(compareItemNames);
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

  const currentTrackIndex = useMemo(() => {
    if (!currentTrack) return 0;
    const idx = trackItems.findIndex((t) => t.id === currentTrack.id);
    return idx !== -1 ? idx : 0;
  }, [trackItems, currentTrack]);

  const formattedWheelItems = useMemo(() => {
    return trackItems.map((track) => `${track.name} • ${track.artist}`);
  }, [trackItems]);

  const handleWheelSettled = useCallback((index: number) => {
    if (index === currentTrackIndex) return;
    playQueue(trackItems, index);
  }, [currentTrackIndex, playQueue, trackItems]);

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
    <div className="relative w-full h-[460px] md:h-[500px] flex items-center justify-center overflow-hidden">
      {/* Ambient glow behind/centered with the active element of the wheel */}
      <div className="absolute left-[60px] md:left-[100px] top-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

      <OptionWheel
        items={formattedWheelItems}
        defaultSelected={currentTrackIndex}
        textColor="rgba(255, 255, 255, 0.35)"
        activeColor="var(--primary)"
        side="left"
        fontSize={1.7}
        spacing={1.8}
        curve={1.2}
        tilt={6}
        blur={2}
        fade={0.32}
        smoothing={220}
        inset={60}
        loop={true}
        draggable={true}
        onSettled={handleWheelSettled}
        className="w-full h-full"
      />
    </div>
  );
}
