import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { jellyfinClient, type JellyfinView, type JellyfinItem, type JellyfinItemsResponse } from "@/lib/jellyfin";

interface JellyfinContextType {
  connected: boolean;
  serverUrl: string;
  userName: string;
  isConnecting: boolean;
  error: string | null;
  musicLibraries: JellyfinView[];
  selectedLibrary: JellyfinView | null;
  connectWithPassword: (serverUrl: string, username: string, password: string) => Promise<void>;
  connectWithApiKey: (serverUrl: string, apiKey: string) => Promise<void>;
  disconnect: () => void;
  selectLibrary: (library: JellyfinView | null) => void;
  // Data fetching
  getAlbums: (options?: { parentId?: string; startIndex?: number; limit?: number }) => Promise<JellyfinItemsResponse>;
  getAlbumTracks: (albumId: string) => Promise<JellyfinItemsResponse>;
  getArtists: (options?: { parentId?: string; startIndex?: number; limit?: number }) => Promise<JellyfinItemsResponse>;
  getTracks: (options?: { parentId?: string; startIndex?: number; limit?: number; sortBy?: string }) => Promise<JellyfinItemsResponse>;
  getRecentlyAdded: (options?: { limit?: number; parentId?: string }) => Promise<JellyfinItemsResponse>;
  search: (query: string, options?: { limit?: number; parentId?: string }) => Promise<JellyfinItemsResponse>;
  getImageUrl: (itemId: string, options?: { height?: number; width?: number; quality?: number }) => string;
  getBackdropUrl: (itemId: string, options?: { height?: number; width?: number; quality?: number }) => string;
  getStreamUrl: (itemId: string, container?: string) => string;
  getUserImageUrl: (userId?: string) => string;
  userId: string;
}

const JellyfinContext = createContext<JellyfinContextType | null>(null);

export function JellyfinProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(jellyfinClient.isConnected);
  const [serverUrl, setServerUrl] = useState(jellyfinClient.serverUrl);
  const [userId, setUserId] = useState(jellyfinClient.userId);
  const [userName, setUserName] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [musicLibraries, setMusicLibraries] = useState<JellyfinView[]>([]);
  const [selectedLibrary, setSelectedLibrary] = useState<JellyfinView | null>(null);
  const [userDisplayName, setUserDisplayName] = useState("");

  // On mount, if already connected, fetch libraries
  useEffect(() => {
    if (jellyfinClient.isConnected) {
      setConnected(true);
      setServerUrl(jellyfinClient.serverUrl);
      loadLibraries();

      // Try to restore display name
      const savedName = localStorage.getItem("jellyfin_user_name");
      if (savedName) setUserDisplayName(savedName);
    }
  }, []);

  const loadLibraries = useCallback(async () => {
    try {
      const musicLibs = await jellyfinClient.getMusicLibraries();
      setMusicLibraries(musicLibs);
      if (musicLibs.length > 0) {
        // Check if previously selected library still exists
        const savedId = localStorage.getItem("jellyfin_selected_library");
        const found = savedId ? musicLibs.find((lib) => lib.Id === savedId) : null;
        setSelectedLibrary(found || musicLibs[0]);
      }
    } catch (err) {
      console.error("Failed to load libraries:", err);
    }
  }, []);

  const connectWithPassword = useCallback(async (sUrl: string, username: string, password: string) => {
    setIsConnecting(true);
    setError(null);
    try {
      const { user, token } = await jellyfinClient.authenticateWithPassword(sUrl, username, password);
      jellyfinClient.setConfig({
        serverUrl: sUrl.replace(/\/+$/, ""),
        token,
        userId: user.Id,
      });
      setConnected(true);
      setServerUrl(sUrl);
      setUserId(user.Id);
      setUserName(username);
      const displayName = user.Name || username;
      setUserDisplayName(displayName);
      localStorage.setItem("jellyfin_user_name", displayName);
      await loadLibraries();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      setError(message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [loadLibraries]);

  const connectWithApiKey = useCallback(async (sUrl: string, apiKey: string) => {
    setIsConnecting(true);
    setError(null);
    try {
      const { user } = await jellyfinClient.authenticateWithApiKey(sUrl, apiKey);
      jellyfinClient.setConfig({
        serverUrl: sUrl.replace(/\/+$/, ""),
        token: apiKey,
        userId: user.Id,
      });
      setConnected(true);
      setServerUrl(sUrl);
      setUserId(user.Id);
      const displayName = user.Name || "User";
      setUserDisplayName(displayName);
      localStorage.setItem("jellyfin_user_name", displayName);
      await loadLibraries();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      setError(message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [loadLibraries]);

  const disconnect = useCallback(() => {
    jellyfinClient.disconnect();
    setConnected(false);
    setServerUrl("");
    setUserName("");
    setUserId("");
    setUserDisplayName("");
    setMusicLibraries([]);
    setSelectedLibrary(null);
    localStorage.removeItem("jellyfin_user_name");
    localStorage.removeItem("jellyfin_selected_library");
  }, []);

  useEffect(() => {
    jellyfinClient.onUnauthorized = () => {
      localStorage.setItem("connection_error", "Sua sessão expirou ou a chave de API é inválida. Por favor, conecte-se novamente.");
      disconnect();
    };
    return () => {
      jellyfinClient.onUnauthorized = undefined;
    };
  }, [disconnect]);

  // Keep device active in Jellyfin server by posting capabilities on connect and periodically
  useEffect(() => {
    if (connected) {
      // First registration
      jellyfinClient.postCapabilities();

      const interval = setInterval(() => {
        jellyfinClient.postCapabilities();
      }, 3 * 60 * 1000); // every 3 minutes

      return () => clearInterval(interval);
    }
  }, [connected]);

  const selectLibrary = useCallback((library: JellyfinView | null) => {
    setSelectedLibrary(library);
    if (library) {
      localStorage.setItem("jellyfin_selected_library", library.Id);
    } else {
      localStorage.removeItem("jellyfin_selected_library");
    }
  }, []);

  const ctx: JellyfinContextType = {
    connected,
    serverUrl,
    userName: userDisplayName,
    isConnecting,
    error,
    musicLibraries,
    selectedLibrary,
    connectWithPassword,
    connectWithApiKey,
    disconnect,
    selectLibrary,
    getAlbums: useCallback((opts) => jellyfinClient.getAlbums(opts), []),
    getAlbumTracks: useCallback((id) => jellyfinClient.getAlbumTracks(id), []),
    getArtists: useCallback((opts) => jellyfinClient.getArtists(opts), []),
    getTracks: useCallback((opts) => jellyfinClient.getTracks(opts), []),
    getRecentlyAdded: useCallback((opts?: { limit?: number; parentId?: string }) => jellyfinClient.getRecentlyAdded(opts), []),
    search: useCallback((q, opts) => jellyfinClient.search(q, opts), []),
    getImageUrl: useCallback((id, opts) => jellyfinClient.getImageUrl(id, opts), []),
    getBackdropUrl: useCallback((id, opts) => jellyfinClient.getBackdropUrl(id, opts), []),
    getStreamUrl: useCallback((id, container) => jellyfinClient.getStreamUrl(id, container), []),
    getUserImageUrl: useCallback((uid) => jellyfinClient.getUserImageUrl(uid), []),
    userId,
  };

  return (
    <JellyfinContext.Provider value={ctx}>
      {children}
    </JellyfinContext.Provider>
  );
}

export function useJellyfin(): JellyfinContextType {
  const ctx = useContext(JellyfinContext);
  if (!ctx) throw new Error("useJellyfin must be used within JellyfinProvider");
  return ctx;
}
