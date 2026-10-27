/**
 * Stock-free photography URLs for home/rental listings (temporary) with
 * resilient SVG fallbacks, 3 rotating Ad Banner graphics, owner names,
 * update recency tags, and client-side image compression.
 */

export type RentalCategory = 'family' | 'commercial' | 'hostel' | 'bachelor';

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

export const CATEGORY_DEFAULT_PHOTOS: Record<RentalCategory, string> = {
  family: svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
      <defs>
        <linearGradient id="bgFam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#EAF4E7"/>
          <stop offset="100%" stop-color="#FFFFFF"/>
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#bgFam)"/>
      <rect x="0" y="455" width="800" height="145" fill="#DCEAD7"/>
      <polygon points="150,210 400,90 650,210" fill="#417545"/>
      <rect x="180" y="210" width="440" height="245" rx="12" fill="#FFFFFF" stroke="#C5DBC0" stroke-width="4"/>
      <rect x="225" y="255" width="150" height="105" rx="10" fill="#EAF4E7" stroke="#417545" stroke-width="3"/>
      <line x1="300" y1="255" x2="300" y2="360" stroke="#417545" stroke-width="3"/>
      <rect x="435" y="260" width="130" height="195" rx="10" fill="#417545"/>
      <circle cx="545" cy="360" r="7" fill="#EAF4E7"/>
      <circle cx="120" cy="405" r="46" fill="#6DA34D"/>
      <rect x="114" y="435" width="12" height="30" fill="#356139"/>
      <circle cx="680" cy="400" r="52" fill="#417545"/>
      <rect x="674" y="435" width="12" height="30" fill="#356139"/>
    </svg>
  `),
  commercial: svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
      <rect width="800" height="600" fill="#F2F8F0"/>
      <rect x="0" y="460" width="800" height="140" fill="#DCEAD7"/>
      <rect x="140" y="120" width="520" height="340" rx="16" fill="#FFFFFF" stroke="#B8D4B2" stroke-width="4"/>
      <rect x="125" y="100" width="550" height="36" rx="10" fill="#417545"/>
      <rect x="175" y="165" width="450" height="70" rx="10" fill="#EAF4E7" stroke="#417545" stroke-width="3"/>
      <text x="400" y="210" font-family="sans-serif" font-size="28" font-weight="bold" fill="#417545" text-anchor="middle">COMMERCIAL SPACE · SHOP / OFFICE</text>
      <rect x="180" y="265" width="260" height="195" rx="8" fill="#EAF4E7" stroke="#6DA34D" stroke-width="3"/>
      <rect x="465" y="265" width="155" height="195" rx="8" fill="#417545"/>
      <circle cx="595" cy="365" r="7" fill="#FFFFFF"/>
    </svg>
  `),
  hostel: svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
      <rect width="800" height="600" fill="#EAF4E7"/>
      <rect x="0" y="465" width="800" height="135" fill="#D5E7CF"/>
      <rect x="190" y="85" width="420" height="380" rx="16" fill="#FFFFFF" stroke="#B8D4B2" stroke-width="4"/>
      <rect x="175" y="70" width="450" height="28" rx="8" fill="#417545"/>
      <rect x="230" y="125" width="95" height="70" rx="8" fill="#EAF4E7" stroke="#417545" stroke-width="3"/>
      <rect x="352" y="125" width="95" height="70" rx="8" fill="#EAF4E7" stroke="#417545" stroke-width="3"/>
      <rect x="475" y="125" width="95" height="70" rx="8" fill="#EAF4E7" stroke="#417545" stroke-width="3"/>
      <rect x="230" y="220" width="95" height="70" rx="8" fill="#EAF4E7" stroke="#417545" stroke-width="3"/>
      <rect x="352" y="220" width="95" height="70" rx="8" fill="#EAF4E7" stroke="#417545" stroke-width="3"/>
      <rect x="475" y="220" width="95" height="70" rx="8" fill="#EAF4E7" stroke="#417545" stroke-width="3"/>
      <rect x="340" y="330" width="120" height="135" rx="10" fill="#417545"/>
    </svg>
  `),
  bachelor: svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
      <rect width="800" height="600" fill="#F2F8F0"/>
      <rect x="0" y="430" width="800" height="170" fill="#DCEAD7"/>
      <rect x="240" y="80" width="320" height="200" rx="12" fill="#FFFFFF" stroke="#417545" stroke-width="4"/>
      <rect x="258" y="98" width="135" height="164" rx="6" fill="#EAF4E7"/>
      <rect x="407" y="98" width="135" height="164" rx="6" fill="#EAF4E7"/>
      <rect x="190" y="340" width="420" height="95" rx="20" fill="#417545"/>
      <rect x="215" y="310" width="160" height="55" rx="12" fill="#6DA34D"/>
    </svg>
  `),
};

// Royalty-free stock photography for temporary home/rental listings
export const STOCK_FREE_HOME_IMAGES = {
  family1:
    'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=800',
  family2:
    'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=800',
  family3:
    'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=800',
  commercial1:
    'https://images.pexels.com/photos/264507/pexels-photo-264507.jpeg?auto=compress&cs=tinysrgb&w=800',
  commercial2:
    'https://images.pexels.com/photos/1170412/pexels-photo-1170412.jpeg?auto=compress&cs=tinysrgb&w=800',
  hostel1:
    'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=800',
  hostel2:
    'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=800',
  bachelor1:
    'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800',
  bachelor2:
    'https://images.pexels.com/photos/1918291/pexels-photo-1918291.jpeg?auto=compress&cs=tinysrgb&w=800',
};

export const SAMPLE_HOUSE_PHOTOS: string[] = [
  STOCK_FREE_HOME_IMAGES.family1,
  STOCK_FREE_HOME_IMAGES.family2,
  STOCK_FREE_HOME_IMAGES.commercial1,
  STOCK_FREE_HOME_IMAGES.bachelor1,
];

export const SAMPLE_TOLET_PHOTO: string = svgToDataUrl(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <rect width="800" height="600" fill="#EAF4E7"/>
    <rect x="90" y="60" width="620" height="480" rx="24" fill="#DCEAD7" stroke="#B8D4B2" stroke-width="4"/>
    <line x1="280" y1="90" x2="280" y2="150" stroke="#356139" stroke-width="6"/>
    <line x1="520" y1="90" x2="520" y2="150" stroke="#356139" stroke-width="6"/>
    <rect x="170" y="145" width="460" height="310" rx="24" fill="#FFFFFF" stroke="#417545" stroke-width="10"/>
    <rect x="200" y="175" width="400" height="76" rx="12" fill="#417545"/>
    <text x="400" y="227" font-family="sans-serif" font-size="44" font-weight="bold" fill="#FFFFFF" text-anchor="middle">TO - LET</text>
    <text x="400" y="310" font-family="sans-serif" font-size="30" font-weight="bold" fill="#141A15" text-anchor="middle">VERIFIED RENTAL BOARD</text>
    <text x="400" y="362" font-family="sans-serif" font-size="22" fill="#417545" text-anchor="middle">Direct Owner · Zero Brokerage</text>
    <text x="400" y="412" font-family="monospace" font-size="24" font-weight="bold" fill="#6DA34D" text-anchor="middle">GPS LOCATION TAGGED</text>
  </svg>
`);

export interface AdSlideItem {
  id: string;
  title: string;
  imageUrl: string;
  isDefault?: boolean;
}

export const DEFAULT_AD_BANNERS: AdSlideItem[] = [
  {
    id: 'default_ad_1',
    title: 'City Packers & Movers · Flat 20% Off Home Shifting',
    imageUrl:
      'https://images.pexels.com/photos/4246120/pexels-photo-4246120.jpeg?auto=compress&cs=tinysrgb&w=1200',
    isDefault: true,
  },
  {
    id: 'default_ad_2',
    title: 'GreenLeaf Home Interiors · Modular Kitchens & Wardrobes',
    imageUrl:
      'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200',
    isDefault: true,
  },
  {
    id: 'default_ad_3',
    title: 'SpeedNet Fiber Wi-Fi · Zero Installation for New Tenants',
    imageUrl:
      'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=1200',
    isDefault: true,
  },
];

export interface SeedHouseItem {
  id: string;
  category: RentalCategory;
  ownerName: string;
  updatedTag: 'Updated today' | 'Updated 2 days ago';
  city: string;
  location: string;
  rentPrice: number;
  photos: string[];
  requirements: string;
  terms: string;
  latitude: number;
  longitude: number;
  ownerPhonePreview: string;
}

export const INITIAL_SHOWCASE_HOUSES: SeedHouseItem[] = [
  // 1. HOME (Family Houses Only)
  {
    id: 'demo_family_indiranagar',
    category: 'family',
    ownerName: 'Ramesh Reddy',
    updatedTag: 'Updated today',
    city: 'bengaluru',
    location: 'Indiranagar 2nd Stage, Bengaluru',
    rentPrice: 24000,
    photos: [STOCK_FREE_HOME_IMAGES.family1, STOCK_FREE_HOME_IMAGES.family3],
    requirements: '2BHK sunlit family house with covered car parking and balcony.',
    terms: '11-month agreement. 2 months security deposit. Family tenants only.',
    latitude: 12.9784,
    longitude: 77.6408,
    ownerPhonePreview: '+91 98450 71234',
  },
  {
    id: 'demo_family_jayanagar',
    category: 'family',
    ownerName: 'Srinivas Rao',
    updatedTag: 'Updated 2 days ago',
    city: 'bengaluru',
    location: 'Jayanagar 4th Block, Bengaluru',
    rentPrice: 28500,
    photos: [STOCK_FREE_HOME_IMAGES.family2, STOCK_FREE_HOME_IMAGES.family1],
    requirements: '3BHK independent ground floor house, quiet residential street.',
    terms: '11-month agreement. Kaveri water 24x7. No commercial use.',
    latitude: 12.925,
    longitude: 77.5938,
    ownerPhonePreview: '+91 98451 22901',
  },
  {
    id: 'demo_family_whitefield',
    category: 'family',
    ownerName: 'Lakshmi Narayana',
    updatedTag: 'Updated today',
    city: 'bengaluru',
    location: 'Whitefield ITPL Main Road, Bengaluru',
    rentPrice: 21000,
    photos: [STOCK_FREE_HOME_IMAGES.family3],
    requirements: 'Spacious 2BHK apartment with children play area and security.',
    terms: '11-month rental agreement. Maintenance included.',
    latitude: 12.9698,
    longitude: 77.75,
    ownerPhonePreview: '+91 98452 90811',
  },
  // 2. COMMERCIAL (Shops, Offices, Godowns Only)
  {
    id: 'demo_comm_mgroad',
    category: 'commercial',
    ownerName: 'Venkatesh Gupta',
    updatedTag: 'Updated today',
    city: 'bengaluru',
    location: 'MG Road Main Market, Bengaluru',
    rentPrice: 42000,
    photos: [STOCK_FREE_HOME_IMAGES.commercial1],
    requirements: 'Ground floor retail shop (450 sq.ft) with glass frontage and rolling shutter.',
    terms: '3-year commercial lease. GST invoice available. 3-phase power.',
    latitude: 12.9756,
    longitude: 77.6066,
    ownerPhonePreview: '+91 99001 45890',
  },
  {
    id: 'demo_comm_peenya',
    category: 'commercial',
    ownerName: 'Prakash Naidu',
    updatedTag: 'Updated 2 days ago',
    city: 'bengaluru',
    location: 'Peenya Industrial Area, Bengaluru',
    rentPrice: 35000,
    photos: [STOCK_FREE_HOME_IMAGES.commercial2],
    requirements: '1200 sq.ft dry storage godown & office cabin with loading bay access.',
    terms: '11-month renewable commercial agreement. 24x7 security.',
    latitude: 13.0285,
    longitude: 77.5197,
    ownerPhonePreview: '+91 99002 88310',
  },
  // 3. HOSTEL (Nearest Hostels First via GPS)
  {
    id: 'demo_hostel_koramangala',
    category: 'hostel',
    ownerName: 'Kiran Kumar',
    updatedTag: 'Updated today',
    city: 'bengaluru',
    location: 'Koramangala 5th Block Student Hostel, Bengaluru',
    rentPrice: 7500,
    photos: [STOCK_FREE_HOME_IMAGES.hostel1],
    requirements: 'Clean 2-sharing hostel room with Wi-Fi, homestyle meals, and laundry.',
    terms: '1 month deposit. Biometric gate entry. No lock-in period.',
    latitude: 12.9352,
    longitude: 77.6245,
    ownerPhonePreview: '+91 97310 55120',
  },
  {
    id: 'demo_hostel_brigade',
    category: 'hostel',
    ownerName: 'Anitha Chowdary',
    updatedTag: 'Updated 2 days ago',
    city: 'bengaluru',
    location: 'Central Metro Men & Women Hostel, Ashok Nagar, Bengaluru',
    rentPrice: 8200,
    photos: [STOCK_FREE_HOME_IMAGES.hostel2],
    requirements: 'Walking distance from Metro. High-speed Wi-Fi, power backup, study desk.',
    terms: 'Monthly rent paid by 5th. 1 month notice.',
    latitude: 12.9719,
    longitude: 77.6012,
    ownerPhonePreview: '+91 97312 66409',
  },
  // 4. BACHELOR (Nearest 1-room places, Lowest Price First)
  {
    id: 'demo_bach_btm',
    category: 'bachelor',
    ownerName: 'Suresh Varma',
    updatedTag: 'Updated today',
    city: 'bengaluru',
    location: 'BTM Layout 1st Stage, 1-Room RK, Bengaluru',
    rentPrice: 6500,
    photos: [STOCK_FREE_HOME_IMAGES.bachelor1],
    requirements: 'Independent 1-room kitchen (1RK) on terrace with attached bath. Bachelors welcome.',
    terms: '1 month security deposit. No curfew restrictions. Separate electricity meter.',
    latitude: 12.9166,
    longitude: 77.6101,
    ownerPhonePreview: '+91 96114 30988',
  },
  {
    id: 'demo_bach_hsr',
    category: 'bachelor',
    ownerName: 'Harish Babu',
    updatedTag: 'Updated 2 days ago',
    city: 'bengaluru',
    location: 'HSR Layout Sector 7, 1-Room Studio, Bengaluru',
    rentPrice: 8500,
    photos: [STOCK_FREE_HOME_IMAGES.bachelor2],
    requirements: 'Bright 1-room bachelor pad with bike parking and 24x7 water.',
    terms: '11-month agreement. 1 month deposit. Friends allowed.',
    latitude: 12.9121,
    longitude: 77.6446,
    ownerPhonePreview: '+91 96119 74210',
  },
];

/**
 * Calculates distance in kilometers between two GPS coordinates using Haversine formula.
 */
export function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

/**
 * Compresses an uploaded image file to a clean JPEG data URL <= 150KB
 * so that it can be safely stored in Firestore without hitting the 1MB document cap.
 */
export async function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = () => {
        const maxW = 720;
        const maxH = 540;
        let width = img.width;
        let height = img.height;

        if (width > maxW || height > maxH) {
          const ratio = Math.min(maxW / width, maxH / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(CATEGORY_DEFAULT_PHOTOS.family);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.72);
        resolve(compressedDataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
