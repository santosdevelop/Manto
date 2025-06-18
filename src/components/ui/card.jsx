import React from 'react';

export const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-6 ${className}`}>
    {children}
  </div>
);

export const CardContent = ({ children, className = '' }) => (
  <div className={`text-gray-800 ${className}`}>
    {children}
  </div>
);
