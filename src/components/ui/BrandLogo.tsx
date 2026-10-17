import React from 'react';

interface BrandLogoProps {
  variant?: 'full' | 'icon-only' | 'light-bg';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
}) => {
  const iconSize = size === 'sm' ? 28 : size === 'lg' ? 44 : 36;

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* SVG Butterfly Emblem with Gold and Silver gradients */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-sm transition-transform duration-300 hover:scale-105"
        aria-label="TechSozo Logo"
      >
        <defs>
          {/* Champagne Gold Gradient */}
          <linearGradient id="goldGradient" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F3DE9A" />
            <stop offset="45%" stopColor="#C6A15B" />
            <stop offset="100%" stopColor="#93722A" />
          </linearGradient>

          {/* Polished Silver Gradient */}
          <linearGradient id="silverGradient" x1="14" y1="14" x2="34" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#D2D4DA" />
            <stop offset="100%" stopColor="#8E929B" />
          </linearGradient>

          {/* Charcoal Background */}
          <linearGradient id="charcoalBg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#323438" />
            <stop offset="100%" stopColor="#1E1F21" />
          </linearGradient>
        </defs>

        {/* Outer squircle */}
        <rect width="48" height="48" rx="12" fill="url(#charcoalBg)" stroke="#C6A15B" strokeWidth="0.8" strokeOpacity="0.4" />

        {/* Upper Left Wing */}
        <path
          d="M24 22C21 15 15 11 9 13C8 20 12 25 21 26C22.5 24.5 23.5 23.5 24 22Z"
          fill="url(#goldGradient)"
        />
        {/* Upper Right Wing */}
        <path
          d="M24 22C27 15 33 11 39 13C40 20 36 25 27 26C25.5 24.5 24.5 23.5 24 22Z"
          fill="url(#goldGradient)"
        />

        {/* Lower Left Wing (Silver accent) */}
        <path
          d="M22 28C15 29 11 34 13 39C19 40 22 36 23 31C22.6 30 22.2 29 22 28Z"
          fill="url(#silverGradient)"
        />
        {/* Lower Right Wing (Silver accent) */}
        <path
          d="M26 28C33 29 37 34 35 39C29 40 26 36 25 31C25.4 30 25.8 29 26 28Z"
          fill="url(#silverGradient)"
        />

        {/* Central butterfly body */}
        <ellipse cx="24" cy="24" rx="2" ry="7" fill="#FAF9F6" />
        <circle cx="24" cy="15" r="1.5" fill="#C6A15B" />
      </svg>

      {variant !== 'icon-only' && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-heading font-extrabold tracking-wider ${
                variant === 'light-bg' ? 'text-[#292A2D]' : 'text-[#FAF9F6]'
              } ${size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base'}`}
            >
              TECH<span className="text-[#C6A15B]">SOZO</span>
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#B9BCC4] bg-[#292A2D] px-1.5 py-0.5 rounded border border-[#DAD8D2]/20">
              INVOICES
            </span>
          </div>
          <span className="text-[10px] tracking-wide text-[#B9BCC4] font-medium hidden sm:inline">
            Agency Billing & Financial Engine
          </span>
        </div>
      )}
    </div>
  );
};
