import { useState, useCallback } from 'react';

interface UsePaginationProps<T> {
    items: T[];
    pageSize: number;
}

export function usePagination<T>({ items, pageSize }: UsePaginationProps<T>) {
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.ceil(items.length / pageSize);

    const getCurrentPageItems = useCallback(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return items.slice(startIndex, startIndex + pageSize);
    }, [items, currentPage, pageSize]);

    const onPageChange = useCallback((page: number) => {
        setCurrentPage(page);
    }, []);

    return {
        currentPage,
        totalPages,
        pageSize,
        totalItems: items.length,
        getCurrentPageItems,
        onPageChange,
    };
}
