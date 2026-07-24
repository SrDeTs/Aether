import { useEffect, useRef } from "react";
import { usePlayer } from "@/hooks/use-player";

export function useKeyboardShortcuts() {
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    next,
    previous,
    toggleRepeat,
    toggleShuffle,
  } = usePlayer();

  // Create a mutable ref to store the latest player state and actions.
  // This avoids re-registering the global event listeners on every state change.
  const stateRef = useRef({
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    next,
    previous,
    toggleRepeat,
    toggleShuffle,
  });

  // Keep stateRef in sync with the latest values
  useEffect(() => {
    stateRef.current = {
      isPlaying,
      currentTime,
      duration,
      volume,
      isMuted,
      togglePlay,
      seek,
      setVolume,
      toggleMute,
      next,
      previous,
      toggleRepeat,
      toggleShuffle,
    };
  }, [
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    next,
    previous,
    toggleRepeat,
    toggleShuffle,
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if the user is typing inside an input, textarea, select or editable element
      const target = e.target as HTMLElement;
      if (target) {
        const isInput =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT";
        const isEditable =
          target.isContentEditable ||
          target.getAttribute("contenteditable") === "true";
        if (isInput || isEditable) {
          // Let the user type normally in text inputs/editable elements
          return;
        }
      }

      // Allow browser and system level modifier shortcuts to pass through (e.g., Ctrl+R, Cmd+R, Ctrl+T, Alt+Tab)
      const hasSystemModifier = e.ctrlKey || e.metaKey || e.altKey;
      if (hasSystemModifier) {
        return;
      }

      // Allow standard system function keys to work (F5 for refresh, F11 for full screen, F12 for devtools)
      if (e.key === "F5" || e.key === "F11" || e.key === "F12") {
        return;
      }

      // Now, block ALL other keyboard interactions by default (as per user instruction)
      e.preventDefault();
      e.stopPropagation();

      const key = e.key.toLowerCase();
      const {
        isPlaying: latestIsPlaying,
        currentTime: latestCurrentTime,
        duration: latestDuration,
        volume: latestVolume,
        togglePlay: doTogglePlay,
        seek: doSeek,
        setVolume: doSetVolume,
        toggleMute: doToggleMute,
        next: doNext,
        previous: doPrevious,
        toggleRepeat: doToggleRepeat,
        toggleShuffle: doToggleShuffle,
      } = stateRef.current;

      // Handle configured playback control shortcuts
      switch (e.key) {
        case " ": // Spacebar
          doTogglePlay();
          break;

        case "ArrowLeft": // Seek backward 10s
          doSeek(Math.max(0, latestCurrentTime - 10));
          break;

        case "ArrowRight": // Seek forward 10s
          doSeek(Math.min(latestDuration, latestCurrentTime + 10));
          break;

        case "ArrowUp": // Volume up (5%)
          doSetVolume(Math.min(1, latestVolume + 0.05));
          break;

        case "ArrowDown": // Volume down (5%)
          doSetVolume(Math.max(0, latestVolume - 0.05));
          break;

        case "MediaPlayPause":
          doTogglePlay();
          break;

        case "MediaTrackNext":
          doNext();
          break;

        case "MediaTrackPrevious":
          doPrevious();
          break;

        default:
          // Check letters (case-insensitive keys)
          if (key === "m") {
            // M for mute toggle
            doToggleMute();
          } else if (key === "n") {
            // N for next track
            doNext();
          } else if (key === "p") {
            // P for previous track
            doPrevious();
          } else if (key === "r") {
            // R for repeat mode toggle
            doToggleRepeat();
          } else if (key === "s") {
            // S for shuffle toggle
            doToggleShuffle();
          }
          break;
      }
    };

    // Use capture: true to intercept the event before other components block it
    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, []);
}
