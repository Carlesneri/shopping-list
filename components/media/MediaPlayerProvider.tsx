"use client"

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"
import { MediaPlayer } from "./MediaPlayer"
import type { MediaKind } from "@/lib/types"

interface PlayingState {
  src: string
  title: string
  kind: MediaKind
  storageKey: string
}

interface PlayerContextValue {
  openPlayer: (state: PlayingState) => void
}

const PlayerContext = createContext<PlayerContextValue | null>(null)

export function useMediaPlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) {
    throw new Error("useMediaPlayer must be used within MediaPlayerProvider")
  }
  return ctx
}

/**
 * Hosts the video/audio player outside any Suspense boundary so it survives
 * router.refresh() and server action re-renders (e.g. triggered by uploads).
 * If it lived inside one, the fallback swap would unmount the player and
 * interrupt playback.
 */
export function MediaPlayerProvider({ children }: { children: ReactNode }) {
  const [playing, setPlaying] = useState<PlayingState | null>(null)

  const openPlayer = useCallback((state: PlayingState) => {
    setPlaying(state)
  }, [])

  const closePlayer = useCallback(() => {
    setPlaying(null)
  }, [])

  return (
    <PlayerContext.Provider value={{ openPlayer }}>
      {children}
      {playing ? (
        <MediaPlayer
          src={playing.src}
          title={playing.title}
          kind={playing.kind}
          storageKey={playing.storageKey}
          onClose={closePlayer}
        />
      ) : null}
    </PlayerContext.Provider>
  )
}
