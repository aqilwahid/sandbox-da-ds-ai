import React from 'react';

/** Logo sederhana: tiga batang data + kursor kode. */
export const Logo: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
    <rect width="32" height="32" rx="8" fill="rgb(var(--c-accent-solid))" />
    <rect x="7" y="16" width="4" height="9" rx="1.5" fill="white" opacity="0.75" />
    <rect x="13" y="11" width="4" height="14" rx="1.5" fill="white" opacity="0.9" />
    <rect x="19" y="7" width="4" height="18" rx="1.5" fill="white" />
    <path d="M24.5 21.5l2.5 2-2.5 2" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
