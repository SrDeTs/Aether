import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Disc3,
  Palette,
  Volume2,
  Info,
  RotateCcw,
  Sparkles,
  Sliders,
  Music,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings, PRESETS } from "@/hooks/use-settings";
import { usePlayer } from "@/hooks/use-player";
import { useJellyfin } from "@/hooks/use-jellyfin";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

type SettingsTab = "aparência" | "reprodução" | "sobre";

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2.5">
      <label className="text-xs text-muted-foreground w-20 shrink-0">{label}</label>
      <div className="relative flex-1">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute left-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md border-0 cursor-pointer bg-transparent p-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-8 pl-8 pr-2 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-foreground font-mono focus:outline-none focus:border-primary/40"
        />
      </div>
    </div>
  );
}

function RangeControl({
  label, value, min, max, step = 0.1, onChange, unit = "",
}: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unit?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted-foreground">{label}</label>
        <span className="text-[10px] text-muted-foreground/60 font-mono tabular-nums">
          {value.toFixed(step >= 1 ? 0 : 1)}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 appearance-none bg-white/[0.08] rounded-full cursor-pointer
          [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-white/[0.08] [&::-webkit-slider-runnable-track]:rounded-full
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-primary/30
          [&::-moz-range-track]:h-1 [&::-moz-range-track]:bg-white/[0.08] [&::-moz-range-track]:rounded-full
          [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0"
      />
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { settings, activePreset, updateSettings, applyPreset, resetSettings } = useSettings();
  const { volume, setVolume } = usePlayer();
  const { userName, serverUrl, disconnect, connected } = useJellyfin();
  const [tab, setTab] = useState<SettingsTab>("aparência");

  // Redirect to connect if not connected
  if (!connected) {
    navigate("/connect", { replace: true });
    return null;
  }

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "aparência", label: "Aparência", icon: <Palette className="w-4 h-4" /> },
    { id: "reprodução", label: "Reprodução", icon: <Volume2 className="w-4 h-4" /> },
    { id: "sobre", label: "Sobre", icon: <Info className="w-4 h-4" /> },
  ];

  return (
    <div className="h-screen flex flex-col">
      <div className="flex flex-1 overflow-hidden relative z-10">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => navigate("/player")}
                className="p-2 rounded-lg glass hover:bg-white/[0.06] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-lg font-semibold">Configurações</h1>
                <p className="text-xs text-muted-foreground/60">Personalize sua experiência</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2",
                    tab === t.id
                      ? "bg-primary/15 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border border-transparent"
                  )}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "aparência" && (
              <div className="space-y-6">
                {/* Presets */}
                <div className="glass-strong rounded-2xl p-5">
                  <h2 className="text-sm font-semibold mb-1 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Presets do Fundo
                  </h2>
                  <p className="text-xs text-muted-foreground/60 mb-4">
                    Escolha um tema visual para o fundo do app
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PRESETS.map((preset) => {
                      const gradientPreview = preset.settings.colors.length >= 2
                        ? `linear-gradient(135deg, ${preset.settings.colors[0]}, ${preset.settings.colors[preset.settings.colors.length - 1]})`
                        : preset.settings.bgColor;
                      return (
                        <button
                          key={preset.id}
                          onClick={() => applyPreset(preset.id)}
                          className={cn(
                            "relative p-3 rounded-xl transition-all duration-200 text-left border",
                            activePreset === preset.id
                              ? "bg-primary/15 border-primary/30 shadow-sm shadow-primary/10"
                              : "glass-card-hover border-white/[0.06] hover:bg-white/[0.04]"
                          )}
                        >
                          <div className="w-full h-12 rounded-lg mb-2" style={{ background: gradientPreview }} />
                          <p className="text-xs font-medium truncate">{preset.name}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Personalização avançada */}
                <div className="glass-strong rounded-2xl p-5">
                  <h2 className="text-sm font-semibold mb-1 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-primary" />
                    Personalização Avançada
                  </h2>
                  <p className="text-xs text-muted-foreground/60 mb-4">
                    Ajuste manual dos parâmetros do gradiente
                  </p>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
                        Cores
                      </p>
                      <div className="space-y-2">
                        <ColorInput label="Fundo" value={settings.bgColor} onChange={(v) => updateSettings({ bgColor: v })} />
                        <ColorInput label="Sombra" value={settings.shadowColor} onChange={(v) => updateSettings({ shadowColor: v })} />
                        {settings.colors.map((color, i) => (
                          <ColorInput
                            key={i}
                            label={`Cor ${i + 1}`}
                            value={color}
                            onChange={(v) => {
                              const newColors = [...settings.colors];
                              newColors[i] = v;
                              updateSettings({ colors: newColors });
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <Separator className="bg-white/[0.04]" />

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
                        Parâmetros
                      </p>
                      <div className="space-y-3">
                        <RangeControl label="Suavidade" value={settings.softness} min={0} max={2} step={0.1} onChange={(v) => updateSettings({ softness: v })} />
                        <RangeControl label="Saturação" value={settings.saturation} min={0} max={2} step={0.1} onChange={(v) => updateSettings({ saturation: v })} />
                        <RangeControl label="Rotação" value={settings.rotation} min={0} max={360} step={1} unit="°" onChange={(v) => updateSettings({ rotation: v })} />
                        <RangeControl label="Zoom" value={settings.zoom} min={4} max={18} step={1} onChange={(v) => updateSettings({ zoom: v })} />
                        <RangeControl label="Ribbon" value={settings.ribbon} min={0} max={1} step={0.05} onChange={(v) => updateSettings({ ribbon: v })} />
                        <RangeControl label="Largura" value={settings.ribbonWidth} min={0.1} max={3} step={0.1} onChange={(v) => updateSettings({ ribbonWidth: v })} />
                        <RangeControl label="Velocidade" value={settings.speed} min={0} max={3} step={0.1} onChange={(v) => updateSettings({ speed: v })} />
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={resetSettings}
                    variant="ghost"
                    size="sm"
                    className="w-full mt-4 text-xs rounded-xl text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    Resetar para padrão
                  </Button>
                </div>
              </div>
            )}

            {tab === "reprodução" && (
              <div className="glass-strong rounded-2xl p-5 space-y-4">
                <h2 className="text-sm font-semibold mb-1 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-primary" />
                  Áudio
                </h2>
                <RangeControl
                  label="Volume Padrão"
                  value={volume}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(v) => setVolume(v)}
                />
                <p className="text-[10px] text-muted-foreground/60">
                  O volume é salvo automaticamente entre sessões
                </p>

                <Separator className="bg-white/[0.04]" />

                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Music className="w-4 h-4 text-primary" />
                  Jellyfin
                </h2>
                <div className="space-y-2 text-xs">
                  <p className="text-muted-foreground">
                    <span className="text-foreground/60">Servidor:</span> {serverUrl}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="text-foreground/60">Usuário:</span> {userName}
                  </p>
                </div>
                <Button
                  onClick={disconnect}
                  variant="destructive"
                  size="sm"
                  className="text-xs rounded-xl"
                >
                  Desconectar do Servidor
                </Button>
              </div>
            )}

            {tab === "sobre" && (
              <div className="glass-strong rounded-2xl p-5 space-y-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-purple-500/20 mx-auto">
                  <Disc3 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">JellyMusic</h2>
                  <p className="text-xs text-muted-foreground">v1.0.0</p>
                </div>
                <p className="text-xs text-muted-foreground/60 max-w-md mx-auto leading-relaxed">
                  Um reprodutor musical moderno para servidores Jellyfin.<br />
                  Com temas dinâmicos, efeitos glassmorphism e integração direta.
                </p>
                <Separator className="bg-white/[0.04]" />
                <p className="text-[10px] text-muted-foreground/40">
                  Construído com React, Vite, Convex e Paper Shaders
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
