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

  // Debounce ref for search
  const timeoutRef = useRef<any>(null);

  const fetchData = useCallback(async (currentPage: number, currentSearch: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMethod(currentPage, pageSize, currentSearch);
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
  }, [fetchMethod, pageSize]);

  // Effect for Page changes
  useEffect(() => {
    fetchData(page, search);
  }, [page, fetchData]); // Search excluded from dependency to handle it via debounce separately

  // Handle Search with Debounce
  const handleSearch = (term: string) => {
    setSearch(term);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      setPage(1); // Reset to page 1 on search
      fetchData(1, term);
    }, 400); // 400ms debounce
  };

  const refresh = () => {
    fetchData(page, search);
  };

  return {
    data,
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