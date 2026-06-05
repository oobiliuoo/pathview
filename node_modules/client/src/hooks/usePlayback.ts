import { useState, useEffect, useCallback, useRef } from 'react';
import type { PathPoint } from '../types/index.js';

export type PlaybackMode = 'point' | 'smooth' | 'loop';

interface PlaybackState {
  isPlaying: boolean;
  currentIndex: number;
  progress: number;
  speed: number;
  mode: PlaybackMode;
}

export function usePlayback(points: PathPoint[]) {
  const [state, setState] = useState<PlaybackState>({
    isPlaying: false,
    currentIndex: 0,
    progress: 0,
    speed: 1,
    mode: 'point',
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: true }));
  }, []);

  const pause = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const stop = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false, currentIndex: 0, progress: 0 }));
  }, []);

  const setSpeed = useCallback((speed: number) => {
    setState((prev) => ({ ...prev, speed }));
  }, []);

  const setMode = useCallback((mode: PlaybackMode) => {
    setState((prev) => ({ ...prev, mode }));
  }, []);

  const seek = useCallback((progress: number) => {
    const idx = Math.floor(progress * (points.length - 1));
    setState((prev) => ({
      ...prev,
      progress,
      currentIndex: Math.min(idx, points.length - 1),
    }));
  }, [points.length]);

  useEffect(() => {
    if (!state.isPlaying || points.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const interval = 1000 / (10 * state.speed);
    intervalRef.current = setInterval(() => {
      setState((prev) => {
        const totalSteps = points.length - 1;
        if (totalSteps <= 0) return prev;

        let nextIndex = prev.currentIndex + 1;
        let nextProgress = nextIndex / totalSteps;

        if (nextIndex >= points.length) {
          if (prev.mode === 'loop') {
            nextIndex = 0;
            nextProgress = 0;
          } else {
            return { ...prev, isPlaying: false, currentIndex: totalSteps, progress: 1 };
          }
        }

        return { ...prev, currentIndex: nextIndex, progress: nextProgress };
      });
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.isPlaying, state.speed, state.mode, points.length]);

  return {
    ...state,
    start,
    pause,
    stop,
    setSpeed,
    setMode,
    seek,
  };
}
