import { motion } from "framer-motion";
import { Disc3, Music, Headphones, ArrowRight, Server, Shield, Zap } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useJellyfin } from "@/hooks/use-jellyfin";

export default function Landing() {
  const navigate = useNavigate();
  const { connected } = useJellyfin();

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Ambient background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-[600px] h-[600px] rounded-full bg-purple-600/8 blur-[120px]" />
        <div className="absolute -top-32 right-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/6 blur-[100px]" />
        <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] rounded-full bg-fuchsia-500/5 blur-[80px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Disc3 className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-sm">JellyMusic</span>
        </div>
        <div className="flex items-center gap-3">
          {connected && (
            <Button
              onClick={() => navigate("/player")}
              variant="ghost"
              size="sm"
              className="text-xs rounded-xl"
            >
              Open Player
            </Button>
          )}
          <Button
            onClick={() => navigate(connected ? "/player" : "/connect")}
            size="sm"
            className="text-xs rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/20"
          >
            {connected ? "Launch Player" : "Connect Server"}
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-3xl mx-auto text-center"
        >
          <Badge variant="outline" className="mb-6 glass rounded-full px-4 py-1.5 text-xs font-normal text-muted-foreground border-white/[0.08]">
            <Headphones className="w-3 h-3 mr-1.5" />
            Stream your Jellyfin music library
          </Badge>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="text-foreground">Your Music.</span>
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
              Anywhere.
            </span>
          </h1>

          <p className="text-base md:text-lg text-muted-foreground/80 max-w-xl mx-auto mb-10 leading-relaxed">
            A beautiful, modern music player for your Jellyfin server.
            Browse albums, discover artists, and enjoy your collection
            with a sleek glassmorphic interface.
          </p>

          <div className="flex items-center justify-center gap-3">
            <Button
              onClick={() => navigate("/connect")}
              size="lg"
              className="rounded-xl h-12 px-8 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium shadow-xl shadow-purple-500/25 transition-all duration-200 hover:shadow-2xl hover:shadow-purple-500/30"
            >
              <Server className="w-4 h-4 mr-2" />
              Connect to Server
            </Button>
            {connected && (
              <Button
                onClick={() => navigate("/player")}
                size="lg"
                variant="outline"
                className="rounded-xl h-12 px-8 glass border-white/[0.1] hover:bg-white/[0.06]"
              >
                <Music className="w-4 h-4 mr-2" />
                Open Player
              </Button>
            )}
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full"
        >
          {[
            {
              icon: <Shield className="w-5 h-5 text-purple-400" />,
              title: "Direct Connection",
              description: "Connect directly to your Jellyfin server. No intermediaries, no cloud.",
            },
            {
              icon: <Music className="w-5 h-5 text-indigo-400" />,
              title: "Full Library Access",
              description: "Browse albums, artists, and songs from your entire music collection.",
            },
            {
              icon: <Zap className="w-5 h-5 text-fuchsia-400" />,
              title: "Real Playback",
              description: "Stream audio directly from your server with real controls.",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="glass-card rounded-2xl p-5 border-white/[0.06]"
            >
              <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1.5">{feature.title}</h3>
              <p className="text-xs text-muted-foreground/70 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center text-xs text-muted-foreground/40 mt-12 pb-8"
        >
          Requires a self-hosted Jellyfin server. No data leaves your server.
        </motion.p>
      </div>
    </div>
  );
}
