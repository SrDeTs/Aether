import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Disc3, Mic2, Music, ListMusic } from "lucide-react";
import { jellyfinClient } from "@/lib/jellyfin";
import { useJellyfin } from "@/hooks/use-jellyfin";
import { usePlayer, trackFromJellyfinItem } from "@/hooks/use-player";
import { useSettings } from "@/hooks/use-settings";
import { Sidebar } from "@/components/player/Sidebar";
import { AlbumGrid } from "@/components/player/AlbumGrid";
import { TrackList } from "@/components/player/TrackList";
import { NowPlayingBar } from "@/components/player/NowPlayingBar";
import { SettingsPanel } from "@/components/player/SettingsPanel";
import FoldGradient from "@/components/FoldGradient/FoldGradient";
import type { JellyfinItem } from "@/lib/jellyfin";

type ViewType = "albums" | "artists" | "tracks" | "recent" | "search";

interface AlbumViewProps {
  albumId: string;
  onBack: () => void;
}

function AlbumView({ albumId, onBack }: AlbumViewProps) {
  const { getImageUrl } = useJellyfin();
  const [album, setAlbum] = useState<JellyfinItem | null>(null);
  const [tracks, setTracks] = useState<JellyfinItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      jellyfinClient.getItem(albumId),
      jellyfinClient.getAlbumTracks(albumId),
    ]).then(([albumData, tracksData]) => {
      setAlbum(albumData);
      setTracks(tracksData.Items || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [albumId]);

  const albumImage = album ? getImageUrl(album.Id, { height: 300, width: 300, quality: 90 }) : undefined;
  const artistName = album?.AlbumArtist || album?.AlbumArtists?.[0]?.Name || "Unknown Artist";

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="glass rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Albums
      </button>

      {/* Album header */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="w-48 h-48 rounded-2xl overflow-hidden shrink-0 shadow-2xl">
          {albumImage ? (
            <img src={albumImage} alt={album?.Name || ""} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-900/40 to-indigo-900/40 flex items-center justify-center">
              <Disc3 className="w-16 h-16 text-white/20" />
            </div>
          )}
        </div>
        <div className="flex-1 pt-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground/60 font-medium mb-1">Album</p>
          {loading ? (
            <div className="space-y-2">
              <div className="h-8 w-64 shimmer rounded-lg" />
              <div className="h-4 w-32 shimmer rounded-lg" />
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-foreground mb-2">{album?.Name}</h1>
              <p className="text-sm text-muted-foreground">
                {artistName}
                {album?.ProductionYear && ` · ${album.ProductionYear}`}
                {tracks.length > 0 && ` · ${tracks.length} tracks`}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Track list */}
      <TrackList
        tracks={tracks}
        isLoading={loading}
        albumId={albumId}
        albumName={album?.Name}
        albumArtist={artistName}
      />
    </div>
  );
}

export default function Player() {
  const navigate = useNavigate();
  const {
    connected,
    musicLibraries,
    selectedLibrary,
    getAlbums,
    getArtists,
    getTracks,
    getRecentlyAdded,
    search: jellyfinSearch,
    getImageUrl,
    selectLibrary,
  } = useJellyfin();
  const { playQueue } = usePlayer();
  const { settings: fgSettings } = useSettings();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>("albums");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);

  // Data states
  const [albums, setAlbums] = useState<JellyfinItem[]>([]);
  const [artists, setArtists] = useState<JellyfinItem[]>([]);
  const [tracks, setTracks] = useState<JellyfinItem[]>([]);
  const [recentTracks, setRecentTracks] = useState<JellyfinItem[]>([]);
  const [searchResults, setSearchResults] = useState<JellyfinItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Redirect to connect if not connected
  useEffect(() => {
    if (!connected) {
      navigate("/connect", { replace: true });
    }
  }, [connected, navigate]);

  // Load data based on active view
  useEffect(() => {
    if (!connected) return;

    const parentId = selectedLibrary?.Id;

    const loadData = async () => {
      setLoading(true);
      try {
        switch (activeView) {
          case "albums": {
            const result = await getAlbums({ parentId });
            setAlbums(result.Items || []);
            break;
          }
          case "artists": {
            const result = await getArtists({ parentId });
            setArtists(result.Items || []);
            break;
          }
          case "tracks": {
            const result = await getTracks({ parentId, sortBy: "Album,SortName" });
            setTracks(result.Items || []);
            break;
          }
          case "recent": {
            const result = await getRecentlyAdded({ limit: 30, parentId });
            setRecentTracks(result.Items || []);
            break;
          }
        }
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (!searchQuery && activeView !== "search") {
      loadData();
    }
  }, [activeView, selectedLibrary, connected, getAlbums, getArtists, getTracks, getRecentlyAdded]);

  // Handle search
  useEffect(() => {
    if (!connected || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const result = await jellyfinSearch(searchQuery, { limit: 30 });
        setSearchResults(result.Items || []);
      } catch (err) {
        console.error("Search failed:", err);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery, connected, jellyfinSearch]);

  // When search is active, switch to search view
  useEffect(() => {
    if (searchQuery.trim()) {
      setActiveView("search");
    }
  }, [searchQuery]);

  const handleViewChange = useCallback((view: ViewType) => {
    setActiveView(view);
    setSelectedAlbum(null);
    if (view !== "search") {
      setSearchQuery("");
    }
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setSelectedAlbum(null);
  }, []);

  const handleAlbumClick = useCallback((albumId: string) => {
    setSelectedAlbum(albumId);
  }, []);

  const handlePlayTrack = useCallback((items: JellyfinItem[], startIndex: number) => {
    const libraryId = selectedLibrary?.Id;
    const imageUrl = libraryId ? getImageUrl(libraryId) : undefined;
    const trackItems = items.map((item) =>
      trackFromJellyfinItem({ ...item, Album: item.Album }, imageUrl)
    );
    playQueue(trackItems, startIndex);
  }, [selectedLibrary, getImageUrl, playQueue]);

  // Organize search results by type
  const searchAlbums = useMemo(() =>
    searchResults.filter((i) => i.Type === "MusicAlbum"),
    [searchResults]
  );
  const searchTracks = useMemo(() =>
    searchResults.filter((i) => i.Type === "Audio"),
    [searchResults]
  );
  const searchArtistsItems = useMemo(() =>
    searchResults.filter((i) => i.Type === "MusicArtist"),
    [searchResults]
  );

  if (!connected) return null;

  return (
    <div className="h-screen flex flex-col">
      {/* Fold gradient background */}
      <div className="fixed inset-0 z-0">
        <FoldGradient
          colors={fgSettings.colors}
          bgColor={fgSettings.bgColor}
          shadowColor={fgSettings.shadowColor}
          softness={fgSettings.softness}
          saturation={fgSettings.saturation}
          rotation={fgSettings.rotation}
          zoom={fgSettings.zoom}
          ribbon={fgSettings.ribbon}
          ribbonWidth={fgSettings.ribbonWidth}
          speed={fgSettings.speed}
          style={{ position: "absolute", inset: 0 }}
        />
      </div>

      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Sidebar */}
        <Sidebar
          activeView={activeView}
          onViewChange={handleViewChange}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onAlbumClick={handleAlbumClick}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        {/* Main content */}
        <div className="flex-1 overflow-y-auto relative">
          <div className="p-6 pb-28 max-w-7xl mx-auto relative z-10">
            {/* Header */}
            <div className="mb-6">
              {selectedAlbum ? null : (
                <div className="flex items-center gap-3 mb-1">
                  {activeView === "albums" && <Disc3 className="w-5 h-5 text-primary" />}
                  {activeView === "artists" && <Mic2 className="w-5 h-5 text-primary" />}
                  {activeView === "tracks" && <Music className="w-5 h-5 text-primary" />}
                  {activeView === "recent" && <ListMusic className="w-5 h-5 text-primary" />}
                  <h1 className="text-lg font-semibold text-foreground">
                    {activeView === "albums" && "Albums"}
                    {activeView === "artists" && "Artists"}
                    {activeView === "tracks" && "All Songs"}
                    {activeView === "recent" && "Recently Added"}
                    {activeView === "search" && `Search: "${searchQuery}"`}
                  </h1>
                </div>
              )}

              {selectedLibrary && !selectedAlbum && (
                <p className="text-xs text-muted-foreground/60 ml-8">
                  Library: {selectedLibrary.Name}
                </p>
              )}
            </div>

            {selectedAlbum ? (
              <AlbumView
                albumId={selectedAlbum}
                onBack={() => setSelectedAlbum(null)}
              />
            ) : (
              <>
                {/* Search Results */}
                {activeView === "search" && searchQuery.trim() && (
                  <div className="space-y-8">
                    {searchAlbums.length > 0 && (
                      <div>
                        <h2 className="text-sm font-medium text-muted-foreground mb-3">Albums</h2>
                        <AlbumGrid
                          albums={searchAlbums}
                          isLoading={false}
                          onAlbumClick={handleAlbumClick}
                        />
                      </div>
                    )}
                    {searchTracks.length > 0 && (
                      <div>
                        <h2 className="text-sm font-medium text-muted-foreground mb-3">Songs</h2>
                        <TrackList
                          tracks={searchTracks}
                          isLoading={false}
                        />
                      </div>
                    )}
                    {searchResults.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="glass-strong rounded-full p-5">
                          <Music className="w-10 h-10 text-muted-foreground/30" />
                        </div>
                        <p className="text-muted-foreground">No results found</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Albums */}
                {activeView === "albums" && (
                  <AlbumGrid
                    albums={albums}
                    isLoading={loading}
                    onAlbumClick={handleAlbumClick}
                  />
                )}

                {/* Artists */}
                {activeView === "artists" && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {artists.map((artist) => (
                      <motion.button
                        key={artist.Id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card rounded-xl overflow-hidden glass-card-hover text-center p-4 flex flex-col items-center gap-3 cursor-pointer"
                        onClick={() => {
                          // Show artist albums
                          // For now, search for albums by this artist
                          setSearchQuery(artist.Name);
                        }}
                      >
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-purple-900/40 to-indigo-900/40">
                          {getImageUrl(artist.Id, { height: 200, width: 200, quality: 90 }) ? (
                            <img
                              src={getImageUrl(artist.Id, { height: 200, width: 200, quality: 90 })}
                              alt={artist.Name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Mic2 className="w-8 h-8 text-white/20" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium truncate max-w-[140px]">{artist.Name}</p>
                          <p className="text-xs text-muted-foreground">
                            {artist.Type === "MusicArtist" ? "Artist" : ""}
                          </p>
                        </div>
                      </motion.button>
                    ))}
                    {!loading && artists.length === 0 && (
                      <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
                        <div className="glass-strong rounded-full p-6">
                          <Mic2 className="w-12 h-12 text-muted-foreground/50" />
                        </div>
                        <p className="text-muted-foreground text-lg">No artists found</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tracks (All Songs) */}
                {activeView === "tracks" && (
                  <TrackList
                    tracks={tracks}
                    isLoading={loading}
                  />
                )}

                {/* Recently Added */}
                {activeView === "recent" && (
                  <TrackList
                    tracks={recentTracks}
                    isLoading={loading}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Now Playing Bar */}
      <NowPlayingBar />

      {/* Settings Panel */}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
