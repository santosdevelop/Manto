import React from 'react';
import './Skeleton.css';

export const Skeleton = ({ type = 'text', className = '' }) => {
  return <div className={`skeleton skeleton-${type} ${className}`} />;
};

// Tipos predefinidos
export const CardSkeleton = () => (
  <div className="skeleton-card-container">
    <Skeleton type="card" />
    <Skeleton type="text" />
    <Skeleton type="text" />
  </div>
);