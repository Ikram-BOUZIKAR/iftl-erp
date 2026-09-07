import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  studentsService,
  groupesService,
  intervenantsService,
  sessionsService,
  presencesService,
  candidaturesService
} from '../services/firestore';

function makeHook(fetchFn) {
  return function useHook(params) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetch = useCallback(async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchFn(params);
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, [JSON.stringify(params)]);

    useEffect(() => { fetch(); }, [fetch]);
    return { data, loading, error, refetch: fetch };
  };
}

export const useStudents = makeHook((filters) => studentsService.getAll(filters));

// useGroupes returns both:
//   data   — full list including all Firestore IDs (needed for alias resolution)
//   unique — deduplicated by normalized name (hyphen/en-dash) for dropdowns
export function useGroupes(filters) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await groupesService.getAll(filters);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => { fetch(); }, [fetch]);

  const unique = useMemo(() => {
    const seen = new Map();
    data.forEach(g => {
      const key = (g.nom || '').replace(/[–—]/g, '-').trim().toLowerCase();
      if (!seen.has(key)) seen.set(key, g);
    });
    return Array.from(seen.values());
  }, [data]);

  return { data, unique, loading, error, refetch: fetch };
}

export const useIntervenants = makeHook(() => intervenantsService.getAll());
export const useCandidatures = makeHook((filters) => candidaturesService.getAll(filters));

export function useSessions(filters) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await sessionsService.getAll(filters || {});
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, error, refetch: fetch };
}

export function useWeekSessions(startDate) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const result = await sessionsService.getWeek(startDate);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [startDate?.toISOString?.() || startDate]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, error, refetch: fetch };
}

export function usePresencesBySession(sessionId) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!sessionId) { setData([]); setLoading(false); return; }
    try {
      setLoading(true);
      const result = await presencesService.getBySession(sessionId);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, error, refetch: fetch };
}

export function usePresencesByStudent(studentId) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!studentId) { setData([]); setLoading(false); return; }
    try {
      setLoading(true);
      const result = await presencesService.getByStudent(studentId);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, error, refetch: fetch };
}
