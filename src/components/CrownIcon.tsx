import React from 'react';

interface CrownIconProps {
  className?: string;
  size?: number;
}

export const CrownIcon: React.FC<CrownIconProps> = ({ className = 'w-6 h-6', size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M2.5 19.5H21.5V17.5H2.5V19.5Z"
        fill="currentColor"
      />
      <path
        d="M4.5 16L2 7L7.5 11L12 3.5L16.5 11L22 7L19.5 16H4.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="2" cy="6" r="1.2" fill="currentColor" />
      <circle cx="12" cy="2.5" r="1.3" fill="currentColor" />
      <circle cx="22" cy="6" r="1.2" fill="currentColor" />
      <circle cx="7.5" cy="10" r="1" fill="currentColor" />
      <circle cx="16.5" cy="10" r="1" fill="currentColor" />
    </svg>
  );
};
