import { useState } from 'react';
import { organizationLogoNeedsDarkBackground, organizationLogoPath, organizationMonogram } from './organizationBrand';
import type { HeliosItem } from './types';

export function OrganizationMark({ item, className = '' }: { item: HeliosItem; className?: string }) {
  const logoPath = organizationLogoPath(item.id);
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const showLogo = logoPath !== null && failedPath !== logoPath;
  return <span className={`organization-mark ${showLogo && organizationLogoNeedsDarkBackground(item.id) ? 'logo-on-dark' : ''} ${className}`} aria-hidden="true">
    {showLogo ? <img src={logoPath} alt="" onError={() => setFailedPath(logoPath)} /> : <span>{organizationMonogram(item)}</span>}
  </span>;
}
