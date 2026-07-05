import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Disc3, Mic2, Music, ListMusic, Palette, Volume2, Info, Sparkles, Sliders, RotateCcw, Settings2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { JellyfinItem } from "@/lib/jellyfin";

type ViewType = "albums" | "artists" | "tracks" | "recent" | "search" | "settings";

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
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Voltar para Álbuns
      </button>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="w-48 h-48 rounded-2xl overflow-hidden shrink-0 shadow-2xl">
          {albumImage ? (
            <img src={albumImage} alt={album?.Name || ""} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/40 to-indigo-900/40">
              <Disc3 className="w-16 h-16 text-white/20" />
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

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

function rgbToOklch(r: number, g: number, b: number, lightness = 0.6, chroma = 0.15): string {
  const hue = Math.atan2(b - 0.5, r - 0.5) * (180 / Math.PI);
  const h = ((hue % 360) + 360) % 360;
  return `oklch(${lightness} ${chroma} ${h})`;
}

function getThemeColors(colors: string[]) {
  if (!colors || colors.length === 0) {
    return {
      primary: "oklch(0.68 0.18 300)",
      accent: "oklch(0.55 0.15 280)",
      muted: "oklch(0.65 0.04 280)",
      chart1: "oklch(0.68 0.18 300)",
    };
  }
  const primaryHex = colors[Math.min(2, colors.length - 1)];
  const accentHex = colors[Math.min(1, colors.length - 1)];
  const mutedHex = colors[0];
  const chartHex = colors[colors.length - 1];

  const [pr, pg, pb] = hexToRgb(primaryHex);
  const [ar, ag, ab] = hexToRgb(accentHex);
  const [mr, mg, mm] = hexToRgb(mutedHex);
  const [cr, cg, cb] = hexToRgb(chartHex);

  return {
    primary: rgbToOklch(pr, pg, pb, 0.65, 0.18),
    accent: rgbToOklch(ar, ag, ab, 0.55, 0.15),
    muted: rgbToOklch(mr, mg, mm, 0.6, 0.06),
    chart1: rgbToOklch(cr, cg, cb, 0.62, 0.2),
  };
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

  const [activeView, setActiveView] = useState<ViewType>("albums");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);

  const [albums, setAlbums] = useState<JellyfinItem[]>([]);
  const [artists, setArtists] = useState<JellyfinItem[]>([]);
  const [tracks, setTracks] = useState<JellyfinItem[]>([]);
  const [recentTracks, setRecentTracks] = useState<JellyfinItem[]>([]);
  const [searchResults, setSearchResults] = useState<JellyfinItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Dynamic theme based on fold gradient colors
  useEffect(() => {
    const theme = getThemeColors(fgSettings.colors);
    const root = document.documentElement;
    root.style.setProperty("--primary", theme.primary);
    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--muted-foreground", theme.muted);
    root.style.setProperty("--chart-1", theme.chart1);
    root.style.setProperty("--ring", theme.primary.replace(")", " / 0.5)"));
  }, [fgSettings.colors]);

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
        console.error("Busca falhou:", err);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, connected, jellyfinSearch]);

  useEffect(() => {
    if (searchQuery.trim()) setActiveView("search");
  }, [searchQuery]);

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

  if (!connected) return null;

  return (
    <div className="h-screen flex flex-col">
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

      <div className="flex flex-1 overflow-hidden relative z-10">
        <Sidebar
          activeView={activeView}
          onViewChange={handleViewChange}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onAlbumClick={handleAlbumClick}
        />

        <div className="flex-1 overflow-y-auto relative">
          <div className="p-6 pb-28 max-w-7xl mx-auto relative z-10">
            <div className="mb-6">
              {selectedAlbum ? null : (
                <div className="flex items-center gap-3 mb-1">
                  {activeView === "albums" && <Disc3 className="w-5 h-5 text-primary" />}
                  {activeView === "artists" && <Mic2 className="w-5 h-5 text-primary" />}
                  {activeView === "tracks" && <Music className="w-5 h-5 text-primary" />}
                  {activeView === "recent" && <ListMusic className="w-5 h-5 text-primary" />}
                  {activeView === "settings" && <Settings2 className="w-5 h-5 text-primary" />}
                  <h1 className="text-lg font-semibold text-foreground">
                    {activeView === "albums" && "Álbuns"}
                    {activeView === "artists" && "Artistas"}
                    {activeView === "tracks" && "Todas as Músicas"}
                    {activeView === "recent" && "Adicionados Recentemente"}
                    {activeView === "settings" && "Configurações"}
                    {activeView === "search" && `Busca: "${searchQuery}"`}
                  </h1>
                </div>
              )}
              {selectedLibrary && !selectedAlbum && (
                <p className="text-xs text-muted-foreground/60 ml-8">Biblioteca: {selectedLibrary.Name}</p>
              )}
            </div>

            {selectedAlbum ? (
              <AlbumView albumId={selectedAlbum} onBack={() => setSelectedAlbum(null)} />
            ) : (
              <>
                {activeView === "search" && searchQuery.trim() && (
                  <div className="space-y-8">
                    {searchAlbums.length > 0 && (
                      <div>
                        <h2 className="text-sm font-medium text-muted-foreground mb-3">Álbuns</h2>
                        <AlbumGrid albums={searchAlbums} isLoading={false} onAlbumClick={handleAlbumClick} />
                      </div>
                    )}
                    {searchTracks.length > 0 && (
                      <div>
                        <h2 className="text-sm font-medium text-muted-foreground mb-3">Músicas</h2>
                        <TrackList tracks={searchTracks} isLoading={false} />
                      </div>
                    )}
                    {searchResults.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="glass-strong rounded-full p-5">
                          <Music className="w-10 h-10 text-muted-foreground/30" />
                        </div>
                        <p className="text-muted-foreground">Nenhum resultado encontrado</p>
                      </div>
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
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-purple-900/40 to-indigo-900/40">
                          {getImageUrl(artist.Id, { height: 200, width: 200, quality: 90 }) ? (
                            <img src={getImageUrl(artist.Id, { height: 200, width: 200, quality: 90 })} alt={artist.Name} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Mic2 className="w-8 h-8 text-white/20" /></div>
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
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 appearance-none bg-white/[0.08] rounded-full cursor-pointer
          [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-white/[0.08] [&::-webkit-slider-runnable-track]:rounded-full
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-primary/30
          [&::-moz-range-track]:h-1 [&::-moz-range-track]:bg-white/[0.08] [&::-moz-range-track]:rounded-full
          [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0" />
    </div>
  );
}

function SettingsView() {
  const { settings, activePreset, updateSettings, applyPreset, resetSettings } = useSettings();
  const { volume, setVolume } = usePlayer();
  const { userName, serverUrl, disconnect } = useJellyfin();
  const [tab, setTab] = useState<"aparência" | "reprodução" | "sobre">("aparência");

  const tabs = [
    { id: "aparência" as const, label: "Aparência", icon: <Palette className="w-4 h-4" /> },
    { id: "reprodução" as const, label: "Reprodução", icon: <Volume2 className="w-4 h-4" /> },
    { id: "sobre" as const, label: "Sobre", icon: <Info className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2",
              tab === t.id ? "bg-primary/15 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border border-transparent")}
          >{t.icon}{t.label}</button>
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
                  ? `linear-gradient(135deg, ${preset.settings.colors[0]}, ${preset.settings.colors[preset.settings.colors.length - 1]})`
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
        </div>
      )}

      {tab === "reprodução" && (
        <div className="glass-strong rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2"><Volume2 className="w-4 h-4 text-primary" /> Áudio</h2>
          <RangeControl label="Volume Padrão" value={volume} min={0} max={1} step={0.01} onChange={(v) => setVolume(v)} />
          <Separator className="bg-white/[0.04]" />
          <h2 className="text-sm font-semibold flex items-center gap-2"><Music className="w-4 h-4 text-primary" /> Jellyfin</h2>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p><span className="text-foreground/60">Servidor:</span> {serverUrl}</p>
            <p><span className="text-foreground/60">Usuário:</span> {userName}</p>
          </div>
          <Button onClick={disconnect} variant="destructive" size="sm" className="text-xs rounded-xl">Desconectar do Servidor</Button>
        </div>
      )}

      {tab === "sobre" && (
        <div className="glass-strong rounded-2xl p-5 space-y-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-purple-500/20 mx-auto">
            <Disc3 className="w-8 h-8 text-white" />
          </div>
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
