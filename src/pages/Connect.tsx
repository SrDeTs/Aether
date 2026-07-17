import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Server, User, Lock, AlertCircle, Check, Loader, Disc3 } from "lucide-react";
import { useJellyfin } from "@/hooks/use-jellyfin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Connect() {
  const navigate = useNavigate();
  const { connectWithPassword, isConnecting, error, connected } = useJellyfin();

  const [serverUrl, setServerUrl] = useState(() => localStorage.getItem("saved_server_url") || "");
  const [username, setUsername] = useState(() => localStorage.getItem("saved_username") || "");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load and clear any saved connection error from localStorage
  useEffect(() => {
    const connErr = localStorage.getItem("connection_error");
    if (connErr) {
      setLocalError(connErr);
      localStorage.removeItem("connection_error");
    }
  }, []);

  // Redirect se já conectado
  useEffect(() => {
    if (connected) {
      navigate("/player", { replace: true });
    }
  }, [connected, navigate]);

  if (connected) return null;

  const handlePasswordConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!serverUrl.trim() || !username.trim() || !password.trim()) {
      setLocalError("Preencha todos os campos");
      return;
    }
    try {
      await connectWithPassword(serverUrl.trim(), username.trim(), password);
      localStorage.setItem("saved_server_url", serverUrl.trim());
      localStorage.setItem("saved_username", username.trim());
      setSuccess(true);
      setTimeout(() => navigate("/player"), 500);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Falha na conexão");
    }
  };

  const displayError = error || localError;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-purple-600/5 blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-indigo-600/5 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-purple-600/20 to-indigo-600/20 border border-white/10 flex items-center justify-center shadow-2xl mb-4">
            <Disc3 className="w-12 h-12 text-primary animate-[spin_12s_linear_infinite]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Aether</h1>
        </div>

        <div className="glass rounded-2xl md:rounded-3xl p-6 md:p-8 border border-white/[0.04] shadow-2xl shadow-black/40">
          <form onSubmit={handlePasswordConnect} className="space-y-4">
            <div className="space-y-1.5">
              <div className="relative">
                <Server className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <Input
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="URL do Servidor (ex: http://192.168.1.100:8096)"
                  className="pl-10 h-10 bg-white/[0.03] border-white/[0.06] rounded-xl text-xs placeholder:text-muted-foreground/40"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nome do Usuário"
                  className="pl-10 h-10 bg-white/[0.03] border-white/[0.06] rounded-xl text-xs placeholder:text-muted-foreground/40"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha do Jellyfin"
                  className="pl-10 h-10 bg-white/[0.03] border-white/[0.06] rounded-xl text-xs placeholder:text-muted-foreground/40"
                />
              </div>
            </div>
            {displayError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-xs text-red-300">{displayError}</p>
              </div>
            )}
            <Button
              type="submit"
              disabled={isConnecting || success}
              className="w-full h-10 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-purple-500/20 transition-all duration-200 text-xs"
            >
              {isConnecting ? (
                <Loader className="w-4 h-4 animate-spin mr-2" />
              ) : success ? (
                <Check className="w-4 h-4 mr-2" />
              ) : null}
              {isConnecting ? "Conectando..." : success ? "Conectado!" : "Conectar"}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
