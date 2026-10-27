export type RentalCategory = 'family' | 'commercial' | 'hostel' | 'bachelor';
export type RoomBhkType = '1BHK' | '2BHK' | '3BHK' | '4BHK';

export interface SeedHouseItem {
  id: string;
  ownerName: string;
  updatedTag: 'Updated today' | 'Updated 2 days ago';
  category: RentalCategory;
  bhk: RoomBhkType;
  city: string;
  location: string;
  rentPrice: number;
  photos: string[];
  requirements: string;
  terms: string;
  ownerPhonePreview: string;
  latitude: number;
  longitude: number;
}

export interface AdSlideItem {
  id: string;
  title: string;
  imageUrl: string;
  isDefault?: boolean;
}

// Minimum 6 dummy images per category (family, commercial, hostel, bachelor)
export const STOCK_FREE_HOME_IMAGES = {
  // 6+ Family Home Images
  family1:
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80',
  family2:
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80',
  family3:
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=900&q=80',
  family4:
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=900&q=80',
  family5:
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80',
  family6:
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=900&q=80',

  // 6+ Commercial (Shops, Offices, Godowns) Images
  commercial1:
    'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=900&q=80',
  commercial2:
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=80',
  commercial3:
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80',
  commercial4:
    'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=900&q=80',
  commercial5:
    'https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=900&q=80',
  commercial6:
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=900&q=80',

  // 6+ Hostel / PG Images
  hostel1:
    'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=900&q=80',
  hostel2:
    'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=900&q=80',
  hostel3:
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=900&q=80',
  hostel4:
    'https://images.unsplash.com/photo-1540518614846-7ede433c4576?auto=format&fit=crop&w=900&q=80',
  hostel5:
    'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?auto=format&fit=crop&w=900&q=80',
  hostel6:
    'https://images.unsplash.com/photo-1505693314120-0d443867891c?auto=format&fit=crop&w=900&q=80',

  // 6+ Bachelor Room Images (including user-provided bachelor assets)
  bachelor1:
    '/assets/aistudio/8a9f91439054386e0190543eeff200bd_21708_896004_large_bbf05810.jpg',
  bachelor2: '/assets/aistudio/images_5b5938a2.jpeg',
  bachelor3:
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
  bachelor4:
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80',
  bachelor5:
    'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=900&q=80',
  bachelor6:
    'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&w=900&q=80',
};

export const CATEGORY_DEFAULT_PHOTOS: Record<RentalCategory, string> = {
  family: STOCK_FREE_HOME_IMAGES.family1,
  commercial: STOCK_FREE_HOME_IMAGES.commercial1,
  hostel: STOCK_FREE_HOME_IMAGES.hostel1,
  bachelor: STOCK_FREE_HOME_IMAGES.bachelor1,
};

export const DEFAULT_AD_BANNERS: AdSlideItem[] = [
  {
    id: 'default_ad_1',
    title: 'Zero-Stress Home Shifting · 20% Off Packers & Movers',
    imageUrl:
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
    isDefault: true,
  },
  {
    id: 'default_ad_2',
    title: 'Instant Rental Furniture & Appliances · Starting ₹499/mo',
    imageUrl:
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80',
    isDefault: true,
  },
  {
    id: 'default_ad_3',
    title: 'High-Speed Fiber Wi-Fi for New Tenants · Free Installation',
    imageUrl:
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
    isDefault: true,
  },
];

export const SAMPLE_TOLET_PHOTO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 540" width="800" height="540">
  <rect width="800" height="540" fill="#EAF4E7"/>
  <rect x="130" y="70" width="540" height="400" rx="28" fill="#FFFFFF" stroke="#417545" stroke-width="10"/>
  <circle cx="400" cy="110" r="10" fill="#417545"/>
  <text x="400" y="210" font-family="Plus Jakarta Sans, sans-serif" font-size="68" font-weight="800" fill="#417545" text-anchor="middle">TO-LET</text>
  <text x="400" y="280" font-family="Plus Jakarta Sans, sans-serif" font-size="32" font-weight="700" fill="#141A15" text-anchor="middle">2 BHK HOUSE FOR RENT</text>
  <rect x="210" y="330" width="380" height="72" rx="16" fill="#417545"/>
  <text x="400" y="376" font-family="JetBrains Mono, monospace" font-size="28" font-weight="700" fill="#FFFFFF" text-anchor="middle">GPS VERIFIED</text>
</svg>`);

export const INITIAL_SHOWCASE_HOUSES: SeedHouseItem[] = [
  // First 6 items are featured in the "Recently Added Houses" 6-image showcase banner (under 4500/-, 8000/-, 12000/-)
  {
    id: 'seed_just_added_4500',
    ownerName: 'Srinivas Rao',
    updatedTag: 'Updated today',
    category: 'bachelor',
    bhk: '1BHK',
    city: 'Hyderabad',
    location: 'Alwal, Secunderabad, Hyderabad',
    rentPrice: 4500,
    photos: [STOCK_FREE_HOME_IMAGES.bachelor1],
    requirements:
      '1BHK / Single room for bachelors or students, 24/7 water, near Alwal main road.',
    terms: '1 month advance. Electricity as per sub-meter.',
    ownerPhonePreview: '+91 88863 88635',
    latitude: 17.5015,
    longitude: 78.5065,
  },
  {
    id: 'seed_just_added_8000',
    ownerName: 'Lakshmi Narayana',
    updatedTag: 'Updated today',
    category: 'family',
    bhk: '1BHK',
    city: 'Hyderabad',
    location: 'Kukatpally Housing Board (KPHB), Hyderabad',
    rentPrice: 8000,
    photos: [STOCK_FREE_HOME_IMAGES.family1],
    requirements:
      '1BHK independent portion, two-wheeler parking, walking distance to Kukatpally metro.',
    terms: '2 months advance. 11 months rental agreement.',
    ownerPhonePreview: '+91 89999 99333',
    latitude: 17.4849,
    longitude: 78.4138,
  },
  {
    id: 'seed_just_added_12000',
    ownerName: 'Venkat Reddy',
    updatedTag: 'Updated today',
    category: 'family',
    bhk: '2BHK',
    city: 'Hyderabad',
    location: 'Kondapur & Miyapur Cross Road, Hyderabad',
    rentPrice: 12000,
    photos: [STOCK_FREE_HOME_IMAGES.family2],
    requirements:
      'Spacious 2BHK family flat, lift & car parking, peaceful residential colony.',
    terms: '2 months security deposit. 11 months agreement.',
    ownerPhonePreview: '+91 88863 88635',
    latitude: 17.4622,
    longitude: 78.3568,
  },
  {
    id: 'seed_just_added_4200_bachelor',
    ownerName: 'Raju Yadav',
    updatedTag: 'Updated today',
    category: 'bachelor',
    bhk: '1BHK',
    city: 'Hyderabad',
    location: 'Dilsukhnagar & LB Nagar Metro, Hyderabad',
    rentPrice: 4200,
    photos: [STOCK_FREE_HOME_IMAGES.bachelor2],
    requirements:
      'Neat 1-room bachelor accommodation with attached bath, bike parking, zero brokerage.',
    terms: '1 month advance. Immediate move-in.',
    ownerPhonePreview: '+91 89999 99333',
    latitude: 17.3688,
    longitude: 78.5247,
  },
  {
    id: 'seed_just_added_7800_family',
    ownerName: 'Sudhakar Reddy',
    updatedTag: 'Updated today',
    category: 'family',
    bhk: '1BHK',
    city: 'Hyderabad',
    location: 'Trimulgherry, Trimalgherry & HMT Officers Colony, Alwal, Hyderabad',
    rentPrice: 7800,
    photos: [STOCK_FREE_HOME_IMAGES.family4],
    requirements:
      '1BHK independent floor in peaceful defense colony near Kandla Koya & Alwal.',
    terms: '2 months deposit. Direct owner.',
    ownerPhonePreview: '+91 89999 99333',
    latitude: 17.4792,
    longitude: 78.5124,
  },
  {
    id: 'seed_just_added_11500_family',
    ownerName: 'Narasimha Rao',
    updatedTag: 'Updated today',
    category: 'family',
    bhk: '2BHK',
    city: 'Hyderabad',
    location: 'Uppal Ring Road Near Metro, Hyderabad',
    rentPrice: 11500,
    photos: [STOCK_FREE_HOME_IMAGES.family5],
    requirements:
      '2BHK independent house ground floor, 5 mins walk to Uppal Metro Station.',
    terms: '2 months advance. Family only.',
    ownerPhonePreview: '+91 88863 88635',
    latitude: 17.4058,
    longitude: 78.5591,
  },

  // Additional Family Houses (total 10+ family houses)
  {
    id: 'seed_hyd_pragathi_3bhk',
    ownerName: 'Prakash Goud',
    updatedTag: 'Updated today',
    category: 'family',
    bhk: '3BHK',
    city: 'Hyderabad',
    location: 'Pragathi Nagar, Kukatpally, Hyderabad',
    rentPrice: 18500,
    photos: [STOCK_FREE_HOME_IMAGES.family3],
    requirements:
      '3BHK semi-furnished flat with modular kitchen, 2 balconies, covered parking.',
    terms: '2 months deposit. Family tenants preferred.',
    ownerPhonePreview: '+91 88863 88635',
    latitude: 17.5159,
    longitude: 78.3956,
  },
  {
    id: 'seed_hyd_gachibowli_2bhk',
    ownerName: 'Madhavi Latha',
    updatedTag: 'Updated today',
    category: 'family',
    bhk: '2BHK',
    city: 'Hyderabad',
    location: 'Gachibowli Financial District Road, Hyderabad',
    rentPrice: 22000,
    photos: [STOCK_FREE_HOME_IMAGES.family6],
    requirements:
      '2BHK gated community apartment near IT hub, gym, security & power backup.',
    terms: '2 months advance. Immediate occupancy.',
    ownerPhonePreview: '+91 89999 99333',
    latitude: 17.4401,
    longitude: 78.3489,
  },
  {
    id: 'seed_hyd_manikonda_2bhk',
    ownerName: 'Ramesh Babu',
    updatedTag: 'Updated today',
    category: 'family',
    bhk: '2BHK',
    city: 'Hyderabad',
    location: 'Manikonda Panchavati Colony, Hyderabad',
    rentPrice: 14500,
    photos: [STOCK_FREE_HOME_IMAGES.family2],
    requirements:
      '2BHK independent floor, Manjeera water connection, car & bike parking.',
    terms: '2 months deposit. 11 months rental agreement.',
    ownerPhonePreview: '+91 88863 88635',
    latitude: 17.4021,
    longitude: 78.3772,
  },
  {
    id: 'seed_hyd_banjara_4bhk',
    ownerName: 'Vikram Aditya',
    updatedTag: 'Updated today',
    category: 'family',
    bhk: '4BHK',
    city: 'Hyderabad',
    location: 'Banjara Hills Road No 12 & Jubilee Hills, Hyderabad',
    rentPrice: 29500,
    photos: [STOCK_FREE_HOME_IMAGES.family4],
    requirements:
      '4BHK duplex villa portion with terrace garden, servant room & 2 car parkings.',
    terms: '3 months deposit. Long-term lease available.',
    ownerPhonePreview: '+91 88863 88635',
    latitude: 17.4156,
    longitude: 78.4347,
  },
  {
    id: 'seed_hyd_tolichowki_3bhk',
    ownerName: 'Mohammed Azhar',
    updatedTag: 'Updated 2 days ago',
    category: 'family',
    bhk: '3BHK',
    city: 'Hyderabad',
    location: 'Tolichowki & Hafeezpet Link Road, Hyderabad',
    rentPrice: 16500,
    photos: [STOCK_FREE_HOME_IMAGES.family5],
    requirements:
      '3BHK spacious flat with lift, 24hr borewell water, close to supermarkets.',
    terms: '2 months security deposit.',
    ownerPhonePreview: '+91 89999 99333',
    latitude: 17.3991,
    longitude: 78.4153,
  },
  {
    id: 'seed_hyd_kokapet_3bhk',
    ownerName: 'Harish Varma',
    updatedTag: 'Updated today',
    category: 'family',
    bhk: '3BHK',
    city: 'Hyderabad',
    location: 'Kokapet & Nizampet Road, Hyderabad',
    rentPrice: 24000,
    photos: [STOCK_FREE_HOME_IMAGES.family6],
    requirements:
      '3BHK luxury flat with clubhouse access, modular wardrobes & children play area.',
    terms: '2 months advance. 11 months rental agreement.',
    ownerPhonePreview: '+91 88863 88635',
    latitude: 17.3912,
    longitude: 78.3345,
  },

  // 6 Bachelor Listings (Minimum 6 dummy images in Bachelor section)
  {
    id: 'seed_hyd_madhapur_1bhk',
    ownerName: 'Kiran Kumar',
    updatedTag: 'Updated today',
    category: 'bachelor',
    bhk: '1BHK',
    city: 'Hyderabad',
    location: 'Madhapur Ayyappa Society, Hyderabad',
    rentPrice: 7500,
    photos: [STOCK_FREE_HOME_IMAGES.bachelor3],
    requirements:
      '1BHK furnished bachelor flat with work desk, high-speed Wi-Fi ready, near Hitec City.',
    terms: '1 month deposit. Bachelors & IT employees welcome.',
    ownerPhonePreview: '+91 88863 88635',
    latitude: 17.4483,
    longitude: 78.3915,
  },
  {
    id: 'seed_hyd_ameerpet_1bhk',
    ownerName: 'Suresh Chandra',
    updatedTag: 'Updated today',
    category: 'bachelor',
    bhk: '1BHK',
    city: 'Hyderabad',
    location: 'Ameerpet & Malkajgiri Cross, Secunderabad, Hyderabad',
    rentPrice: 4400,
    photos: [STOCK_FREE_HOME_IMAGES.bachelor4],
    requirements:
      '1BHK budget room for students or bachelors near Ameerpet Metro & coaching centers.',
    terms: '1 month advance. Zero maintenance.',
    ownerPhonePreview: '+91 88863 88635',
    latitude: 17.4375,
    longitude: 78.4483,
  },
  {
    id: 'seed_bachelor_kondapur_5',
    ownerName: 'Anil Shetty',
    updatedTag: 'Updated today',
    category: 'bachelor',
    bhk: '1BHK',
    city: 'Hyderabad',
    location: 'Kondapur Botanical Garden Road, Hyderabad',
    rentPrice: 6800,
    photos: [STOCK_FREE_HOME_IMAGES.bachelor5],
    requirements:
      'Single 1BHK penthouse room for working bachelors, terrace access, 24/7 water.',
    terms: '1 month advance. No restrictions.',
    ownerPhonePreview: '+91 89999 99333',
    latitude: 17.4589,
    longitude: 78.3631,
  },
  {
    id: 'seed_bachelor_begumpet_6',
    ownerName: 'Naveen Chowdary',
    updatedTag: 'Updated 2 days ago',
    category: 'bachelor',
    bhk: '2BHK',
    city: 'Hyderabad',
    location: 'Begumpet & Secunderabad Station Road, Hyderabad',
    rentPrice: 9800,
    photos: [STOCK_FREE_HOME_IMAGES.bachelor6],
    requirements:
      '2BHK shared flat for bachelors, walking distance to metro station & bus stop.',
    terms: '1 month security deposit.',
    ownerPhonePreview: '+91 88863 88635',
    latitude: 17.4447,
    longitude: 78.4664,
  },

  // 6 Commercial Listings (Minimum 6 dummy images in Commercial section)
  {
    id: 'seed_commercial_1',
    ownerName: 'Srinivas Gowda',
    updatedTag: 'Updated today',
    category: 'commercial',
    bhk: '1BHK',
    city: 'Hyderabad',
    location: 'Kukatpally Main Road Shop, Hyderabad',
    rentPrice: 12000,
    photos: [STOCK_FREE_HOME_IMAGES.commercial1],
    requirements:
      'Ground floor retail shop (350 sq.ft), glass frontage, main road facing.',
    terms: '3 months security deposit. 11-month agreement.',
    ownerPhonePreview: '+91 88863 88635',
    latitude: 17.4851,
    longitude: 78.4112,
  },
  {
    id: 'seed_commercial_2',
    ownerName: 'Rajeshwari Enterprises',
    updatedTag: 'Updated today',
    category: 'commercial',
    bhk: '2BHK',
    city: 'Hyderabad',
    location: 'Madhapur 100 Feet Road Office Space, Hyderabad',
    rentPrice: 24000,
    photos: [STOCK_FREE_HOME_IMAGES.commercial2],
    requirements:
      'Plug-and-play office space with 12 workstations, conference cabin & power backup.',
    terms: '3 months deposit. Immediate possession.',
    ownerPhonePreview: '+91 89999 99333',
    latitude: 17.4474,
    longitude: 78.3911,
  },
  {
    id: 'seed_commercial_3',
    ownerName: 'Mahender Reddy',
    updatedTag: 'Updated today',
    category: 'commercial',
    bhk: '3BHK',
    city: 'Hyderabad',
    location: 'Uppal & LB Nagar Industrial Godown, Hyderabad',
    rentPrice: 19500,
    photos: [STOCK_FREE_HOME_IMAGES.commercial3],
    requirements:
      'Spacious commercial godown / warehouse (1400 sq.ft) with lorry loading bay.',
    terms: '3 months security deposit.',
    ownerPhonePreview: '+91 88863 88635',
    latitude: 17.3985,
    longitude: 78.5582,
  },
  {
    id: 'seed_commercial_4',
    ownerName: 'Chaitanya Properties',
    updatedTag: 'Updated 2 days ago',
    category: 'commercial',
    bhk: '1BHK',
    city: 'Hyderabad',
    location: 'Alwal Main Road Shutter Shop, Secunderabad, Hyderabad',
    rentPrice: 7500,
    photos: [STOCK_FREE_HOME_IMAGES.commercial4],
    requirements:
      'Road-facing commercial shutter shop ideal for medical store, clinic or boutique.',
    terms: '2 months advance. Direct owner.',
    ownerPhonePreview: '+91 89999 99333',
    latitude: 17.5028,
    longitude: 78.5071,
  },
  {
    id: 'seed_commercial_5',
    ownerName: 'Global Tech Spaces',
    updatedTag: 'Updated today',
    category: 'commercial',
    bhk: '2BHK',
    city: 'Hyderabad',
    location: 'Gachibowli & Kondapur Commercial Complex, Hyderabad',
    rentPrice: 11800,
    photos: [STOCK_FREE_HOME_IMAGES.commercial5],
    requirements:
      'First-floor commercial office suite with lift, washroom & dedicated parking.',
    terms: '2 months advance.',
    ownerPhonePreview: '+91 88863 88635',
    latitude: 17.4512,
    longitude: 78.3619,
  },
  {
    id: 'seed_commercial_6',
    ownerName: 'Bhaskar Rao',
    updatedTag: 'Updated today',
    category: 'commercial',
    bhk: '1BHK',
    city: 'Hyderabad',
    location: 'Ameerpet Main Road Commercial Showroom, Hyderabad',
    rentPrice: 4500,
    photos: [STOCK_FREE_HOME_IMAGES.commercial6],
    requirements:
      'Compact ground-floor kiosk / counter space in high-footfall Ameerpet commercial hub.',
    terms: '2 months security deposit.',
    ownerPhonePreview: '+91 89999 99333',
    latitude: 17.4368,
    longitude: 78.4489,
  },

  // 6 Hostel Listings (Minimum 6 dummy images in Hostel section)
  {
    id: 'seed_hostel_1',
    ownerName: 'GreenStay Hostels',
    updatedTag: 'Updated today',
    category: 'hostel',
    bhk: '1BHK',
    city: 'Hyderabad',
    location: 'Madhapur & Hitec City Metro Hostel, Hyderabad',
    rentPrice: 5500,
    photos: [STOCK_FREE_HOME_IMAGES.hostel1],
    requirements:
      '2-sharing & 3-sharing PG hostel with 3 times homely food, Wi-Fi & washing machine.',
    terms: '1 month deposit. Rent includes food, Wi-Fi & power.',
    ownerPhonePreview: '+91 88863 88635',
    latitude: 17.4445,
    longitude: 78.3881,
  },
  {
    id: 'seed_hostel_2',
    ownerName: 'Sri Sai Executive PG',
    updatedTag: 'Updated today',
    category: 'hostel',
    bhk: '1BHK',
    city: 'Hyderabad',
    location: 'Kukatpally KPHB Phase 1 Hostel, Hyderabad',
    rentPrice: 4400,
    photos: [STOCK_FREE_HOME_IMAGES.hostel2],
    requirements:
      'AC & Non-AC Men/Women PG hostel near JNTU Metro with North & South Indian food.',
    terms: '₹2000 maintenance deposit. No lock-in.',
    ownerPhonePreview: '+91 89999 99333',
    latitude: 17.4892,
    longitude: 78.4015,
  },
  {
    id: 'seed_hostel_3',
    ownerName: 'Royal Nest Ladies Hostel',
    updatedTag: 'Updated today',
    category: 'hostel',
    bhk: '2BHK',
    city: 'Hyderabad',
    location: 'Gachibowli DLF Gate 2 Ladies PG, Hyderabad',
    rentPrice: 7200,
    photos: [STOCK_FREE_HOME_IMAGES.hostel3],
    requirements:
      '24/7 biometric security, CCTV, attached western washrooms, daily housekeeping.',
    terms: '1 month advance. Food & Wi-Fi included.',
    ownerPhonePreview: '+91 88863 88635',
    latitude: 17.4488,
    longitude: 78.3564,
  },
  {
    id: 'seed_hostel_4',
    ownerName: 'Metro Student Living',
    updatedTag: 'Updated 2 days ago',
    category: 'hostel',
    bhk: '1BHK',
    city: 'Hyderabad',
    location: 'Ameerpet & SR Nagar Coaching Hub Hostel, Hyderabad',
    rentPrice: 4200,
    photos: [STOCK_FREE_HOME_IMAGES.hostel4],
    requirements:
      'Budget student hostel with study hall, 3 meals daily, hot water & purified drinking water.',
    terms: 'Zero deposit for students.',
    ownerPhonePreview: '+91 89999 99333',
    latitude: 17.4399,
    longitude: 78.4452,
  },
  {
    id: 'seed_hostel_5',
    ownerName: 'Comfort Zone Co-Living PG',
    updatedTag: 'Updated today',
    category: 'hostel',
    bhk: '2BHK',
    city: 'Hyderabad',
    location: 'Kondapur & Miyapur Main Road PG, Hyderabad',
    rentPrice: 8000,
    photos: [STOCK_FREE_HOME_IMAGES.hostel5],
    requirements:
      'Premium 2-sharing studio rooms with smart TV, gym, power backup & homely meals.',
    terms: '1 month deposit. Immediate check-in.',
    ownerPhonePreview: '+91 88863 88635',
    latitude: 17.4665,
    longitude: 78.3592,
  },
  {
    id: 'seed_hostel_6',
    ownerName: 'Secunderabad Pride Hostel',
    updatedTag: 'Updated today',
    category: 'hostel',
    bhk: '3BHK',
    city: 'Hyderabad',
    location: 'Alwal & Secunderabad Railway Station Hostel, Hyderabad',
    rentPrice: 4500,
    photos: [STOCK_FREE_HOME_IMAGES.hostel6],
    requirements:
      'Spaciousventilated hostel rooms with lockers, high-speed internet & two-wheeler parking.',
    terms: '1 month advance.',
    ownerPhonePreview: '+91 89999 99333',
    latitude: 17.4985,
    longitude: 78.5042,
  },
];

// Haversine formula to calculate distance in km between two GPS points
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

// Compute a deterministic fast hash string of an image data URI for duplicate photo fraud checks
export function computePhotoHash(dataUrl: string): string {
  let hash = 5381;
  const step = Math.max(1, Math.floor(dataUrl.length / 500));
  for (let i = 0; i < dataUrl.length; i += step) {
    hash = (hash * 33) ^ dataUrl.charCodeAt(i);
  }
  return `ph_${(hash >>> 0).toString(16)}_${dataUrl.length}`;
}

// Compress uploaded image files into lightweight JPEG data URLs (< 250KB) for Firestore storage
export async function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 800;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
