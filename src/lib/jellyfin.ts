// Jellyfin API client for music playback
// https://api.jellyfin.org/

export interface JellyfinConfig {
  serverUrl: string;
  token: string;
  userId: string;
}

export interface JellyfinUser {
  Id: string;
  Name: string;
}

export interface JellyfinItem {
  Id: string;
  Name: string;
  Type: string;
  AlbumArtist?: string;
  AlbumArtistId?: string;
  Album?: string;
  AlbumId?: string;
  Artists?: string[];
  ArtistItems?: { Id: string; Name: string }[];
  AlbumArtists?: { Id: string; Name: string }[];
  RunTimeTicks?: number;
  ProductionYear?: number;
  ImageTags?: { Primary?: string };
  BackdropImageTags?: string[];
  ParentBackdropItemId?: string;
  ParentBackdropImageTags?: string[];
  SortName?: string;
  IndexNumber?: number;
  ParentIndexNumber?: number;
  MediaStreams?: Array<{
    Codec: string;
    Type: string;
    Index: number;
    Channels?: number;
    SampleRate?: number;
    BitRate?: number;
  }>;
  MediaSources?: Array<{
    Id: string;
    Container: string;
    Path: string;
  }>;
  Container?: string;
}

export interface JellyfinItemsResponse {
  Items: JellyfinItem[];
  TotalRecordCount: number;
  StartIndex: number;
}

export interface JellyfinView {
  Id: string;
  Name: string;
  Type: string;
  CollectionType: string;
  ImageTags?: { Primary?: string };
}

const CLIENT_NAME = "AetherPlayer";
const DEVICE_NAME = "Browser";
const DEVICE_ID = "aether-player-web";
const CLIENT_VERSION = "1.0.0";

function buildAuthHeader(token: string): string {
  return `MediaBrowser Client="${CLIENT_NAME}", Device="${DEVICE_NAME}", DeviceId="${DEVICE_ID}", Version="${CLIENT_VERSION}", Token="${token}"`;
}

export class JellyfinClient {
  private config: JellyfinConfig | null = null;
  public onUnauthorized?: () => void;

  constructor() {
    // Try to restore from localStorage
    const saved = localStorage.getItem("jellyfin_config");
    if (saved) {
      try {
        this.config = JSON.parse(saved);
      } catch {}
    }
  }

  get isConnected(): boolean {
    return this.config !== null;
  }

  get serverUrl(): string {
    return this.config?.serverUrl ?? "";
  }

  get token(): string {
    return this.config?.token ?? "";
  }

  get userId(): string {
    return this.config?.userId ?? "";
  }

  get configData(): JellyfinConfig | null {
    return this.config;
  }

  getProxyUrl(url: string, params?: { stream?: boolean; image?: boolean }): string {
    const isHttpsPage = typeof window !== "undefined" && window.location.protocol === "https:";
    const isTargetHttp = url.startsWith("http://");

    if (isTargetHttp || isHttpsPage) {
      const q = new URLSearchParams({ url });
      if (params?.stream) q.set("stream", "true");
      if (params?.image) q.set("image", "true");
      return `/api/jellyfin-proxy?${q.toString()}`;
    }
    return url;
  }

  private get baseUrl(): string {
    if (!this.config) return "";
    return `${this.config.serverUrl.replace(/\/+$/, "")}`;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    useApiKey: boolean = false,
  ): Promise<T> {
    if (!this.config) throw new Error("Not connected to Jellyfin server");

    const url = this.getProxyUrl(`${this.baseUrl}${path}`);
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    // Sempre enviamos o X-Emby-Token para compatibilidade máxima com API Key e Session Token
    headers["X-Emby-Token"] = this.config.token;

    // Também enviamos o cabeçalho clássico customizado do Jellyfin/Emby (evitando o Authorization padrão que pode ser bloqueado por proxies reversos)
    headers["X-Emby-Authorization"] = buildAuthHeader(this.config.token);

    headers["Accept"] = "application/json";

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      if (response.status === 401) {
        this.onUnauthorized?.();
      }
      const text = await response.text().catch(() => "Unknown error");
      throw new Error(`Jellyfin API error (${response.status}): ${text}`);
    }
    if (response.status === 204) {
      return {} as T;
    }
    const text = await response.text();
    if (!text || text.trim() === "") {
      return {} as T;
    }
    return JSON.parse(text) as T;
  }

  private imageUrl(itemId: string, imageType: string, options?: { fillHeight?: number; fillWidth?: number; quality?: number }): string {
    if (!this.config) return "";
    let url = `${this.baseUrl}/Items/${itemId}/Images/${imageType}`;
    const params = new URLSearchParams();
    if (options?.fillHeight) params.set("fillHeight", String(options.fillHeight));
    if (options?.fillWidth) params.set("fillWidth", String(options.fillWidth));
    if (options?.quality) params.set("quality", String(options.quality));
    const qs = params.toString();
    if (qs) url += "?" + qs;
    return this.getProxyUrl(url, { image: true });
  }

  getImageUrl(itemId: string, options?: { height?: number; width?: number; quality?: number }): string {
    return this.imageUrl(itemId, "Primary", options ? { fillHeight: options.height, fillWidth: options.width, quality: options.quality } : undefined);
  }

  getBackdropUrl(itemId: string, options?: { height?: number; width?: number; quality?: number }): string {
    return this.imageUrl(itemId, "Backdrop", options ? { fillHeight: options.height, fillWidth: options.width, quality: options.quality } : undefined);
  }

  getUserImageUrl(userId?: string): string {
    if (!this.config) return "";
    const id = userId || this.config.userId;
    if (!id) return "";
    const url = `${this.baseUrl}/Users/${id}/Images/Primary?api_key=${this.config.token}`;
    return this.getProxyUrl(url, { image: true });
  }

  getStreamUrl(itemId: string, container?: string): string {
    if (!this.config) return "";
    const params = new URLSearchParams({
      static: "true",
      ...(container ? { container } : {}),
    });
    const token = this.config.token;
    const url = `${this.baseUrl}/Audio/${itemId}/stream?${params.toString()}&api_key=${token}`;
    return this.getProxyUrl(url, { stream: true });
  }

  getStreamUrlTranscoded(itemId: string, container: string = "opus", maxBitrate: number = 320000): string {
    if (!this.config) return "";
    const params = new URLSearchParams({
      container,
      audioCodec: "aac",
      maxStreamingBitrate: String(maxBitrate),
      transcodingProtocol: "hls",
      api_key: this.config.token,
    });
    const url = `${this.baseUrl}/Audio/${itemId}/universal?${params.toString()}`;
    return this.getProxyUrl(url, { stream: true });
  }

  // Store config and persist
  setConfig(config: JellyfinConfig): void {
    this.config = config;
    localStorage.setItem("jellyfin_config", JSON.stringify(config));
  }

  disconnect(): void {
    this.config = null;
    localStorage.removeItem("jellyfin_config");
  }

  // --- Auth ---

  async authenticateWithPassword(
    serverUrl: string,
    username: string,
    password: string,
  ): Promise<{ user: JellyfinUser; token: string }> {
    const normalizedUrl = serverUrl.replace(/\/+$/, "");
    const directUrl = `${normalizedUrl}/Users/AuthenticateByName`;
    const url = this.getProxyUrl(directUrl);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Emby-Authorization": `MediaBrowser Client="${CLIENT_NAME}", Device="${DEVICE_NAME}", DeviceId="${DEVICE_ID}", Version="${CLIENT_VERSION}"`,
      },
      body: JSON.stringify({ Username: username, Pw: password }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "Authentication failed");
      throw new Error(`Jellyfin auth error (${response.status}): ${text}`);
    }

    const data = await response.json();
    return {
      user: { Id: data.User.Id, Name: data.User.Name },
      token: data.AccessToken,
    };
  }

  async authenticateWithApiKey(
    serverUrl: string,
    apiKey: string,
  ): Promise<{ user: JellyfinUser }> {
    const normalizedUrl = serverUrl.replace(/\/+$/, "");
    const directUrlMe = `${normalizedUrl}/Users/Me`;
    const urlMe = this.getProxyUrl(directUrlMe);

    // Tenta primeiro o endpoint /Users/Me (caso a chave de API esteja vinculada a um usuário específico)
    try {
      const response = await fetch(urlMe, {
        headers: {
          "X-Emby-Token": apiKey,
          "X-Emby-Authorization": `MediaBrowser Client="${CLIENT_NAME}", Device="${DEVICE_NAME}", DeviceId="${DEVICE_ID}", Version="${CLIENT_VERSION}"`,
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const user = await response.json();
        return { user: { Id: user.Id, Name: user.Name } };
      }
    } catch (e) {
      console.warn("Falha ao autenticar com /Users/Me, tentando fallback de usuários:", e);
    }

    // Fallback: se falhar, tenta obter a lista completa de usuários e selecionar o primeiro disponível.
    // Chaves de API globais criadas pelo administrador do Jellyfin possuem permissão para listar usuários.
    const directUrlUsers = `${normalizedUrl}/Users`;
    const urlUsers = this.getProxyUrl(directUrlUsers);
    const response = await fetch(urlUsers, {
      headers: {
        "X-Emby-Token": apiKey,
        "X-Emby-Authorization": `MediaBrowser Client="${CLIENT_NAME}", Device="${DEVICE_NAME}", DeviceId="${DEVICE_ID}", Version="${CLIENT_VERSION}"`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Erro na conexão com Jellyfin ou chave de API inválida (${response.status})`);
    }

    const users = await response.json();
    if (Array.isArray(users) && users.length > 0) {
      return { user: { Id: users[0].Id, Name: users[0].Name } };
    }

    throw new Error("Nenhum usuário foi encontrado neste servidor Jellyfin.");
  }

  // --- Libraries / Views ---

  async getViews(): Promise<JellyfinView[]> {
    const data = await this.request<{ Items: JellyfinView[] }>(
      `/Users/${this.userId}/Views`,
    );
    return data.Items || [];
  }

  async getMusicLibraries(): Promise<JellyfinView[]> {
    const views = await this.getViews();
    return views.filter(
      (v) =>
        v.CollectionType === "music" ||
        v.CollectionType === "audiobooks",
    );
  }

  // --- Items ---

  async getItems(params: {
    parentId?: string;
    includeItemTypes?: string;
    recursive?: boolean;
    startIndex?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
    filters?: string;
    searchTerm?: string;
  }): Promise<JellyfinItemsResponse> {
    const query = new URLSearchParams();
    if (params.parentId) query.set("ParentId", params.parentId);
    if (params.includeItemTypes) query.set("IncludeItemTypes", params.includeItemTypes);
    if (params.recursive) query.set("Recursive", "true");
    if (params.startIndex !== undefined) query.set("StartIndex", String(params.startIndex));
    if (params.limit) query.set("Limit", String(params.limit));
    if (params.sortBy) query.set("SortBy", params.sortBy);
    if (params.sortOrder) query.set("SortOrder", params.sortOrder);
    if (params.filters) query.set("Filters", params.filters);
    if (params.searchTerm) query.set("SearchTerm", params.searchTerm);

    return this.request<JellyfinItemsResponse>(
      `/Users/${this.userId}/Items?${query.toString()}`,
    );
  }

  async getItem(itemId: string): Promise<JellyfinItem> {
    return this.request<JellyfinItem>(`/Users/${this.userId}/Items/${itemId}`);
  }

  // --- Albums ---

  async getAlbums(options?: {
    parentId?: string;
    startIndex?: number;
    limit?: number;
    sortBy?: string;
  }): Promise<JellyfinItemsResponse> {
    return this.getItems({
      ...options,
      includeItemTypes: "MusicAlbum",
      recursive: true,
      sortBy: options?.sortBy || "Album",
      sortOrder: "Ascending",
    });
  }

  async getAlbum(albumId: string): Promise<JellyfinItem> {
    return this.getItem(albumId);
  }

  async getAlbumTracks(albumId: string): Promise<JellyfinItemsResponse> {
    return this.getItems({
      parentId: albumId,
      includeItemTypes: "Audio",
      sortBy: "IndexNumber",
      sortOrder: "Ascending",
      recursive: true,
    });
  }

  // --- Artists ---

  async getArtists(options?: {
    parentId?: string;
    startIndex?: number;
    limit?: number;
  }): Promise<JellyfinItemsResponse> {
    const query = new URLSearchParams();
    if (options?.parentId) query.set("ParentId", options.parentId);
    if (options?.startIndex !== undefined) query.set("StartIndex", String(options.startIndex));
    if (options?.limit) query.set("Limit", String(options.limit));
    query.set("Recursive", "true");

    const data = await this.request<{ Items: JellyfinItem[]; TotalRecordCount: number; StartIndex: number }>(
      `/Artists/AlbumArtists?${query.toString()}`,
    );
    return data;
  }

  async getArtistAlbums(artistId: string): Promise<JellyfinItemsResponse> {
    const query = new URLSearchParams({
      includeItemTypes: "MusicAlbum",
      recursive: "true",
      sortBy: "ProductionYear",
      sortOrder: "Descending",
      artistIds: artistId,
    });
    return this.request<JellyfinItemsResponse>(
      `/Users/${this.userId}/Items?${query.toString()}`,
    );
  }

  // --- Songs / Tracks ---

  async getTracks(options?: {
    parentId?: string;
    startIndex?: number;
    limit?: number;
    sortBy?: string;
    filters?: string;
  }): Promise<JellyfinItemsResponse> {
    return this.getItems({
      ...options,
      includeItemTypes: "Audio",
      recursive: true,
      sortBy: options?.sortBy || "Album,SortName",
      sortOrder: "Ascending",
    });
  }

  async getRecentlyAdded(options?: {
    limit?: number;
    parentId?: string;
  }): Promise<JellyfinItemsResponse> {
    return this.getItems({
      includeItemTypes: "Audio",
      recursive: true,
      limit: options?.limit || 20,
      parentId: options?.parentId,
      sortBy: "DateCreated",
      sortOrder: "Descending",
    });
  }

  async search(query: string, options?: {
    limit?: number;
    parentId?: string;
  }): Promise<JellyfinItemsResponse> {
    return this.getItems({
      searchTerm: query,
      includeItemTypes: "Audio,MusicAlbum,MusicArtist",
      recursive: true,
      limit: options?.limit || 30,
      parentId: options?.parentId,
    });
  }

  // --- Session & Playback Reporting ---

  async postCapabilities(): Promise<void> {
    if (!this.config) return;
    try {
      await this.request("/Sessions/Capabilities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          PlayableMediaTypes: ["Audio"],
          SupportedCommands: [
            "Play", "Pause", "Stop", "Seek", "VolumeUp", "VolumeDown", "Mute", "Unmute"
          ],
          SupportsMediaControl: true,
          SupportsPersistentIdentifier: true
        })
      });
    } catch (err) {
      console.error("Failed to report capabilities to Jellyfin:", err);
    }
  }

  async reportPlaybackStart(itemId: string, positionTicks: number = 0): Promise<void> {
    if (!this.config) return;
    try {
      await this.request("/Sessions/Playing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ItemId: itemId,
          CanSeek: true,
          PositionTicks: Math.floor(positionTicks),
        })
      });
    } catch (err) {
      console.error("Failed to report playback start to Jellyfin:", err);
    }
  }

  async reportPlaybackProgress(itemId: string, positionTicks: number, isPaused: boolean): Promise<void> {
    if (!this.config) return;
    try {
      await this.request("/Sessions/Playing/Progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ItemId: itemId,
          IsPaused: isPaused,
          IsMuted: false,
          PositionTicks: Math.floor(positionTicks),
        })
      });
    } catch (err) {
      console.error("Failed to report playback progress to Jellyfin:", err);
    }
  }

  async reportPlaybackStopped(itemId: string, positionTicks: number): Promise<void> {
    if (!this.config) return;
    try {
      await this.request("/Sessions/Playing/Stopped", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ItemId: itemId,
          PositionTicks: Math.floor(positionTicks),
        })
      });
    } catch (err) {
      console.error("Failed to report playback stopped to Jellyfin:", err);
    }
  }
}

// Singleton instance
export const jellyfinClient = new JellyfinClient();
