import { useState } from 'react';
import { organizationBadgeTone, organizationLogoNeedsDarkBackground, organizationLogoPath, organizationMonogram } from './organizationBrand';
import type { HeliosItem } from './types';

export function OrganizationMark({ item, className = '' }: { item: HeliosItem; className?: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  const logoPath = organizationLogoPath(item.id);
  const showLogo = logoPath && !imageFailed;
  const variant = !showLogo ? 'is-monogram' : organizationLogoNeedsDarkBackground(item.id) ? 'logo-on-dark' : '';
  return <span className={`organization-mark ${variant} ${className}`}
    data-mark-tone={organizationBadgeTone(item.id)} aria-hidden="true">
    {showLogo ? <img src={logoPath} alt="" onError={() => setImageFailed(true)} /> : <span>{organizationMonogram(item)}</span>}
  </span>;
}
