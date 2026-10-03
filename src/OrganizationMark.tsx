import { organizationLogoPath, organizationMonogram } from './organizationBrand';
import type { HeliosItem } from './types';

export function OrganizationMark({ item, className = '' }: { item: HeliosItem; className?: string }) {
  const logoPath = organizationLogoPath(item.id);
  return <span className={`organization-mark ${className}`} aria-hidden="true">
    {logoPath ? <img src={logoPath} alt="" /> : <span>{organizationMonogram(item)}</span>}
  </span>;
}
