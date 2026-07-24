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

/**
 * App-like chrome suppression: blocks the right-click context menu, native
 * text selection, image/element dragging and some browser shortcuts so the
 * app behaves like a native player instead of a web page. Text inputs,
 * textareas and contentEditable regions stay fully editable/selectable.
 */
function useBrowserBehaviorSuppression() {
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable === true
      );
    };

    const onContextMenu = (e: MouseEvent) => {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
    };

    const onSelectStart = (e: Event) => {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
    };

    const onDragStart = (e: DragEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      // Allow explicit drags on elements that opt-in (e.g. carousel handles)
      if (el.draggable === true) return;
      // Block image/link/native element dragging elsewhere
      e.preventDefault();
    };

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("selectstart", onSelectStart);
    document.addEventListener("dragstart", onDragStart, { capture: true });

    // Disable image dragging at the DOM level for all existing + future images
    const disableImgDragging = () => {
      document.querySelectorAll("img").forEach((img) => {
        img.draggable = false;
      });
    };
    disableImgDragging();

    // Observe DOM mutations to keep new images non-draggable too
    const observer = new MutationObserver((mutations) => {
      let run = false;
      for (const m of mutations) {
        if (m.addedNodes && m.addedNodes.length > 0) run = true;
      }
      if (run) disableImgDragging();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("selectstart", onSelectStart);
      document.removeEventListener("dragstart", onDragStart, { capture: true } as EventListenerOptions);
      observer.disconnect();
    };
  }, []);
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


function App() {
  useBrowserBehaviorSuppression();
  return (
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
  );
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <InstrumentationProvider>
      <App />
      <Toaster />
    </InstrumentationProvider>
  </StrictMode>,
);
