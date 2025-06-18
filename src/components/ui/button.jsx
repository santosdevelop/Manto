import React from 'react';

export const Button = ({ children, onClick, className = '', ...props }) => (
  <button
    onClick={onClick}
    className={`bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold py-2 px-4 rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 ${className}`}
    {...props}
  >
    {children}
  </button>
);
