import { motion } from "framer-motion";
import { Disc3, Music } from "lucide-react";
import { useJellyfin } from "@/hooks/use-jellyfin";
import { Skeleton } from "@/components/ui/skeleton";
import type { JellyfinItem } from "@/lib/jellyfin";

interface AlbumGridProps {
  albums: JellyfinItem[];
  isLoading: boolean;
  onAlbumClick: (albumId: string) => void;
}

function AlbumCard({ album, onClick, imageUrl }: { album: JellyfinItem; onClick: () => void; imageUrl: string }) {
  const year = album.ProductionYear;
  const artist = album.AlbumArtist || album.AlbumArtists?.[0]?.Name || "Artista Desconhecido";

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      onClick={onClick}
      className="group text-left w-full"
    >
      <div className="glass-card rounded-xl overflow-hidden glass-card-hover cursor-pointer">
        <div className="relative aspect-square overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={album.Name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white/5 border border-white/[0.04]">
              <Disc3 className="w-16 h-16 text-primary/30 animate-spin-slow" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="glass-strong rounded-full p-2">
              <Music className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
        <div className="p-3 space-y-1">
          <p className="text-sm font-medium text-foreground truncate leading-tight">
            {album.Name}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {artist}
            {year && ` · ${year}`}
          </p>
        </div>
      </div>
    </motion.button>
  );
}

function AlbumGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="glass-card rounded-xl overflow-hidden">
          <Skeleton className="aspect-square w-full rounded-none bg-white/5" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4 bg-white/5" />
            <Skeleton className="h-3 w-1/2 bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AlbumGrid({ albums, isLoading, onAlbumClick }: AlbumGridProps) {
  const { getImageUrl } = useJellyfin();

  if (isLoading) return <AlbumGridSkeleton />;

  if (!albums.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="glass-strong rounded-full p-4">
          <Disc3 className="w-8 h-8 text-muted-foreground/40 animate-pulse" />
        </div>
        <p className="text-muted-foreground text-sm font-medium">Nenhum álbum encontrado</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {albums.map((album) => (
        <AlbumCard
          key={album.Id}
          album={album}
          onClick={() => onAlbumClick(album.Id)}
          imageUrl={getImageUrl(album.Id, { height: 300, width: 300, quality: 90 })}
        />
      ))}
    </div>
  );
}
