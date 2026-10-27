/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  BedDouble,
  Building2,
  Camera,
  Check,
  ChevronRight,
  Edit3,
  FileText,
  Flag,
  Gift,
  Heart,
  Home as HomeIcon,
  Instagram,
  KeyRound,
  Lock,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Navigation,
  Phone,
  Plus,
  Search as SearchIcon,
  Share2,
  ShieldCheck,
  Sparkles,
  Store,
  Trash2,
  Truck,
  Upload,
  User as UserIcon,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  AdSlideItem,
  CATEGORY_DEFAULT_PHOTOS,
  compressImageFile,
  DEFAULT_AD_BANNERS,
  getDistanceKm,
  INITIAL_SHOWCASE_HOUSES,
  RentalCategory,
  RoomBhkType,
  SAMPLE_TOLET_PHOTO,
  STOCK_FREE_HOME_IMAGES,
} from './utils/sampleAssets';
import { findSeoPageByPath } from './utils/seoKeywords';
import { PopularSearchesSection } from './components/PopularSearchesSection';
import { RentalHeroesPage } from './components/RentalHeroesPage';
import { RazorpayModal } from './components/RazorpayModal';
import { ScratchCardData, ScratchCardItem } from './components/ScratchCardItem';

type PageRoute =
  | 'home'
  | 'take_options'
  | 'search'
  | 'saved'
  | 'detail'
  | 'give_options'
  | 'owner'
  | 'hero'
  | 'rewards'
  | 'login';

interface UserProfileData {
  uid: string;
  displayName: string;
  phone: string;
  hasPaidSeekerFee: boolean;
  hasPaidOwnerFee: boolean;
  points: number;
  freeUntil?: number;
  referralCode?: string;
  referredByCode?: string;
  referralBonusCredited?: boolean;
  rentedBonusCash?: number;
  agentArea?: string;
  agentBonusPoints?: number;
}

interface HouseListingData {
  id: string;
  ownerId: string;
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
  latitude: number;
  longitude: number;
  status: 'active' | 'removed';
  isDemo?: boolean;
  demoPhone?: string;
}

interface HeroUploadData {
  id: string;
  userId: string;
  userName: string;
  photoUrl: string;
  locationText: string;
  latitude: number;
  longitude: number;
  status: 'pending' | 'approved' | 'rejected';
  pointsAwarded: number;
}

const ADMIN_EMAIL = 'ruchitvacloudkitchen@gmail.com';
const CONTACT_NUMBER = '+8886388635, 8999999333';
const CONTACT_PRIMARY_TEL = '+918886388635';
const CONTACT_SECONDARY_TEL = '+918999999333';
const WHATSAPP_NUMBER = '8886388635';
const WHATSAPP_URL = 'https://wa.me/918886388635';

const ALWAL_NEARBY_LOCALITIES = [
  'Trimalgherry',
  'Trimulgherry',
  'Kandla Koya',
  'HMT Officers Colony',
] as const;

const CATEGORY_META: Record<
  RentalCategory,
  {
    takeTitle: string;
    takeTelugu: string;
    takeSubtitle: string;
    giveTitle: string;
    giveSubtitle: string;
    ruleHint: string;
  }
> = {
  family: {
    takeTitle: 'Home',
    takeTelugu: 'కుటుంబ ఇళ్లు',
    takeSubtitle: 'Only family houses',
    giveTitle: 'Family',
    giveSubtitle: 'List a family house · కుటుంబ ఇల్లు',
    ruleHint: 'Family houses only · Photo, location, rent & details',
  },
  commercial: {
    takeTitle: 'Commercial',
    takeTelugu: 'షాపులు & ఆఫీసులు',
    takeSubtitle: 'Shops, offices, godowns',
    giveTitle: 'Commercial',
    giveSubtitle: 'List a shop, office or godown · కమర్షియల్',
    ruleHint: 'Shops, offices & godowns · Photo, location, rent & details',
  },
  hostel: {
    takeTitle: 'Hostel',
    takeTelugu: 'హాస్టల్స్',
    takeSubtitle: 'Nearest hostels first (GPS)',
    giveTitle: 'Hostel',
    giveSubtitle: 'List a hostel · హాస్టల్',
    ruleHint: 'Sorted by nearest GPS distance first · Photo, location & price',
  },
  bachelor: {
    takeTitle: 'Bachelor',
    takeTelugu: 'బ్యాచిలర్ రూమ్స్',
    takeSubtitle: 'Nearest 1-room, lowest price first',
    giveTitle: 'Bachelor',
    giveSubtitle: 'List a 1-room bachelor place · బ్యాచిలర్ రూమ్',
    ruleHint: 'Sorted by lowest price & nearest GPS · Photo, location & price',
  },
};

const REWARD_POOL: { type: 'cash' | 'coupon'; label: string; codePrefix: string }[] = [
  { type: 'cash', label: '₹25 Instant UPI Cashback', codePrefix: 'CASH25' },
  { type: 'coupon', label: '₹250 OFF Shifting Box Kit', codePrefix: 'BOX250' },
  { type: 'cash', label: '₹50 Hero Bonus Cash', codePrefix: 'HERO50' },
  { type: 'coupon', label: '20% OFF Rental Agreement', codePrefix: 'LEGAL20' },
];

const TOP_HERO_BANNERS: {
  id: string;
  imageUrl: string;
  alt: string;
  targetPage: PageRoute;
  category?: RentalCategory;
}[] = [
  {
    id: 'hero_slide_bachelor',
    imageUrl:
      '/assets/aistudio/Gemini_Generated_Image_mw5dl1mw5dl1mw5d_3e3d523c.png',
    alt: 'RENTBOX - Find your new friend @ bachelor rooms. Bachelors & Students Welcome!',
    targetPage: 'search',
    category: 'bachelor',
  },
  {
    id: 'hero_slide_nobroker',
    imageUrl: '/assets/aistudio/homepage-banner_b2030f63.png',
    alt: 'RENTBOX - Why Use NoBroker Avoid Brokers. We directly connect you to verified owners to save brokerage.',
    targetPage: 'take_options',
  },
  {
    id: 'hero_slide_owner_49',
    imageUrl:
      '/assets/aistudio/Gemini_Generated_Image_v94pouv94pouv94p__1__1b71b9ba.png',
    alt: 'RENTBOX - Own a house? Post it for just ₹49. మీ ఇల్లు అద్దెకు ఇవ్వాలా? కేవలం ₹49 పోస్ట్ చేయండి.',
    targetPage: 'give_options',
  },
  {
    id: 'hero_slide_1',
    imageUrl:
      '/assets/aistudio/Gemini_Generated_Image_mxrmflmxrmflmxrm__1__432b345c.jpg',
    alt: 'RENTBOX - Find your place. No broker. No Fee. Start Searching',
    targetPage: 'take_options',
  },
  {
    id: 'hero_slide_2',
    imageUrl:
      '/assets/aistudio/Gemini_Generated_Image_cfzvagcfzvagcfzv_27852d24.png',
    alt: 'RENTBOX - Give Rent · అద్దెకు ఇవ్వండి. Select Property Category',
    targetPage: 'give_options',
  },
  {
    id: 'hero_slide_3',
    imageUrl:
      '/assets/aistudio/Gemini_Generated_Image_s35pzes35pzes35p_4372b24c.png',
    alt: 'RENTBOX - Find your place. No broker. No Fee. Start Searching',
    targetPage: 'take_options',
  },
];

const BUTTON_PATTERN_IMAGE =
  '/assets/aistudio/Gemini_Generated_Image_mxrmflmxrmflmxrm__2__9137008f.jpg';
const GIVE_RENT_BANNER_IMAGE =
  '/assets/aistudio/Gemini_Generated_Image_v94pouv94pouv94p__1__1b71b9ba.png';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [currentPage, setCurrentPageState] = useState<PageRoute>('home');

  // Active Hyderabad SEO page if URL matches one of the 47 SEO keywords
  const activeSeoPage = useMemo(
    () => findSeoPageByPath(location.pathname),
    [location.pathname]
  );

  // Navigate helper that keeps React Router URL in sync with app pages
  const setCurrentPage = (nextPage: PageRoute) => {
    setCurrentPageState(nextPage);
    const routeMap: Record<PageRoute, string> = {
      home: '/',
      take_options: '/take-rent',
      search: '/search',
      saved: '/saved',
      detail: '/property-detail',
      give_options: '/give-rent',
      owner: '/owner-dashboard',
      hero: '/rental-heroes',
      rewards: '/rewards',
      login: '/login',
    };
    const targetPath = routeMap[nextPage] || '/';
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sync direct URL entry with internal page state
  useEffect(() => {
    const cleanPath = location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
    if (!cleanPath) {
      setCurrentPageState('home');
    } else if (cleanPath === 'take-rent') {
      setCurrentPageState('take_options');
    } else if (cleanPath === 'search') {
      setCurrentPageState('search');
    } else if (cleanPath === 'saved') {
      setCurrentPageState('saved');
    } else if (cleanPath === 'property-detail') {
      setCurrentPageState('detail');
    } else if (cleanPath === 'give-rent') {
      setCurrentPageState('give_options');
    } else if (cleanPath === 'owner-dashboard') {
      setCurrentPageState('owner');
    } else if (cleanPath === 'rental-heroes' || cleanPath === 'heroes') {
      setCurrentPageState('hero');
    } else if (cleanPath === 'rewards') {
      setCurrentPageState('rewards');
    } else if (cleanPath === 'login') {
      setCurrentPageState('login');
    }
  }, [location.pathname]);

  // Dynamic SEO Head Updater: Unique <title>, <meta name="description">, and <link rel="canonical"> on every page
  useEffect(() => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://rentbox.in';
    const canonicalPath = activeSeoPage
      ? `/${activeSeoPage.slug}`
      : location.pathname === '/'
      ? '/'
      : location.pathname;
    const canonicalUrl = `${origin}${canonicalPath}`;

    const pageTitle = activeSeoPage
      ? activeSeoPage.title
      : currentPage === 'hero'
      ? 'Rental Heroes · Post To-Let Boards & Earn Points | RENTBOX Hyderabad'
      : currentPage === 'give_options' || currentPage === 'owner'
      ? 'Give Rent · Post Your House FREE for 3 Months | RENTBOX Hyderabad'
      : currentPage === 'take_options' || currentPage === 'search'
      ? 'Take Rent · No Broker Houses, Flats & Rooms in Hyderabad | RENTBOX'
      : 'RENTBOX — Your home, in a box | No Broker Rentals in Hyderabad';

    const pageDescription = activeSeoPage
      ? activeSeoPage.metaDescription
      : 'Your home, in a box. Browse photo-verified flats, independent houses, hostels, and bachelor rooms for rent in Hyderabad with zero brokerage.';

    document.title = pageTitle;

    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) descMeta.setAttribute('content', pageDescription);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', pageTitle);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', pageDescription);

    let canonicalEl = document.querySelector(
      'link[rel="canonical"]'
    ) as HTMLLinkElement | null;
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonicalUrl);
  }, [activeSeoPage, currentPage, location.pathname]);

  const [heroBannerIndex, setHeroBannerIndex] = useState(0);
  const [showTopRightServicesMenu, setShowTopRightServicesMenu] =
    useState(false);
  const [selectedTakeCategory, setSelectedTakeCategory] =
    useState<RentalCategory>('family');
  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);

  // Saved (Hearted) House IDs persisted in localStorage
  const [savedHouseIds, setSavedHouseIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('rentbox_saved_houses');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Reported Houses Modal State
  const [reportingHouse, setReportingHouse] = useState<HouseListingData | null>(null);
  const [reportedHouseIds, setReportedHouseIds] = useState<string[]>([]);
  const [reportNotice, setReportNotice] = useState<string | null>(null);

  // Quick Service Modal State ("Rental Agreement" | "Packers & Movers")
  const [activeServiceModal, setActiveServiceModal] = useState<
    'Rental Agreement' | 'Packers & Movers' | null
  >(null);
  const [serviceFormName, setServiceFormName] = useState('');
  const [serviceFormPhone, setServiceFormPhone] = useState('');
  const [serviceFormCity, setServiceFormCity] = useState('Bengaluru');
  const [serviceSubmittedMsg, setServiceSubmittedMsg] = useState<string | null>(null);

  // Animated Number Counters on Home Page
  const [animatedCounts, setAnimatedCounts] = useState({
    houses: 0,
    heroes: 0,
    points: 0,
  });

  // User GPS Coordinates (Used for Hostel & Bachelor nearest sorting)
  const [userGps, setUserGps] = useState<{ lat: number; lng: number }>({
    lat: 12.9716,
    lng: 77.5946,
  });
  const [gpsActive, setGpsActive] = useState(false);

  // Auth & User Profile State
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<UserProfileData | null>(null);

  // Data Collections
  const [firestoreHouses, setFirestoreHouses] = useState<HouseListingData[]>([]);
  const [unlockedPhones, setUnlockedPhones] = useState<Record<string, string>>({});
  const [myHeroUploads, setMyHeroUploads] = useState<HeroUploadData[]>([]);
  const [pendingAdminUploads, setPendingAdminUploads] = useState<HeroUploadData[]>([]);
  const [scratchCards, setScratchCards] = useState<ScratchCardData[]>([]);

  // Ad Banner State (Rotates every 4 seconds)
  const [firestoreAds, setFirestoreAds] = useState<AdSlideItem[]>([]);
  const [removedDefaultAdIds, setRemovedDefaultAdIds] = useState<string[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [showAdAdminPanel, setShowAdAdminPanel] = useState(false);
  const [newAdTitle, setNewAdTitle] = useState('');
  const [newAdImage, setNewAdImage] = useState(STOCK_FREE_HOME_IMAGES.family1);
  const [uploadingAd, setUploadingAd] = useState(false);

  // Footer Info Sheet State (About, Contact, Terms, Privacy)
  const [footerInfoTopic, setFooterInfoTopic] = useState<
    'About' | 'Contact' | 'Terms' | 'Privacy' | null
  >(null);

  // Search & Filter State (Rent Prices: 4500/-, 8000/-, 12000/- & Rent Rooms: 1BHK, 2BHK, 3BHK)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRentFilter, setSelectedRentFilter] = useState<
    'all' | 4500 | 8000 | 12000
  >('all');
  const [selectedBhkFilter, setSelectedBhkFilter] = useState<
    'all' | RoomBhkType
  >('all');
  const [selectedNearbyLocalities, setSelectedNearbyLocalities] = useState<
    string[]
  >([]);
  const [showFilterSidebar, setShowFilterSidebar] = useState(false);
  const [showPopularSearchesInMenu, setShowPopularSearchesInMenu] =
    useState(false);
  const [showTelugu, setShowTelugu] = useState(true);

  // Payment Modal State
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    purpose: 'seeker_fee' | 'owner_fee';
  }>({ isOpen: false, purpose: 'seeker_fee' });

  // Free Unlock Modal State for Bachelor & Hostel Seekers (Login with Google + Phone Number only, no payment)
  const [freeSeekerModalOpen, setFreeSeekerModalOpen] = useState(false);
  const [freeSeekerPhoneInput, setFreeSeekerPhoneInput] = useState('');
  const [freeSeekerSaving, setFreeSeekerSaving] = useState(false);
  const [freeSeekerError, setFreeSeekerError] = useState<string | null>(null);

  // Owner Phone OTP & Listing Form State
  const [phoneInput, setPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpStatusMsg, setOtpStatusMsg] = useState<string | null>(null);

  const [editingHouseId, setEditingHouseId] = useState<string | null>(null);
  const [houseCategory, setHouseCategory] = useState<RentalCategory>('family');
  const [houseCity, setHouseCity] = useState('Bengaluru');
  const [houseLocation, setHouseLocation] = useState('');
  const [houseRent, setHouseRent] = useState('18000');
  const [houseOwnerPhone, setHouseOwnerPhone] = useState('');
  const [houseRequirements, setHouseRequirements] = useState('');
  const [houseTerms, setHouseTerms] = useState('');
  const [housePhotos, setHousePhotos] = useState<string[]>([
    STOCK_FREE_HOME_IMAGES.family1,
  ]);
  const [ownerFormMsg, setOwnerFormMsg] = useState<string | null>(null);
  const [savingHouse, setSavingHouse] = useState(false);

  // Rental Hero Upload Form State
  const [heroPhoto, setHeroPhoto] = useState<string>(SAMPLE_TOLET_PHOTO);
  const [heroLocationText, setHeroLocationText] = useState('');
  const [heroCoords, setHeroCoords] = useState<{ lat: number; lng: number }>({
    lat: 12.9716,
    lng: 77.5946,
  });
  const [gpsStatus, setGpsStatus] = useState<string>('Ready to tag GPS');
  const [uploadingHero, setUploadingHero] = useState(false);
  const [heroMsg, setHeroMsg] = useState<string | null>(null);

  const isAdminUser = Boolean(
    user && user.email === ADMIN_EMAIL && user.emailVerified
  );

  // Toggle Heart (Save) House
  const handleToggleSaveHouse = (houseId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSavedHouseIds((prev) => {
      const next = prev.includes(houseId)
        ? prev.filter((id) => id !== houseId)
        : [...prev, houseId];
      try {
        localStorage.setItem('rentbox_saved_houses', JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  // Share House via WhatsApp
  const handleShareWhatsApp = (house: HouseListingData, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const shareText = `Check out this ${CATEGORY_META[house.category].takeTitle} on RENTBOX: ${house.location} — ₹${house.rentPrice.toLocaleString('en-IN')}/mo (${house.updatedTag}).`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    const link = document.createElement('a');
    link.href = waUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit Report for Fake or Rented-out House
  const handleConfirmReportHouse = (reason: 'Fake photo / listing' | 'Already rented out') => {
    if (!reportingHouse) return;
    setReportedHouseIds((prev) =>
      prev.includes(reportingHouse.id) ? prev : [...prev, reportingHouse.id]
    );
    setReportNotice(
      `Reported "${reportingHouse.location}" (${reason}). Admin will verify.`
    );
    setReportingHouse(null);
    setTimeout(() => setReportNotice(null), 4000);
  };

  // Submit Service Request (Rental Agreement / Packers & Movers)
  const handleSubmitServiceForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceFormName.trim() || !serviceFormPhone.trim() || !serviceFormCity.trim()) {
      return;
    }
    setServiceSubmittedMsg(
      `Request received for ${activeServiceModal}! We will call ${serviceFormPhone} in ${serviceFormCity}.`
    );
    setTimeout(() => {
      setServiceSubmittedMsg(null);
      setActiveServiceModal(null);
      setServiceFormName('');
      setServiceFormPhone('');
    }, 1800);
  };

  // Count-up animation when Home page opens
  useEffect(() => {
    if (currentPage !== 'home') return;
    const targetHouses = 148 + firestoreHouses.length;
    const targetHeroes = 64 + myHeroUploads.length;
    const targetPoints = 18400 + (profile?.points ?? 0);

    let frame = 0;
    const totalFrames = 30;
    const interval = setInterval(() => {
      frame += 1;
      const progress = Math.min(1, frame / totalFrames);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedCounts({
        houses: Math.round(targetHouses * eased),
        heroes: Math.round(targetHeroes * eased),
        points: Math.round(targetPoints * eased),
      });
      if (frame >= totalFrames) {
        clearInterval(interval);
      }
    }, 28);

    return () => clearInterval(interval);
  }, [currentPage, firestoreHouses.length, myHeroUploads.length, profile?.points]);

  // Active Rotating Ads List (Firestore Ads + Default 3 Ads unless removed)
  const activeAds = useMemo<AdSlideItem[]>(() => {
    const remainingDefaults = DEFAULT_AD_BANNERS.filter(
      (ad) => !removedDefaultAdIds.includes(ad.id)
    );
    return [...firestoreAds, ...remainingDefaults].slice(0, 3);
  }, [firestoreAds, removedDefaultAdIds]);

  // Rotate Top Hero Banner one by one every 3.5 seconds
  useEffect(() => {
    const heroTimer = setInterval(() => {
      setHeroBannerIndex((prev) => (prev + 1) % TOP_HERO_BANNERS.length);
    }, 3500);
    return () => clearInterval(heroTimer);
  }, []);

  // Rotate Ad Banner every 4 seconds
  useEffect(() => {
    if (activeAds.length <= 1) {
      setCurrentAdIndex(0);
      return;
    }
    const timer = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % activeAds.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [activeAds.length]);

  // Request GPS on mount or when selecting Hostel / Bachelor
  const refreshUserGps = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserGps({
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5)),
        });
        setGpsActive(true);
      },
      () => {
        setGpsActive(true);
      },
      { timeout: 4000 }
    );
  };

  // 1. Auth Listener & Profile Bootstrap (Saves 3-month freeUntil date and referralCode)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);

      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const threeMonthsMs = Date.now() + 90 * 24 * 60 * 60 * 1000;
        const generatedRefCode = `RBX${currentUser.uid.slice(0, 5).toUpperCase()}`;
        try {
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            const initialProfile = {
              uid: currentUser.uid,
              displayName: (currentUser.displayName || 'RENTBOX User').slice(0, 80),
              phone: '',
              hasPaidSeekerFee: false,
              hasPaidOwnerFee: false,
              points: 0,
              freeUntil: threeMonthsMs,
              referralCode: generatedRefCode,
              referredByCode: '',
              referralBonusCredited: false,
              rentedBonusCash: 0,
              agentArea: '',
              agentBonusPoints: 0,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            await setDoc(userRef, initialProfile);
          } else {
            const existingData = snap.data();
            if (!existingData.freeUntil || !existingData.referralCode) {
              await updateDoc(userRef, {
                freeUntil: existingData.freeUntil || threeMonthsMs,
                referralCode: existingData.referralCode || generatedRefCode,
                updatedAt: serverTimestamp(),
              });
            }
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        }
      } else {
        setProfile(null);
      }
    });
    return () => unsub();
  }, []);

  // 2. Real-time User Profile Subscription
  useEffect(() => {
    if (!authReady || !user) return;
    const userPath = `users/${user.uid}`;
    const unsub = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setProfile({
            uid: data.uid,
            displayName: data.displayName,
            phone: data.phone || '',
            hasPaidSeekerFee: Boolean(data.hasPaidSeekerFee),
            hasPaidOwnerFee: Boolean(data.hasPaidOwnerFee),
            points: Number(data.points || 0),
            freeUntil: Number(
              data.freeUntil || Date.now() + 90 * 24 * 60 * 60 * 1000
            ),
            referralCode:
              data.referralCode || `RBX${user.uid.slice(0, 5).toUpperCase()}`,
            referredByCode: data.referredByCode || '',
            referralBonusCredited: Boolean(data.referralBonusCredited),
            rentedBonusCash: Number(data.rentedBonusCash || 0),
            agentArea: data.agentArea || '',
            agentBonusPoints: Number(data.agentBonusPoints || 0),
          });
          if (data.phone && !houseOwnerPhone) {
            setHouseOwnerPhone(data.phone);
          }
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, userPath)
    );
    return () => unsub();
  }, [authReady, user]);

  // 3. Real-time Active Houses & Ads Subscription
  useEffect(() => {
    if (!authReady) return;
    const qHouses = query(collection(db, 'houses'), where('status', '==', 'active'));
    const unsubHouses = onSnapshot(
      qHouses,
      (snap) => {
        const list: HouseListingData[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          if (Array.isArray(d.photos) && d.photos.length > 0) {
            const cat: RentalCategory = ['family', 'commercial', 'hostel', 'bachelor'].includes(
              d.category
            )
              ? d.category
              : 'family';

            // Compute whether updated today or older ("Updated 2 days ago")
            let updatedLabel: 'Updated today' | 'Updated 2 days ago' = 'Updated today';
            if (d.updatedAt && typeof d.updatedAt.toMillis === 'function') {
              const ageHours = (Date.now() - d.updatedAt.toMillis()) / (1000 * 60 * 60);
              if (ageHours > 24) {
                updatedLabel = 'Updated 2 days ago';
              }
            }

            const reqText = String(d.requirements || '').toUpperCase();
            const inferredBhk: RoomBhkType = reqText.includes('3BHK')
              ? '3BHK'
              : reqText.includes('2BHK')
              ? '2BHK'
              : '1BHK';

            list.push({
              id: docSnap.id,
              ownerId: d.ownerId,
              ownerName: 'Verified Owner',
              updatedTag: updatedLabel,
              category: cat,
              bhk: inferredBhk,
              city: d.city,
              location: d.location,
              rentPrice: Number(d.rentPrice),
              photos: d.photos,
              requirements: d.requirements,
              terms: d.terms,
              latitude: Number(d.latitude ?? 12.9716),
              longitude: Number(d.longitude ?? 77.5946),
              status: d.status,
            });
          }
        });
        setFirestoreHouses(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'houses')
    );

    const qAds = query(collection(db, 'ads'), where('status', '==', 'active'));
    const unsubAds = onSnapshot(
      qAds,
      (snap) => {
        const list: AdSlideItem[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            title: d.title,
            imageUrl: d.imageUrl,
          });
        });
        setFirestoreAds(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'ads')
    );

    return () => {
      unsubHouses();
      unsubAds();
    };
  }, [authReady]);

  // 4. Fetch Unlocked Owner Phone Numbers when Seeker has Paid ₹49, or is Owner/Admin, or is viewing Bachelor/Hostel with verified phone
  useEffect(() => {
    if (!authReady || !user || !profile) return;
    const canViewAllPhones = profile.hasPaidSeekerFee || isAdminUser;
    const hasSeekerPhone = Boolean(
      profile.phone && profile.phone.replace(/\D/g, '').length >= 10
    );

    firestoreHouses.forEach(async (house) => {
      const isFreeCategory =
        house.category === 'bachelor' || house.category === 'hostel';
      if (
        canViewAllPhones ||
        house.ownerId === user.uid ||
        (isFreeCategory && hasSeekerPhone)
      ) {
        if (unlockedPhones[house.id]) return;
        const contactPath = `houses/${house.id}/contact/info`;
        try {
          const contactSnap = await getDoc(doc(db, 'houses', house.id, 'contact', 'info'));
          if (contactSnap.exists()) {
            const phone = contactSnap.data().ownerPhone;
            setUnlockedPhones((prev) => ({ ...prev, [house.id]: phone }));
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, contactPath);
        }
      }
    });
  }, [authReady, user, profile, firestoreHouses, isAdminUser]);

  // 5. Real-time Rental Hero Uploads & Scratch Cards Subscription
  useEffect(() => {
    if (!authReady || !user) {
      setMyHeroUploads([]);
      setScratchCards([]);
      setPendingAdminUploads([]);
      return;
    }

    const myUploadsQuery = query(
      collection(db, 'heroUploads'),
      where('userId', '==', user.uid)
    );
    const unsubUploads = onSnapshot(
      myUploadsQuery,
      (snap) => {
        const items: HeroUploadData[] = [];
        snap.forEach((d) => {
          const data = d.data();
          items.push({
            id: d.id,
            userId: data.userId,
            userName: data.userName,
            photoUrl: data.photoUrl,
            locationText: data.locationText,
            latitude: Number(data.latitude),
            longitude: Number(data.longitude),
            status: data.status,
            pointsAwarded: Number(data.pointsAwarded || 0),
          });
        });
        setMyHeroUploads(items);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'heroUploads')
    );

    const myCardsQuery = query(
      collection(db, 'scratchCards'),
      where('userId', '==', user.uid)
    );
    const unsubCards = onSnapshot(
      myCardsQuery,
      (snap) => {
        const cards: ScratchCardData[] = [];
        snap.forEach((d) => {
          const data = d.data();
          cards.push({
            id: d.id,
            userId: data.userId,
            uploadId: data.uploadId,
            rewardType: data.rewardType,
            rewardLabel: data.rewardLabel,
            rewardCode: data.rewardCode,
            isScratched: Boolean(data.isScratched),
          });
        });
        setScratchCards(cards);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'scratchCards')
    );

    let unsubAdmin: (() => void) | undefined;
    if (isAdminUser) {
      const adminQuery = query(collection(db, 'heroUploads'));
      unsubAdmin = onSnapshot(
        adminQuery,
        (snap) => {
          const allUploads: HeroUploadData[] = [];
          snap.forEach((d) => {
            const data = d.data();
            allUploads.push({
              id: d.id,
              userId: data.userId,
              userName: data.userName,
              photoUrl: data.photoUrl,
              locationText: data.locationText,
              latitude: Number(data.latitude),
              longitude: Number(data.longitude),
              status: data.status,
              pointsAwarded: Number(data.pointsAwarded || 0),
            });
          });
          setPendingAdminUploads(allUploads);
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'heroUploads')
      );
    }

    return () => {
      unsubUploads();
      unsubCards();
      if (unsubAdmin) unsubAdmin();
    };
  }, [authReady, user, isAdminUser]);

  // Combined Active Listings with Photos
  const allHousesWithPhotos = useMemo<HouseListingData[]>(() => {
    const demoMapped: HouseListingData[] = INITIAL_SHOWCASE_HOUSES.map((item) => ({
      id: item.id,
      ownerId: 'demo_owner',
      ownerName: item.ownerName,
      updatedTag: item.updatedTag,
      category: item.category,
      bhk: item.bhk,
      city: item.city,
      location: item.location,
      rentPrice: item.rentPrice,
      photos: item.photos,
      requirements: item.requirements,
      terms: item.terms,
      latitude: item.latitude,
      longitude: item.longitude,
      status: 'active',
      isDemo: true,
      demoPhone: item.ownerPhonePreview,
    }));
    return [...demoMapped, ...firestoreHouses].filter(
      (h) => h.status === 'active' && Array.isArray(h.photos) && h.photos.length > 0
    );
  }, [firestoreHouses]);

  // Recently Added 6 Showcase Houses (under 4500/-, 8000/-, 12000/-)
  const recentlyAddedShowcaseHouses = useMemo(
    () => allHousesWithPhotos.filter((h) => h.isDemo).slice(0, 6),
    [allHousesWithPhotos]
  );

  // Check if user is searching "Alwal"
  const isAlwalSearch = useMemo(
    () => searchQuery.trim().toLowerCase().includes('alwal'),
    [searchQuery]
  );

  const toggleNearbyLocality = (locality: string) => {
    setSelectedNearbyLocalities((prev) =>
      prev.includes(locality)
        ? prev.filter((item) => item !== locality)
        : [...prev, locality]
    );
  };

  // Category-Filtered & Rule-Sorted Listings for Take Rent
  const categoryListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const byCategory = allHousesWithPhotos.filter((h) => {
      if (h.category !== selectedTakeCategory) return false;

      // Filter by Rent Price (4500/-, 8000/-, 12000/-)
      if (selectedRentFilter !== 'all' && h.rentPrice > selectedRentFilter) {
        return false;
      }

      // Filter by Rent Rooms (1BHK, 2BHK, 3BHK)
      if (selectedBhkFilter !== 'all' && h.bhk !== selectedBhkFilter) {
        return false;
      }

      // Filter by Search Query + Nearby Localities (when Alwal or localities selected)
      if (!q && selectedNearbyLocalities.length === 0) return true;

      const hay = `${h.city} ${h.location}`.toLowerCase();
      const matchesQuery = q ? hay.includes(q) : false;
      const matchesNearby = selectedNearbyLocalities.some((loc) =>
        hay.includes(loc.toLowerCase())
      );

      // When searching "Alwal", also include Alwal's nearby localities if selected or by default
      if (q.includes('alwal')) {
        const activeLocalities =
          selectedNearbyLocalities.length > 0
            ? selectedNearbyLocalities
            : [...ALWAL_NEARBY_LOCALITIES];
        const matchesAlwalCluster =
          hay.includes('alwal') ||
          activeLocalities.some((loc) => hay.includes(loc.toLowerCase()));
        return matchesAlwalCluster;
      }

      return matchesQuery || matchesNearby;
    });

    if (selectedTakeCategory === 'hostel') {
      return [...byCategory].sort((a, b) => {
        const distA = getDistanceKm(userGps.lat, userGps.lng, a.latitude, a.longitude);
        const distB = getDistanceKm(userGps.lat, userGps.lng, b.latitude, b.longitude);
        return distA - distB;
      });
    }

    if (selectedTakeCategory === 'bachelor') {
      return [...byCategory].sort((a, b) => {
        if (a.rentPrice !== b.rentPrice) {
          return a.rentPrice - b.rentPrice;
        }
        const distA = getDistanceKm(userGps.lat, userGps.lng, a.latitude, a.longitude);
        const distB = getDistanceKm(userGps.lat, userGps.lng, b.latitude, b.longitude);
        return distA - distB;
      });
    }

    return byCategory;
  }, [
    allHousesWithPhotos,
    selectedTakeCategory,
    searchQuery,
    selectedRentFilter,
    selectedBhkFilter,
    selectedNearbyLocalities,
    userGps,
  ]);

  // Saved (Hearted) Houses
  const savedHousesList = useMemo(
    () => allHousesWithPhotos.filter((h) => savedHouseIds.includes(h.id)),
    [allHousesWithPhotos, savedHouseIds]
  );

  const selectedHouse = useMemo(
    () =>
      allHousesWithPhotos.find((h) => h.id === selectedHouseId) ||
      categoryListings[0] ||
      allHousesWithPhotos[0] ||
      null,
    [allHousesWithPhotos, categoryListings, selectedHouseId]
  );

  const myOwnerHouses = useMemo(
    () => (user ? firestoreHouses.filter((h) => h.ownerId === user.uid) : []),
    [firestoreHouses, user]
  );

  // Days left in the 3-month (90 days) Free for Owners period
  const freeOwnerDaysLeft = useMemo(() => {
    const targetMs =
      profile?.freeUntil || Date.now() + 90 * 24 * 60 * 60 * 1000;
    const diffDays = Math.ceil((targetMs - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }, [profile?.freeUntil]);

  const isOwnerFreeActive = freeOwnerDaysLeft > 0;

  // Matching rental properties for the current Hyderabad SEO keyword page
  const seoMatchedListings = useMemo(() => {
    if (!activeSeoPage) return [];
    const filtered = allHousesWithPhotos.filter((h) => {
      if (activeSeoPage.areaFilter) {
        const hay = `${h.city} ${h.location} ${h.requirements}`.toLowerCase();
        if (!hay.includes(activeSeoPage.areaFilter.toLowerCase())) {
          return false;
        }
      }
      if (activeSeoPage.bhkFilter && h.bhk !== activeSeoPage.bhkFilter) {
        return false;
      }
      if (
        activeSeoPage.maxRentFilter &&
        h.rentPrice > activeSeoPage.maxRentFilter
      ) {
        return false;
      }
      return true;
    });
    return filtered.length > 0 ? filtered : allHousesWithPhotos.slice(0, 6);
  }, [activeSeoPage, allHousesWithPhotos]);

  // Handlers
  const handleSelectTakeOption = (cat: RentalCategory) => {
    setSelectedTakeCategory(cat);
    if (cat === 'hostel' || cat === 'bachelor') {
      refreshUserGps();
    }
    setCurrentPage('search');
  };

  const handleSelectGiveOption = (cat: RentalCategory) => {
    setEditingHouseId(null);
    setHouseCategory(cat);
    const defaultImg =
      cat === 'family'
        ? STOCK_FREE_HOME_IMAGES.family1
        : cat === 'commercial'
        ? STOCK_FREE_HOME_IMAGES.commercial1
        : cat === 'hostel'
        ? STOCK_FREE_HOME_IMAGES.hostel1
        : STOCK_FREE_HOME_IMAGES.bachelor1;
    setHousePhotos([defaultImg]);
    setOwnerFormMsg(null);
    setCurrentPage('owner');
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      if (currentPage === 'login') {
        setCurrentPage('home');
      }
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  const handlePaymentSuccess = async (
    method: 'upi' | 'razorpay',
    referenceId: string
  ) => {
    if (!user || !profile) {
      await handleGoogleSignIn();
      return;
    }
    const paymentId = `pay_${Date.now()}`;
    const paymentPath = `payments/${paymentId}`;
    const userPath = `users/${user.uid}`;

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'payments', paymentId), {
        userId: user.uid,
        paymentType: paymentModal.purpose,
        amount: 49,
        method,
        referenceId,
        status: 'completed',
        createdAt: serverTimestamp(),
      });

      batch.update(doc(db, 'users', user.uid), {
        hasPaidSeekerFee:
          paymentModal.purpose === 'seeker_fee' ? true : profile.hasPaidSeekerFee,
        hasPaidOwnerFee:
          paymentModal.purpose === 'owner_fee' ? true : profile.hasPaidOwnerFee,
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${paymentPath} & ${userPath}`);
    }
  };

  // Ad Banner Upload / Remove Handlers
  const handleAdPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const compressed = await compressImageFile(files[0]);
      setNewAdImage(compressed);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = (newAdTitle.trim() || 'Featured Partner Offer').slice(0, 100);
    if (isAdminUser) {
      setUploadingAd(true);
      const adId = `ad_${Date.now()}`;
      try {
        await setDoc(doc(db, 'ads', adId), {
          title: cleanTitle,
          imageUrl: newAdImage,
          status: 'active',
          createdAt: serverTimestamp(),
        });
        setNewAdTitle('');
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `ads/${adId}`);
      } finally {
        setUploadingAd(false);
      }
    }
  };

  const handleRemoveAd = async (ad: AdSlideItem) => {
    if (ad.isDefault) {
      setRemovedDefaultAdIds((prev) => [...prev, ad.id]);
      setCurrentAdIndex(0);
      return;
    }
    if (!isAdminUser) return;
    try {
      await deleteDoc(doc(db, 'ads', ad.id));
      setCurrentAdIndex(0);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `ads/${ad.id}`);
    }
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = phoneInput.replace(/\D/g, '');
    if (cleaned.length < 10) {
      setOtpStatusMsg('Enter a valid 10-digit mobile number.');
      return;
    }
    setOtpSent(true);
    setOtpInput('4920');
    setOtpStatusMsg('OTP sent! Demo code 4920 pre-filled.');
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (otpInput.trim().length < 4) {
      setOtpStatusMsg('Enter the 4-digit OTP.');
      return;
    }
    const cleanedPhone = phoneInput.replace(/\D/g, '').slice(-10);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        phone: `+91 ${cleanedPhone}`,
        updatedAt: serverTimestamp(),
      });
      setHouseOwnerPhone(`+91 ${cleanedPhone}`);
      setOtpStatusMsg('Phone number verified.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleHousePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const compressed = await compressImageFile(files[0]);
      setHousePhotos((prev) => [compressed, ...prev.slice(0, 2)]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveHouseListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    if (!profile.hasPaidOwnerFee && !isOwnerFreeActive) {
      setPaymentModal({ isOpen: true, purpose: 'owner_fee' });
      return;
    }

    const cleanCity = houseCity.trim().slice(0, 60);
    const cleanLocation = houseLocation.trim().slice(0, 120);
    const cleanReq = (
      houseRequirements.trim() || 'Direct owner listing, ready to move in.'
    ).slice(0, 500);
    const cleanTerms = (houseTerms.trim() || '11 months rental agreement.').slice(
      0,
      500
    );
    const cleanPhone = (
      houseOwnerPhone.trim() ||
      profile.phone ||
      '+91 9876543210'
    ).slice(0, 15);
    const parsedRent = Math.max(500, Math.min(10000000, Number(houseRent) || 12000));
    const validPhotos =
      housePhotos.length > 0
        ? housePhotos.slice(0, 3)
        : [CATEGORY_DEFAULT_PHOTOS[houseCategory]];

    if (cleanCity.length < 2 || cleanLocation.length < 2) {
      setOwnerFormMsg('Please enter both City and Area Location.');
      return;
    }

    setSavingHouse(true);
    setOwnerFormMsg(null);
    const targetHouseId = editingHouseId || `house_${Date.now()}`;

    try {
      const batch = writeBatch(db);
      const houseRef = doc(db, 'houses', targetHouseId);
      const contactRef = doc(db, 'houses', targetHouseId, 'contact', 'info');

      if (editingHouseId) {
        batch.update(houseRef, {
          category: houseCategory,
          city: cleanCity,
          location: cleanLocation,
          rentPrice: parsedRent,
          photos: validPhotos,
          requirements: cleanReq,
          terms: cleanTerms,
          latitude: userGps.lat,
          longitude: userGps.lng,
          status: 'active',
          updatedAt: serverTimestamp(),
        });
        batch.update(contactRef, {
          ownerPhone: cleanPhone,
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.set(houseRef, {
          ownerId: user.uid,
          category: houseCategory,
          city: cleanCity,
          location: cleanLocation,
          rentPrice: parsedRent,
          photos: validPhotos,
          requirements: cleanReq,
          terms: cleanTerms,
          latitude: userGps.lat,
          longitude: userGps.lng,
          status: 'active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        batch.set(contactRef, {
          houseId: targetHouseId,
          ownerId: user.uid,
          ownerPhone: cleanPhone,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
      setEditingHouseId(null);
      setHouseLocation('');
      setHouseRequirements('');
      setHouseTerms('');
      setOwnerFormMsg(
        editingHouseId
          ? 'Listing updated!'
          : `Listed under ${CATEGORY_META[houseCategory].takeTitle} in Take Rent!`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `houses/${targetHouseId}`);
    } finally {
      setSavingHouse(false);
    }
  };

  const handleStartEditHouse = (house: HouseListingData) => {
    setEditingHouseId(house.id);
    setHouseCategory(house.category);
    setHouseCity(house.city);
    setHouseLocation(house.location);
    setHouseRent(String(house.rentPrice));
    setHouseRequirements(house.requirements);
    setHouseTerms(house.terms);
    setHousePhotos(house.photos);
    if (unlockedPhones[house.id]) {
      setHouseOwnerPhone(unlockedPhones[house.id]);
    }
  };

  const handleRemoveHouse = async (houseId: string) => {
    try {
      await deleteDoc(doc(db, 'houses', houseId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `houses/${houseId}`);
    }
  };

  const handleDetectGps = () => {
    setGpsStatus('Fetching GPS coordinates...');
    if (!navigator.geolocation) {
      setHeroCoords({ lat: 12.9784, lng: 77.6408 });
      setGpsStatus('GPS locked: 12.9784° N, 77.6408° E');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        setHeroCoords({ lat, lng });
        setGpsStatus(`GPS locked: ${lat}° N, ${lng}° E`);
      },
      () => {
        setHeroCoords({ lat: 12.9784, lng: 77.6408 });
        setGpsStatus('GPS locked: 12.9784° N, 77.6408° E (Indiranagar)');
      },
      { timeout: 5000 }
    );
  };

  const handleHeroPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const compressed = await compressImageFile(files[0]);
      setHeroPhoto(compressed);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitHeroUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) {
      setCurrentPage('login');
      return;
    }
    const cleanLoc = (
      heroLocationText.trim() || '12th Main Road, Indiranagar'
    ).slice(0, 140);
    setUploadingHero(true);
    setHeroMsg(null);
    const uploadId = `hero_${Date.now()}`;

    try {
      await setDoc(doc(db, 'heroUploads', uploadId), {
        userId: user.uid,
        userName: profile.displayName.slice(0, 80),
        photoUrl: heroPhoto,
        locationText: cleanLoc,
        latitude: heroCoords.lat,
        longitude: heroCoords.lng,
        status: 'pending',
        pointsAwarded: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setHeroLocationText('');
      setHeroMsg('Uploaded! Admin will review & credit 100 points + Scratch Card.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `heroUploads/${uploadId}`);
    } finally {
      setUploadingHero(false);
    }
  };

  const handleAdminReviewUpload = async (
    upload: HeroUploadData,
    decision: 'approved' | 'rejected'
  ) => {
    if (!isAdminUser) return;
    const uploadRef = doc(db, 'heroUploads', upload.id);
    const uploaderRef = doc(db, 'users', upload.userId);
    const cardId = `card_${upload.id}`;
    const rewardPick = REWARD_POOL[Math.floor(Math.random() * REWARD_POOL.length)];

    try {
      const uploaderSnap = await getDoc(uploaderRef);
      const currentPoints = uploaderSnap.exists()
        ? Number(uploaderSnap.data().points || 0)
        : 0;

      const batch = writeBatch(db);
      batch.update(uploadRef, {
        status: decision,
        pointsAwarded: decision === 'approved' ? 100 : 0,
        updatedAt: serverTimestamp(),
      });

      if (decision === 'approved') {
        if (uploaderSnap.exists()) {
          batch.update(uploaderRef, {
            points: currentPoints + 100,
            updatedAt: serverTimestamp(),
          });
        }
        batch.set(doc(db, 'scratchCards', cardId), {
          userId: upload.userId,
          uploadId: upload.id,
          rewardType: rewardPick.type,
          rewardLabel: rewardPick.label,
          rewardCode: `${rewardPick.codePrefix}-${Date.now().toString().slice(-4)}`,
          isScratched: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `heroUploads/${upload.id}`);
    }
  };

  const handleScratchCard = async (cardId: string) => {
    try {
      await updateDoc(doc(db, 'scratchCards', cardId), {
        isScratched: true,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `scratchCards/${cardId}`);
    }
  };

  const hasVerifiedSeekerPhone = Boolean(
    user && profile?.phone && profile.phone.replace(/\D/g, '').length >= 10
  );

  const isFreeSeekerCategory = (cat: RentalCategory): boolean =>
    cat === 'bachelor' || cat === 'hostel';

  const isPhoneUnlocked = (house: HouseListingData): boolean =>
    Boolean(
      profile?.hasPaidSeekerFee ||
        (user && house.ownerId === user.uid) ||
        isAdminUser ||
        (isFreeSeekerCategory(house.category) && hasVerifiedSeekerPhone)
    );

  const getDisplayedOwnerPhone = (house: HouseListingData): string => {
    if (!isPhoneUnlocked(house)) {
      return '+91 ••••• •••••';
    }
    if (house.isDemo) {
      return house.demoPhone || '+91 98450 71234';
    }
    return unlockedPhones[house.id] || '+91 98450 71234';
  };

  const handleSaveFreeSeekerPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      await handleGoogleSignIn();
      return;
    }
    const cleaned = freeSeekerPhoneInput.replace(/\D/g, '');
    if (cleaned.length < 10) {
      setFreeSeekerError('Please enter a valid 10-digit mobile number.');
      return;
    }
    const formattedPhone = `+91 ${cleaned.slice(-10)}`;
    setFreeSeekerSaving(true);
    setFreeSeekerError(null);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        phone: formattedPhone,
        updatedAt: serverTimestamp(),
      });
      setHouseOwnerPhone(formattedPhone);
      setFreeSeekerModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setFreeSeekerSaving(false);
    }
  };

  const currentAd = activeAds[currentAdIndex] || activeAds[0] || null;

  // Reusable House Card Renderer (Used in Search & Saved pages)
  const renderHouseCard = (house: HouseListingData) => {
    const unlocked = isPhoneUnlocked(house);
    const isSaved = savedHouseIds.includes(house.id);
    const isReported = reportedHouseIds.includes(house.id);
    const distanceKm = getDistanceKm(
      userGps.lat,
      userGps.lng,
      house.latitude,
      house.longitude
    );
    const showDetailsOnCard =
      house.category === 'family' || house.category === 'commercial';

    return (
      <div
        key={house.id}
        className="rounded-3xl border border-[#DCEAD7] bg-white overflow-hidden flex flex-col justify-between hover:border-[#417545] transition-colors shadow-xs"
      >
        <div>
          {/* Photo + Top Row Overlay with "Updated today / 2 days ago" & 3 Action Icons */}
          <div className="relative aspect-[4/3] w-full bg-[#EAF4E7] overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setSelectedHouseId(house.id);
                setCurrentPage('detail');
              }}
              className="block w-full h-full cursor-pointer"
            >
              <img
                src={house.photos[0]}
                alt={house.location}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    CATEGORY_DEFAULT_PHOTOS[house.category];
                }}
                className="w-full h-full object-cover"
              />
            </button>

            {/* 1. "Updated today" or "Updated 2 days ago" tag on every house card */}
            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#417545] shadow-xs">
              {house.updatedTag}
            </div>

            {/* 2. Three small icons on every house card: Heart (save), Share (WhatsApp), Report */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => handleToggleSaveHouse(house.id, e)}
                aria-label="Save house"
                className={`w-9 h-9 rounded-full bg-white/95 backdrop-blur-xs flex items-center justify-center shadow-xs transition-colors cursor-pointer ${
                  isSaved ? 'text-red-500' : 'text-[#141A15] hover:text-[#417545]'
                }`}
              >
                <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              </button>
              <button
                type="button"
                onClick={(e) => handleShareWhatsApp(house, e)}
                aria-label="Share on WhatsApp"
                className="w-9 h-9 rounded-full bg-white/95 backdrop-blur-xs text-[#141A15] hover:text-[#417545] flex items-center justify-center shadow-xs transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setReportingHouse(house);
                }}
                aria-label="Report fake or rented-out house"
                className={`w-9 h-9 rounded-full bg-white/95 backdrop-blur-xs flex items-center justify-center shadow-xs transition-colors cursor-pointer ${
                  isReported ? 'text-amber-600' : 'text-[#5C6B5E] hover:text-red-600'
                }`}
              >
                <Flag className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Card Body */}
          <button
            type="button"
            onClick={() => {
              setSelectedHouseId(house.id);
              setCurrentPage('detail');
            }}
            className="text-left block w-full p-5 pb-3 cursor-pointer"
          >
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold font-mono tabular-nums text-[#417545]">
                  ₹{house.rentPrice}/-
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[#EAF4E7] border border-[#DCEAD7] text-[11px] font-bold text-[#417545]">
                  {house.bhk}
                </span>
              </div>
              <span className="text-xs text-[#5C6B5E]">
                {house.category === 'hostel' || house.category === 'bachelor'
                  ? `${distanceKm} km away`
                  : house.city}
              </span>
            </div>

            <p className="text-sm font-semibold text-[#141A15] mt-1.5 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#417545] shrink-0" />
              <span className="truncate">{house.location}</span>
            </p>

            {/* 6. Owner Name + Green verified tick after ₹49 fee is paid */}
            <div className="flex items-center gap-1.5 mt-2 text-xs text-[#5C6B5E]">
              <span>Owner:</span>
              <span className="font-semibold text-[#141A15]">{house.ownerName}</span>
              {unlocked && (
                <span
                  title="Verified Owner (₹49 Paid)"
                  className="inline-flex items-center gap-0.5 text-[#417545] font-semibold"
                >
                  <BadgeCheck className="w-4 h-4 fill-[#417545] text-white" />
                </span>
              )}
            </div>

            {showDetailsOnCard && (
              <p className="text-xs text-[#5C6B5E] mt-1.5 line-clamp-2">
                {house.requirements}
              </p>
            )}
          </button>
        </div>

        {/* Owner Phone Number Row */}
        <div className="px-5 pb-5 pt-3 border-t border-[#EAF4E7] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <Phone className="w-4 h-4 text-[#417545] shrink-0" />
            <span className="font-mono tabular-nums font-semibold text-[#141A15]">
              {getDisplayedOwnerPhone(house)}
            </span>
          </div>
          {!unlocked ? (
            <button
              type="button"
              onClick={() => {
                if (isFreeSeekerCategory(house.category)) {
                  setFreeSeekerError(null);
                  setFreeSeekerPhoneInput(
                    profile?.phone ? profile.phone.replace(/^\+91\s*/, '') : ''
                  );
                  setFreeSeekerModalOpen(true);
                  return;
                }
                if (!user) {
                  setCurrentPage('login');
                } else {
                  setPaymentModal({
                    isOpen: true,
                    purpose: 'seeker_fee',
                  });
                }
              }}
              className="min-h-[38px] px-4 py-1.5 rounded-full bg-[#417545] hover:bg-[#356139] text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
            >
              {isFreeSeekerCategory(house.category)
                ? user
                  ? 'Enter Phone (Free)'
                  : 'Login to View (Free)'
                : 'Pay ₹49'}
            </button>
          ) : (
            <span className="text-xs font-semibold text-[#417545]">Unlocked</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white text-[#141A15] pb-24 md:pb-0 flex flex-col justify-between">
      <div>
        {/* Reference Image Soft Botanical Green Top Wash */}
        <div className="bg-gradient-to-b from-[#DCEAD7] via-[#EAF4E7] to-white">
          {/* 7. ONLY ONE LOGO at top inside the header (no duplicate top-left logo below) */}
          <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-[#DCEAD7]">
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-8 px-6 py-3.5">
              {/* Zone 1: Single Brand Logo + Tagline */}
              <button
                type="button"
                onClick={() => setCurrentPage('home')}
                className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 cursor-pointer"
              >
                <img
                  src="/assets/aistudio/rentalbox_288054f0.png"
                  alt="RENTBOX Logo"
                  className="w-9 h-9 object-contain shrink-0"
                />
                <div>
                  <span className="block text-lg font-bold tracking-tight text-[#141A15] leading-none">
                    RENT<span className="text-[#00B353]">BOX</span>
                  </span>
                  <span className="block text-[11px] font-medium text-[#417545] mt-0.5">
                    Your home, in a box{showTelugu ? ' · మీ ఇల్లు, ఒకే బాక్స్‌లో' : ''}
                  </span>
                </div>
              </button>

              {/* Zone 2: Show ONLY Take Rent, Give Rent, Heroes with filled color button style (Home removed) */}
              <nav className="hidden md:flex items-center gap-3 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setCurrentPage('take_options')}
                  className={`min-h-[40px] px-4 py-2 rounded-full text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs ${
                    currentPage === 'take_options' ||
                    currentPage === 'search' ||
                    currentPage === 'detail'
                      ? 'bg-[#00B353]'
                      : 'bg-[#417545] hover:bg-[#356139]'
                  }`}
                >
                  Take Rent
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage('give_options')}
                  className={`min-h-[40px] px-4 py-2 rounded-full text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs ${
                    currentPage === 'give_options' || currentPage === 'owner'
                      ? 'bg-[#00B353]'
                      : 'bg-[#417545] hover:bg-[#356139]'
                  }`}
                >
                  Give Rent
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage('hero')}
                  className={`min-h-[40px] px-4 py-2 rounded-full text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs ${
                    currentPage === 'hero'
                      ? 'bg-[#00B353]'
                      : 'bg-[#417545] hover:bg-[#356139]'
                  }`}
                >
                  Heroes
                </button>
              </nav>

              {/* Zone 3: Telugu Toggle (తె ON) + Homepage button + Sign In + 3-Lines Menu */}
              <div className="relative flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowTelugu((prev) => !prev)}
                  aria-label="Toggle Telugu"
                  className={`min-h-[40px] px-3 py-1.5 rounded-full border text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    showTelugu
                      ? 'bg-[#EAF4E7] border-[#417545] text-[#417545]'
                      : 'border-[#DCEAD7] bg-white text-[#5C6B5E] hover:bg-[#F5FAF3]'
                  }`}
                >
                  {showTelugu ? 'తె ON' : 'తె OFF'}
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage('home')}
                  aria-label="Homepage"
                  className={`min-h-[42px] px-3.5 py-2 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    currentPage === 'home' && !activeSeoPage
                      ? 'bg-[#EAF4E7] border-[#417545] text-[#417545]'
                      : 'border-[#DCEAD7] bg-white hover:bg-[#EAF4E7] text-[#417545]'
                  }`}
                >
                  <HomeIcon className="w-3.5 h-3.5" />
                  <span>Home</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage('login')}
                  className="min-h-[42px] px-4 py-2 text-xs font-semibold text-white bg-[#417545] rounded-full hover:bg-[#356139] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {user ? `${profile?.points ?? 0} pts` : 'Sign In'}
                </button>

                {/* 3-Lines Menu Icon at the Top Right Corner */}
                <button
                  type="button"
                  onClick={() => setShowTopRightServicesMenu((prev) => !prev)}
                  aria-label="Open menu"
                  className="min-h-[42px] min-w-[42px] rounded-xl border border-[#DCEAD7] bg-white hover:bg-[#EAF4E7] text-[#141A15] flex items-center justify-center transition-colors cursor-pointer"
                >
                  {showTopRightServicesMenu ? (
                    <X className="w-5 h-5 text-[#417545]" />
                  ) : (
                    <Menu className="w-5 h-5 text-[#417545]" />
                  )}
                </button>

                {/* Top-Right Corner 3-Lines Dropdown Drawer */}
                {showTopRightServicesMenu && (
                  <div className="absolute right-0 top-14 z-50 w-80 rounded-3xl border border-[#DCEAD7] bg-white p-4 shadow-xl space-y-2.5">
                    <div className="flex items-center justify-between px-1 pb-1 border-b border-[#EAF4E7]">
                      <span className="text-xs font-bold text-[#417545]">
                        Menu & Our Services{showTelugu ? ' · మా సేవలు' : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowTopRightServicesMenu(false)}
                        className="text-xs text-[#5C6B5E] hover:text-[#141A15] cursor-pointer"
                      >
                        Close
                      </button>
                    </div>

                    {/* Saved Button moved inside 3-lines menu (No Telugu on buttons) */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowTopRightServicesMenu(false);
                        setCurrentPage('saved');
                      }}
                      className="w-full rounded-2xl border border-[#DCEAD7] bg-[#F9FCF8] hover:border-[#417545] p-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#EAF4E7] text-[#417545] flex items-center justify-center shrink-0">
                          <Heart className="w-4 h-4 fill-[#417545]" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#141A15]">
                            Saved Houses ({savedHouseIds.length})
                          </p>
                          <p className="text-[11px] text-[#5C6B5E]">
                            View your saved listings
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#5C6B5E]" />
                    </button>

                    {/* Open Filter Sidebar Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowTopRightServicesMenu(false);
                        setShowFilterSidebar(true);
                      }}
                      className="w-full rounded-2xl border border-[#DCEAD7] bg-[#F9FCF8] hover:border-[#417545] p-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#EAF4E7] text-[#417545] flex items-center justify-center shrink-0">
                          <SearchIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#141A15]">
                            Filter Rent & Rooms
                          </p>
                          <p className="text-[11px] text-[#5C6B5E]">
                            Rent Price & Rooms (1BHK, 2BHK, 3BHK)
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#5C6B5E]" />
                    </button>

                    {/* Service 1: Rental Agreement */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowTopRightServicesMenu(false);
                        setServiceSubmittedMsg(null);
                        setActiveServiceModal('Rental Agreement');
                      }}
                      className="w-full rounded-2xl border border-[#DCEAD7] bg-[#F9FCF8] hover:border-[#417545] p-3 flex items-center gap-3 text-left transition-colors cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[#EAF4E7] text-[#417545] flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#141A15]">
                          Rental Agreement
                        </p>
                        <p className="text-[11px] text-[#5C6B5E]">Quick online agreement</p>
                      </div>
                    </button>

                    {/* Service 2: Packers & Movers */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowTopRightServicesMenu(false);
                        setServiceSubmittedMsg(null);
                        setActiveServiceModal('Packers & Movers');
                      }}
                      className="w-full rounded-2xl border border-[#DCEAD7] bg-[#F9FCF8] hover:border-[#417545] p-3 flex items-center gap-3 text-left transition-colors cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[#EAF4E7] text-[#417545] flex items-center justify-center shrink-0">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#141A15]">
                          Packers & Movers
                        </p>
                        <p className="text-[11px] text-[#5C6B5E]">Safe house shifting</p>
                      </div>
                    </button>

                    {/* Service 3: Click & Earn */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowTopRightServicesMenu(false);
                        setCurrentPage('hero');
                      }}
                      className="w-full rounded-2xl border border-[#417545] bg-[#EAF4E7] hover:bg-[#DCEAD7] p-3 flex items-center gap-3 text-left transition-colors cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[#417545] text-white flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#141A15]">
                          Click & Earn
                        </p>
                        <p className="text-[11px] font-semibold text-[#417545]">
                          Earn 100 points
                        </p>
                      </div>
                    </button>

                    {/* Separate Button in 3-lines section with small text size */}
                    <div className="pt-1 border-t border-[#EAF4E7] space-y-2">
                      <button
                        type="button"
                        onClick={() =>
                          setShowPopularSearchesInMenu((prev) => !prev)
                        }
                        className="w-full rounded-xl border border-[#DCEAD7] bg-[#F5FAF3] hover:border-[#417545] px-3 py-2 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
                      >
                        <span className="text-[11px] font-semibold text-[#417545] truncate">
                          Popular Searches in Hyderabad
                        </span>
                        <ChevronRight
                          className={`w-3.5 h-3.5 text-[#417545] transition-transform shrink-0 ${
                            showPopularSearchesInMenu ? 'rotate-90' : ''
                          }`}
                        />
                      </button>

                      {showPopularSearchesInMenu && (
                        <PopularSearchesSection
                          currentSlug={activeSeoPage?.slug}
                          onSelectLink={() => {
                            setShowTopRightServicesMenu(false);
                            setShowPopularSearchesInMenu(false);
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>
        </div>

        {/* Report Confirmation Banner if triggered */}
        {reportNotice && (
          <div className="max-w-5xl mx-auto px-6 pt-4">
            <div className="rounded-2xl bg-[#EAF4E7] border border-[#417545]/30 px-4 py-3 text-xs font-semibold text-[#417545] flex items-center justify-between">
              <span>{reportNotice}</span>
              <button
                type="button"
                onClick={() => setReportNotice(null)}
                className="text-[#141A15] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main Content Container */}
        <main className="max-w-5xl mx-auto px-6 pt-6 pb-12">
          {/* DEDICATED HYDERABAD SEO KEYWORD PAGE (When URL matches any of the 47 SEO slugs) */}
          {activeSeoPage && (
            <div className="space-y-8">
              <div className="rounded-3xl border border-[#DCEAD7] bg-[#F5FAF3] p-6 sm:p-8 space-y-3 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#DCEAD7] text-xs font-bold text-[#417545]">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Hyderabad Verified Rentals · నో బ్రోకర్</span>
                  </span>
                  <Link
                    to="/"
                    className="text-xs font-semibold text-[#417545] hover:underline"
                  >
                    ← Back to RENTBOX Home
                  </Link>
                </div>

                {/* Single H1 with the exact keyword */}
                <h1 className="text-2xl sm:text-3xl font-bold text-[#141A15]">
                  {activeSeoPage.h1}
                </h1>

                {/* Short 2-line intro in simple English */}
                <div className="text-sm text-[#5C6B5E] space-y-1 leading-relaxed max-w-3xl">
                  <p>{activeSeoPage.introLine1}</p>
                  <p>{activeSeoPage.introLine2}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[#141A15]">
                    Matching Rental Properties ({seoMatchedListings.length})
                  </h2>
                  <button
                    type="button"
                    onClick={() => setCurrentPage('search')}
                    className="text-xs font-bold text-[#417545] hover:underline cursor-pointer"
                  >
                    Open Full Filter Search →
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {seoMatchedListings.map((house) => renderHouseCard(house))}
                </div>
              </div>
            </div>
          )}

          {/* PAGE 1: HOME SCREEN (Only when not viewing a dedicated SEO keyword page) */}
          {!activeSeoPage && currentPage === 'home' && (
            <div className="space-y-8">
              {/* 1. TOP BANNER SLIDESHOW (Includes the newly attached homepage-banner_b2030f63.png sliding one by one) */}
              <section className="relative rounded-3xl overflow-hidden border border-[#DCEAD7] bg-[#F1F9F1] shadow-xs">
                <div className="grid grid-cols-1">
                  {TOP_HERO_BANNERS.map((banner, idx) => (
                    <button
                      key={banner.id}
                      type="button"
                      onClick={() => {
                        if (banner.category) {
                          handleSelectTakeOption(banner.category);
                        } else {
                          setCurrentPage(banner.targetPage);
                        }
                      }}
                      aria-label={banner.alt}
                      className={`col-start-1 row-start-1 w-full block text-left cursor-pointer overflow-hidden transition-opacity duration-500 ${
                        idx === heroBannerIndex
                          ? 'opacity-100 z-10'
                          : 'opacity-0 pointer-events-none z-0'
                      }`}
                    >
                      <img
                        src={banner.imageUrl}
                        alt={banner.alt}
                        className="w-full h-auto object-cover block"
                      />
                    </button>
                  ))}
                </div>

                {/* Slide Indicator Dots */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-white/80 backdrop-blur-xs px-3 py-1.5 rounded-full border border-[#DCEAD7]">
                  {TOP_HERO_BANNERS.map((banner, idx) => (
                    <button
                      key={banner.id}
                      type="button"
                      onClick={() => setHeroBannerIndex(idx)}
                      aria-label={`Banner slide ${idx + 1}`}
                      className={`h-2 rounded-full transition-opacity cursor-pointer ${
                        idx === heroBannerIndex
                          ? 'w-6 bg-[#00B353]'
                          : 'w-2 bg-[#417545]/40'
                      }`}
                    />
                  ))}
                </div>
              </section>

              {/* 6. 6-IMAGE SHOWCASE BANNER FOR RECENTLY ADDED HOUSES (Under 4500/-, 8000/-, 12000/-) */}
              <section className="rounded-3xl border border-[#DCEAD7] bg-[#F5FAF3] p-4 sm:p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-[#141A15]">
                      Recently Added Houses{showTelugu ? ' · కొత్తగా చేర్చిన ఇళ్లు' : ''}
                    </h2>
                    <p className="text-xs text-[#5C6B5E]">
                      Under 4500/-, 8000/-, 12000/-
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentPage('search')}
                    className="text-xs font-semibold text-[#417545] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
                  {recentlyAddedShowcaseHouses.map((house) => (
                    <button
                      key={house.id}
                      type="button"
                      onClick={() => {
                        setSelectedHouseId(house.id);
                        setCurrentPage('detail');
                      }}
                      className="group relative rounded-2xl overflow-hidden border border-[#DCEAD7] bg-white aspect-[4/3] text-left cursor-pointer"
                    >
                      <img
                        src={house.photos[0]}
                        alt={house.location}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            CATEGORY_DEFAULT_PHOTOS[house.category];
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <span className="absolute top-2 left-2 bg-white/95 px-2 py-0.5 rounded-md text-[10px] font-bold text-[#417545]">
                        {house.bhk}
                      </span>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-2.5 sm:p-3">
                        <p className="text-white font-bold font-mono text-xs sm:text-base leading-tight">
                          {house.rentPrice}/-
                        </p>
                        <p className="text-white/90 text-[10px] sm:text-xs truncate">
                          {house.location}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              {/* HOME SEARCH BOX (Filter Rent Price & Rooms moved to Sidebar option) */}
              <section className="rounded-3xl border border-[#DCEAD7] bg-white p-5 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <SearchIcon className="w-5 h-5 text-[#5C6B5E] absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search city or area (e.g. Alwal)..."
                      className="w-full h-12 pl-12 pr-4 rounded-2xl border border-[#DCEAD7] bg-[#F5FAF3] text-sm text-[#141A15] placeholder:text-[#5C6B5E] focus:bg-white focus:outline-none focus:border-[#417545]"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('Alwal');
                        setCurrentPage('search');
                      }}
                      className="min-h-[44px] px-4 rounded-2xl bg-[#EAF4E7] border border-[#DCEAD7] text-xs font-semibold text-[#417545] hover:bg-[#DCEAD7] cursor-pointer whitespace-nowrap"
                    >
                      Search Alwal
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFilterSidebar(true)}
                      className="min-h-[44px] px-4 rounded-2xl bg-[#F5FAF3] border border-[#DCEAD7] text-xs font-bold text-[#141A15] hover:bg-[#EAF4E7] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Menu className="w-4 h-4 text-[#417545]" />
                      <span>
                        Filters
                        {selectedRentFilter !== 'all' ||
                        selectedBhkFilter !== 'all'
                          ? ` (${
                              selectedRentFilter !== 'all'
                                ? `<${selectedRentFilter}`
                                : ''
                            }${
                              selectedRentFilter !== 'all' &&
                              selectedBhkFilter !== 'all'
                                ? ', '
                                : ''
                            }${
                              selectedBhkFilter !== 'all'
                                ? selectedBhkFilter
                                : ''
                            })`
                          : ''}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage('search')}
                      className="min-h-[44px] px-5 rounded-2xl bg-[#417545] hover:bg-[#356139] text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                    >
                      Search Houses
                    </button>
                  </div>
                </div>

                {/* Alwal Nearby Localities Light Box when "Alwal" is typed */}
                {isAlwalSearch && (
                  <div className="rounded-2xl bg-[#F5FAF3] border border-[#DCEAD7] p-4 space-y-2">
                    <p className="text-xs font-semibold text-[#5C6B5E]">
                      Add more...
                    </p>
                    <p className="text-xs font-bold text-[#417545]">
                      Nearby Localities :
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {ALWAL_NEARBY_LOCALITIES.map((locality) => {
                        const isSelected =
                          selectedNearbyLocalities.includes(locality);
                        return (
                          <button
                            key={locality}
                            type="button"
                            onClick={() => {
                              toggleNearbyLocality(locality);
                              setCurrentPage('search');
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#DCEAD7] border-[#417545] text-[#141A15]'
                                : 'bg-[#EAF4E7]/70 border-[#DCEAD7] text-[#417545] hover:bg-[#EAF4E7]'
                            }`}
                          >
                            + {locality}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              {/* 1. THREE MAIN CARDS (Take Rent, Give Rent, Rental Heroes with attached diagonal pattern — No Telugu on buttons) */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. Take Rent */}
                <button
                  type="button"
                  onClick={() => setCurrentPage('take_options')}
                  className="relative overflow-hidden group text-left rounded-3xl border border-[#DCEAD7] bg-white p-7 hover:border-[#417545] transition-colors flex flex-col justify-between min-h-[210px] cursor-pointer shadow-xs"
                >
                  <img
                    src={BUTTON_PATTERN_IMAGE}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-80"
                  />
                  <div className="relative z-10 w-13 h-13 rounded-2xl bg-white/90 border border-[#DCEAD7] text-[#417545] flex items-center justify-center mb-5 shadow-xs">
                    <SearchIcon className="w-6 h-6" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-xs font-medium text-[#5C6B5E] mb-1">
                      I need a place
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-2xl font-bold text-[#141A15]">
                        Take Rent
                      </h2>
                      <ChevronRight className="w-5 h-5 text-[#5C6B5E] group-hover:text-[#417545] transition-colors" />
                    </div>
                  </div>
                </button>

                {/* 2. Give Rent */}
                <button
                  type="button"
                  onClick={() => setCurrentPage('give_options')}
                  className="relative overflow-hidden group text-left rounded-3xl border border-[#DCEAD7] bg-white p-7 hover:border-[#417545] transition-colors flex flex-col justify-between min-h-[210px] cursor-pointer shadow-xs"
                >
                  <img
                    src={BUTTON_PATTERN_IMAGE}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-80"
                  />
                  <div className="relative z-10 w-13 h-13 rounded-2xl bg-white/90 border border-[#DCEAD7] text-[#417545] flex items-center justify-center mb-5 shadow-xs">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-xs font-medium text-[#5C6B5E] mb-1">
                      I am an owner
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-2xl font-bold text-[#141A15]">
                        Give Rent
                      </h2>
                      <ChevronRight className="w-5 h-5 text-[#5C6B5E] group-hover:text-[#417545] transition-colors" />
                    </div>
                  </div>
                </button>

                {/* 3. Rental Heroes */}
                <button
                  type="button"
                  onClick={() => setCurrentPage('hero')}
                  className="relative overflow-hidden group text-left rounded-3xl border border-[#DCEAD7] bg-[#EAF4E7] p-7 hover:border-[#417545] transition-colors flex flex-col justify-between min-h-[210px] cursor-pointer shadow-xs"
                >
                  <img
                    src={BUTTON_PATTERN_IMAGE}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-80"
                  />
                  <div className="relative z-10 w-13 h-13 rounded-2xl bg-[#417545] text-white flex items-center justify-center mb-5 shadow-xs">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-xs font-medium text-[#417545] mb-1">
                      Earn points
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-2xl font-bold text-[#141A15]">
                        Rental Heroes
                      </h2>
                      <ChevronRight className="w-5 h-5 text-[#417545] transition-colors" />
                    </div>
                  </div>
                </button>
              </section>

              {/* 3. GIVE RENT BANNER (Replaced with the attached image for "Own a house? Post it for just ₹49.") */}
              <section className="rounded-3xl overflow-hidden border border-[#DCEAD7] bg-[#F5FAF3] shadow-xs">
                <button
                  type="button"
                  onClick={() => setCurrentPage('give_options')}
                  aria-label="Own a house? Post it for just ₹49. మీ ఇల్లు అద్దెకు ఇవ్వాలా? కేవలం ₹49 పోస్ట్ చేయండి."
                  className="block w-full text-left cursor-pointer group overflow-hidden"
                >
                  <img
                    src={GIVE_RENT_BANNER_IMAGE}
                    alt="Own a house? Post it for just ₹49 · మీ ఇల్లు అద్దెకు ఇవ్వాలా? కేవలం ₹49 మాత్రమే."
                    className="w-full h-auto object-cover block group-hover:scale-[1.01] transition-transform duration-200"
                  />
                </button>
              </section>

              {/* 3. NUMBER COUNTERS ROW: "Houses Listed", "Rental Heroes", "Points Given" */}
              <section className="grid grid-cols-3 gap-3 sm:gap-5 rounded-3xl bg-[#F5FAF3] border border-[#DCEAD7] p-5 sm:p-6 text-center">
                <div>
                  <p className="text-xl sm:text-3xl font-bold font-mono tabular-nums text-[#417545]">
                    {animatedCounts.houses.toLocaleString('en-IN')}+
                  </p>
                  <p className="text-xs font-semibold text-[#141A15] mt-1">
                    Houses Listed
                  </p>
                </div>
                <div className="border-x border-[#DCEAD7]">
                  <p className="text-xl sm:text-3xl font-bold font-mono tabular-nums text-[#417545]">
                    {animatedCounts.heroes.toLocaleString('en-IN')}+
                  </p>
                  <p className="text-xs font-semibold text-[#141A15] mt-1">
                    Rental Heroes
                  </p>
                </div>
                <div>
                  <p className="text-xl sm:text-3xl font-bold font-mono tabular-nums text-[#417545]">
                    {animatedCounts.points.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs font-semibold text-[#141A15] mt-1">
                    Points Given
                  </p>
                </div>
              </section>

              {/* AD BANNER (below the cards) */}
              <section className="space-y-3">
                <div className="relative rounded-3xl border border-[#DCEAD7] bg-[#F5FAF3] overflow-hidden min-h-[190px] sm:min-h-[220px] flex items-center justify-center">
                  {/* Small "Ad" label in the corner */}
                  <span className="absolute top-3.5 left-4 z-20 text-[11px] font-semibold text-white bg-[#141A15]/70 px-2.5 py-0.5 rounded-md">
                    Ad
                  </span>

                  {/* Admin Manage Ads Button in top-right corner */}
                  <button
                    type="button"
                    onClick={() => setShowAdAdminPanel((prev) => !prev)}
                    className="absolute top-3.5 right-4 z-20 text-[11px] font-semibold text-[#141A15] bg-white/90 hover:bg-white px-3 py-1 rounded-full border border-[#DCEAD7] cursor-pointer"
                  >
                    {showAdAdminPanel ? 'Done' : 'Manage Ads'}
                  </button>

                  {currentAd ? (
                    <div className="relative w-full h-[190px] sm:h-[220px]">
                      <img
                        src={currentAd.imageUrl}
                        alt={currentAd.title}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            CATEGORY_DEFAULT_PHOTOS.family;
                        }}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent flex flex-col justify-end p-6">
                        <p className="text-white font-bold text-base sm:text-lg max-w-xl">
                          {currentAd.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2">
                          {activeAds.map((ad, idx) => (
                            <button
                              key={ad.id}
                              type="button"
                              onClick={() => setCurrentAdIndex(idx)}
                              aria-label={`Slide ${idx + 1}`}
                              className={`h-1.5 rounded-full transition-opacity cursor-pointer ${
                                idx === currentAdIndex
                                  ? 'w-6 bg-white'
                                  : 'w-2 bg-white/50'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <p className="text-base sm:text-lg font-bold text-[#141A15]">
                        Advertise here. Call{' '}
                        <a
                          href={`tel:${CONTACT_PRIMARY_TEL}`}
                          className="text-[#417545] underline font-mono"
                        >
                          {CONTACT_NUMBER}
                        </a>
                      </p>
                    </div>
                  )}
                </div>

                {/* Admin Ad Upload / Remove Panel */}
                {showAdAdminPanel && (
                  <div className="rounded-3xl border border-[#DCEAD7] bg-white p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#141A15]">
                        Admin Ad Banner Manager
                      </h3>
                      {removedDefaultAdIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setRemovedDefaultAdIds([])}
                          className="text-xs font-semibold text-[#417545] underline cursor-pointer"
                        >
                          Restore Default Ads
                        </button>
                      )}
                    </div>

                    {activeAds.length > 0 ? (
                      <div className="space-y-2">
                        {activeAds.map((ad) => (
                          <div
                            key={ad.id}
                            className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#F5FAF3] border border-[#DCEAD7]"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={ad.imageUrl}
                                alt={ad.title}
                                referrerPolicy="no-referrer"
                                className="w-12 h-10 rounded-lg object-cover shrink-0"
                              />
                              <span className="text-xs font-semibold text-[#141A15] truncate">
                                {ad.title}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveAd(ad)}
                              className="min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#5C6B5E]">
                        All ads removed — showing empty state banner.
                      </p>
                    )}

                    {isAdminUser ? (
                      <form
                        onSubmit={handleCreateAd}
                        className="pt-2 border-t border-[#EAF4E7] flex flex-col sm:flex-row gap-3"
                      >
                        <input
                          type="text"
                          value={newAdTitle}
                          onChange={(e) => setNewAdTitle(e.target.value)}
                          placeholder="Ad headline..."
                          maxLength={100}
                          className="flex-1 h-11 px-4 rounded-xl border border-[#DCEAD7] text-xs"
                          required
                        />
                        <label className="min-h-[44px] px-4 rounded-xl border border-[#DCEAD7] bg-[#F5FAF3] text-xs font-semibold text-[#417545] inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Choose Image</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAdPhotoUpload}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="submit"
                          disabled={uploadingAd}
                          className="min-h-[44px] px-5 rounded-xl bg-[#417545] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                        >
                          {uploadingAd ? 'Uploading...' : 'Upload Ad'}
                        </button>
                      </form>
                    ) : (
                      <p className="text-xs text-[#5C6B5E]">
                        Sign in as Admin to upload new custom ads, or click Remove above to preview the empty state.
                      </p>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* PAGE 2: TAKE RENT OPTIONS (4 Big Option Cards) */}
          {!activeSeoPage && currentPage === 'take_options' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#417545]">
                    Take Rent{showTelugu ? ' · అద్దెకు కావాలి' : ''}
                  </p>
                  <h1 className="text-2xl font-bold text-[#141A15] mt-0.5">
                    What kind of place do you need?
                  </h1>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage('home')}
                  className="min-h-[44px] px-4 py-2 rounded-full border border-[#DCEAD7] text-xs font-semibold text-[#5C6B5E] hover:bg-[#EAF4E7] transition-colors cursor-pointer"
                >
                  ← Back
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {(['family', 'commercial', 'hostel', 'bachelor'] as RentalCategory[]).map(
                  (cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleSelectTakeOption(cat)}
                      className="relative overflow-hidden group text-left rounded-3xl border border-[#DCEAD7] bg-white p-8 hover:border-[#417545] transition-colors flex flex-col justify-between min-h-[200px] cursor-pointer"
                    >
                      <img
                        src={BUTTON_PATTERN_IMAGE}
                        alt=""
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-80"
                      />
                      <div className="relative z-10 w-14 h-14 rounded-2xl bg-white/90 border border-[#DCEAD7] text-[#417545] flex items-center justify-center mb-6 shadow-xs">
                        {cat === 'family' && <HomeIcon className="w-7 h-7" />}
                        {cat === 'commercial' && <Store className="w-7 h-7" />}
                        {cat === 'hostel' && <Building2 className="w-7 h-7" />}
                        {cat === 'bachelor' && <BedDouble className="w-7 h-7" />}
                      </div>
                      <div className="relative z-10">
                        <p className="text-xs font-medium text-[#5C6B5E] mb-1">
                          {CATEGORY_META[cat].takeSubtitle}
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="text-2xl font-bold text-[#141A15]">
                            {CATEGORY_META[cat].takeTitle}
                          </h2>
                          <ChevronRight className="w-5 h-5 text-[#5C6B5E] group-hover:text-[#417545]" />
                        </div>
                      </div>
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* PAGE 3: SEARCH LISTINGS PAGE */}
          {!activeSeoPage && currentPage === 'search' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#417545]">
                    <button
                      type="button"
                      onClick={() => setCurrentPage('take_options')}
                      className="hover:underline cursor-pointer"
                    >
                      Take Rent Options
                    </button>
                    <span>·</span>
                    <span>{CATEGORY_META[selectedTakeCategory].takeTitle}</span>
                  </div>
                  <h1 className="text-2xl font-bold text-[#141A15] mt-1">
                    {CATEGORY_META[selectedTakeCategory].takeTitle}
                    {showTelugu ? ` · ${CATEGORY_META[selectedTakeCategory].takeTelugu}` : ''}
                  </h1>
                  <p className="text-xs text-[#5C6B5E] mt-0.5">
                    {CATEGORY_META[selectedTakeCategory].ruleHint}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {(selectedTakeCategory === 'hostel' ||
                    selectedTakeCategory === 'bachelor') && (
                    <button
                      type="button"
                      onClick={refreshUserGps}
                      className="min-h-[44px] px-4 py-2 rounded-full border border-[#DCEAD7] bg-[#EAF4E7] text-xs font-semibold text-[#417545] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>{gpsActive ? 'GPS Active' : 'Use GPS'}</span>
                    </button>
                  )}

                  {isFreeSeekerCategory(selectedTakeCategory) ? (
                    !hasVerifiedSeekerPhone && !profile?.hasPaidSeekerFee && (
                      <button
                        type="button"
                        onClick={() => {
                          setFreeSeekerError(null);
                          setFreeSeekerPhoneInput(
                            profile?.phone ? profile.phone.replace(/^\+91\s*/, '') : ''
                          );
                          setFreeSeekerModalOpen(true);
                        }}
                        className="min-h-[44px] px-5 py-2.5 rounded-full bg-[#417545] hover:bg-[#356139] text-white text-xs font-semibold flex items-center gap-2 cursor-pointer whitespace-nowrap"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>
                          {user ? 'Enter Phone to Unlock (Free)' : 'Login & Enter Phone (Free)'}
                        </span>
                      </button>
                    )
                  ) : (
                    !profile?.hasPaidSeekerFee && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!user) {
                            setCurrentPage('login');
                          } else {
                            setPaymentModal({ isOpen: true, purpose: 'seeker_fee' });
                          }
                        }}
                        className="min-h-[44px] px-5 py-2.5 rounded-full bg-[#417545] hover:bg-[#356139] text-white text-xs font-semibold flex items-center gap-2 cursor-pointer whitespace-nowrap"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Unlock Numbers · ₹49</span>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Search Input + Sidebar Filter Trigger (Filter Rent Price & Rooms opened in Sidebar) */}
              <div className="rounded-3xl border border-[#DCEAD7] bg-white p-5 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <SearchIcon className="w-5 h-5 text-[#5C6B5E] absolute left-5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by city or area (try Alwal)..."
                      className="w-full h-13 pl-13 pr-5 rounded-2xl border border-[#DCEAD7] bg-[#F5FAF3] text-base text-[#141A15] placeholder:text-[#5C6B5E] focus:bg-white focus:outline-none focus:border-[#417545] transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSearchQuery('Alwal')}
                      className="min-h-[48px] px-4 rounded-2xl bg-[#EAF4E7] border border-[#DCEAD7] text-xs font-bold text-[#417545] hover:bg-[#DCEAD7] cursor-pointer whitespace-nowrap"
                    >
                      Try &ldquo;Alwal&rdquo;
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFilterSidebar(true)}
                      className="min-h-[48px] px-4 rounded-2xl bg-[#417545] hover:bg-[#356139] text-white text-xs font-bold flex items-center gap-2 cursor-pointer whitespace-nowrap"
                    >
                      <Menu className="w-4 h-4" />
                      <span>
                        Filter Sidebar
                        {selectedRentFilter !== 'all' ||
                        selectedBhkFilter !== 'all'
                          ? ` (${
                              selectedRentFilter !== 'all'
                                ? `<${selectedRentFilter}`
                                : ''
                            }${
                              selectedRentFilter !== 'all' &&
                              selectedBhkFilter !== 'all'
                                ? ', '
                                : ''
                            }${
                              selectedBhkFilter !== 'all'
                                ? selectedBhkFilter
                                : ''
                            })`
                          : ''}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 3. When searching Alwal, give nearby location suggestions in a light color */}
                {isAlwalSearch && (
                  <div className="rounded-2xl bg-[#F5FAF3] border border-[#DCEAD7] p-4 space-y-1.5">
                    <p className="text-xs font-semibold text-[#5C6B5E]">
                      Add more...
                    </p>
                    <p className="text-xs font-bold text-[#417545]">
                      Nearby Localities :
                    </p>
                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 pt-1">
                      {ALWAL_NEARBY_LOCALITIES.map((locality) => {
                        const isSelected =
                          selectedNearbyLocalities.includes(locality);
                        return (
                          <button
                            key={locality}
                            type="button"
                            onClick={() => toggleNearbyLocality(locality)}
                            className={`text-left px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#DCEAD7] border-[#417545] text-[#141A15]'
                                : 'bg-[#EAF4E7]/65 border-[#DCEAD7] text-[#417545] hover:bg-[#EAF4E7]'
                            }`}
                          >
                            + {locality}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {categoryListings.length === 0 ? (
                <div className="rounded-3xl border border-[#DCEAD7] p-12 text-center">
                  <p className="text-base font-semibold text-[#141A15]">
                    No {CATEGORY_META[selectedTakeCategory].takeTitle.toLowerCase()}{' '}
                    listings found
                  </p>
                  {(searchQuery ||
                    selectedRentFilter !== 'all' ||
                    selectedBhkFilter !== 'all' ||
                    selectedNearbyLocalities.length > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedRentFilter('all');
                        setSelectedBhkFilter('all');
                        setSelectedNearbyLocalities([]);
                      }}
                      className="mt-4 min-h-[44px] px-5 py-2 rounded-full bg-[#EAF4E7] text-xs font-semibold text-[#417545] hover:bg-[#DCEAD7] transition-colors cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryListings.map((house) => renderHouseCard(house))}
                </div>
              )}
            </div>
          )}

          {/* SAVED PAGE (For Hearted Houses) */}
          {!activeSeoPage && currentPage === 'saved' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-[#141A15]">
                    Saved Houses ({savedHousesList.length})
                  </h1>
                  <p className="text-xs text-[#5C6B5E] mt-0.5">
                    మీరు సేవ్ చేసిన ఇళ్లు · Tap the heart icon on any listing to save or remove.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage('take_options')}
                  className="min-h-[44px] px-5 py-2 rounded-full bg-[#417545] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                >
                  Browse Houses
                </button>
              </div>

              {savedHousesList.length === 0 ? (
                <div className="rounded-3xl border border-[#DCEAD7] p-12 text-center space-y-3">
                  <Heart className="w-8 h-8 text-[#417545] mx-auto" />
                  <p className="text-base font-semibold text-[#141A15]">
                    No saved houses yet
                  </p>
                  <p className="text-xs text-[#5C6B5E]">
                    Tap the Heart icon on any house card to save it here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedHousesList.map((house) => renderHouseCard(house))}
                </div>
              )}
            </div>
          )}

          {/* PAGE 4: HOUSE DETAIL PAGE */}
          {!activeSeoPage && currentPage === 'detail' && selectedHouse && (
            <div className="space-y-8 max-w-3xl mx-auto">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentPage('search')}
                  className="min-h-[44px] px-4 py-2 rounded-full border border-[#DCEAD7] text-xs font-semibold text-[#141A15] hover:bg-[#EAF4E7] transition-colors cursor-pointer"
                >
                  ← Back to Listings
                </button>
                <span className="text-xs font-semibold text-[#417545]">
                  {selectedHouse.updatedTag}
                </span>
              </div>

              <div className="rounded-3xl border border-[#DCEAD7] bg-white overflow-hidden">
                <div className="relative aspect-[16/10] w-full bg-[#EAF4E7]">
                  <img
                    src={selectedHouse.photos[0]}
                    alt={selectedHouse.location}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        CATEGORY_DEFAULT_PHOTOS[selectedHouse.category];
                    }}
                    className="w-full h-full object-cover"
                  />
                  {/* Heart, Share, Report icons on detail view as well */}
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleToggleSaveHouse(selectedHouse.id, e)}
                      className={`w-10 h-10 rounded-full bg-white/95 flex items-center justify-center shadow-xs cursor-pointer ${
                        savedHouseIds.includes(selectedHouse.id)
                          ? 'text-red-500'
                          : 'text-[#141A15]'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          savedHouseIds.includes(selectedHouse.id) ? 'fill-current' : ''
                        }`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleShareWhatsApp(selectedHouse, e)}
                      className="w-10 h-10 rounded-full bg-white/95 text-[#141A15] flex items-center justify-center shadow-xs cursor-pointer"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportingHouse(selectedHouse)}
                      className="w-10 h-10 rounded-full bg-white/95 text-[#5C6B5E] hover:text-red-600 flex items-center justify-center shadow-xs cursor-pointer"
                    >
                      <Flag className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAF4E7] pb-6">
                    <div>
                      <h1 className="text-2xl font-bold text-[#141A15]">
                        {selectedHouse.location}
                      </h1>
                      {/* Owner Name + Green Verified Tick after ₹49 is paid */}
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-[#5C6B5E]">
                        <span>Owner:</span>
                        <span className="font-bold text-[#141A15]">
                          {selectedHouse.ownerName}
                        </span>
                        {isPhoneUnlocked(selectedHouse) && (
                          <span className="inline-flex items-center gap-1 text-[#417545] font-semibold">
                            <BadgeCheck className="w-4 h-4 fill-[#417545] text-white" />
                            <span>Verified Owner</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-2xl font-bold font-mono tabular-nums text-[#417545]">
                      ₹{selectedHouse.rentPrice.toLocaleString('en-IN')}/mo
                    </div>
                  </div>

                  {/* Owner Phone Box */}
                  <div className="rounded-2xl bg-[#EAF4E7] border border-[#CFE3C8] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-[#417545]">
                        Owner Phone Number
                      </p>
                      <p className="text-lg font-bold font-mono tabular-nums text-[#141A15] mt-0.5">
                        {getDisplayedOwnerPhone(selectedHouse)}
                      </p>
                    </div>

                    {!isPhoneUnlocked(selectedHouse) ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (isFreeSeekerCategory(selectedHouse.category)) {
                            setFreeSeekerError(null);
                            setFreeSeekerPhoneInput(
                              profile?.phone
                                ? profile.phone.replace(/^\+91\s*/, '')
                                : ''
                            );
                            setFreeSeekerModalOpen(true);
                            return;
                          }
                          if (!user) {
                            setCurrentPage('login');
                          } else {
                            setPaymentModal({
                              isOpen: true,
                              purpose: 'seeker_fee',
                            });
                          }
                        }}
                        className="min-h-[48px] px-6 py-3 rounded-full bg-[#417545] hover:bg-[#356139] text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                      >
                        <Lock className="w-4 h-4" />
                        <span>
                          {isFreeSeekerCategory(selectedHouse.category)
                            ? user
                              ? 'Enter Phone to Unlock Free'
                              : 'Login & Enter Phone (Free)'
                            : 'Pay ₹49 to Unlock Phone'}
                        </span>
                      </button>
                    ) : (
                      <a
                        href={`tel:${getDisplayedOwnerPhone(selectedHouse)}`}
                        className="min-h-[48px] px-6 py-3 rounded-full bg-[#417545] hover:bg-[#356139] text-white text-sm font-semibold flex items-center justify-center gap-2 whitespace-nowrap"
                      >
                        <Phone className="w-4 h-4" />
                        <span>Call Owner</span>
                      </a>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                    <div>
                      <h3 className="text-xs font-semibold text-[#5C6B5E] mb-2">
                        Details & Requirements
                      </h3>
                      <p className="text-sm text-[#141A15] leading-relaxed">
                        {selectedHouse.requirements}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-[#5C6B5E] mb-2">
                        Terms & Conditions
                      </h3>
                      <p className="text-sm text-[#141A15] leading-relaxed">
                        {selectedHouse.terms}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PAGE 5: GIVE RENT OPTIONS (3 Big Option Cards: Family, Commercial, Bachelor) */}
          {!activeSeoPage && currentPage === 'give_options' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#417545]">
                    Give Rent{showTelugu ? ' · అద్దెకు ఇవ్వండి' : ''}
                  </p>
                  <h1 className="text-2xl font-bold text-[#141A15] mt-0.5">
                    Select Property Category
                  </h1>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage('home')}
                  className="min-h-[44px] px-4 py-2 rounded-full border border-[#DCEAD7] text-xs font-semibold text-[#5C6B5E] hover:bg-[#EAF4E7] transition-colors cursor-pointer"
                >
                  ← Back
                </button>
              </div>

              {/* 8. 2nd Image in Give Rent page at top of the Family Button */}
              <div className="rounded-3xl overflow-hidden border border-[#DCEAD7] bg-[#F5FAF3] shadow-xs">
                <img
                  src="/assets/aistudio/post_your_house_7bd662c1.png"
                  alt="Post your house FREE for 3 months · మీ ఇంటిని 3 నెలల పాటు ఉచితంగా పోస్ట్ చేయండి"
                  className="w-full h-auto object-cover block"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(['family', 'commercial', 'bachelor'] as RentalCategory[]).map(
                  (cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleSelectGiveOption(cat)}
                      className="relative overflow-hidden group text-left rounded-3xl border border-[#DCEAD7] bg-white p-8 hover:border-[#417545] transition-colors flex flex-col justify-between min-h-[220px] cursor-pointer"
                    >
                      <img
                        src={BUTTON_PATTERN_IMAGE}
                        alt=""
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-80"
                      />
                      <div className="relative z-10 w-14 h-14 rounded-2xl bg-white/90 border border-[#DCEAD7] text-[#417545] flex items-center justify-center mb-6 shadow-xs">
                        {cat === 'family' && <Users className="w-7 h-7" />}
                        {cat === 'commercial' && <Store className="w-7 h-7" />}
                        {cat === 'bachelor' && <UserIcon className="w-7 h-7" />}
                      </div>
                      <div className="relative z-10">
                        <p className="text-xs font-medium text-[#5C6B5E] mb-1">
                          {CATEGORY_META[cat].giveSubtitle}
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="text-2xl font-bold text-[#141A15]">
                            {CATEGORY_META[cat].giveTitle}
                          </h2>
                          <ChevronRight className="w-5 h-5 text-[#5C6B5E] group-hover:text-[#417545]" />
                        </div>
                      </div>
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* PAGE 6: OWNER DASHBOARD */}
          {!activeSeoPage && currentPage === 'owner' && (
            <div className="space-y-8 max-w-3xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#417545]">
                    <button
                      type="button"
                      onClick={() => setCurrentPage('give_options')}
                      className="hover:underline cursor-pointer"
                    >
                      Give Rent Options
                    </button>
                    <span>·</span>
                    <span>{CATEGORY_META[houseCategory].giveTitle}</span>
                  </div>
                  <h1 className="text-2xl font-bold text-[#141A15] mt-1">
                    Owner Dashboard · {CATEGORY_META[houseCategory].giveTitle}
                  </h1>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage('give_options')}
                  className="min-h-[44px] px-4 py-2 rounded-full border border-[#DCEAD7] text-xs font-semibold text-[#5C6B5E] hover:bg-[#EAF4E7] transition-colors cursor-pointer"
                >
                  Change Category
                </button>
              </div>

              {/* FREE FOR OWNERS IMAGE BANNER ON OWNER DASHBOARD */}
              <div className="rounded-3xl overflow-hidden border border-[#DCEAD7] bg-[#F5FAF3] shadow-xs">
                <img
                  src="/assets/aistudio/post_your_house_7bd662c1.png"
                  alt="Post your house FREE for 3 months · మీ ఇంటిని 3 నెలల పాటు ఉచితంగా పోస్ట్ చేయండి"
                  className="w-full h-auto object-cover block"
                />
              </div>

              {!user ? (
                <div className="rounded-3xl border border-[#DCEAD7] p-8 text-center space-y-4">
                  <KeyRound className="w-10 h-10 text-[#417545] mx-auto" />
                  <h2 className="text-lg font-bold text-[#141A15]">
                    Owner Sign In Required
                  </h2>
                  <p className="text-sm text-[#5C6B5E] max-w-md mx-auto">
                    Sign in to get 3 months FREE owner posting (90 days from sign-up), verify your phone with OTP, and publish your listing.
                  </p>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="min-h-[48px] px-6 py-3 rounded-full bg-[#417545] hover:bg-[#356139] text-white text-sm font-semibold cursor-pointer"
                  >
                    Continue with Google
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Phone OTP Card */}
                    <div className="rounded-3xl border border-[#DCEAD7] p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#5C6B5E]">
                          Step 1 · Phone OTP
                        </span>
                        <span className="text-xs font-semibold text-[#417545]">
                          {profile?.phone ? `Verified (${profile.phone})` : 'Required'}
                        </span>
                      </div>

                      {!otpSent ? (
                        <form onSubmit={handleSendOtp} className="space-y-3">
                          <input
                            type="tel"
                            value={phoneInput}
                            onChange={(e) => setPhoneInput(e.target.value)}
                            placeholder="10-digit mobile number"
                            maxLength={15}
                            className="w-full h-12 px-4 rounded-xl border border-[#DCEAD7] text-sm"
                            required
                          />
                          <button
                            type="submit"
                            className="w-full min-h-[44px] rounded-full bg-[#141A15] hover:bg-[#273329] text-white text-xs font-semibold cursor-pointer"
                          >
                            Send OTP
                          </button>
                        </form>
                      ) : (
                        <form onSubmit={handleVerifyOtp} className="space-y-3">
                          <input
                            type="text"
                            value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value)}
                            placeholder="Enter 4-digit OTP"
                            maxLength={6}
                            className="w-full h-12 px-4 rounded-xl border border-[#DCEAD7] text-sm font-mono"
                            required
                          />
                          <button
                            type="submit"
                            className="w-full min-h-[44px] rounded-full bg-[#417545] hover:bg-[#356139] text-white text-xs font-semibold cursor-pointer"
                          >
                            Verify OTP
                          </button>
                        </form>
                      )}
                      {otpStatusMsg && (
                        <p className="text-xs text-[#417545]">{otpStatusMsg}</p>
                      )}
                    </div>

                    {/* Owner Free 3-Month Status / ₹49 Registration Card */}
                    <div className="rounded-3xl border border-[#DCEAD7] p-6 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#5C6B5E]">
                            Step 2 · Owner Account Status
                          </span>
                          <span className="text-xs font-mono font-bold text-[#417545]">
                            {isOwnerFreeActive ? 'FREE (3 Months)' : '₹49'}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-[#141A15] mt-2 flex items-center gap-1.5">
                          <span>
                            {profile?.hasPaidOwnerFee || isOwnerFreeActive
                              ? 'Verified Owner Account'
                              : 'One-time ₹49 Owner Fee'}
                          </span>
                          {(profile?.hasPaidOwnerFee || isOwnerFreeActive) && (
                            <BadgeCheck className="w-5 h-5 fill-[#417545] text-white" />
                          )}
                        </h3>
                        <p className="text-xs text-[#5C6B5E] mt-1">
                          {isOwnerFreeActive
                            ? `Post your house FREE for 3 months (${freeOwnerDaysLeft} days left).`
                            : profile?.hasPaidOwnerFee
                            ? 'You can upload, edit, or remove your rental listings.'
                            : 'Pay ₹49 via UPI or Razorpay to publish your listing.'}
                        </p>
                      </div>

                      {profile?.hasPaidOwnerFee || isOwnerFreeActive ? (
                        <div className="min-h-[44px] px-4 rounded-full bg-[#EAF4E7] text-[#417545] text-xs font-semibold flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5">
                            <Check className="w-4 h-4" />
                            <span>
                              {isOwnerFreeActive
                                ? `FREE Owner Pass Active (${freeOwnerDaysLeft} days left)`
                                : '₹49 Registration Paid'}
                            </span>
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setPaymentModal({ isOpen: true, purpose: 'owner_fee' })
                          }
                          className="w-full min-h-[44px] rounded-full bg-[#417545] hover:bg-[#356139] text-white text-xs font-semibold cursor-pointer"
                        >
                          Pay ₹49 via UPI / Razorpay
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Upload / Edit Listing Form */}
                  <form
                    onSubmit={handleSaveHouseListing}
                    className="rounded-3xl border border-[#DCEAD7] p-6 sm:p-8 space-y-5"
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-[#141A15]">
                        {editingHouseId
                          ? 'Edit Listing'
                          : `Upload ${CATEGORY_META[houseCategory].giveTitle} Listing`}
                      </h2>
                      {editingHouseId && (
                        <button
                          type="button"
                          onClick={() => setEditingHouseId(null)}
                          className="text-xs font-semibold text-[#5C6B5E] hover:text-[#141A15] cursor-pointer"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {(['family', 'commercial', 'bachelor', 'hostel'] as RentalCategory[]).map(
                        (cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setHouseCategory(cat);
                              const defaultImg =
                                cat === 'family'
                                  ? STOCK_FREE_HOME_IMAGES.family1
                                  : cat === 'commercial'
                                  ? STOCK_FREE_HOME_IMAGES.commercial1
                                  : cat === 'hostel'
                                  ? STOCK_FREE_HOME_IMAGES.hostel1
                                  : STOCK_FREE_HOME_IMAGES.bachelor1;
                              setHousePhotos([defaultImg]);
                            }}
                            className={`min-h-[40px] px-4 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                              houseCategory === cat
                                ? 'bg-[#417545] text-white'
                                : 'bg-[#EAF4E7] text-[#417545] hover:bg-[#DCEAD7]'
                            }`}
                          >
                            {CATEGORY_META[cat].giveTitle}
                          </button>
                        )
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#141A15] mb-2">
                        Photos (Required)
                      </label>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <img
                          src={housePhotos[0]}
                          alt="Listing preview"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              CATEGORY_DEFAULT_PHOTOS[houseCategory];
                          }}
                          className="w-32 h-24 rounded-2xl object-cover border border-[#DCEAD7] shrink-0"
                        />
                        <label className="min-h-[44px] px-4 py-2.5 rounded-full border border-[#DCEAD7] bg-[#F5FAF3] hover:bg-[#EAF4E7] text-xs font-semibold text-[#417545] inline-flex items-center gap-2 cursor-pointer">
                          <Upload className="w-4 h-4" />
                          <span>Upload Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleHousePhotoUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#141A15] mb-1.5">
                          City
                        </label>
                        <input
                          type="text"
                          value={houseCity}
                          onChange={(e) => setHouseCity(e.target.value)}
                          placeholder="Bengaluru"
                          maxLength={60}
                          className="w-full h-12 px-4 rounded-xl border border-[#DCEAD7] text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#141A15] mb-1.5">
                          Location (Area)
                        </label>
                        <input
                          type="text"
                          value={houseLocation}
                          onChange={(e) => setHouseLocation(e.target.value)}
                          placeholder="Indiranagar 2nd Stage"
                          maxLength={120}
                          className="w-full h-12 px-4 rounded-xl border border-[#DCEAD7] text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#141A15] mb-1.5">
                          Rent Price (₹/mo)
                        </label>
                        <input
                          type="number"
                          value={houseRent}
                          onChange={(e) => setHouseRent(e.target.value)}
                          min={500}
                          max={10000000}
                          className="w-full h-12 px-4 rounded-xl border border-[#DCEAD7] text-sm font-mono"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#141A15] mb-1.5">
                          Requirements
                        </label>
                        <textarea
                          rows={2}
                          value={houseRequirements}
                          onChange={(e) => setHouseRequirements(e.target.value)}
                          placeholder="Tenant requirements & property details..."
                          maxLength={500}
                          className="w-full p-3.5 rounded-xl border border-[#DCEAD7] text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#141A15] mb-1.5">
                          Terms & Conditions
                        </label>
                        <textarea
                          rows={2}
                          value={houseTerms}
                          onChange={(e) => setHouseTerms(e.target.value)}
                          placeholder="11 months agreement, deposit details..."
                          maxLength={500}
                          className="w-full p-3.5 rounded-xl border border-[#DCEAD7] text-sm"
                          required
                        />
                      </div>
                    </div>

                    {ownerFormMsg && (
                      <p className="text-xs font-medium text-[#417545] bg-[#EAF4E7] border border-[#CFE3C8] rounded-xl px-4 py-2.5">
                        {ownerFormMsg}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={savingHouse}
                      className="w-full min-h-[48px] rounded-full bg-[#417545] hover:bg-[#356139] text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>
                        {savingHouse
                          ? 'Saving...'
                          : editingHouseId
                          ? 'Save Changes'
                          : `Publish to ${CATEGORY_META[houseCategory].takeTitle}`}
                      </span>
                    </button>
                  </form>

                  {/* Owner's Active Listings */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-bold text-[#141A15]">
                      Your Listings ({myOwnerHouses.length})
                    </h2>
                    {myOwnerHouses.length === 0 ? (
                      <p className="text-sm text-[#5C6B5E]">
                        You have not published any listings yet.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {myOwnerHouses.map((h) => (
                          <div
                            key={h.id}
                            className="rounded-2xl border border-[#DCEAD7] p-4 flex items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <img
                                src={h.photos[0]}
                                alt={h.location}
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src =
                                    CATEGORY_DEFAULT_PHOTOS[h.category];
                                }}
                                className="w-16 h-14 rounded-xl object-cover shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-[#141A15] truncate">
                                  {h.location}
                                </p>
                                <p className="text-xs font-mono text-[#5C6B5E]">
                                  {CATEGORY_META[h.category].takeTitle} · ₹
                                  {h.rentPrice.toLocaleString('en-IN')}/mo · {h.city}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEditHouse(h)}
                                className="min-h-[44px] min-w-[44px] rounded-xl border border-[#DCEAD7] flex items-center justify-center text-[#5C6B5E] hover:text-[#141A15] cursor-pointer"
                                aria-label="Edit listing"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveHouse(h.id)}
                                className="min-h-[44px] min-w-[44px] rounded-xl border border-[#DCEAD7] flex items-center justify-center text-red-600 hover:bg-red-50 cursor-pointer"
                                aria-label="Remove listing"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* PAGE 7: RENTAL HEROES */}
          {!activeSeoPage && currentPage === 'hero' && (
            <RentalHeroesPage
              user={user}
              profile={profile}
              isAdminUser={isAdminUser}
              showTelugu={showTelugu}
              onOpenScratchCards={() => setCurrentPage('rewards')}
              onRequireLogin={() => setCurrentPage('login')}
            />
          )}

          {/* PAGE 8: REWARDS & POINTS WALLET */}
          {!activeSeoPage && currentPage === 'rewards' && (
            <div className="space-y-8 max-w-3xl mx-auto">
              <div className="rounded-3xl bg-gradient-to-br from-[#417545] to-[#6DA34D] text-white p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <p className="text-xs font-medium text-[#EAF4E7]">
                    Rental Heroes Points Wallet
                  </p>
                  <h1 className="text-3xl font-bold font-mono tabular-nums mt-1">
                    {profile?.points ?? 0} Points
                  </h1>
                  <p className="text-xs text-[#EAF4E7] mt-1">
                    1000 points = ₹100 on PhonePe · Each approved upload also unlocks 1 Scratch Card
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage('hero')}
                  className="min-h-[48px] px-6 py-3 rounded-full bg-white text-[#417545] text-xs font-bold cursor-pointer whitespace-nowrap"
                >
                  ← Back to Rental Heroes
                </button>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-bold text-[#141A15]">
                  Scratch Cards ({scratchCards.length})
                </h2>
                {scratchCards.length === 0 ? (
                  <div className="rounded-3xl border border-[#DCEAD7] p-10 text-center space-y-3">
                    <Gift className="w-8 h-8 text-[#417545] mx-auto" />
                    <p className="text-sm font-semibold text-[#141A15]">
                      No scratch cards yet
                    </p>
                    <p className="text-xs text-[#5C6B5E] max-w-sm mx-auto">
                      Upload a To-Let board photo in Rental Heroes. Once approved, your scratch card appears here!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {scratchCards.map((card) => (
                      <ScratchCardItem
                        key={card.id}
                        card={card}
                        onScratch={handleScratchCard}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PAGE 9: LOGIN / ACCOUNT PAGE */}
          {!activeSeoPage && currentPage === 'login' && (
            <div className="max-w-md mx-auto">
              <div className="rounded-3xl border border-[#DCEAD7] bg-white p-8 space-y-6">
                <div>
                  <h1 className="text-xl font-bold text-[#141A15]">
                    RENTBOX Account
                  </h1>
                  <p className="text-xs text-[#5C6B5E]">
                    Your home, in a box · మీ ఇల్లు, ఒకే బాక్స్‌లో
                  </p>
                </div>

                {!user ? (
                  <div className="space-y-4 pt-2">
                    <p className="text-sm text-[#5C6B5E]">
                      Sign in to unlock owner phone numbers, list your property FREE for 3 months, or earn Rental Hero points.
                    </p>
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      className="w-full min-h-[48px] rounded-full bg-[#417545] hover:bg-[#356139] text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Continue with Google</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="rounded-2xl bg-[#EAF4E7] border border-[#CFE3C8] p-4 space-y-1">
                      <p className="text-sm font-bold text-[#141A15] flex items-center gap-1.5">
                        <span>{profile?.displayName || user.displayName}</span>
                        {(profile?.hasPaidSeekerFee ||
                          profile?.hasPaidOwnerFee ||
                          isOwnerFreeActive) && (
                          <BadgeCheck className="w-4 h-4 fill-[#417545] text-white" />
                        )}
                      </p>
                      <p className="text-xs text-[#5C6B5E]">{user.email}</p>
                      {profile?.phone && (
                        <p className="text-xs font-mono text-[#417545]">
                          Phone: {profile.phone}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 text-xs text-[#5C6B5E]">
                      <div className="flex items-center justify-between py-2 border-b border-[#EAF4E7]">
                        <span>Take Rent Registration (₹49)</span>
                        <span className="font-semibold text-[#141A15]">
                          {profile?.hasPaidSeekerFee ? 'Paid · Unlocked' : 'Unpaid'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-[#EAF4E7]">
                        <span>Give Rent Owner Status</span>
                        <span className="font-semibold text-[#417545]">
                          {isOwnerFreeActive
                            ? `FREE (${freeOwnerDaysLeft} days left)`
                            : profile?.hasPaidOwnerFee
                            ? 'Paid · Active'
                            : 'Unpaid'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span>Rental Hero Points</span>
                        <span className="font-mono font-bold text-[#417545]">
                          {profile?.points ?? 0} pts
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => signOut(auth)}
                      className="w-full min-h-[48px] rounded-full border border-[#DCEAD7] hover:bg-[#EAF4E7] text-[#141A15] font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. BOTTOM BANNER ("Own a house? Post it for just ₹49.") — Removed from bottom of Home page & Take Rent pages */}
          {!activeSeoPage &&
            currentPage !== 'home' &&
            currentPage !== 'hero' &&
            currentPage !== 'take_options' &&
            currentPage !== 'search' &&
            currentPage !== 'detail' && (
              <section className="mt-10 rounded-3xl overflow-hidden border border-[#DCEAD7] bg-[#F5FAF3] shadow-xs">
                <button
                  type="button"
                  onClick={() => setCurrentPage('give_options')}
                  aria-label="Own a house? Post it for just ₹49. మీ ఇల్లు అద్దెకు ఇవ్వాలా? కేవలం ₹49 పోస్ట్ చేయండి."
                  className="block w-full text-left cursor-pointer group overflow-hidden"
                >
                  <img
                    src={GIVE_RENT_BANNER_IMAGE}
                    alt="Own a house? Post it for just ₹49 · మీ ఇల్లు అద్దెకు ఇవ్వాలా? కేవలం ₹49 మాత్రమే."
                    className="w-full h-auto object-cover block group-hover:scale-[1.01] transition-transform duration-200"
                  />
                </button>
              </section>
            )}
        </main>
      </div>

      {/* FILTER SIDEBAR DRAWER (Filter Rent Price & Filter Rent Rooms) */}
      {showFilterSidebar && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#141A15]/45 backdrop-blur-xs">
          <div className="w-full max-w-xs bg-white h-full border-l border-[#DCEAD7] p-6 flex flex-col justify-between overflow-y-auto shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#EAF4E7]">
                <div>
                  <h3 className="text-base font-bold text-[#141A15]">
                    Filters{showTelugu ? ' · ఫిల్టర్లు' : ''}
                  </h3>
                  <p className="text-xs text-[#5C6B5E]">
                    Select rent price and rooms
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFilterSidebar(false)}
                  aria-label="Close filter sidebar"
                  className="min-h-[38px] min-w-[38px] rounded-xl border border-[#DCEAD7] flex items-center justify-center text-[#5C6B5E] hover:bg-[#EAF4E7] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Filter Rent Price */}
              <div className="space-y-2.5">
                <p className="text-xs font-bold text-[#141A15]">
                  Filter Rent Price
                </p>
                <div className="flex flex-col gap-2">
                  {(['all', 4500, 8000, 12000] as const).map((price) => (
                    <button
                      key={String(price)}
                      type="button"
                      onClick={() => {
                        setSelectedRentFilter(price);
                        if (currentPage !== 'search') {
                          setCurrentPage('search');
                        }
                      }}
                      className={`min-h-[42px] px-4 py-2.5 rounded-xl text-xs font-bold border text-left flex items-center justify-between transition-colors cursor-pointer ${
                        selectedRentFilter === price
                          ? 'bg-[#417545] border-[#417545] text-white'
                          : 'bg-[#F5FAF3] border-[#DCEAD7] text-[#141A15] hover:bg-[#EAF4E7]'
                      }`}
                    >
                      <span>
                        {price === 'all' ? 'All Prices' : `Under ${price}/-`}
                      </span>
                      {selectedRentFilter === price && (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter Rent Rooms */}
              <div className="space-y-2.5 pt-2 border-t border-[#EAF4E7]">
                <p className="text-xs font-bold text-[#141A15]">
                  Filter Rent Rooms
                </p>
                <div className="flex flex-col gap-2">
                  {(['all', '1BHK', '2BHK', '3BHK'] as const).map((bhk) => (
                    <button
                      key={bhk}
                      type="button"
                      onClick={() => {
                        setSelectedBhkFilter(bhk);
                        if (currentPage !== 'search') {
                          setCurrentPage('search');
                        }
                      }}
                      className={`min-h-[42px] px-4 py-2.5 rounded-xl text-xs font-bold border text-left flex items-center justify-between transition-colors cursor-pointer ${
                        selectedBhkFilter === bhk
                          ? 'bg-[#417545] border-[#417545] text-white'
                          : 'bg-[#F5FAF3] border-[#DCEAD7] text-[#141A15] hover:bg-[#EAF4E7]'
                      }`}
                    >
                      <span>{bhk === 'all' ? 'All Rooms' : bhk}</span>
                      {selectedBhkFilter === bhk && (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-[#EAF4E7] flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedRentFilter('all');
                  setSelectedBhkFilter('all');
                }}
                className="flex-1 min-h-[44px] rounded-xl border border-[#DCEAD7] bg-[#F5FAF3] text-xs font-bold text-[#141A15] hover:bg-[#EAF4E7] cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setShowFilterSidebar(false)}
                className="flex-1 min-h-[44px] rounded-xl bg-[#417545] hover:bg-[#356139] text-white text-xs font-bold cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER (Styled to match reference image /assets/aistudio/footer_947fc15e.jpg) */}
      <footer className="border-t border-[#DCEAD7] bg-[#F5FAF3] py-10 px-6">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Top Row: Left = Brand Logo & Tagline | Right = Stacked WhatsApp Box & Contact Us Box */}
          <div className="w-full flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
            {/* Left Brand Block */}
            <div className="flex items-center gap-3.5 text-left">
              <img
                src="/assets/aistudio/rentalbox_288054f0.png"
                alt="RENTBOX Logo"
                className="w-11 h-11 object-contain shrink-0"
              />
              <div>
                <p className="text-lg font-bold tracking-tight text-[#141A15] leading-tight">
                  RENT<span className="text-[#00B353]">BOX</span>
                </p>
                <p className="text-xs text-[#5C6B5E] mt-0.5">
                  Your home, in a box · మీ ఇల్లు, ఒకే బాక్స్‌లో
                </p>
              </div>
            </div>

            {/* Right Stacked Contact Column (Green WhatsApp Box on top, White Contact Us Box below) */}
            <div className="w-full md:w-auto flex flex-col items-stretch sm:items-end gap-3.5">
              {/* Green WhatsApp Button */}
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-[360px] rounded-2xl bg-[#417545] hover:bg-[#356139] text-white px-5 py-3.5 flex items-center gap-3.5 transition-colors shadow-xs"
              >
                <span className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5 text-white" />
                </span>
                <div className="text-left">
                  <p className="text-[11px] font-semibold text-[#EAF4E7]">
                    Message Us on WhatsApp · వాట్సాప్ చేయండి
                  </p>
                  <p className="text-xl font-bold font-mono tabular-nums tracking-tight leading-tight mt-0.5">
                    {WHATSAPP_NUMBER}
                  </p>
                </div>
              </a>

              {/* White Contact Us Card */}
              <div className="w-full sm:w-[360px] rounded-2xl bg-white border border-[#DCEAD7] px-5 py-3.5 text-left shadow-xs">
                <p className="text-[11px] font-semibold text-[#5C6B5E] flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#417545]" />
                  <span>Contact Us · సంప్రదించండి</span>
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xl font-bold font-mono tabular-nums text-[#141A15] leading-tight">
                  <a
                    href={`tel:${CONTACT_PRIMARY_TEL}`}
                    className="hover:text-[#417545] transition-colors"
                  >
                    +8886388635,
                  </a>
                  <a
                    href={`tel:${CONTACT_SECONDARY_TEL}`}
                    className="hover:text-[#417545] transition-colors"
                  >
                    8999999333
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Divider Row: Left = Social Icons | Right = Links + © 2026 RENTBOX */}
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[#DCEAD7]">
            {/* Left: Instagram & WhatsApp Circles */}
            <div className="flex items-center gap-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-11 h-11 rounded-full bg-white border border-[#DCEAD7] text-[#417545] hover:bg-[#EAF4E7] flex items-center justify-center transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp 8886388635"
                className="w-11 h-11 rounded-full bg-white border border-[#DCEAD7] text-[#417545] hover:bg-[#EAF4E7] flex items-center justify-center transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>

            {/* Right: Links row on top, © 2026 RENTBOX right-aligned below */}
            <div className="flex flex-col items-center sm:items-end gap-2">
              <div className="flex items-center gap-5 text-xs font-medium text-[#5C6B5E]">
                {(['About', 'Contact', 'Terms', 'Privacy'] as const).map(
                  (topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => setFooterInfoTopic(topic)}
                      className="hover:text-[#141A15] cursor-pointer"
                    >
                      {topic}
                    </button>
                  )
                )}
              </div>
              <p className="text-xs text-[#5C6B5E]">© 2026 RENTBOX</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Short Service Form Modal ("Rental Agreement" / "Packers & Movers"): Name, Phone, City */}
      {activeServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#141A15]/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-[#DCEAD7] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#141A15]">
                {activeServiceModal}
              </h3>
              <button
                type="button"
                onClick={() => setActiveServiceModal(null)}
                className="min-h-[38px] min-w-[38px] rounded-xl flex items-center justify-center text-[#5C6B5E] hover:bg-[#EAF4E7] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {serviceSubmittedMsg ? (
              <div className="rounded-2xl bg-[#EAF4E7] p-4 text-xs font-semibold text-[#417545] text-center">
                {serviceSubmittedMsg}
              </div>
            ) : (
              <form onSubmit={handleSubmitServiceForm} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#141A15] mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={serviceFormName}
                    onChange={(e) => setServiceFormName(e.target.value)}
                    placeholder="Your name"
                    maxLength={80}
                    className="w-full h-11 px-3.5 rounded-xl border border-[#DCEAD7] text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#141A15] mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={serviceFormPhone}
                    onChange={(e) => setServiceFormPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    maxLength={15}
                    className="w-full h-11 px-3.5 rounded-xl border border-[#DCEAD7] text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#141A15] mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={serviceFormCity}
                    onChange={(e) => setServiceFormCity(e.target.value)}
                    placeholder="City"
                    maxLength={60}
                    className="w-full h-11 px-3.5 rounded-xl border border-[#DCEAD7] text-sm"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full min-h-[44px] rounded-full bg-[#417545] hover:bg-[#356139] text-white text-xs font-bold cursor-pointer"
                >
                  Submit Request
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Report House Modal (Flag fake or rented-out house) */}
      {reportingHouse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#141A15]/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-[#DCEAD7] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#141A15]">
                Report Listing
              </h3>
              <button
                type="button"
                onClick={() => setReportingHouse(null)}
                className="min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center text-[#5C6B5E] hover:bg-[#EAF4E7] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#5C6B5E]">
              Why are you reporting &ldquo;{reportingHouse.location}&rdquo;?
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleConfirmReportHouse('Fake photo / listing')}
                className="w-full min-h-[44px] px-4 rounded-2xl border border-[#DCEAD7] hover:border-[#417545] hover:bg-[#EAF4E7] text-left text-xs font-semibold text-[#141A15] cursor-pointer"
              >
                Fake photo or wrong details
              </button>
              <button
                type="button"
                onClick={() => handleConfirmReportHouse('Already rented out')}
                className="w-full min-h-[44px] px-4 rounded-2xl border border-[#DCEAD7] hover:border-[#417545] hover:bg-[#EAF4E7] text-left text-xs font-semibold text-[#141A15] cursor-pointer"
              >
                House is already rented out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info Modal (About, Contact, Terms, Privacy) */}
      {footerInfoTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#141A15]/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white border border-[#DCEAD7] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#141A15]">
                {footerInfoTopic} · RENTBOX
              </h3>
              <button
                type="button"
                onClick={() => setFooterInfoTopic(null)}
                className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center text-[#5C6B5E] hover:bg-[#EAF4E7] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-[#5C6B5E] leading-relaxed">
              {footerInfoTopic === 'About' &&
                'RENTBOX ("Your home, in a box.") connects seekers directly with verified property owners across Family Homes, Commercial Spaces, Hostels, and Bachelor rooms without brokerage.'}
              {footerInfoTopic === 'Contact' &&
                `Call or WhatsApp us anytime at ${CONTACT_NUMBER} for support or advertising inquiries.`}
              {footerInfoTopic === 'Terms' &&
                'One-time ₹49 registration fee applies for unlocking verified owner phone numbers or publishing property listings. All listings must include real photos.'}
              {footerInfoTopic === 'Privacy' &&
                'Owner phone numbers remain strictly protected until registration verification. GPS coordinates are used only to sort nearby hostels and bachelor rooms.'}
            </p>
          </div>
        </div>
      )}

      {/* Mobile Fixed Bottom Tab Bar: Home, Take Rent, Give Rent, Heroes, Rewards */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#DCEAD7] grid grid-cols-5 items-center h-16 px-2">
        <button
          type="button"
          onClick={() => setCurrentPage('home')}
          className={`min-h-[44px] flex flex-col items-center justify-center cursor-pointer ${
            currentPage === 'home' ? 'text-[#417545]' : 'text-[#5C6B5E]'
          }`}
        >
          <HomeIcon className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-1">Home</span>
        </button>
        <button
          type="button"
          onClick={() => setCurrentPage('take_options')}
          className={`min-h-[44px] flex flex-col items-center justify-center cursor-pointer ${
            currentPage === 'take_options' ||
            currentPage === 'search' ||
            currentPage === 'detail'
              ? 'text-[#417545]'
              : 'text-[#5C6B5E]'
          }`}
        >
          <SearchIcon className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-1">Take Rent</span>
        </button>
        <button
          type="button"
          onClick={() => setCurrentPage('give_options')}
          className={`min-h-[44px] flex flex-col items-center justify-center cursor-pointer ${
            currentPage === 'give_options' || currentPage === 'owner'
              ? 'text-[#417545]'
              : 'text-[#5C6B5E]'
          }`}
        >
          <KeyRound className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-1">Give Rent</span>
        </button>
        <button
          type="button"
          onClick={() => setCurrentPage('hero')}
          className={`min-h-[44px] flex flex-col items-center justify-center cursor-pointer ${
            currentPage === 'hero' ? 'text-[#417545]' : 'text-[#5C6B5E]'
          }`}
        >
          <Camera className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-1">Heroes</span>
        </button>
        <button
          type="button"
          onClick={() => setCurrentPage('rewards')}
          className={`min-h-[44px] flex flex-col items-center justify-center cursor-pointer ${
            currentPage === 'rewards' ? 'text-[#417545]' : 'text-[#5C6B5E]'
          }`}
        >
          <Gift className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-1">Rewards</span>
        </button>
      </nav>

      {/* Free Unlock Modal for Bachelors & Hostels (Login with Google + Enter Phone Number, No Payment) */}
      {freeSeekerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#141A15]/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-[#DCEAD7] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#EAF4E7] text-[10px] font-bold text-[#417545]">
                  FREE FOR BACHELORS & HOSTELS
                </span>
                <h3 className="text-base font-bold text-[#141A15] mt-1">
                  Unlock Owner Phone Number
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setFreeSeekerModalOpen(false)}
                className="min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center text-[#5C6B5E] hover:bg-[#EAF4E7] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#5C6B5E] leading-relaxed">
              Bachelor and Hostel seekers do not need to pay ₹49. Simply sign in with Google and enter your 10-digit mobile number to view owner contact numbers.
            </p>

            {!user ? (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full min-h-[46px] rounded-full bg-[#417545] hover:bg-[#356139] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>Login with Google</span>
              </button>
            ) : (
              <form onSubmit={handleSaveFreeSeekerPhone} className="space-y-3">
                <div className="rounded-xl bg-[#F5FAF3] border border-[#DCEAD7] px-3.5 py-2 text-xs text-[#417545] font-semibold">
                  Signed in as {profile?.displayName || user.displayName || user.email}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#141A15] mb-1">
                    Your 10-Digit Phone Number
                  </label>
                  <input
                    type="tel"
                    value={freeSeekerPhoneInput}
                    onChange={(e) => setFreeSeekerPhoneInput(e.target.value)}
                    placeholder="Enter 10-digit mobile number"
                    maxLength={15}
                    className="w-full h-11 px-3.5 rounded-xl border border-[#DCEAD7] text-sm font-mono"
                    required
                  />
                </div>
                {freeSeekerError && (
                  <p className="text-xs font-semibold text-red-600">
                    {freeSeekerError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={freeSeekerSaving}
                  className="w-full min-h-[46px] rounded-full bg-[#417545] hover:bg-[#356139] text-white text-xs font-bold cursor-pointer"
                >
                  {freeSeekerSaving ? 'Saving...' : 'Unlock Phone Number (Free)'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* UPI / Razorpay ₹49 Checkout Modal */}
      <RazorpayModal
        isOpen={paymentModal.isOpen}
        purpose={paymentModal.purpose}
        onClose={() => setPaymentModal((prev) => ({ ...prev, isOpen: false }))}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
