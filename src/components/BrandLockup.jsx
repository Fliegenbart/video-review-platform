import React from 'react';

export default function BrandLockup() {
  return (
    <div className="brand-lockup">
      <span className="brand-mark" role="img" aria-label="OBSIDIAN mark">
        <span className="brand-mark__core" />
        <span className="brand-mark__shine" />
      </span>

      <span className="brand-copy">
        <span className="brand-name">OBSIDIAN</span>
        <span className="brand-tagline">Collaborative editing made easy</span>
      </span>
    </div>
  );
}
