function normalized(value: string): string {
  return value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function voiceCatalogQuery(query: string, place?: string): string {
  if (!place) return query;
  const city = place.split(',')[0]?.trim() ?? place;
  const words = ` ${normalized(query)} `;
  if (words.includes(` ${normalized(place)} `) || words.includes(` ${normalized(city)} `)) return query;
  return `${query} in ${place}`;
}
