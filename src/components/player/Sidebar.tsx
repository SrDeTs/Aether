import { useState } from "react";
import { motion } from "framer-motion";
import {
  Music,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useJellyfin } from "@/hooks/use-jellyfin";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type ViewType = "albums" | "artists" | "tracks" | "recent" | "search" | "settings";

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const navItems: { id: ViewType; label: string; icon: React.ReactNode }[] = [
  { id: "tracks", label: "Músicas", icon: <Music className="w-4 h-4" /> },
  { id: "settings", label: "Configurações", icon: <Settings2 className="w-4 h-4" /> },
];

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const { userName, disconnect } = useJellyfin();
  const [collapsed, setCollapsed] = useState(false);

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
                "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all duration-200",
                collapsed && "justify-center px-0",
                activeView === item.id
                  ? "bg-primary/15 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border border-transparent"
              )}
              title={collapsed ? item.label : undefined}
            >
              {item.icon}
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          ))}

        </div>
      </ScrollArea>

      <div className={cn("border-t border-white/[0.04] p-3", collapsed && "px-2")}>
        <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
          <Avatar className="w-7 h-7 shrink-0">
            <AvatarFallback className="text-[10px] bg-gradient-to-br from-purple-500/30 to-indigo-500/30 text-primary text-xs">
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
