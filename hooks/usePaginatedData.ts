
import { useState, useEffect, useCallback, useRef } from 'react';

interface PaginatedResult<T> {
  data: T[];
  total: number;
}

interface UsePaginatedDataParams<T> {
  fetchMethod: (page: number, pageSize: number, search: string, filters?: any) => Promise<PaginatedResult<T>>;
  pageSize?: number;
  initialSearch?: string;
  initialFilters?: any;
}

export function usePaginatedData<T>({ fetchMethod, pageSize = 20, initialSearch = '', initialFilters = {} }: UsePaginatedDataParams<T>) {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(initialSearch);
  const [filters, setFilters] = useState(initialFilters);
  const [error, setError] = useState<string | null>(null);

  // Use a ref for fetchMethod to avoid it being a dependency for the fetch logic
  // while still using the latest version.
  const fetchMethodRef = useRef(fetchMethod);
  useEffect(() => {
    fetchMethodRef.current = fetchMethod;
  }, [fetchMethod]);

  // Track last fetched parameters to avoid infinite loops
  const lastFetchedRef = useRef({ page: -1, search: '___', filtersStr: '' });

  const fetchData = useCallback(async (currentPage: number, currentSearch: string, currentFilters: any, force = false) => {
    const filtersStr = JSON.stringify(currentFilters);
    // Avoid redundant fetches if parameters haven't changed (unless forced)
    if (!force && lastFetchedRef.current.page === currentPage && lastFetchedRef.current.search === currentSearch && lastFetchedRef.current.filtersStr === filtersStr) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchMethodRef.current(currentPage, pageSize, currentSearch, currentFilters);
      lastFetchedRef.current = { page: currentPage, search: currentSearch, filtersStr };
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
      fetchData(page, search, filters);
    }, search ? 400 : 0);
    
    return () => clearTimeout(timer);
  }, [page, search, filters, fetchData]);

  const refresh = useCallback(() => {
    fetchData(page, search, filters, true); // Force refresh
  }, [fetchData, page, search, filters]);

  const handleSearch = useCallback((term: string) => {
    setSearch(term);
    setPage(1);
  }, []);

  const handleFilters = useCallback((newFilters: any) => {
    setFilters(newFilters);
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
    filters,
    setFilters: handleFilters,
    pageSize,
    refresh
  };
}
