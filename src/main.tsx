import { Toaster } from "@/components/ui/sonner";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";
import "./types/global.d.ts";
import { JellyfinProvider } from "@/hooks/use-jellyfin";
import { PlayerProvider } from "@/hooks/use-player";
import { SettingsProvider } from "@/hooks/use-settings";

// Lazy load route components for better code splitting
const ConnectPage = lazy(() => import("./pages/Connect.tsx"));
const PlayerPage = lazy(() => import("./pages/Player.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}



function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <InstrumentationProvider>
      <BrowserRouter>
        <RouteSyncer />
        <Suspense fallback={<RouteLoading />}>
          <JellyfinProvider>
            <PlayerProvider>
              <SettingsProvider>
                <Routes>
                  <Route path="/" element={<ConnectPage />} />
                  <Route path="/connect" element={<ConnectPage />} />
                  <Route path="/player" element={<PlayerPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </SettingsProvider>
            </PlayerProvider>
          </JellyfinProvider>
        </Suspense>
      </BrowserRouter>
      <Toaster />
    </InstrumentationProvider>
  </StrictMode>,
);
