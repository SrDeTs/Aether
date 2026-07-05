import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings2,
  RotateCcw,
  ChevronDown,
  Sliders,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings, PRESETS, type FoldGradientSettings } from "@/hooks/use-settings";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

function PresetCard({ preset, active, onClick }: { preset: typeof PRESETS[0]; active: boolean; onClick: () => void }) {
  const { colors, bgColor } = preset.settings;
  const gradientPreview = colors.length >= 2
    ? `linear-gradient(135deg, ${colors[0]}, ${colors[colors.length - 1]})`
    : bgColor;

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 w-full text-left",
        active
          ? "bg-primary/15 border border-primary/30 shadow-sm shadow-primary/10"
          : "glass-card glass-card-hover border-white/[0.06]"
      )}
    >
      <div
        className="w-10 h-10 rounded-lg shrink-0 border border-white/[0.08]"
        style={{ background: gradientPreview }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{preset.name}</p>
        <p className="text-[10px] text-muted-foreground/60 truncate">
          {colors.length} cores · zoom {preset.settings.zoom}
        </p>
      </div>
      {active && (
        <div className="w-2 h-2 rounded-full bg-primary shrink-0 shadow-sm shadow-primary/50" />
      )}
    </button>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2.5">
      <label className="text-[11px] text-muted-foreground w-20 shrink-0">{label}</label>
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
          className="w-full h-8 pl-8 pr-2 text-[11px] bg-white/[0.04] border border-white/[0.08] rounded-lg text-foreground font-mono focus:outline-none focus:border-primary/40"
        />
      </div>
    </div>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  step = 0.1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[11px] text-muted-foreground">{label}</label>
        <span className="text-[10px] text-muted-foreground/60 font-mono tabular-nums">
          {value.toFixed(step >= 1 ? 0 : 1)}
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

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { settings, activePreset, updateSettings, applyPreset, resetSettings } = useSettings();
  const [tab, setTab] = useState<"presets" | "customize">("presets");
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, x: 320 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 320 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed right-0 top-0 bottom-0 w-80 z-50 glass border-l border-white/[0.06] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.04] shrink-0">
              <div className="flex items-center gap-2.5">
                <Settings2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Configurações</span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-3 pt-3 pb-2 shrink-0">
              <button
                onClick={() => setTab("presets")}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-xs font-medium transition-all",
                  tab === "presets"
                    ? "bg-primary/15 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border border-transparent"
                )}
              >
                <Sparkles className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                Presets
              </button>
              <button
                onClick={() => setTab("customize")}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-xs font-medium transition-all",
                  tab === "customize"
                    ? "bg-primary/15 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border border-transparent"
                )}
              >
                <Sliders className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                Personalizar
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-1">
                  {tab === "presets" ? (
                    <>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-1 mb-2">
                        Escolha um preset
                      </p>
                      {PRESETS.map((preset) => (
                        <PresetCard
                          key={preset.id}
                          preset={preset}
                          active={activePreset === preset.id}
                          onClick={() => applyPreset(preset.id)}
                        />
                      ))}
                    </>
                  ) : (
                    <div className="space-y-4 pb-4">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-1">
                        Cores
                      </p>
                      <div className="space-y-2 px-1">
                        <ColorInput
                          label="BG Color"
                          value={settings.bgColor}
                          onChange={(v) => updateSettings({ bgColor: v })}
                        />
                        <ColorInput
                          label="Shadow"
                          value={settings.shadowColor}
                          onChange={(v) => updateSettings({ shadowColor: v })}
                        />
                      </div>

                      {/* Color stops */}
                      <div className="space-y-2 px-1">
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

                      <Separator className="bg-white/[0.04]" />

                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-1">
                        Parâmetros
                      </p>
                      <div className="space-y-3 px-1">
                        <RangeControl
                          label="Suavidade"
                          value={settings.softness}
                          min={0}
                          max={2}
                          step={0.1}
                          onChange={(v) => updateSettings({ softness: v })}
                        />
                        <RangeControl
                          label="Saturação"
                          value={settings.saturation}
                          min={0}
                          max={2}
                          step={0.1}
                          onChange={(v) => updateSettings({ saturation: v })}
                        />
                        <RangeControl
                          label="Rotação"
                          value={settings.rotation}
                          min={0}
                          max={360}
                          step={1}
                          onChange={(v) => updateSettings({ rotation: v })}
                        />
                        <RangeControl
                          label="Zoom"
                          value={settings.zoom}
                          min={4}
                          max={18}
                          step={1}
                          onChange={(v) => updateSettings({ zoom: v })}
                        />
                        <RangeControl
                          label="Ribbon"
                          value={settings.ribbon}
                          min={0}
                          max={1}
                          step={0.05}
                          onChange={(v) => updateSettings({ ribbon: v })}
                        />
                        <RangeControl
                          label="Largura Ribbon"
                          value={settings.ribbonWidth}
                          min={0.1}
                          max={3}
                          step={0.1}
                          onChange={(v) => updateSettings({ ribbonWidth: v })}
                        />
                        <RangeControl
                          label="Velocidade"
                          value={settings.speed}
                          min={0}
                          max={3}
                          step={0.1}
                          onChange={(v) => updateSettings({ speed: v })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-white/[0.04] shrink-0">
              <Button
                onClick={resetSettings}
                variant="ghost"
                size="sm"
                className="w-full text-xs rounded-xl text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Resetar para padrão
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
