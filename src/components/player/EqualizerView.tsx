import { useState, useRef, useEffect } from "react";
import { usePlayer } from "@/hooks/use-player";
import { motion } from "framer-motion";
import {
  Power,
  RotateCcw,
  Sparkles,
  Sliders,
  Volume2,
  Ear,
  Layers,
  Activity,
  Waves,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RubberBandSlider } from "@/components/ui/RubberBandSlider";
import { VerticalRubberBandSlider } from "@/components/ui/VerticalRubberBandSlider";

const bands = [
  { freq: "32Hz", label: "Sub-Grave" },
  { freq: "64Hz", label: "Sub-Grave" },
  { freq: "125Hz", label: "Graves" },
  { freq: "250Hz", label: "Médio-Graves" },
  { freq: "500Hz", label: "Médios" },
  { freq: "1kHz", label: "Médios" },
  { freq: "2kHz", label: "Médio-Agudos" },
  { freq: "4kHz", label: "Agudos" },
  { freq: "8kHz", label: "Agudos" },
  { freq: "16kHz", label: "Brilho" },
];

const presetsList = [
  { id: "Flat", name: "Padrão (Flat)" },
  { id: "Bass Booster", name: "Super Graves" },
  { id: "Bass Reducer", name: "Reduzir Graves" },
  { id: "Treble Booster", name: "Super Agudos" },
  { id: "Treble Reducer", name: "Reduzir Agudos" },
  { id: "Pop", name: "Pop" },
  { id: "Rock", name: "Rock" },
  { id: "Jazz", name: "Jazz" },
  { id: "Classical", name: "Clássica" },
  { id: "Dance", name: "Eletrônica (Dance)" },
  { id: "Vocal Booster", name: "Clareza Vocal" },
];

export function EqualizerView() {
  const {
    eqEnabled,
    setEqEnabled,
    eqPreamp,
    setEqPreamp,
    eqGains,
    setEqGain,
    eqBassBoost,
    setEqBassBoost,
    eqVocalBoost,
    setEqVocalBoost,
    eqReverb,
    setEqReverb,
    eqPreset,
    applyEqPreset,
    getAnalyserData,
    isPlaying,
  } = usePlayer();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dynamic Canvas Audio Spectrum Visualizer
  useEffect(() => {
    let animationId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const { analyser } = getAnalyserData();
    const bufferLength = analyser ? analyser.frequencyBinCount : 64;
    const dataArray = new Uint8Array(bufferLength);

    let waveAngle = 0;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      if (analyser && isPlaying && eqEnabled) {
        analyser.getByteFrequencyData(dataArray);

        const barWidth = (width / bufferLength) * 1.5;
        let x = 0;

        // Draw neon styled gradient frequency bars
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, "rgba(59, 130, 246, 0.05)");   // Neon blue bottom
        gradient.addColorStop(0.5, "rgba(139, 92, 246, 0.4)");  // Purple mid
        gradient.addColorStop(1, "rgba(236, 72, 153, 0.8)");    // Pink peaks

        for (let i = 0; i < bufferLength; i++) {
          const value = dataArray[i] / 255;
          const barHeight = value * height * 0.8;

          ctx.fillStyle = gradient;
          
          ctx.beginPath();
          ctx.roundRect(x, height - barHeight, barWidth - 1.5, barHeight, [3, 3, 0, 0]);
          ctx.fill();

          x += barWidth;
        }
      } else {
        // Breathing ambient sine wave when silent or equalizer is off
        ctx.beginPath();
        ctx.strokeStyle = eqEnabled
          ? "rgba(139, 92, 246, 0.3)"
          : "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = 1.5;

        waveAngle += 0.02;
        for (let x = 0; x < width; x++) {
          const y =
            height / 2 +
            Math.sin(x * 0.01 + waveAngle) * 12 * Math.sin(x * 0.003 + waveAngle * 0.5);
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [getAnalyserData, isPlaying, eqEnabled]);

  const handleReset = () => {
    applyEqPreset("Flat");
    setEqPreamp(0);
    setEqBassBoost(0);
    setEqVocalBoost(0);
    setEqReverb(0);
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full h-full text-foreground/90 select-none pb-24">
      
      {/* Header Info Banner (Simplified) */}
      <div className="flex flex-row items-center justify-end gap-4 pb-2 border-b border-white/[0.06]">

        {/* Master Power Toggle and Reset Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.04] text-xs font-medium transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Resetar
          </button>
          
          <button
            onClick={() => setEqEnabled(!eqEnabled)}
            className={cn(
              "flex items-center gap-2 px-4.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide border transition duration-300",
              eqEnabled
                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                : "bg-transparent text-muted-foreground border-white/[0.08] hover:border-white/20"
            )}
          >
            <Power className="w-3.5 h-3.5" />
            {eqEnabled ? "ATIVADO" : "DESATIVADO"}
          </button>
        </div>
      </div>

      {/* Visualizer and Preset Grid Splitter */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Dynamic Spectrum Display */}
        <div className="lg:col-span-7 flex flex-col gap-2 bg-black/20 border border-white/[0.04] rounded-2xl p-4 min-h-[140px] relative overflow-hidden group">
          <div className="flex items-center justify-between z-10">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/80 flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-primary" />
              Espectro de Áudio
            </span>
            {eqEnabled && isPlaying && (
              <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                Processando DSP
              </span>
            )}
          </div>
          <canvas
            ref={canvasRef}
            className="w-full h-24 mt-2 opacity-80 group-hover:opacity-100 transition duration-300"
          />
        </div>

        {/* Dynamic Presets Shelf */}
        <div className="lg:col-span-5 flex flex-col gap-3 bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Presets de Estúdio
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto max-h-[120px] pr-1.5">
            {presetsList.map((preset) => (
              <button
                key={preset.id}
                disabled={!eqEnabled}
                onClick={() => applyEqPreset(preset.id)}
                className={cn(
                  "text-[11px] px-2.5 py-1.5 rounded-xl border font-medium transition text-left truncate flex items-center justify-between",
                  !eqEnabled && "opacity-40 cursor-not-allowed",
                  eqPreset === preset.id && eqEnabled
                    ? "bg-primary/10 border-primary/40 text-primary shadow-sm"
                    : "bg-white/[0.01] border-white/[0.04] hover:border-white/[0.12] text-foreground/70"
                )}
              >
                {preset.name}
                {eqPreset === preset.id && eqEnabled && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Main Multi-Band Equalizer Sliders Row */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 relative">
        <div className="flex items-center justify-between mb-8">
          <span className="text-xs font-semibold tracking-wider text-muted-foreground flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            EQUALIZADOR GRÁFICO (10 BANDAS)
          </span>
        </div>

        <div className={cn(
          "flex justify-between items-stretch gap-2 overflow-x-auto min-h-[300px] pb-2 px-1 touch-pan-x transition duration-300",
          !eqEnabled && "opacity-45 pointer-events-none filter blur-[0.5px]"
        )}>
          
          {/* Pre-Amp Slider Block */}
          <div className="flex flex-col items-center gap-3 bg-white/[0.02] border border-white/[0.06] rounded-2xl py-4 px-3 min-w-[70px] select-none shadow-inner mr-4">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Pre-Amp
            </span>
            
            <div className="relative flex-1 flex flex-col justify-center items-center py-2 h-[170px]">
              {/* Level markings */}
              <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-between text-[8px] font-mono text-muted-foreground/40 pointer-events-none select-none py-1 pr-1">
                <span>+15</span>
                <span>+10</span>
                <span>+5</span>
                <span>0</span>
                <span>-5</span>
                <span>-10</span>
                <span>-15</span>
              </div>

              {/* Slider Input */}
              <VerticalRubberBandSlider
                min={-15}
                max={15}
                step={0.5}
                value={eqPreamp}
                onChange={setEqPreamp}
                className="h-[140px] w-5"
              />
            </div>

            <div className="flex flex-col items-center mt-1">
              <span className="text-[11px] font-mono font-bold text-primary">
                {eqPreamp > 0 ? `+${eqPreamp.toFixed(1)}` : eqPreamp.toFixed(1)}
              </span>
              <span className="text-[9px] text-muted-foreground font-semibold uppercase mt-0.5">
                dB
              </span>
            </div>
          </div>

          {/* Equalizer Frequency Sliders */}
          {bands.map((band, idx) => {
            const gain = eqGains[idx] ?? 0;
            return (
              <div
                key={band.freq}
                className="flex flex-col items-center gap-3 bg-white/[0.01] border border-white/[0.03] hover:border-white/[0.08] hover:bg-white/[0.02] rounded-2xl py-4 px-2.5 flex-1 min-w-[64px] select-none transition group shadow-sm"
              >
                <div className="text-center">
                  <span className="text-[10px] font-bold text-foreground/80 group-hover:text-primary transition duration-200">
                    {band.freq}
                  </span>
                  <span className="block text-[8px] text-muted-foreground font-medium scale-90 origin-center truncate max-w-[58px]">
                    {band.label}
                  </span>
                </div>
                
                <div className="relative flex-1 flex flex-col justify-center items-center py-2 h-[170px] w-full">
                  {/* Grid Lines background */}
                  <div className="absolute inset-y-2 w-[1px] bg-white/[0.04] left-1/2 -translate-x-1/2 pointer-events-none select-none" />
                  <div className="absolute top-1/2 -translate-y-1/2 w-4 h-[1px] bg-white/[0.08] left-1/2 -translate-x-1/2 pointer-events-none select-none" />

                  {/* Slider Input */}
                  <VerticalRubberBandSlider
                    min={-15}
                    max={15}
                    step={0.5}
                    value={gain}
                    onChange={(val) => setEqGain(idx, val)}
                    className="h-[140px] w-5"
                  />
                </div>

                <div className="flex flex-col items-center mt-1">
                  <span className={cn(
                    "text-[10px] font-mono font-bold transition",
                    gain !== 0 ? "text-primary" : "text-muted-foreground"
                  )}>
                    {gain > 0 ? `+${gain.toFixed(1)}` : gain.toFixed(1)}
                  </span>
                  <span className="text-[8px] text-muted-foreground font-mono">
                    dB
                  </span>
                </div>
              </div>
            );
          })}

        </div>
      </div>

      {/* Bento Rack for DSP Special Effects */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Bass Boost Card */}
        <div className={cn(
          "bg-white/[0.02] border border-white/[0.05] rounded-3xl p-5 flex flex-col gap-4 relative overflow-hidden transition duration-300",
          !eqEnabled && "opacity-45 pointer-events-none filter blur-[0.5px]"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                <Volume2 className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Super Graves
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-blue-400">
              {eqBassBoost > 0 ? `+${eqBassBoost.toFixed(1)} dB` : "Inativo"}
            </span>
          </div>

          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Aumenta o ganho do sub-grave de 100Hz para reforçar batidas sem distorcer.
          </p>

          <RubberBandSlider
            min={0}
            max={15}
            step={0.5}
            value={eqBassBoost}
            onChange={setEqBassBoost}
            className="w-full"
          />
        </div>

        {/* Vocal Booster Card */}
        <div className={cn(
          "bg-white/[0.02] border border-white/[0.05] rounded-3xl p-5 flex flex-col gap-4 relative overflow-hidden transition duration-300",
          !eqEnabled && "opacity-45 pointer-events-none filter blur-[0.5px]"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400">
                <Ear className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Clareza Vocal
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-pink-400">
              {eqVocalBoost > 0 ? `+${eqVocalBoost.toFixed(1)} dB` : "Inativo"}
            </span>
          </div>

          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Destaque de presença e frequências de voz para obter cantos nítidos e claros.
          </p>

          <RubberBandSlider
            min={0}
            max={15}
            step={0.5}
            value={eqVocalBoost}
            onChange={setEqVocalBoost}
            className="w-full"
          />
        </div>

        {/* Reverb Spatializer Card */}
        <div className={cn(
          "bg-white/[0.02] border border-white/[0.05] rounded-3xl p-5 flex flex-col gap-4 relative overflow-hidden transition duration-300",
          !eqEnabled && "opacity-45 pointer-events-none filter blur-[0.5px]"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
                <Waves className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Ambiente 3D
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400">
              {eqReverb > 0 ? `${eqReverb.toFixed(0)}%` : "Inativo"}
            </span>
          </div>

          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Simula acústica espacial de estúdio adicionando ambiência e eco dinâmico.
          </p>

          <RubberBandSlider
            min={0}
            max={100}
            step={1}
            value={eqReverb}
            onChange={setEqReverb}
            className="w-full"
          />
        </div>

      </div>

    </div>
  );
}
