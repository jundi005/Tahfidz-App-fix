import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '', title }) => {
  return (
    <div className={`bg-primary rounded-xl shadow-sm border border-slate-200 ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        </div>
      )}
      <div className="p-6">
          {children}
      </div>
    </div>
  );
};

// Simplified card without title header for dashboard widgets
export const WidgetCard: React.FC<Pick<CardProps, 'children' | 'className'>> = ({ children, className = '' }) => {
    return (
        <div className={`bg-primary rounded-xl shadow-sm border border-slate-200 p-6 ${className}`}>
            {children}
        </div>
    );
};


export default Card;