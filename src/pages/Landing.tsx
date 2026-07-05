import { useEffect } from "react";
import { motion } from "framer-motion";
import { Disc3, Server, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { useJellyfin } from "@/hooks/use-jellyfin";

export default function Landing() {
  const navigate = useNavigate();
  const { connected } = useJellyfin();

  // Se já estiver conectado, redireciona direto pro player
  useEffect(() => {
    if (connected) {
      navigate("/player", { replace: true });
    }
  }, [connected, navigate]);

  if (connected) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden p-4">
      {/* Fundo com glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-[600px] h-[600px] rounded-full bg-purple-600/8 blur-[120px]" />
        <div className="absolute -bottom-32 right-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/6 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-8 relative z-10"
      >
        {/* Logo */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-purple-500/30">
          <Disc3 className="w-10 h-10 text-white" />
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">JellyMusic</h1>
          <p className="text-sm text-muted-foreground">
            Seu reprodutor musical Jellyfin
          </p>
        </div>

        <div className="glass-strong rounded-2xl p-8 w-full max-w-sm space-y-4">
          <Button
            onClick={() => navigate("/connect")}
            size="lg"
            className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-purple-500/25 transition-all duration-200 text-base"
          >
            <Server className="w-5 h-5 mr-2" />
            Conectar ao Servidor
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          <p className="text-xs text-muted-foreground/60 text-center leading-relaxed">
            Conecte-se ao seu servidor Jellyfin<br />
            para ouvir sua biblioteca musical
          </p>
        </div>

        <p className="text-xs text-muted-foreground/40 text-center">
          Requer um servidor Jellyfin próprio. Nenhum dado sai do seu servidor.
        </p>
      </motion.div>
    </div>
  );
}
