import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Disc3, Mic2, Music, ListMusic, Palette, Volume2, Info, Sparkles, Sliders, RotateCcw, Settings2, Search, Loader2, X } from "lucide-react";
import iconWebp from "../../assets/icon.webp";
import { jellyfinClient } from "@/lib/jellyfin";
import { useJellyfin } from "@/hooks/use-jellyfin";
import { usePlayer } from "@/hooks/use-player";
import { useSettings, PRESETS } from "@/hooks/use-settings";
import { Sidebar } from "@/components/player/Sidebar";
import { AlbumGrid } from "@/components/player/AlbumGrid";
import { TrackList } from "@/components/player/TrackList";
import { NowPlayingBar } from "@/components/player/NowPlayingBar";
import AnimatedFoldGradient from "@/components/FoldGradient/AnimatedFoldGradient";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RubberBandSlider } from "@/components/ui/RubberBandSlider";
import { cn } from "@/lib/utils";
import type { JellyfinItem } from "@/lib/jellyfin";

type ViewType = "albums" | "artists" | "tracks" | "recent" | "search" | "settings";

/** Correct hex-to-HSL conversion (standard algorithm, no atan2 hacks) */
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

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
  const artistName = album?.AlbumArtist || album?.AlbumArtists?.[0]?.Name || "Artista Desconhecido";

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="glass rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
      >                  <ArrowLeft className="w-3.5 h-3.5" />
                  Voltar para Álbuns
                </button>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="w-48 h-48 rounded-2xl overflow-hidden shrink-0 shadow-2xl">
          {albumImage ? (
            <img src={albumImage} alt={album?.Name || ""} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white/5 border border-white/[0.04]">
              <Disc3 className="w-16 h-16 text-primary/30 animate-spin-slow" />
            </div>
          )}
        </div>
        <div className="flex-1 pt-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground/60 font-medium mb-1">Álbum</p>
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
                {tracks.length > 0 && ` · ${tracks.length} músicas`}
              </p>
            </>
          )}
        </div>
      </div>

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

  // Dynamic theme: derive accent colors from the fold gradient palette
  useEffect(() => {
    const colors = fgSettings.colors;
    if (!colors || colors.length === 0) return;
    // Pick the middle color as the accent source
    const midColor = colors[Math.floor(colors.length / 2)];
    const { h, s, l } = hexToHSL(midColor);
    
    // Check if the color palette is monochromatic (very low saturation)
    const isMono = s <= 5;
    const sat = isMono ? 0 : Math.max(s, 35);
    const lit = isMono ? 85 : Math.max(Math.min(l, 65), 40);

    const sidebarPrimarySat = isMono ? 0 : Math.max(sat - 10, 20);
    const sidebarPrimaryLit = isMono ? 75 : Math.max(lit - 5, 35);

    const sidebarAccentSat = isMono ? 0 : Math.max(sat - 20, 10);
    const sidebarAccentLit = isMono ? 35 : Math.min(lit + 10, 55);

    const glowAccentSat = isMono ? 0 : sat;
    const glowAccentLit = isMono ? 85 : lit;

    const glowPrimarySat = isMono ? 0 : sat;
    const glowPrimaryLit = isMono ? 85 : lit;

    const root = document.documentElement;
    root.style.setProperty("--primary", `hsl(${h} ${sat}% ${lit}%)`);
    root.style.setProperty("--primary-foreground", `hsl(${h} ${isMono ? 0 : Math.min(sat, 15)}% ${isMono ? 10 : 97}%)`);
    root.style.setProperty("--ring", `hsl(${h} ${sat}% ${lit}% / 0.5)`);
    root.style.setProperty("--chart-1", `hsl(${h} ${sat}% ${lit}%)`);
    root.style.setProperty("--sidebar-primary", `hsl(${h} ${sidebarPrimarySat}% ${sidebarPrimaryLit}%)`);
    root.style.setProperty("--sidebar-accent", `hsl(${h} ${sidebarAccentSat}% ${sidebarAccentLit}% / 0.4)`);
    root.style.setProperty("--sidebar-ring", `hsl(${h} ${sat}% ${lit}% / 0.4)`);
    root.style.setProperty("--glow-accent", `hsl(${h} ${glowAccentSat}% ${glowAccentLit}% / 0.12)`);
    root.style.setProperty("--glow-primary", `hsl(${h} ${glowPrimarySat}% ${glowPrimaryLit}% / 0.2)`);
    return () => {
      ["--primary", "--primary-foreground", "--ring", "--chart-1",
       "--sidebar-primary", "--sidebar-accent", "--sidebar-ring",
       "--glow-accent", "--glow-primary"].forEach((v) => root.style.removeProperty(v));
    };
  }, [fgSettings.colors]);

  const [activeView, setActiveView] = useState<ViewType>("tracks");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);

  const [albums, setAlbums] = useState<JellyfinItem[]>([]);
  const [artists, setArtists] = useState<JellyfinItem[]>([]);
  const [tracks, setTracks] = useState<JellyfinItem[]>([]);
  const [recentTracks, setRecentTracks] = useState<JellyfinItem[]>([]);
  const [searchResults, setSearchResults] = useState<JellyfinItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!connected) navigate("/connect", { replace: true });
  }, [connected, navigate]);

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
            const result = await getTracks({ parentId, sortBy: "SortName" });
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
        console.error("Erro ao carregar dados:", err);
      } finally {
        setLoading(false);
      }
    };

    if (!searchQuery && activeView !== "search") loadData();
  }, [activeView, selectedLibrary, connected, getAlbums, getArtists, getTracks, getRecentlyAdded]);

  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (!connected || !searchQuery.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const result = await jellyfinSearch(searchQuery, { 
          limit: 50,
          parentId: selectedLibrary?.Id 
        });
        setSearchResults(result.Items || []);
      } catch (err) {
        console.error("Busca falhou:", err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, connected, jellyfinSearch, selectedLibrary]);

  useEffect(() => {
    if (searchQuery.trim()) {
      setActiveView("search");
    } else if (activeView === "search") {
      setActiveView("tracks");
    }
  }, [searchQuery, activeView]);

  const handleViewChange = useCallback((view: ViewType) => {
    setActiveView(view);
    setSelectedAlbum(null);
    if (view !== "search") setSearchQuery("");
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setSelectedAlbum(null);
  }, []);

  const handleAlbumClick = useCallback((albumId: string) => {
    setSelectedAlbum(albumId);
  }, []);

  const searchAlbums = useMemo(() =>
    searchResults.filter((i) => i.Type === "MusicAlbum"), [searchResults]
  );
  const searchTracks = useMemo(() =>
    searchResults.filter((i) => i.Type === "Audio"), [searchResults]
  );
  const searchArtists = useMemo(() =>
    searchResults.filter((i) => i.Type === "MusicArtist"), [searchResults]
  );

  if (!connected) return null;

  return (
    <div className="h-screen flex flex-col p-4 md:p-6 gap-4 md:gap-6 overflow-hidden relative">
      <div className="fixed inset-0 z-0">
        <AnimatedFoldGradient
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

      <div className="flex flex-1 gap-4 md:gap-6 overflow-hidden relative z-10">
        <Sidebar
          activeView={activeView}
          onViewChange={handleViewChange}
        />

        <div className="flex-1 overflow-y-auto glass rounded-2xl md:rounded-3xl border border-white/[0.04] shadow-2xl shadow-black/30 scrollbar-none">
          <div className="p-6 md:p-8 max-w-7xl mx-auto relative z-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedAlbum ? `album-${selectedAlbum}` : activeView}
                initial={{ opacity: 0, scale: 0.97, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.97, y: -10, filter: "blur(4px)" }}
                transition={{ type: "spring", stiffness: 300, damping: 28, mass: 0.8 }}
                className="w-full"
              >
                {selectedAlbum ? (
                  <AlbumView albumId={selectedAlbum} onBack={() => setSelectedAlbum(null)} />
                ) : (
                  <>
                    {(activeView === "tracks" || activeView === "search") && (
                      <div className="mb-6 flex justify-end">
                        <div className="relative w-full sm:w-80">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                          <Input
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            placeholder="Buscar músicas, álbuns ou artistas..."
                            className="pl-10 pr-10 h-10 text-xs bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05] focus:bg-white/[0.06] rounded-xl focus-visible:ring-primary/20 placeholder:text-muted-foreground/30 transition-all duration-200"
                          />
                          {searchLoading ? (
                            <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
                          ) : searchQuery ? (
                            <button
                              onClick={() => handleSearchChange("")}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-white/10 text-muted-foreground/50 hover:text-foreground transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    )}
                    {activeView === "search" && searchQuery.trim() && (
                      <div className="space-y-8">
                        {searchLoading && searchResults.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            <p className="text-xs text-muted-foreground/60 font-mono">Buscando no Jellyfin...</p>
                          </div>
                        ) : (
                          <>
                            {searchArtists.length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3 font-mono">Artistas</h2>
                                <div className="flex flex-wrap gap-3">
                                  {searchArtists.map((artist) => (
                                    <motion.button
                                      key={artist.Id}
                                      className="glass-strong rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-white/[0.08] active:scale-95 transition-all text-left w-full sm:w-[220px]"
                                      onClick={() => handleSearchChange(artist.Name)}
                                    >
                                      <div className="w-10 h-10 rounded-full overflow-hidden bg-white/5 border border-white/[0.04] shrink-0">
                                        {getImageUrl(artist.Id, { height: 80, width: 80, quality: 80 }) ? (
                                          <img src={getImageUrl(artist.Id, { height: 80, width: 80, quality: 80 })} alt={artist.Name} className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center bg-primary/10">
                                            <Mic2 className="w-4 h-4 text-primary" />
                                          </div>
                                        )}
                                      </div>
                                      <p className="text-xs font-medium truncate flex-1">{artist.Name}</p>
                                    </motion.button>
                                  ))}
                                </div>
                              </motion.div>
                            )}

                            {searchAlbums.length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, delay: 0.05 }}
                              >
                                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3 font-mono">Álbuns</h2>
                                <AlbumGrid albums={searchAlbums} isLoading={false} onAlbumClick={handleAlbumClick} />
                              </motion.div>
                            )}

                            {searchTracks.length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, delay: 0.1 }}
                              >
                                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3 font-mono">Músicas</h2>
                                <TrackList tracks={searchTracks} isLoading={false} />
                              </motion.div>
                            )}

                            {!searchLoading && searchResults.length === 0 && (
                              <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <div className="glass-strong rounded-full p-5">
                                  <Music className="w-10 h-10 text-muted-foreground/30" />
                                </div>
                                <p className="text-sm text-muted-foreground">Nenhum resultado encontrado</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {activeView === "albums" && (
                      <AlbumGrid albums={albums} isLoading={loading} onAlbumClick={handleAlbumClick} />
                    )}

                    {activeView === "artists" && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {artists.map((artist) => (
                          <motion.button
                            key={artist.Id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-card rounded-xl overflow-hidden glass-card-hover text-center p-4 flex flex-col items-center gap-3 cursor-pointer"
                            onClick={() => setSearchQuery(artist.Name)}
                          >
                            <div className="w-24 h-24 rounded-full overflow-hidden bg-white/5 border border-white/[0.04]">
                              {getImageUrl(artist.Id, { height: 200, width: 200, quality: 90 }) ? (
                                <img src={getImageUrl(artist.Id, { height: 200, width: 200, quality: 90 })} alt={artist.Name} className="w-full h-full object-cover" loading="lazy" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center"><Mic2 className="w-8 h-8 text-primary/30" /></div>
                              )}
                            </div>
                            <p className="text-sm font-medium truncate max-w-[140px]">{artist.Name}</p>
                          </motion.button>
                        ))}
                        {!loading && artists.length === 0 && (
                          <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
                            <div className="glass-strong rounded-full p-6"><Mic2 className="w-12 h-12 text-muted-foreground/50" /></div>
                            <p className="text-muted-foreground text-lg">Nenhum artista encontrado</p>
                          </div>
                        )}
                      </div>
                    )}

                    {activeView === "tracks" && <TrackList tracks={tracks} isLoading={loading} />}
                    {activeView === "recent" && <TrackList tracks={recentTracks} isLoading={loading} />}

                    {activeView === "settings" && <SettingsView />}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <NowPlayingBar />
    </div>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2.5">
      <label className="text-xs text-muted-foreground w-20 shrink-0">{label}</label>
      <div className="relative flex-1">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute left-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md border-0 cursor-pointer bg-transparent p-0" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-8 pl-8 pr-2 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-foreground font-mono focus:outline-none focus:border-primary/40" />
      </div>
    </div>
  );
}

function RangeControl({ label, value, min, max, step = 0.1, onChange, unit = "" }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unit?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted-foreground">{label}</label>
        <span className="text-[10px] text-muted-foreground/60 font-mono tabular-nums">{value.toFixed(step >= 1 ? 0 : 1)}{unit}</span>
      </div>
      <RubberBandSlider
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

function SettingsView() {
  const { settings, activePreset, updateSettings, applyPreset, resetSettings } = useSettings();
  const { volume, setVolume } = usePlayer();
  const { userName, serverUrl, disconnect } = useJellyfin();
  const [tab, setTab] = useState<"aparência" | "sobre">("aparência");

  const tabs = [
    { id: "aparência" as const, label: "Aparência", icon: <Palette className="w-4 h-4" /> },
    { id: "sobre" as const, label: "Sobre", icon: <Info className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 relative",
              tab === t.id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
            )}
          >
            {tab === t.id && (
              <motion.div
                layoutId="activeSettingsTab"
                className="absolute inset-0 bg-primary/15 border border-primary/20 rounded-xl"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {t.icon}
              {t.label}
            </span>
          </button>
        ))}
      </div>

      {tab === "aparência" && (
        <div className="space-y-6">
          <div className="glass-strong rounded-2xl p-5">
            <h2 className="text-sm font-semibold mb-1 flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Presets do Fundo</h2>
            <p className="text-xs text-muted-foreground/60 mb-4">Escolha um tema visual para o fundo do app</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESETS.map((preset) => {
                const grad = preset.settings.colors.length >= 2
                  ? `linear-gradient(135deg, ${preset.settings.colors.join(", ")})`
                  : preset.settings.bgColor;
                return (
                  <button key={preset.id} onClick={() => applyPreset(preset.id)}
                    className={cn("relative p-3 rounded-xl transition-all duration-200 text-left border",
                      activePreset === preset.id ? "bg-primary/15 border-primary/30 shadow-sm shadow-primary/10" : "glass-card-hover border-white/[0.06] hover:bg-white/[0.04]")}>
                    <div className="w-full h-12 rounded-lg mb-2" style={{ background: grad }} />
                    <p className="text-xs font-medium truncate">{preset.name}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="glass-strong rounded-2xl p-5">
            <h2 className="text-sm font-semibold mb-1 flex items-center gap-2"><Sliders className="w-4 h-4 text-primary" /> Personalização</h2>
            <p className="text-xs text-muted-foreground/60 mb-4">Ajuste manual dos parâmetros do gradiente</p>
            <div className="space-y-2">
              <ColorInput label="Fundo" value={settings.bgColor} onChange={(v) => updateSettings({ bgColor: v })} />
              <ColorInput label="Sombra" value={settings.shadowColor} onChange={(v) => updateSettings({ shadowColor: v })} />
              {settings.colors.map((c, i) => (
                <ColorInput key={i} label={`Cor ${i + 1}`} value={c} onChange={(v) => {
                  const nc = [...settings.colors]; nc[i] = v; updateSettings({ colors: nc });
                }} />
              ))}
            </div>
            <Separator className="bg-white/[0.04] my-4" />
            <div className="space-y-3">
              <RangeControl label="Suavidade" value={settings.softness} min={0} max={2} step={0.1} onChange={(v) => updateSettings({ softness: v })} />
              <RangeControl label="Saturação" value={settings.saturation} min={0} max={2} step={0.1} onChange={(v) => updateSettings({ saturation: v })} />
              <RangeControl label="Rotação" value={settings.rotation} min={0} max={360} step={1} unit="°" onChange={(v) => updateSettings({ rotation: v })} />
              <RangeControl label="Zoom" value={settings.zoom} min={4} max={18} step={1} onChange={(v) => updateSettings({ zoom: v })} />
              <RangeControl label="Ribbon" value={settings.ribbon} min={0} max={1} step={0.05} onChange={(v) => updateSettings({ ribbon: v })} />
              <RangeControl label="Velocidade" value={settings.speed} min={0} max={3} step={0.1} onChange={(v) => updateSettings({ speed: v })} />
            </div>
            <Button onClick={resetSettings} variant="ghost" size="sm" className="w-full mt-4 text-xs rounded-xl text-muted-foreground hover:text-foreground">
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Resetar para padrão
            </Button>
          </div>

          <div className="glass-strong rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2"><Volume2 className="w-4 h-4 text-primary" /> Áudio</h2>
            <RangeControl label="Volume Padrão" value={volume} min={0} max={1} step={0.01} onChange={(v) => setVolume(v)} />
          </div>

          <div className="glass-strong rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2"><Music className="w-4 h-4 text-primary" /> Jellyfin</h2>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p><span className="text-foreground/60">Servidor:</span> {serverUrl}</p>
              <p><span className="text-foreground/60">Usuário:</span> {userName}</p>
            </div>
            <Button onClick={disconnect} variant="destructive" size="sm" className="text-xs rounded-xl">Desconectar do Servidor</Button>
          </div>
        </div>
      )}

      {tab === "sobre" && (
        <div className="glass-strong rounded-2xl p-5 space-y-4 text-center">
          <img src={iconWebp} className="w-16 h-16 rounded-2xl mx-auto shadow-xl" alt="JellyMusic" />
          <div><h2 className="text-lg font-bold">JellyMusic</h2><p className="text-xs text-muted-foreground">v1.0.0</p></div>
          <p className="text-xs text-muted-foreground/60 max-w-md mx-auto leading-relaxed">
            Um reprodutor musical moderno para servidores Jellyfin.<br /> Com temas dinâmicos, efeitos glassmorphism e integração direta.
          </p>
          <Separator className="bg-white/[0.04]" />
          <p className="text-[10px] text-muted-foreground/40">Construído com React, Vite, Convex e Paper Shaders</p>
        </div>
      )}
    </div>
  );
}
