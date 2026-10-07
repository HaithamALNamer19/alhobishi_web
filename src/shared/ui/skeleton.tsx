import React from 'react';

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  ...props
}) => {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200/80 ${className}`}
      {...props}
    />
  );
};

export const CardSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
    <Skeleton className="h-4 w-1/3" />
    <Skeleton className="h-8 w-1/2" />
    <Skeleton className="h-3 w-3/4" />
  </div>
);

export const ProductCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
    <Skeleton className="h-44 w-full rounded-lg" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
    <div className="flex justify-between items-center pt-2">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-8 w-20 rounded-lg" />
    </div>
  </div>
);

