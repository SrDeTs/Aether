import { useState } from "react";
import { motion } from "framer-motion";
import {
  Library,
  Disc3,
  Mic2,
  Music,
  Clock,
  Search,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useJellyfin } from "@/hooks/use-jellyfin";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";

type ViewType = "albums" | "artists" | "tracks" | "recent" | "search";

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAlbumClick: (albumId: string) => void;
  onOpenSettings: () => void;
}

const navItems: { id: ViewType; label: string; icon: React.ReactNode }[] = [
  { id: "albums", label: "Albums", icon: <Disc3 className="w-4 h-4" /> },
  { id: "artists", label: "Artists", icon: <Mic2 className="w-4 h-4" /> },
  { id: "tracks", label: "Songs", icon: <Music className="w-4 h-4" /> },
  { id: "recent", label: "Recent", icon: <Clock className="w-4 h-4" /> },
];

export function Sidebar({ activeView, onViewChange, searchQuery, onSearchChange, onOpenSettings }: SidebarProps) {
  const { musicLibraries, selectedLibrary, selectLibrary, userName, disconnect, getImageUrl } = useJellyfin();
  const [collapsed, setCollapsed] = useState(false);

  const userInitial = userName?.charAt(0)?.toUpperCase() || "J";

  // Run inside effect instead of render for the navigate redirect
  const handleDisconnect = () => {
    disconnect();
  };


  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 260 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="h-full flex flex-col glass border-r border-white/[0.04] shrink-0 overflow-hidden"
    >
      {/* Header */}
      <div className={cn(
        "flex items-center gap-3 px-4 h-16 border-b border-white/[0.04]",
        collapsed && "justify-center px-2"
      )}>
        {!collapsed && (
          <>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Disc3 className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm truncate">JellyMusic</span>
          </>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            "ml-auto p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-muted-foreground hover:text-foreground",
            collapsed && "ml-0"
          )}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className={cn("p-3 space-y-1", collapsed && "px-2")}>
          {/* Library selector */}
          {!collapsed && musicLibraries.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2 mb-2">
                Library
              </p>
              <div className="space-y-0.5">
                {musicLibraries.map((lib) => (
                  <button
                    key={lib.Id}
                    onClick={() => selectLibrary(lib)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all duration-200",
                      selectedLibrary?.Id === lib.Id
                        ? "bg-primary/15 text-primary border border-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border border-transparent"
                    )}
                  >
                    <Library className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{lib.Name}</span>
                  </button>
                ))}
              </div>
              <Separator className="my-3 bg-white/[0.04]" />
            </div>
          )}

          {/* Navigation */}
          {!collapsed && (
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2 mb-2">
              Browse
            </p>
          )}
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

          {/* Search */}
          {!collapsed && (
            <>
              <Separator className="my-3 bg-white/[0.04]" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2 mb-2">
                Search
              </p>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
                <Input
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search music..."
                  className="pl-8 h-8 text-xs bg-white/[0.04] border-white/[0.06] rounded-lg"
                />
              </div>
            </>
          )}

          {/* Settings */}
          {!collapsed && (
            <>
              <Separator className="my-3 bg-white/[0.04]" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2 mb-2">
                App
              </p>
              <button
                onClick={onOpenSettings}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border border-transparent"
              >
                <Settings2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Configurações</span>
              </button>
            </>
          )}
        </div>
      </ScrollArea>

      {/* User footer */}
      <div className={cn(
        "border-t border-white/[0.04] p-3",
        collapsed && "px-2"
      )}>
        <div className={cn(
          "flex items-center gap-2.5",
          collapsed && "justify-center"
        )}>
          <Avatar className="w-7 h-7 shrink-0">
            <AvatarFallback className="text-[10px] bg-gradient-to-br from-purple-500/30 to-indigo-500/30 text-primary text-xs">
              {userInitial}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{userName}</p>
                <p className="text-[10px] text-muted-foreground/60 truncate">Connected</p>
              </div>
              <button
                onClick={handleDisconnect}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-muted-foreground hover:text-destructive"
                title="Disconnect"
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
