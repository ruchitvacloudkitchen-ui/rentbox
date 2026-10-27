/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
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
  SAMPLE_TOLET_PHOTO,
  STOCK_FREE_HOME_IMAGES,
} from './utils/sampleAssets';
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
}

interface HouseListingData {
  id: string;
  ownerId: string;
  ownerName: string;
  updatedTag: 'Updated today' | 'Updated 2 days ago';
  category: RentalCategory;
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
const CONTACT_NUMBER = '+91 98450 00049';
const CONTACT_TEL = '+919845000049';

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
  const [currentPage, setCurrentPage] = useState<PageRoute>('home');
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

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Payment Modal State
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    purpose: 'seeker_fee' | 'owner_fee';
  }>({ isOpen: false, purpose: 'seeker_fee' });

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

  // 1. Auth Listener & Profile Bootstrap
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);

      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
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
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            await setDoc(userRef, initialProfile);
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

            list.push({
              id: docSnap.id,
              ownerId: d.ownerId,
              ownerName: 'Verified Owner',
              updatedTag: updatedLabel,
              category: cat,
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

  // 4. Fetch Unlocked Owner Phone Numbers when Seeker has Paid ₹49 (or is Owner/Admin)
  useEffect(() => {
    if (!authReady || !user || !profile) return;
    const canViewAllPhones = profile.hasPaidSeekerFee || isAdminUser;

    firestoreHouses.forEach(async (house) => {
      if (canViewAllPhones || house.ownerId === user.uid) {
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
    return [...firestoreHouses, ...demoMapped].filter(
      (h) => h.status === 'active' && Array.isArray(h.photos) && h.photos.length > 0
    );
  }, [firestoreHouses]);

  // Category-Filtered & Rule-Sorted Listings for Take Rent
  const categoryListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const byCategory = allHousesWithPhotos.filter(
      (h) =>
        h.category === selectedTakeCategory &&
        (!q ||
          h.city.toLowerCase().includes(q) ||
          h.location.toLowerCase().includes(q))
    );

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
  }, [allHousesWithPhotos, selectedTakeCategory, searchQuery, userGps]);

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

  // Handlers
  const handleSelectTakeOption = (cat: RentalCategory) => {
    setSelectedTakeCategory(cat);
    setSearchQuery('');
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

    if (!profile.hasPaidOwnerFee) {
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

  const getDisplayedOwnerPhone = (house: HouseListingData): string => {
    const canSee = Boolean(
      profile?.hasPaidSeekerFee ||
        (user && house.ownerId === user.uid) ||
        isAdminUser
    );
    if (!canSee) {
      return '+91 ••••• •••••';
    }
    if (house.isDemo) {
      return house.demoPhone || '+91 98450 71234';
    }
    return unlockedPhones[house.id] || '+91 98450 71234';
  };

  const isPhoneUnlocked = (house: HouseListingData): boolean =>
    Boolean(
      profile?.hasPaidSeekerFee ||
        (user && house.ownerId === user.uid) ||
        isAdminUser
    );

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
              <span className="text-lg font-bold font-mono tabular-nums text-[#417545]">
                ₹{house.rentPrice.toLocaleString('en-IN')}/mo
              </span>
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
              Pay ₹49
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
                    Your home, in a box · మీ ఇల్లు, ఒకే బాక్స్‌లో
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

              {/* Zone 3: Saved button moved beside Sign In + Top-Right 3-Lines Services Menu */}
              <div className="relative flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setCurrentPage('saved')}
                  aria-label="Saved houses"
                  className={`min-h-[42px] px-3.5 py-2 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    currentPage === 'saved'
                      ? 'bg-[#EAF4E7] border-[#417545] text-[#417545]'
                      : 'border-[#DCEAD7] bg-white hover:bg-[#EAF4E7] text-[#417545]'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5 fill-[#417545]" />
                  <span>Saved ({savedHouseIds.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage('login')}
                  className="min-h-[42px] px-4 py-2 text-xs font-semibold text-white bg-[#417545] rounded-full hover:bg-[#356139] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {user ? `${profile?.points ?? 0} pts` : 'Sign In'}
                </button>

                {/* 2. 3-Lines Menu Icon at the Top Right Corner for Our Services */}
                <button
                  type="button"
                  onClick={() => setShowTopRightServicesMenu((prev) => !prev)}
                  aria-label="Open Our Services menu"
                  className="min-h-[42px] min-w-[42px] rounded-xl border border-[#DCEAD7] bg-white hover:bg-[#EAF4E7] text-[#141A15] flex items-center justify-center transition-colors cursor-pointer"
                >
                  {showTopRightServicesMenu ? (
                    <X className="w-5 h-5 text-[#417545]" />
                  ) : (
                    <Menu className="w-5 h-5 text-[#417545]" />
                  )}
                </button>

                {/* Top-Right Corner Dropdown Drawer for Our Services */}
                {showTopRightServicesMenu && (
                  <div className="absolute right-0 top-14 z-50 w-72 rounded-3xl border border-[#DCEAD7] bg-white p-4 shadow-xl space-y-2.5">
                    <div className="flex items-center justify-between px-1 pb-1 border-b border-[#EAF4E7]">
                      <span className="text-xs font-bold text-[#417545]">
                        Our Services · మా సేవలు
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowTopRightServicesMenu(false)}
                        className="text-xs text-[#5C6B5E] hover:text-[#141A15] cursor-pointer"
                      >
                        Close
                      </button>
                    </div>

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
                      <div className="w-10 h-10 rounded-xl bg-[#EAF4E7] text-[#417545] flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#141A15]">
                          Rental Agreement
                        </p>
                        <p className="text-[11px] text-[#5C6B5E]">అద్దె ఒప్పందం</p>
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
                      <div className="w-10 h-10 rounded-xl bg-[#EAF4E7] text-[#417545] flex items-center justify-center shrink-0">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#141A15]">
                          Packers & Movers
                        </p>
                        <p className="text-[11px] text-[#5C6B5E]">ఇల్లు షిఫ్టింగ్</p>
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
                      <div className="w-10 h-10 rounded-xl bg-[#417545] text-white flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5" />
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
          {/* PAGE 1: HOME SCREEN */}
          {currentPage === 'home' && (
            <div className="space-y-8">
              {/* 1. TOP BANNER SLIDESHOW (Includes the newly attached banners sliding one by one) */}
              <section className="relative rounded-3xl overflow-hidden border border-[#DCEAD7] bg-[#F1F9F1] shadow-xs">
                <div
                  className={`flex w-[500%] transition-transform duration-500 ease-out ${
                    heroBannerIndex === 0
                      ? 'translate-x-0'
                      : heroBannerIndex === 1
                      ? '-translate-x-[20%]'
                      : heroBannerIndex === 2
                      ? '-translate-x-[40%]'
                      : heroBannerIndex === 3
                      ? '-translate-x-[60%]'
                      : '-translate-x-[80%]'
                  }`}
                >
                  {TOP_HERO_BANNERS.map((banner) => (
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
                      className="w-1/5 shrink-0 block text-left cursor-pointer overflow-hidden"
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
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-white/80 backdrop-blur-xs px-3 py-1.5 rounded-full border border-[#DCEAD7]">
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

              {/* 6. 3-IMAGE SHOWCASE BANNER FOR JUST ADDED HOUSES (Below Top Take Rent Banner) */}
              <section className="rounded-3xl border border-[#DCEAD7] bg-[#F5FAF3] p-4 sm:p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-[#141A15]">
                      Just Added Houses · కొత్తగా చేర్చిన ఇళ్లు
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentPage('take_options')}
                    className="text-xs font-semibold text-[#417545] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
                  {allHousesWithPhotos.slice(0, 3).map((house) => (
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
                        Updated today
                      </span>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 sm:p-3">
                        <p className="text-white font-bold font-mono text-xs sm:text-sm leading-tight">
                          ₹{house.rentPrice.toLocaleString('en-IN')}/mo
                        </p>
                        <p className="text-white/90 text-[10px] sm:text-xs truncate">
                          {house.location}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              {/* 1. THREE MAIN CARDS (Take Rent, Give Rent, Rental Heroes with attached diagonal pattern) */}
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
                      I need a place · అద్దెకు ఇల్లు కావాలి
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
                      I am an owner · ఇల్లు అద్దెకు ఇవ్వండి
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
                      Earn points · పాయింట్లు గెలుచుకోండి
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
                          href={`tel:${CONTACT_TEL}`}
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
          {currentPage === 'take_options' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#417545]">
                    Take Rent · అద్దెకు కావాలి
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
                          {CATEGORY_META[cat].takeSubtitle} ·{' '}
                          {CATEGORY_META[cat].takeTelugu}
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
          {currentPage === 'search' && (
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
                    {CATEGORY_META[selectedTakeCategory].takeTitle} ·{' '}
                    {CATEGORY_META[selectedTakeCategory].takeTelugu}
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

                  {!profile?.hasPaidSeekerFee && (
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
                  )}
                </div>
              </div>

              {/* Single Clean Search Input (Search by city or area, no filters) */}
              <div className="relative">
                <SearchIcon className="w-5 h-5 text-[#5C6B5E] absolute left-5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by city or area..."
                  className="w-full h-14 pl-14 pr-5 rounded-3xl border border-[#DCEAD7] bg-[#F5FAF3] text-base text-[#141A15] placeholder:text-[#5C6B5E] focus:bg-white focus:outline-none focus:border-[#417545] transition-colors"
                />
              </div>

              {categoryListings.length === 0 ? (
                <div className="rounded-3xl border border-[#DCEAD7] p-12 text-center">
                  <p className="text-base font-semibold text-[#141A15]">
                    No {CATEGORY_META[selectedTakeCategory].takeTitle.toLowerCase()}{' '}
                    listings found
                  </p>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="mt-4 min-h-[44px] px-5 py-2 rounded-full bg-[#EAF4E7] text-xs font-semibold text-[#417545] hover:bg-[#DCEAD7] transition-colors cursor-pointer"
                    >
                      Clear Search
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
          {currentPage === 'saved' && (
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
          {currentPage === 'detail' && selectedHouse && (
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
                        <span>Pay ₹49 to Unlock Phone</span>
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
          {currentPage === 'give_options' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#417545]">
                    Give Rent · అద్దెకు ఇవ్వండి
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
          {currentPage === 'owner' && (
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

              {!user ? (
                <div className="rounded-3xl border border-[#DCEAD7] p-8 text-center space-y-4">
                  <KeyRound className="w-10 h-10 text-[#417545] mx-auto" />
                  <h2 className="text-lg font-bold text-[#141A15]">
                    Owner Sign In Required
                  </h2>
                  <p className="text-sm text-[#5C6B5E] max-w-md mx-auto">
                    Sign in to verify your phone with OTP, pay the ₹49 registration fee, and publish your listing.
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

                    {/* ₹49 Owner Fee Card */}
                    <div className="rounded-3xl border border-[#DCEAD7] p-6 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#5C6B5E]">
                            Step 2 · Owner Registration
                          </span>
                          <span className="text-xs font-mono font-bold text-[#417545]">
                            ₹49
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-[#141A15] mt-2 flex items-center gap-1.5">
                          <span>
                            {profile?.hasPaidOwnerFee
                              ? 'Verified Owner Account'
                              : 'One-time ₹49 Owner Fee'}
                          </span>
                          {profile?.hasPaidOwnerFee && (
                            <BadgeCheck className="w-5 h-5 fill-[#417545] text-white" />
                          )}
                        </h3>
                        <p className="text-xs text-[#5C6B5E] mt-1">
                          {profile?.hasPaidOwnerFee
                            ? 'You can upload, edit, or remove your rental listings.'
                            : 'Pay ₹49 via UPI or Razorpay to publish your listing.'}
                        </p>
                      </div>

                      {profile?.hasPaidOwnerFee ? (
                        <div className="min-h-[44px] px-4 rounded-full bg-[#EAF4E7] text-[#417545] text-xs font-semibold flex items-center gap-2">
                          <Check className="w-4 h-4" />
                          <span>₹49 Registration Paid</span>
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
          {currentPage === 'hero' && (
            <div className="space-y-8 max-w-3xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-[#141A15]">
                    Rental Heroes · ఫోటో తీసి గెలుచుకోండి
                  </h1>
                  <p className="text-sm text-[#5C6B5E]">
                    Take a photo of a &ldquo;To-Let&rdquo; board or house with GPS. Earn 100 points & a scratch card on approval.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage('rewards')}
                  className="min-h-[44px] px-5 py-2.5 rounded-full bg-[#417545] text-white text-xs font-semibold flex items-center gap-2 self-start sm:self-auto cursor-pointer whitespace-nowrap"
                >
                  <Wallet className="w-4 h-4" />
                  <span>{profile?.points ?? 0} Points · Scratch Cards</span>
                </button>
              </div>

              <form
                onSubmit={handleSubmitHeroUpload}
                className="rounded-3xl border border-[#DCEAD7] p-6 sm:p-8 space-y-5"
              >
                <h2 className="text-lg font-bold text-[#141A15]">
                  Upload To-Let Board Photo
                </h2>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  <img
                    src={heroPhoto}
                    alt="To-Let upload preview"
                    referrerPolicy="no-referrer"
                    className="w-36 h-28 rounded-2xl object-cover border border-[#DCEAD7] shrink-0"
                  />
                  <div className="space-y-2">
                    <label className="min-h-[44px] px-5 py-2.5 rounded-full bg-[#417545] hover:bg-[#356139] text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer">
                      <Camera className="w-4 h-4" />
                      <span>Take / Select Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleHeroPhotoChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-[#5C6B5E]">
                      Clear photo of the To-Let board or house.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#141A15] mb-1.5">
                      Street / Area Name
                    </label>
                    <input
                      type="text"
                      value={heroLocationText}
                      onChange={(e) => setHeroLocationText(e.target.value)}
                      placeholder="e.g. 80 Feet Road, Indiranagar"
                      maxLength={140}
                      className="w-full h-12 px-4 rounded-xl border border-[#DCEAD7] text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#141A15] mb-1.5">
                      GPS Location Tag
                    </label>
                    <button
                      type="button"
                      onClick={handleDetectGps}
                      className="w-full h-12 px-4 rounded-xl border border-[#DCEAD7] bg-[#F5FAF3] hover:bg-[#EAF4E7] text-left text-xs font-mono text-[#141A15] flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate">{gpsStatus}</span>
                      <MapPin className="w-4 h-4 text-[#417545] shrink-0 ml-2" />
                    </button>
                  </div>
                </div>

                {heroMsg && (
                  <p className="text-xs font-medium text-[#417545] bg-[#EAF4E7] border border-[#CFE3C8] rounded-xl px-4 py-2.5">
                    {heroMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={uploadingHero}
                  className="w-full min-h-[48px] rounded-full bg-[#417545] hover:bg-[#356139] text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>
                    {uploadingHero ? 'Uploading...' : 'Submit To-Let Upload (+100 Pts)'}
                  </span>
                </button>
              </form>

              <div className="space-y-4">
                <h2 className="text-lg font-bold text-[#141A15]">
                  Past Uploads ({myHeroUploads.length})
                </h2>
                {myHeroUploads.length === 0 ? (
                  <p className="text-sm text-[#5C6B5E]">
                    No uploads yet. Upload a To-Let photo above to earn 100 points.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {myHeroUploads.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-[#DCEAD7] p-4 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <img
                            src={item.photoUrl}
                            alt={item.locationText}
                            referrerPolicy="no-referrer"
                            className="w-16 h-14 rounded-xl object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[#141A15] truncate">
                              {item.locationText}
                            </p>
                            <p className="text-xs font-mono text-[#5C6B5E]">
                              GPS: {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)} ·{' '}
                              <span className="capitalize">{item.status}</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-bold font-mono tabular-nums text-[#417545]">
                            +{item.pointsAwarded} pts
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isAdminUser && (
                <div className="rounded-3xl border border-[#DCEAD7] p-6 sm:p-8 space-y-4 bg-[#F5FAF3]">
                  <div>
                    <h2 className="text-lg font-bold text-[#141A15] flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-[#417545]" />
                      <span>Admin Upload Approval</span>
                    </h2>
                    <p className="text-xs text-[#5C6B5E]">
                      Approve real To-Let photos to credit 100 points & a scratch card.
                    </p>
                  </div>

                  {pendingAdminUploads.length === 0 ? (
                    <p className="text-xs text-[#5C6B5E]">No uploads in queue.</p>
                  ) : (
                    <div className="space-y-3">
                      {pendingAdminUploads.map((u) => (
                        <div
                          key={u.id}
                          className="rounded-2xl bg-white border border-[#DCEAD7] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-4">
                            <img
                              src={u.photoUrl}
                              alt={u.locationText}
                              referrerPolicy="no-referrer"
                              className="w-16 h-14 rounded-xl object-cover shrink-0"
                            />
                            <div>
                              <p className="text-sm font-bold text-[#141A15]">
                                {u.locationText}
                              </p>
                              <p className="text-xs text-[#5C6B5E] font-mono">
                                By {u.userName} · Status: {u.status}
                              </p>
                            </div>
                          </div>
                          {u.status === 'pending' ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleAdminReviewUpload(u, 'approved')}
                                className="min-h-[40px] px-4 py-2 rounded-full bg-[#417545] hover:bg-[#356139] text-white text-xs font-semibold cursor-pointer"
                              >
                                Approve (+100 pts)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAdminReviewUpload(u, 'rejected')}
                                className="min-h-[40px] px-4 py-2 rounded-full border border-[#DCEAD7] text-[#5C6B5E] hover:bg-[#EAF4E7] text-xs font-semibold cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-semibold capitalize text-[#417545]">
                              {u.status}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PAGE 8: REWARDS & POINTS WALLET */}
          {currentPage === 'rewards' && (
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
                    Each approved upload = 100 points & 1 Scratch Card
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage('hero')}
                  className="min-h-[48px] px-6 py-3 rounded-full bg-white text-[#417545] text-xs font-bold cursor-pointer whitespace-nowrap"
                >
                  + Upload To-Let Photo
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
          {currentPage === 'login' && (
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
                      Sign in to unlock owner phone numbers, list your property for rent, or earn Rental Hero points.
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
                        {(profile?.hasPaidSeekerFee || profile?.hasPaidOwnerFee) && (
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
                        <span>Give Rent Registration (₹49)</span>
                        <span className="font-semibold text-[#141A15]">
                          {profile?.hasPaidOwnerFee ? 'Paid · Active' : 'Unpaid'}
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
        </main>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-[#DCEAD7] bg-[#F5FAF3] py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col items-center sm:items-start gap-6">
          <div className="w-full flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <img
                src="/assets/aistudio/rentalbox_288054f0.png"
                alt="RENTBOX Logo"
                className="w-10 h-10 object-contain shrink-0"
              />
              <div>
                <p className="text-base font-bold text-[#141A15]">
                  RENT<span className="text-[#00B353]">BOX</span>
                </p>
                <p className="text-xs text-[#5C6B5E]">
                  Your home, in a box · మీ ఇల్లు, ఒకే బాక్స్‌లో
                </p>
              </div>
            </div>

            {/* 5. Big size WhatsApp number and "WhatsApp us for contact" */}
            <a
              href={`https://wa.me/${CONTACT_TEL.replace('+', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-3xl bg-[#417545] hover:bg-[#356139] text-white px-6 py-4 flex items-center gap-4 transition-colors shadow-xs"
            >
              <span className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <MessageCircle className="w-6 h-6 text-white" />
              </span>
              <div className="text-left">
                <p className="text-xs font-semibold text-[#EAF4E7]">
                  WhatsApp us for contact · సంప్రదించడానికి వాట్సాప్ చేయండి
                </p>
                <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight mt-0.5">
                  {CONTACT_NUMBER}
                </p>
              </div>
            </a>
          </div>

          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#DCEAD7]">
            {/* 4. Only Instagram and WhatsApp social icons */}
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
                href={`https://wa.me/${CONTACT_TEL.replace('+', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="w-11 h-11 rounded-full bg-white border border-[#DCEAD7] text-[#417545] hover:bg-[#EAF4E7] flex items-center justify-center transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>

            <div className="flex items-center gap-5 text-xs font-medium text-[#5C6B5E]">
              {(['About', 'Contact', 'Terms', 'Privacy'] as const).map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => setFooterInfoTopic(topic)}
                  className="hover:text-[#141A15] cursor-pointer"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full text-center sm:text-left text-xs text-[#5C6B5E]">
            © 2026 RENTBOX
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
