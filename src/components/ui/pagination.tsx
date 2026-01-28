"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
    pageSizeOptions?: number[];
}

/**
 * Reusable pagination component for lists.
 * Supports page navigation and optional page size selection.
 */
export function Pagination({
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 20, 50, 100],
}: PaginationProps) {
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
            <div className="text-sm text-muted-foreground">
                Wyświetlanie {startItem}-{endItem} z {totalItems}
            </div>

            <div className="flex items-center gap-4">
                {onPageSizeChange && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                            Na stronie:
                        </span>
                        <Select
                            value={pageSize.toString()}
                            onValueChange={(value) =>
                                onPageSizeChange(parseInt(value))
                            }
                        >
                            <SelectTrigger className="h-8 w-20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {pageSizeOptions.map((size) => (
                                    <SelectItem
                                        key={size}
                                        value={size.toString()}
                                    >
                                        {size}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center gap-1 px-2">
                        <span className="text-sm">
                            Strona {currentPage} z {totalPages || 1}
                        </span>
                    </div>

                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

/**
 * Hook to manage pagination state
 */
export function usePagination<T>(
    items: T[],
    initialPageSize: number = 20
): {
    paginatedItems: T[];
    currentPage: number;
    setCurrentPage: (page: number) => void;
    pageSize: number;
    setPageSize: (size: number) => void;
    totalPages: number;
    totalItems: number;
} {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(initialPageSize);

    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / pageSize);

    // Reset to page 1 when page size changes or items change
    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setCurrentPage(1);
    };

    // Ensure current page is valid
    const validCurrentPage = Math.min(currentPage, totalPages || 1);
    if (validCurrentPage !== currentPage) {
        setCurrentPage(validCurrentPage);
    }

    const startIndex = (validCurrentPage - 1) * pageSize;
    const paginatedItems = items.slice(startIndex, startIndex + pageSize);

    return {
        paginatedItems,
        currentPage: validCurrentPage,
        setCurrentPage,
        pageSize,
        setPageSize: handlePageSizeChange,
        totalPages,
        totalItems,
    };
}
