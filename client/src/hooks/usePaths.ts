import { useState, useEffect, useCallback } from 'react';
import type { Path, PathWithPoints } from '../types/index.js';
import { fetchPaths, fetchPathWithPoints, deletePath } from '../api/paths.js';

export function usePaths() {
  const [paths, setPaths] = useState<Path[]>([]);
  const [selectedPath, setSelectedPath] = useState<PathWithPoints | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPaths = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPaths();
      setPaths(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPathDetail = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPathWithPoints(id);
      setSelectedPath(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const removePath = useCallback(async (id: number) => {
    try {
      await deletePath(id);
      setPaths((prev) => prev.filter((p) => p.id !== id));
      if (selectedPath?.id === id) setSelectedPath(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [selectedPath]);

  useEffect(() => {
    loadPaths();
  }, [loadPaths]);

  return {
    paths,
    selectedPath,
    loading,
    error,
    loadPaths,
    loadPathDetail,
    removePath,
    setSelectedPath,
  };
}
