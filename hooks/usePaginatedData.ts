
import { useState, useEffect, useCallback, useRef } from 'react';

interface PaginatedResult<T> {
  data: T[];
  total: number;
}

interface UsePaginatedDataParams<T> {
  fetchMethod: (page: number, pageSize: number, search: string) => Promise<PaginatedResult<T>>;
  pageSize?: number;
  initialSearch?: string;
}

export function usePaginatedData<T>({ fetchMethod, pageSize = 20, initialSearch = '' }: UsePaginatedDataParams<T>) {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(initialSearch);
  const [error, setError] = useState<string | null>(null);

  // Use a ref for fetchMethod to avoid it being a dependency for the fetch logic
  // while still using the latest version.
  const fetchMethodRef = useRef(fetchMethod);
  useEffect(() => {
    fetchMethodRef.current = fetchMethod;
  }, [fetchMethod]);

  // Track last fetched parameters to avoid infinite loops
  const lastFetchedRef = useRef({ page: -1, search: '___' });

  const fetchData = useCallback(async (currentPage: number, currentSearch: string, force = false) => {
    // Avoid redundant fetches if parameters haven't changed (unless forced)
    if (!force && lastFetchedRef.current.page === currentPage && lastFetchedRef.current.search === currentSearch) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchMethodRef.current(currentPage, pageSize, currentSearch);
      lastFetchedRef.current = { page: currentPage, search: currentSearch };
      setData(result.data);
      setTotal(result.total);
    } catch (err: any) {
      console.error("Error fetching paginated data:", err);
      setError(err.message || "Errore durante il caricamento dei dati.");
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  // Effect for Page or Search changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(page, search);
    }, search ? 400 : 0);
    
    return () => clearTimeout(timer);
  }, [page, search, fetchData]);

  const refresh = useCallback(() => {
    fetchData(page, search, true); // Force refresh
  }, [fetchData, page, search]);

  const handleSearch = useCallback((term: string) => {
    setSearch(term);
    setPage(1);
  }, []);

  return {
    data,
    setData,
    total,
    loading,
    error,
    page,
    setPage,
    search,
    setSearch: handleSearch,
    pageSize,
    refresh
  };
}
