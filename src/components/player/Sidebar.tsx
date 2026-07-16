import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Music,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings2,
  Disc3,
  Sliders,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useJellyfin } from "@/hooks/use-jellyfin";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type ViewType = "artists" | "tracks" | "recent" | "search" | "settings" | "equalizer";

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const navItems: { id: ViewType; label: string; icon: React.ReactNode }[] = [
  { id: "tracks", label: "Músicas", icon: <Music className="w-4 h-4" /> },
  { id: "equalizer", label: "Equalizador", icon: <Sliders className="w-4 h-4" /> },
  { id: "settings", label: "Configurações", icon: <Settings2 className="w-4 h-4" /> },
];

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const { userName, disconnect, getUserImageUrl } = useJellyfin();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    const stored = localStorage.getItem("sidebar_collapsed");
    return stored === "true";
  });

  useEffect(() => {
    localStorage.setItem("sidebar_collapsed", String(collapsed));
  }, [collapsed]);

  const userInitial = userName?.charAt(0)?.toUpperCase() || "J";

  const handleDisconnect = () => {
    disconnect();
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 260 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="h-full flex flex-col glass rounded-2xl md:rounded-3xl border border-white/[0.04] shrink-0 overflow-hidden shadow-2xl shadow-black/30"
    >
      <div className={cn(
        "flex items-center p-3 border-b border-white/[0.02]",
        collapsed ? "justify-center" : "justify-end"
      )}>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className={cn("p-3 space-y-1", collapsed && "px-2")}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all duration-200 relative group",
                collapsed && "justify-center px-0",
                activeView === item.id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
              )}
              title={collapsed ? item.label : undefined}
            >
              {activeView === item.id && (
                <motion.div
                  layoutId="activeSidebarTab"
                  className="absolute inset-0 bg-primary/15 border border-primary/20 rounded-lg"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className={cn(
                "relative z-10 flex items-center gap-2.5 w-full",
                collapsed && "justify-center"
              )}>
                {item.icon}
                {!collapsed && <span className="truncate">{item.label}</span>}
              </span>
            </button>
          ))}

        </div>
      </ScrollArea>

      <div className={cn("border-t border-white/[0.04] p-3", collapsed && "px-2")}>
        <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
          <Avatar className="w-7 h-7 shrink-0">
            <AvatarImage src={getUserImageUrl()} alt={userName} className="object-cover" />
            <AvatarFallback className="text-[10px] bg-primary/15 border border-primary/25 text-primary text-xs font-semibold">
              {userInitial}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{userName}</p>
                <p className="text-[10px] text-muted-foreground/60 truncate">Conectado</p>
              </div>
              <button
                onClick={handleDisconnect}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-muted-foreground hover:text-destructive"
                title="Desconectar"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
