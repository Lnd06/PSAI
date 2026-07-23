import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 32 }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      width={size} 
      height={size} 
      className={`shrink-0 select-none ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="psaiLogoGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6C63FF" />
          <stop offset="40%" stopColor="#8C73FF" />
          <stop offset="100%" stopColor="#FF8A65" />
        </linearGradient>
      </defs>
      
      {/* Background soft drop-shadow style glow (optional / embedded vector glow) */}
      <circle cx="50" cy="52" r="42" fill="#6C63FF" opacity="0.04" filter="blur(2px)" />
      
      {/* The Leaf-Heart Sprout symbol */}
      <path 
        d="M50,85 C25,65 15,45 25,25 C32,11 48,16 50,32 C52,16 68,11 75,25 C85,45 75,65 50,85 Z" 
        fill="url(#psaiLogoGrad)" 
      />
      
      {/* Vein / Inner core shape representing reflection and guidance */}
      <path 
        d="M50,35 C42,28 35,32 35,42 C35,55 50,70 50,70 C50,70 65,55 65,42 C65,32 58,28 50,35 Z" 
        fill="#FFFFFF" 
        opacity="0.32" 
      />
      
      {/* Core line alignment */}
      <path 
        d="M50,32 L50,80" 
        stroke="#FFFFFF" 
        strokeWidth="3" 
        strokeLinecap="round" 
        opacity="0.22" 
      />
    </svg>
  );
};

export default Logo;
