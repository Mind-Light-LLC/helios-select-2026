import { useState } from 'react';
import { organizationBadgeTone, organizationLogoPath, organizationMonogram } from './organizationBrand';
import type { HeliosItem } from './types';

export function OrganizationMark({ item, className = '' }: { item: HeliosItem; className?: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  const logoPath = organizationLogoPath(item.id);
  const showLogo = logoPath && !imageFailed;
  return <span className={`organization-mark ${showLogo ? '' : 'is-monogram'} ${className}`}
    data-mark-tone={organizationBadgeTone(item.id)} aria-hidden="true">
    {showLogo ? <img src={logoPath} alt="" onError={() => setImageFailed(true)} /> : <span>{organizationMonogram(item)}</span>}
  </span>;
}
