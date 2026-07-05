import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Disc3, Server, Key, User, Lock, AlertCircle, Check, Loader } from "lucide-react";
import { useJellyfin } from "@/hooks/use-jellyfin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Connect() {
  const navigate = useNavigate();
  const { connectWithPassword, connectWithApiKey, isConnecting, error, connected } = useJellyfin();

  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [apiKeyServerUrl, setApiKeyServerUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
      setSuccess(true);
      setTimeout(() => navigate("/player"), 500);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Falha na conexão");
    }
  };

  const handleApiKeyConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!apiKeyServerUrl.trim() || !apiKey.trim()) {
      setLocalError("Preencha todos os campos");
      return;
    }
    try {
      await connectWithApiKey(apiKeyServerUrl.trim(), apiKey.trim());
      setSuccess(true);
      setTimeout(() => navigate("/player"), 500);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Falha na conexão");
    }
  };

  const displayError = error || localError;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-purple-600/5 blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-indigo-600/5 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-purple-500/20 mb-4">
            <Disc3 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">JellyMusic</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Conecte-se ao seu servidor Jellyfin
          </p>
        </div>

        <div className="glass-strong rounded-2xl p-6">
          <Tabs defaultValue="password" className="w-full">
            <TabsList className="w-full mb-6 bg-white/[0.04] rounded-xl p-1">
              <TabsTrigger value="password" className="flex-1 text-xs rounded-lg data-[state=active]:glass">
                <User className="w-3.5 h-3.5 mr-1.5" />
                Usuário
              </TabsTrigger>
              <TabsTrigger value="apikey" className="flex-1 text-xs rounded-lg data-[state=active]:glass">
                <Key className="w-3.5 h-3.5 mr-1.5" />
                API Key
              </TabsTrigger>
            </TabsList>

            <TabsContent value="password">
              <form onSubmit={handlePasswordConnect} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">URL do Servidor</label>
                  <div className="relative">
                    <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                    <Input
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                      placeholder="https://seu-servidor-jellyfin:8096"
                      className="pl-9 h-10 bg-white/[0.04] border-white/[0.08] rounded-xl text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Usuário</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="jellyfin"
                      className="pl-9 h-10 bg-white/[0.04] border-white/[0.08] rounded-xl text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-9 h-10 bg-white/[0.04] border-white/[0.08] rounded-xl text-sm"
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
                  className="w-full h-10 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-purple-500/20 transition-all duration-200"
                >
                  {isConnecting ? (
                    <Loader className="w-4 h-4 animate-spin mr-2" />
                  ) : success ? (
                    <Check className="w-4 h-4 mr-2" />
                  ) : null}
                  {isConnecting ? "Conectando..." : success ? "Conectado!" : "Conectar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="apikey">
              <form onSubmit={handleApiKeyConnect} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">URL do Servidor</label>
                  <div className="relative">
                    <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                    <Input
                      value={apiKeyServerUrl}
                      onChange={(e) => setApiKeyServerUrl(e.target.value)}
                      placeholder="https://seu-servidor-jellyfin:8096"
                      className="pl-9 h-10 bg-white/[0.04] border-white/[0.08] rounded-xl text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">API Key</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                    <Input
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sua-api-key"
                      className="pl-9 h-10 bg-white/[0.04] border-white/[0.08] rounded-xl text-sm"
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
                  className="w-full h-10 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-purple-500/20 transition-all duration-200"
                >
                  {isConnecting ? (
                    <Loader className="w-4 h-4 animate-spin mr-2" />
                  ) : success ? (
                    <Check className="w-4 h-4 mr-2" />
                  ) : null}
                  {isConnecting ? "Conectando..." : success ? "Conectado!" : "Conectar"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <p className="text-center text-xs text-muted-foreground/60 mt-6">
          Seus dados de conexão ficam salvos localmente e nunca são enviados
        </p>
      </motion.div>
    </div>
  );
}
