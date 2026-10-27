import { RentalCategory, RoomBhkType } from './sampleAssets';

export interface SeoPageConfig {
  keyword: string;
  slug: string;
  aliasSlugs: string[];
  title: string;
  metaDescription: string;
  h1: string;
  introLine1: string;
  introLine2: string;
  areaFilter?: string;
  bhkFilter?: RoomBhkType;
  maxRentFilter?: number;
  propertyTypeLabel?: string;
  categoryFilter?: RentalCategory;
}

export const RAW_HYDERABAD_KEYWORDS: string[] = [
  'Flats for Rent in Hyderabad',
  'Flats for Rent in Kukatpally',
  'Flats for Rent in Secunderabad',
  'Flats for Rent in Kondapur',
  'Flats for Rent in Manikonda',
  'Flats for Rent in Pragathi Nagar',
  'Flats for Rent in Miyapur',
  'Flats for Rent in Gachibowli',
  'Flats for Rent in Madhapur',
  'Flats for Rent in Uppal',
  'Flats for Rent in Banjara Hills',
  'Independent Floor for Rent in Hyderabad',
  'House for Rent in Hyderabad',
  '1 BHK House for Rent in Hyderabad',
  '2 BHK House for Rent in Hyderabad',
  '3 BHK House for Rent in Hyderabad',
  '4 BHK House for Rent in Hyderabad',
  'House for Rent in Tolichowki Hyderabad',
  'Houses for Rent in Kukatpally Hyderabad',
  'House for Rent in Secunderabad Hyderabad',
  'House for Rent in Gachibowli Hyderabad',
  'House for Rent in Kondapur Hyderabad',
  'House for Rent in Manikonda Hyderabad',
  'Villas For Rent in Hyderabad',
  'Properties for Rent in Hyderabad',
  'Properties for Rent in Secunderabad Hyderabad',
  'Properties for Rent in Kukatpally Hyderabad',
  'Properties for Rent in Madhapur Hyderabad',
  'Properties for Rent in Uppal Hyderabad',
  'Properties for Rent in Jubilee Hills Hyderabad',
  'Properties for Rent in Hafeezpet Hyderabad',
  'Properties for Rent in Kondapur Hyderabad',
  'Properties for Rent in Gachibowli Hyderabad',
  'Properties for Rent in Ameerpet Hyderabad',
  'Properties for Rent in Kokapet Hyderabad',
  'Properties for Rent in Banjara Hills Hyderabad',
  'Properties for Rent in Alwal Hyderabad',
  'Properties for Rent in Miyapur Hyderabad',
  'Properties for Rent in Nizampet Hyderabad',
  'Properties for Rent in Malkajgiri Hyderabad',
  'Properties for Rent in Hyderabad by Budget',
  'Properties for Rent in Hyderabad Below 5000',
  'Properties for Rent in Hyderabad Below 10000',
  'Properties for Rent in Hyderabad Below 15000',
  'Properties for Rent in Hyderabad Below 20000',
  'Properties for Rent in Hyderabad Below 25000',
  'Properties for Rent in Hyderabad Below 30000',
];

const HYDERABAD_AREAS = [
  'Kukatpally',
  'Secunderabad',
  'Kondapur',
  'Manikonda',
  'Pragathi Nagar',
  'Miyapur',
  'Gachibowli',
  'Madhapur',
  'Uppal',
  'Banjara Hills',
  'Tolichowki',
  'Jubilee Hills',
  'Hafeezpet',
  'Ameerpet',
  'Kokapet',
  'Alwal',
  'Nizampet',
  'Malkajgiri',
];

function toBaseSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildSeoConfig(keyword: string): SeoPageConfig {
  const baseSlug = toBaseSlug(keyword);
  const endsWithHyderabad = baseSlug.includes('hyderabad');
  // User prompt example: "Flats for Rent in Kukatpally" -> "/flats-for-rent-in-kukatpally-hyderabad"
  const canonicalSlug = endsWithHyderabad ? baseSlug : `${baseSlug}-hyderabad`;
  const aliasSlugs = endsWithHyderabad ? [baseSlug] : [canonicalSlug, baseSlug];

  // Detect Area
  const matchedArea = HYDERABAD_AREAS.find((area) =>
    keyword.toLowerCase().includes(area.toLowerCase())
  );

  // Detect BHK
  let bhkFilter: RoomBhkType | undefined;
  if (keyword.includes('1 BHK')) bhkFilter = '1BHK';
  else if (keyword.includes('2 BHK')) bhkFilter = '2BHK';
  else if (keyword.includes('3 BHK')) bhkFilter = '3BHK';
  else if (keyword.includes('4 BHK')) bhkFilter = '4BHK';

  // Detect Max Rent Budget
  let maxRentFilter: number | undefined;
  const belowMatch = keyword.match(/Below\s+(\d+)/i);
  if (belowMatch) {
    maxRentFilter = Number(belowMatch[1]);
  }

  const areaLabel = matchedArea ? `${matchedArea}, Hyderabad` : 'Hyderabad';

  const introLine1 = `Find verified ${keyword.toLowerCase()} with real house photos and direct owner contact numbers on RENTBOX.`;
  const introLine2 = matchedArea
    ? `Browse affordable 1BHK, 2BHK, 3BHK, and bachelor rentals in ${areaLabel} with zero brokerage fees.`
    : maxRentFilter
    ? `Compare budget-friendly rental homes across Hyderabad under ₹${maxRentFilter.toLocaleString('en-IN')}/month with zero broker commission.`
    : `Connect directly with verified property owners across all major localities in Hyderabad with no middlemen.`;

  return {
    keyword,
    slug: canonicalSlug,
    aliasSlugs,
    title: `${keyword} | No Broker Rentals on RENTBOX`,
    metaDescription: `Looking for ${keyword}? Browse photo-verified rental homes in ${areaLabel} on RENTBOX. Unlock direct owner phone numbers with zero brokerage.`,
    h1: keyword,
    introLine1,
    introLine2,
    areaFilter: matchedArea,
    bhkFilter,
    maxRentFilter,
  };
}

export const HYDERABAD_SEO_PAGES: SeoPageConfig[] =
  RAW_HYDERABAD_KEYWORDS.map(buildSeoConfig);

export function findSeoPageByPath(pathname: string): SeoPageConfig | null {
  const clean = pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (!clean) return null;
  return (
    HYDERABAD_SEO_PAGES.find(
      (page) => page.slug === clean || page.aliasSlugs.includes(clean)
    ) || null
  );
}
