import React from 'react';
import { Pagination, PaginationPrevious, PaginationNext, PaginationLink } from './pagination';

interface PaginationControlProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const PaginationControl: React.FC<PaginationControlProps> = ({ currentPage, totalPages, onPageChange }) => {
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <Pagination>
      <PaginationPrevious onClick={currentPage > 1 ? handlePrevious : undefined} />
      {[...Array(totalPages)].map((_, index) => (
        <PaginationLink
          key={index}
          isActive={index + 1 === currentPage}
          onClick={() => onPageChange(index + 1)}
        >
          {index + 1}
        </PaginationLink>
      ))}
      <PaginationNext onClick={currentPage < totalPages ? handleNext : undefined} />
    </Pagination>
  );
};