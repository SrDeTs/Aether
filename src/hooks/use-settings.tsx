import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export interface FoldGradientSettings {
  colors: string[];
  bgColor: string;
  shadowColor: string;
  softness: number;
  saturation: number;
  rotation: number;
  zoom: number;
  ribbon: number;
  ribbonWidth: number;
  speed: number;
}

export interface Preset {
  id: string;
  name: string;
  settings: FoldGradientSettings;
}

const DEFAULT_SETTINGS: FoldGradientSettings = {
  colors: ["#700000", "#008cff", "#75daff", "#ff0026", "#ff3626"],
  bgColor: "#121212",
  shadowColor: "#0a1c2a",
  softness: 1,
  saturation: 1,
  rotation: 52,
  zoom: 9,
  ribbon: 0,
  ribbonWidth: 1,
  speed: 1,
};

export const PRESETS: Preset[] = [
  {
    id: "raycast",
    name: "Raycast",
    settings: {
      colors: ["#700000", "#008cff", "#75daff", "#ff0026", "#ff3626"],
      bgColor: "#121212",
      shadowColor: "#0a1c2a",
      softness: 1,
      saturation: 1,
      rotation: 52,
      zoom: 9,
      ribbon: 0,
      ribbonWidth: 1,
      speed: 1,
    },
  },
  {
    id: "aurora",
    name: "Aurora Borealis",
    settings: {
      colors: ["#0a1a1a", "#00ff88", "#00ddff", "#8844ff", "#ff44aa"],
      bgColor: "#050e0e",
      shadowColor: "#001a1a",
      softness: 1.2,
      saturation: 1.3,
      rotation: 45,
      zoom: 10,
      ribbon: 0,
      ribbonWidth: 1,
      speed: 0.8,
    },
  },
  {
    id: "sunset",
    name: "Golden Sunset",
    settings: {
      colors: ["#1a0800", "#ff4400", "#ff8800", "#ffcc44", "#ffeebb"],
      bgColor: "#0a0500",
      shadowColor: "#1a0a00",
      softness: 0.9,
      saturation: 1.4,
      rotation: 60,
      zoom: 8,
      ribbon: 0.1,
      ribbonWidth: 0.8,
      speed: 0.7,
    },
  },
  {
    id: "ocean",
    name: "Deep Ocean",
    settings: {
      colors: ["#001020", "#004466", "#0088aa", "#44ccdd", "#88eeff"],
      bgColor: "#000810",
      shadowColor: "#001833",
      softness: 1.1,
      saturation: 1.1,
      rotation: 30,
      zoom: 11,
      ribbon: 0,
      ribbonWidth: 1,
      speed: 0.6,
    },
  },
  {
    id: "neon",
    name: "Neon Nights",
    settings: {
      colors: ["#0a0015", "#ff00aa", "#6600ff", "#00ccff", "#ff0066"],
      bgColor: "#050010",
      shadowColor: "#150030",
      softness: 0.8,
      saturation: 1.8,
      rotation: 70,
      zoom: 7,
      ribbon: 0.2,
      ribbonWidth: 0.6,
      speed: 1.2,
    },
  },
  {
    id: "mono",
    name: "Monochrome",
    settings: {
      colors: ["#000000", "#333333", "#666666", "#999999", "#ffffff"],
      bgColor: "#050505",
      shadowColor: "#000000",
      softness: 1,
      saturation: 0,
      rotation: 52,
      zoom: 9,
      ribbon: 0,
      ribbonWidth: 1,
      speed: 0.5,
    },
  },
  {
    id: "ribbon",
    name: "Crystal Ribbons",
    settings: {
      colors: ["#1a0020", "#cc44ff", "#4488ff", "#00ffcc", "#44ff88"],
      bgColor: "#080010",
      shadowColor: "#200040",
      softness: 1.3,
      saturation: 1.5,
      rotation: 40,
      zoom: 12,
      ribbon: 0.8,
      ribbonWidth: 0.7,
      speed: 0.9,
    },
  },
  {
    id: "fire",
    name: "Inferno",
    settings: {
      colors: ["#1a0000", "#880000", "#ff2200", "#ff8800", "#ffdd44"],
      bgColor: "#0a0000",
      shadowColor: "#1a0500",
      softness: 0.7,
      saturation: 1.6,
      rotation: 55,
      zoom: 6,
      ribbon: 0.15,
      ribbonWidth: 0.9,
      speed: 1.5,
    },
  },
  {
    id: "forest",
    name: "Enchanted Forest",
    settings: {
      colors: ["#001a0a", "#004422", "#228844", "#66cc66", "#aaffaa"],
      bgColor: "#000a05",
      shadowColor: "#002010",
      softness: 1,
      saturation: 1,
      rotation: 35,
      zoom: 10,
      ribbon: 0.05,
      ribbonWidth: 1,
      speed: 0.7,
    },
  },
  {
    id: "galaxy",
    name: "Galaxy Dust",
    settings: {
      colors: ["#05001a", "#220066", "#6600cc", "#8844ff", "#ff66cc"],
      bgColor: "#020010",
      shadowColor: "#0a0030",
      softness: 1.4,
      saturation: 1.2,
      rotation: 65,
      zoom: 14,
      ribbon: 0.3,
      ribbonWidth: 0.5,
      speed: 0.4,
    },
  },
];

interface SettingsContextType {
  settings: FoldGradientSettings;
  activePreset: string | null;
  updateSettings: (partial: Partial<FoldGradientSettings>) => void;
  applyPreset: (presetId: string) => void;
  resetSettings: () => void;
  presets: Preset[];
}

const SettingsContext = createContext<SettingsContextType | null>(null);

function loadSettings(): FoldGradientSettings {
  try {
    const saved = localStorage.getItem("foldgradient_settings");
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

function loadActivePreset(): string | null {
  return localStorage.getItem("foldgradient_active_preset");
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<FoldGradientSettings>(loadSettings);
  const [activePreset, setActivePreset] = useState<string | null>(loadActivePreset);

  useEffect(() => {
    localStorage.setItem("foldgradient_settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (activePreset) {
      localStorage.setItem("foldgradient_active_preset", activePreset);
      localStorage.setItem("foldgradient_last_applied_preset", activePreset);
    } else {
      localStorage.removeItem("foldgradient_active_preset");
    }
  }, [activePreset]);

  const updateSettings = useCallback((partial: Partial<FoldGradientSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
    setActivePreset(null);
  }, []);

  const applyPreset = useCallback((presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setSettings(preset.settings);
      setActivePreset(presetId);
    }
  }, []);

  const resetSettings = useCallback(() => {
    const lastPresetId = localStorage.getItem("foldgradient_last_applied_preset") || "raycast";
    const preset = PRESETS.find((p) => p.id === lastPresetId);
    if (preset) {
      setSettings(preset.settings);
      setActivePreset(lastPresetId);
    } else {
      setSettings(DEFAULT_SETTINGS);
      setActivePreset(null);
    }
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        activePreset,
        updateSettings,
        applyPreset,
        resetSettings,
        presets: PRESETS,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextType {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
