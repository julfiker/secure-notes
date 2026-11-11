import React from 'react';
import { PaginationMeta } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ meta, onPageChange }) => {
  if (meta.totalPages <= 1) {
    return (
      <div className="py-3 text-xs text-slate-500 text-center">
        Showing all {meta.totalCount} item{meta.totalCount === 1 ? '' : 's'}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200 sm:px-6 rounded-b-lg">
      <div className="text-sm text-slate-700">
        Page <span className="font-semibold text-slate-900">{meta.page}</span> of{' '}
        <span className="font-semibold text-slate-900">{meta.totalPages}</span>{' '}
        <span className="text-slate-500">({meta.totalCount} total)</span>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(meta.page - 1)}
          disabled={!meta.hasPrevPage}
          className="inline-flex items-center px-3 py-1.5 border border-slate-300 text-xs font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </button>

        <button
          onClick={() => onPageChange(meta.page + 1)}
          disabled={!meta.hasNextPage}
          className="inline-flex items-center px-3 py-1.5 border border-slate-300 text-xs font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
};
