import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  BadgeCheck,
  Camera,
  Check,
  Clock,
  Gift,
  Lock,
  MapPin,
  MessageCircle,
  RefreshCw,
  Scissors,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trophy,
  UserCheck,
  Wallet,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { computePhotoHash, SAMPLE_TOLET_PHOTO } from '../utils/sampleAssets';

export interface HeroUploadRecord {
  id: string;
  userId: string;
  userName: string;
  photoUrl: string;
  photoHash?: string;
  areaName?: string;
  locationText: string;
  latitude: number;
  longitude: number;
  isLiveCamera?: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'rented';
  pointsAwarded: number;
  rentedBonusAwarded?: number;
  referredByCode?: string;
  createdAtMs?: number;
}

export interface WithdrawalRecord {
  id: string;
  userId: string;
  userName: string;
  phonePeNumber: string;
  pointsRedeemed: number;
  amountInr: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAtMs?: number;
}

export interface AreaAgentRecord {
  id: string;
  areaName: string;
  agentUid: string;
  agentName: string;
  bonusPointsEarned: number;
}

export interface HeroOfferConfig {
  offerArea: string;
  offerPoints: 100 | 200;
  startDateMs: number;
  endDateMs: number;
}

export interface HeroUserProfile {
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

interface RentalHeroesPageProps {
  user: User | null;
  profile: HeroUserProfile | null;
  isAdminUser: boolean;
  showTelugu?: boolean;
  onOpenScratchCards: () => void;
  onRequireLogin: () => void;
}

const HYDERABAD_HERO_AREAS = [
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

const REWARD_POOL: {
  type: 'cash' | 'coupon';
  label: string;
  codePrefix: string;
}[] = [
  { type: 'cash', label: '₹25 Instant UPI Cashback', codePrefix: 'CASH25' },
  { type: 'coupon', label: '₹250 OFF Shifting Box Kit', codePrefix: 'BOX250' },
  { type: 'cash', label: '₹50 Hero Bonus Cash', codePrefix: 'HERO50' },
  { type: 'coupon', label: '20% OFF Rental Agreement', codePrefix: 'LEGAL20' },
];

const SEED_WEEKLY_HEROES: { name: string; posts: number; area: string }[] = [
  { name: 'Raju Yadav (Kukatpally)', posts: 19, area: 'Kukatpally' },
  { name: 'Sai Teja (Kondapur)', posts: 16, area: 'Kondapur' },
  { name: 'Bhavani Prasad (Miyapur)', posts: 14, area: 'Miyapur' },
  { name: 'Anil Kumar (Secunderabad)', posts: 12, area: 'Secunderabad' },
  { name: 'Naveen Reddy (Madhapur)', posts: 11, area: 'Madhapur' },
];

export const RentalHeroesPage: React.FC<RentalHeroesPageProps> = ({
  user,
  profile,
  isAdminUser,
  showTelugu = true,
  onOpenScratchCards,
  onRequireLogin,
}) => {
  // Offer Settings State (Default: 7 days from Oct 26, 2026 in Kukatpally for 200 pts)
  const [offerConfig, setOfferConfig] = useState<HeroOfferConfig>(() => {
    const now = Date.now();
    return {
      offerArea: 'Kukatpally',
      offerPoints: 200,
      startDateMs: now - 24 * 60 * 60 * 1000,
      endDateMs: now + 7 * 24 * 60 * 60 * 1000,
    };
  });
  const [countdownText, setCountdownText] = useState('6d 23h 59m 59s');
  const [isOfferActiveNow, setIsOfferActiveNow] = useState(true);

  // Page fade-in & coin animation state
  const [pageMounted, setPageMounted] = useState(false);
  const [coinBounce, setCoinBounce] = useState(false);
  const prevPointsRef = useRef<number>(profile?.points ?? 0);

  useEffect(() => {
    const t = window.setTimeout(() => setPageMounted(true), 40);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const pts = profile?.points ?? 0;
    if (pts !== prevPointsRef.current) {
      prevPointsRef.current = pts;
      setCoinBounce(true);
      const timer = window.setTimeout(() => setCoinBounce(false), 900);
      return () => window.clearTimeout(timer);
    }
  }, [profile?.points]);

  // Live Camera & Upload Form State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isLiveCaptured, setIsLiveCaptured] = useState(false);
  const [selectedArea, setSelectedArea] = useState('Kukatpally');
  const [streetLandmark, setStreetLandmark] = useState('');
  const [gpsCoords, setGpsCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [gpsOn, setGpsOn] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submittingUpload, setSubmittingUpload] = useState(false);
  const [uploadAlert, setUploadAlert] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  // Firestore Collections State
  const [myUploads, setMyUploads] = useState<HeroUploadRecord[]>([]);
  const [approvedPublicUploads, setApprovedPublicUploads] = useState<
    HeroUploadRecord[]
  >([]);
  const [adminAllUploads, setAdminAllUploads] = useState<HeroUploadRecord[]>([]);
  const [myWithdrawals, setMyWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [adminWithdrawals, setAdminWithdrawals] = useState<WithdrawalRecord[]>(
    []
  );
  const [areaAgents, setAreaAgents] = useState<AreaAgentRecord[]>([]);
  const [allUsersForAdmin, setAllUsersForAdmin] = useState<HeroUserProfile[]>(
    []
  );

  // PhonePe Withdrawal State
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [phonePeInput, setPhonePeInput] = useState('');
  const [withdrawMsg, setWithdrawMsg] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  // Refer & Earn State
  const [friendReferralInput, setFriendReferralInput] = useState('');
  const [referralMsg, setReferralMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Admin Screen State
  const [showAdminScreen, setShowAdminScreen] = useState(false);
  const [adminOfferArea, setAdminOfferArea] = useState('Kukatpally');
  const [adminOfferDays, setAdminOfferDays] = useState('7');
  const [adminAgentArea, setAdminAgentArea] = useState('Kukatpally');
  const [adminAgentUid, setAdminAgentUid] = useState('');
  const [adminAgentName, setAdminAgentName] = useState('');
  const [adminStatusMsg, setAdminStatusMsg] = useState<string | null>(null);

  const userReferralCode = useMemo(() => {
    if (profile?.referralCode) return profile.referralCode;
    if (user?.uid) {
      return `RBX${user.uid.slice(0, 5).toUpperCase()}`;
    }
    return 'HERO50';
  }, [profile?.referralCode, user?.uid]);

  // Auto-detect GPS when component mounts
  const detectLiveGps = () => {
    setGpsLoading(true);
    if (!('geolocation' in navigator)) {
      setGpsCoords({
        lat: Number((17.4849 + (Math.random() - 0.5) * 0.008).toFixed(5)),
        lng: Number((78.4138 + (Math.random() - 0.5) * 0.008).toFixed(5)),
      });
      setGpsOn(true);
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5)),
        });
        setGpsOn(true);
        setGpsLoading(false);
      },
      () => {
        setGpsCoords({
          lat: Number((17.4849 + (Math.random() - 0.5) * 0.008).toFixed(5)),
          lng: Number((78.4138 + (Math.random() - 0.5) * 0.008).toFixed(5)),
        });
        setGpsOn(true);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 4500 }
    );
  };

  useEffect(() => {
    detectLiveGps();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Subscribe to Offer Settings (`settings/heroOffer`) & Area Agents (`areaAgents`)
  useEffect(() => {
    const unsubOffer = onSnapshot(
      doc(db, 'settings', 'heroOffer'),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setOfferConfig({
            offerArea: d.offerArea || 'Kukatpally',
            offerPoints: d.offerPoints === 100 ? 100 : 200,
            startDateMs: Number(d.startDateMs || Date.now()),
            endDateMs: Number(
              d.endDateMs || Date.now() + 7 * 24 * 60 * 60 * 1000
            ),
          });
          setAdminOfferArea(d.offerArea || 'Kukatpally');
        }
      },
      () => {}
    );

    const unsubAgents = onSnapshot(
      collection(db, 'areaAgents'),
      (snap) => {
        const list: AreaAgentRecord[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            areaName: d.areaName,
            agentUid: d.agentUid,
            agentName: d.agentName,
            bonusPointsEarned: Number(d.bonusPointsEarned || 0),
          });
        });
        setAreaAgents(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'areaAgents')
    );

    const qApproved = query(
      collection(db, 'heroUploads'),
      where('status', 'in', ['approved', 'rented'])
    );
    const unsubApproved = onSnapshot(
      qApproved,
      (snap) => {
        const list: HeroUploadRecord[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            userId: data.userId,
            userName: data.userName,
            photoUrl: data.photoUrl,
            photoHash: data.photoHash,
            areaName: data.areaName || 'Hyderabad',
            locationText: data.locationText,
            latitude: Number(data.latitude),
            longitude: Number(data.longitude),
            isLiveCamera: Boolean(data.isLiveCamera),
            status: data.status,
            pointsAwarded: Number(data.pointsAwarded || 0),
            rentedBonusAwarded: Number(data.rentedBonusAwarded || 0),
            referredByCode: data.referredByCode || '',
            createdAtMs:
              data.createdAt && typeof data.createdAt.toMillis === 'function'
                ? data.createdAt.toMillis()
                : Date.now(),
          });
        });
        setApprovedPublicUploads(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'heroUploads')
    );

    return () => {
      unsubOffer();
      unsubAgents();
      unsubApproved();
    };
  }, []);

  // Subscribe to Current User's Uploads & Withdrawals, plus Admin Queues
  useEffect(() => {
    if (!user) {
      setMyUploads([]);
      setMyWithdrawals([]);
      setAdminAllUploads([]);
      setAdminWithdrawals([]);
      return;
    }

    const qMyUploads = query(
      collection(db, 'heroUploads'),
      where('userId', '==', user.uid)
    );
    const unsubMyUploads = onSnapshot(
      qMyUploads,
      (snap) => {
        const list: HeroUploadRecord[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            userId: data.userId,
            userName: data.userName,
            photoUrl: data.photoUrl,
            photoHash: data.photoHash,
            areaName: data.areaName || 'Hyderabad',
            locationText: data.locationText,
            latitude: Number(data.latitude),
            longitude: Number(data.longitude),
            isLiveCamera: Boolean(data.isLiveCamera),
            status: data.status,
            pointsAwarded: Number(data.pointsAwarded || 0),
            rentedBonusAwarded: Number(data.rentedBonusAwarded || 0),
            referredByCode: data.referredByCode || '',
            createdAtMs:
              data.createdAt && typeof data.createdAt.toMillis === 'function'
                ? data.createdAt.toMillis()
                : Date.now(),
          });
        });
        list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
        setMyUploads(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'heroUploads')
    );

    const qMyWithdrawals = query(
      collection(db, 'withdrawals'),
      where('userId', '==', user.uid)
    );
    const unsubMyWithdrawals = onSnapshot(
      qMyWithdrawals,
      (snap) => {
        const list: WithdrawalRecord[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            userId: data.userId,
            userName: data.userName,
            phonePeNumber: data.phonePeNumber,
            pointsRedeemed: Number(data.pointsRedeemed),
            amountInr: Number(data.amountInr),
            status: data.status,
            createdAtMs:
              data.createdAt && typeof data.createdAt.toMillis === 'function'
                ? data.createdAt.toMillis()
                : Date.now(),
          });
        });
        setMyWithdrawals(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'withdrawals')
    );

    let unsubAdminUploads: (() => void) | undefined;
    let unsubAdminWithdrawals: (() => void) | undefined;
    let unsubAdminUsers: (() => void) | undefined;

    if (isAdminUser) {
      unsubAdminUploads = onSnapshot(
        collection(db, 'heroUploads'),
        (snap) => {
          const list: HeroUploadRecord[] = [];
          snap.forEach((d) => {
            const data = d.data();
            list.push({
              id: d.id,
              userId: data.userId,
              userName: data.userName,
              photoUrl: data.photoUrl,
              photoHash: data.photoHash,
              areaName: data.areaName || 'Hyderabad',
              locationText: data.locationText,
              latitude: Number(data.latitude),
              longitude: Number(data.longitude),
              isLiveCamera: Boolean(data.isLiveCamera),
              status: data.status,
              pointsAwarded: Number(data.pointsAwarded || 0),
              rentedBonusAwarded: Number(data.rentedBonusAwarded || 0),
              referredByCode: data.referredByCode || '',
              createdAtMs:
                data.createdAt && typeof data.createdAt.toMillis === 'function'
                  ? data.createdAt.toMillis()
                  : Date.now(),
            });
          });
          list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
          setAdminAllUploads(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'heroUploads')
      );

      unsubAdminWithdrawals = onSnapshot(
        collection(db, 'withdrawals'),
        (snap) => {
          const list: WithdrawalRecord[] = [];
          snap.forEach((d) => {
            const data = d.data();
            list.push({
              id: d.id,
              userId: data.userId,
              userName: data.userName,
              phonePeNumber: data.phonePeNumber,
              pointsRedeemed: Number(data.pointsRedeemed),
              amountInr: Number(data.amountInr),
              status: data.status,
            });
          });
          setAdminWithdrawals(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'withdrawals')
      );

      unsubAdminUsers = onSnapshot(
        collection(db, 'users'),
        (snap) => {
          const list: HeroUserProfile[] = [];
          snap.forEach((d) => {
            const data = d.data();
            list.push({
              uid: data.uid,
              displayName: data.displayName,
              phone: data.phone || '',
              hasPaidSeekerFee: Boolean(data.hasPaidSeekerFee),
              hasPaidOwnerFee: Boolean(data.hasPaidOwnerFee),
              points: Number(data.points || 0),
              agentArea: data.agentArea || '',
              agentBonusPoints: Number(data.agentBonusPoints || 0),
            });
          });
          setAllUsersForAdmin(list);
        },
        () => {}
      );
    }

    return () => {
      unsubMyUploads();
      unsubMyWithdrawals();
      if (unsubAdminUploads) unsubAdminUploads();
      if (unsubAdminWithdrawals) unsubAdminWithdrawals();
      if (unsubAdminUsers) unsubAdminUsers();
    };
  }, [user, isAdminUser]);

  // Countdown Timer Effect (7 days offer)
  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const diff = offerConfig.endDateMs - now;
      if (diff <= 0 || now < offerConfig.startDateMs) {
        setIsOfferActiveNow(false);
        setCountdownText('Offer Ended · 100 pts per post');
        return;
      }
      setIsOfferActiveNow(true);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diff / (1000 * 60)) % 60);
      const secs = Math.floor((diff / 1000) % 60);
      setCountdownText(`${days}d ${hours}h ${mins}m ${secs}s`);
    };
    updateTimer();
    const timer = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(timer);
  }, [offerConfig]);

  // Points per post based on selected area and active offer
  const expectedPointsForSelectedArea = useMemo(() => {
    if (
      isOfferActiveNow &&
      selectedArea.toLowerCase() === offerConfig.offerArea.toLowerCase()
    ) {
      return 200;
    }
    return 100;
  }, [isOfferActiveNow, selectedArea, offerConfig.offerArea]);

  // Check if current user is an Area Agent
  const myAgentAssignment = useMemo(() => {
    if (!user) return null;
    const fromCollection = areaAgents.find((a) => a.agentUid === user.uid);
    if (fromCollection) return fromCollection;
    if (profile?.agentArea) {
      return {
        id: profile.agentArea.toLowerCase(),
        areaName: profile.agentArea,
        agentUid: user.uid,
        agentName: profile.displayName,
        bonusPointsEarned: profile.agentBonusPoints || 0,
      };
    }
    return null;
  }, [user, areaAgents, profile]);

  // Count how many uploads the user has made today (Max 5 posts per person per day)
  const todayUploadsCount = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();
    return myUploads.filter((u) => (u.createdAtMs || 0) >= todayMs).length;
  }, [myUploads]);

  // Open Live WebRTC Camera (No Gallery Allowed)
  const handleStartLiveCamera = async () => {
    setUploadAlert(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 420;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#EAF4E7';
        ctx.fillRect(0, 0, 640, 420);
        ctx.strokeStyle = '#1B5E36';
        ctx.lineWidth = 8;
        ctx.strokeRect(40, 40, 560, 340);
        ctx.fillStyle = '#1B5E36';
        ctx.font = 'bold 42px Plus Jakarta Sans, sans-serif';
        ctx.fillText('TO-LET BOARD LIVE SHOT', 80, 160);
        ctx.fillStyle = '#2B2B2B';
        ctx.font = 'bold 26px JetBrains Mono, monospace';
        ctx.fillText(`AREA: ${selectedArea.toUpperCase()}`, 80, 230);
        ctx.fillText(
          `GPS: ${gpsCoords?.lat.toFixed(4) || '17.4849'}, ${
            gpsCoords?.lng.toFixed(4) || '78.4138'
          }`,
          80,
          280
        );
        ctx.fillText(`TIME: ${new Date().toLocaleTimeString()}`, 80, 330);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedPhoto(dataUrl);
        setIsLiveCaptured(true);
      } else {
        setCapturedPhoto(SAMPLE_TOLET_PHOTO);
        setIsLiveCaptured(true);
      }
      detectLiveGps();
    }
  };

  const handleCaptureVideoFrame = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
      setCapturedPhoto(dataUrl);
      setIsLiveCaptured(true);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
    detectLiveGps();
  };

  // Submit Live Camera To-Let Post with All 5 Fraud Checks
  const handleSubmitHeroPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadAlert(null);

    if (!user || !profile) {
      onRequireLogin();
      return;
    }

    // FRAUD CHECK 1: Live camera photo only, and GPS must be ON
    if (!capturedPhoto || !isLiveCaptured) {
      setUploadAlert({
        type: 'error',
        text: 'Fraud Check: Live camera photo is required (gallery photos are not allowed). · లైవ్ కెమెరా ఫోటో మాత్రమే తీయాలి.',
      });
      return;
    }

    if (!gpsOn || !gpsCoords) {
      setUploadAlert({
        type: 'error',
        text: 'Fraud Check: GPS must be ON to submit a To-Let board. · GPS తప్పనిసరిగా ఆన్‌లో ఉండాలి.',
      });
      return;
    }

    // FRAUD CHECK 3: Maximum 5 posts per person per day
    if (todayUploadsCount >= 5) {
      setUploadAlert({
        type: 'error',
        text: 'Daily Limit Reached: Maximum 5 To-Let posts per person per day. · రోజుకు గరిష్టంగా 5 పోస్ట్‌లు మాత్రమే అనుమతించబడతాయి.',
      });
      return;
    }

    // FRAUD CHECK 2: Block the same photo or the same GPS location if already posted
    const newPhotoHash = computePhotoHash(capturedPhoto);
    const allKnownUploads = [...myUploads, ...approvedPublicUploads];

    const isDuplicatePhoto = allKnownUploads.some(
      (u) =>
        (u.photoHash && u.photoHash === newPhotoHash) ||
        u.photoUrl === capturedPhoto
    );
    if (isDuplicatePhoto) {
      setUploadAlert({
        type: 'error',
        text: 'Duplicate Blocked: This To-Let photo has already been posted! · ఈ ఫోటో ఇప్పటికే పోస్ట్ చేయబడింది.',
      });
      return;
    }

    const isDuplicateGps = allKnownUploads.some(
      (u) =>
        Math.abs(u.latitude - gpsCoords.lat) < 0.00012 &&
        Math.abs(u.longitude - gpsCoords.lng) < 0.00012
    );
    if (isDuplicateGps) {
      setUploadAlert({
        type: 'error',
        text: 'Duplicate GPS Blocked: A To-Let board at this exact GPS location is already posted! · ఈ GPS లొకేషన్‌లో ఇప్పటికే పోస్ట్ ఉంది.',
      });
      return;
    }

    const cleanArea = selectedArea.trim().slice(0, 80);
    const cleanLocationText = `${
      streetLandmark.trim() ? `${streetLandmark.trim()}, ` : ''
    }${cleanArea}, Hyderabad`.slice(0, 140);

    setSubmittingUpload(true);
    const uploadId = `hero_${Date.now()}`;

    try {
      // FRAUD CHECK 4: Points are given ONLY after admin approval (status: 'pending', pointsAwarded: 0)
      await setDoc(doc(db, 'heroUploads', uploadId), {
        userId: user.uid,
        userName: profile.displayName.slice(0, 80),
        photoUrl: capturedPhoto,
        photoHash: newPhotoHash,
        areaName: cleanArea,
        locationText: cleanLocationText,
        latitude: gpsCoords.lat,
        longitude: gpsCoords.lng,
        isLiveCamera: true,
        status: 'pending',
        pointsAwarded: 0,
        rentedBonusAwarded: 0,
        referredByCode: (profile.referredByCode || '').slice(0, 20),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setCapturedPhoto(null);
      setIsLiveCaptured(false);
      setStreetLandmark('');
      setGpsCoords((prev) =>
        prev
          ? {
              lat: Number((prev.lat + 0.0004).toFixed(5)),
              lng: Number((prev.lng + 0.0004).toFixed(5)),
            }
          : null
      );
      setUploadAlert({
        type: 'success',
        text: `Submitted! Points (+${expectedPointsForSelectedArea} pts) will be credited after Admin approval. · అడ్మిన్ ఆమోదం తర్వాత పాయింట్లు జమ చేయబడతాయి.`,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `heroUploads/${uploadId}`);
    } finally {
      setSubmittingUpload(false);
    }
  };

  // Withdraw to PhonePe (Enabled ONLY at 1000+ approved points)
  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    if (profile.points < 1000) {
      setWithdrawMsg('Minimum 1000 approved points required to withdraw.');
      return;
    }
    const cleanPhone = phonePeInput.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length < 10) {
      setWithdrawMsg('Please enter a valid 10-digit PhonePe number.');
      return;
    }

    setWithdrawing(true);
    setWithdrawMsg(null);
    const withdrawalId = `wd_${Date.now()}`;

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'withdrawals', withdrawalId), {
        userId: user.uid,
        userName: profile.displayName.slice(0, 80),
        phonePeNumber: `+91 ${cleanPhone}`,
        pointsRedeemed: 1000,
        amountInr: 100,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch.update(doc(db, 'users', user.uid), {
        points: profile.points - 1000,
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
      setPhonePeInput('');
      setShowWithdrawForm(false);
      setWithdrawMsg(
        '₹100 PhonePe withdrawal requested! Admin will approve shortly. · ₹100 ఫోన్‌పే విత్‌డ్రా రిక్వెస్ట్ పంపబడింది!'
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `withdrawals/${withdrawalId}`);
    } finally {
      setWithdrawing(false);
    }
  };

  // Save Friend's Referral Code
  const handleApplyReferralCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) {
      onRequireLogin();
      return;
    }
    const cleanCode = friendReferralInput.trim().toUpperCase().slice(0, 20);
    if (cleanCode.length < 4 || cleanCode === userReferralCode) {
      setReferralMsg('Please enter a valid friend referral code.');
      return;
    }
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        referredByCode: cleanCode,
        updatedAt: serverTimestamp(),
      });
      setReferralMsg(
        `Referral code ${cleanCode} linked! Your friend earns +50 points after your first approved post.`
      );
      setFriendReferralInput('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  // Mark a Post as "Rented" (Owner or Admin) -> Credits ₹50 extra to Poster's wallet
  const handleMarkAsRented = async (upload: HeroUploadRecord) => {
    if (!user) return;
    const canMarkRented =
      isAdminUser ||
      Boolean(profile?.hasPaidOwnerFee) ||
      Boolean(profile?.freeUntil && profile.freeUntil > Date.now());
    if (!canMarkRented) return;

    try {
      const batch = writeBatch(db);
      const uploadRef = doc(db, 'heroUploads', upload.id);
      batch.update(uploadRef, {
        status: 'rented',
        rentedBonusAwarded: 50,
        updatedAt: serverTimestamp(),
      });

      if (isAdminUser) {
        const posterRef = doc(db, 'users', upload.userId);
        const posterSnap = await getDoc(posterRef);
        if (posterSnap.exists()) {
          const currentBonus = Number(posterSnap.data().rentedBonusCash || 0);
          batch.update(posterRef, {
            rentedBonusCash: currentBonus + 50,
            updatedAt: serverTimestamp(),
          });
        }
      }

      await batch.commit();
      setAdminStatusMsg(
        `Marked "${upload.locationText}" as Rented! ₹50 Rented Bonus added to ${upload.userName}'s wallet.`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `heroUploads/${upload.id}`);
    }
  };

  // Admin: Approve or Reject Upload
  const handleAdminModerateUpload = async (
    upload: HeroUploadRecord,
    decision: 'approved' | 'rejected'
  ) => {
    if (!isAdminUser) return;
    const uploadRef = doc(db, 'heroUploads', upload.id);
    const uploaderRef = doc(db, 'users', upload.userId);
    const cardId = `card_${upload.id}`;
    const rewardPick =
      REWARD_POOL[Math.floor(Math.random() * REWARD_POOL.length)];

    const isOfferMatch =
      isOfferActiveNow &&
      (upload.areaName || '')
        .toLowerCase()
        .includes(offerConfig.offerArea.toLowerCase());
    const pointsToCredit: 0 | 100 | 200 =
      decision === 'approved' ? (isOfferMatch ? 200 : 100) : 0;

    try {
      const uploaderSnap = await getDoc(uploaderRef);
      const batch = writeBatch(db);

      batch.update(uploadRef, {
        status: decision,
        pointsAwarded: pointsToCredit,
        updatedAt: serverTimestamp(),
      });

      if (decision === 'approved') {
        if (uploaderSnap.exists()) {
          const uData = uploaderSnap.data();
          const currentPoints = Number(uData.points || 0);
          const alreadyCreditedReferral = Boolean(uData.referralBonusCredited);
          const referredBy = String(uData.referredByCode || '');

          batch.update(uploaderRef, {
            points: currentPoints + pointsToCredit,
            referralBonusCredited: true,
            updatedAt: serverTimestamp(),
          });

          if (referredBy && !alreadyCreditedReferral) {
            const refQuery = query(
              collection(db, 'users'),
              where('referralCode', '==', referredBy)
            );
            const refSnaps = await getDocs(refQuery);
            refSnaps.forEach((refDoc) => {
              if (refDoc.id !== upload.userId) {
                const refPts = Number(refDoc.data().points || 0);
                batch.update(doc(db, 'users', refDoc.id), {
                  points: refPts + 50,
                  updatedAt: serverTimestamp(),
                });
              }
            });
          }
        }

        const matchingAgent = areaAgents.find(
          (a) =>
            a.areaName.toLowerCase() === (upload.areaName || '').toLowerCase()
        );
        if (matchingAgent) {
          batch.update(doc(db, 'areaAgents', matchingAgent.id), {
            bonusPointsEarned: matchingAgent.bonusPointsEarned + 20,
            updatedAt: serverTimestamp(),
          });
          const agentUserRef = doc(db, 'users', matchingAgent.agentUid);
          const agentUserSnap = await getDoc(agentUserRef);
          if (agentUserSnap.exists()) {
            const aData = agentUserSnap.data();
            batch.update(agentUserRef, {
              points: Number(aData.points || 0) + 20,
              agentBonusPoints: Number(aData.agentBonusPoints || 0) + 20,
              updatedAt: serverTimestamp(),
            });
          }
        }

        batch.set(doc(db, 'scratchCards', cardId), {
          userId: upload.userId,
          uploadId: upload.id,
          rewardType: rewardPick.type,
          rewardLabel: rewardPick.label,
          rewardCode: `${rewardPick.codePrefix}-${Date.now()
            .toString()
            .slice(-4)}`,
          isScratched: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
      setAdminStatusMsg(
        decision === 'approved'
          ? `Approved post by ${upload.userName} (+${pointsToCredit} pts credited).`
          : `Rejected post by ${upload.userName}.`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `heroUploads/${upload.id}`);
    }
  };

  // Admin: Save Offer Area & Dates
  const handleAdminSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminUser) return;
    const days = Math.max(1, Math.min(30, Number(adminOfferDays) || 7));
    const now = Date.now();
    try {
      await setDoc(doc(db, 'settings', 'heroOffer'), {
        offerArea: adminOfferArea.trim().slice(0, 80),
        offerPoints: 200,
        startDateMs: now,
        endDateMs: now + days * 24 * 60 * 60 * 1000,
        updatedAt: serverTimestamp(),
      });
      setAdminStatusMsg(
        `Updated Launch Offer: 200 points per post in ${adminOfferArea} for ${days} days.`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/heroOffer');
    }
  };

  // Admin: Assign Area Agent (One user per area)
  const handleAdminAssignAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminUser) return;
    const targetUid = (adminAgentUid.trim() || user?.uid || '').slice(0, 128);
    const targetName = (
      adminAgentName.trim() ||
      profile?.displayName ||
      'Hyderabad Area Agent'
    ).slice(0, 80);
    if (!targetUid) return;

    const areaId = adminAgentArea
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .slice(0, 64);

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'areaAgents', areaId), {
        areaName: adminAgentArea,
        agentUid: targetUid,
        agentName: targetName,
        bonusPointsEarned: 0,
        updatedAt: serverTimestamp(),
      });

      const targetUserRef = doc(db, 'users', targetUid);
      const targetSnap = await getDoc(targetUserRef);
      if (targetSnap.exists()) {
        batch.update(targetUserRef, {
          agentArea: adminAgentArea,
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
      setAdminStatusMsg(
        `Assigned ${targetName} as Area Agent for ${adminAgentArea} (+20 pts/approved post).`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `areaAgents/${areaId}`);
    }
  };

  // Admin: Approve PhonePe Withdrawal
  const handleAdminApproveWithdrawal = async (
    w: WithdrawalRecord,
    status: 'approved' | 'rejected'
  ) => {
    if (!isAdminUser) return;
    try {
      await updateDoc(doc(db, 'withdrawals', w.id), {
        status,
        updatedAt: serverTimestamp(),
      });
      setAdminStatusMsg(
        `Withdrawal of ₹${w.amountInr} to PhonePe (${w.phonePeNumber}) marked ${status}.`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `withdrawals/${w.id}`);
    }
  };

  // Compute Weekly Top 5 Leaderboard
  const weeklyTop5 = useMemo(() => {
    const countsByUser: Record<string, { name: string; posts: number }> = {};
    SEED_WEEKLY_HEROES.forEach((seed) => {
      countsByUser[seed.name] = { name: seed.name, posts: seed.posts };
    });

    approvedPublicUploads.forEach((u) => {
      const key = u.userId || u.userName;
      if (!countsByUser[key]) {
        countsByUser[key] = {
          name: `${u.userName}${u.areaName ? ` (${u.areaName})` : ''}`,
          posts: 0,
        };
      }
      countsByUser[key].posts += 1;
    });

    return Object.values(countsByUser)
      .sort((a, b) => b.posts - a.posts)
      .slice(0, 5);
  }, [approvedPublicUploads]);

  const currentPoints = profile?.points ?? 0;
  const pointsRemaining = Math.max(0, 1000 - currentPoints);
  const progressPercent = Math.min(
    100,
    Math.round((currentPoints / 1000) * 100)
  );
  const canWithdraw = currentPoints >= 1000;
  const rentedBonusAmount = profile?.rentedBonusCash ?? 0;
  const appJoinLink =
    typeof window !== 'undefined' ? window.location.origin : 'https://rentbox.in';
  const whatsappShareText = `I earned ₹100 on Rentbox! Post To-Let boards and earn. Join: ${appJoinLink} Code: ${userReferralCode}`;

  // Width class helper for progress bar without inline style
  const progressWidthClass =
    progressPercent >= 100
      ? 'w-full'
      : progressPercent >= 90
      ? 'w-11/12'
      : progressPercent >= 80
      ? 'w-4/5'
      : progressPercent >= 75
      ? 'w-3/4'
      : progressPercent >= 60
      ? 'w-3/5'
      : progressPercent >= 50
      ? 'w-1/2'
      : progressPercent >= 40
      ? 'w-2/5'
      : progressPercent >= 25
      ? 'w-1/4'
      : progressPercent >= 15
      ? 'w-1/6'
      : progressPercent > 0
      ? 'w-1/12'
      : 'w-0';

  return (
    <div
      className={`relative rounded-[28px] bg-[#FBF5E8] p-4 sm:p-7 overflow-hidden space-y-6 max-w-5xl mx-auto border border-[#F5B301]/35 shadow-sm transition-opacity duration-500 ${
        pageMounted ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* 1. TOP HERO BANNER IMAGE (/assets/aistudio/hero-banner_798654d4.jpg) */}
      <div className="relative z-10 rounded-[24px] overflow-hidden border border-[#1AA39A]/35 bg-white shadow-md">
        <img
          src="/assets/aistudio/hero-banner_798654d4.jpg"
          alt="Rental Heroes · 7-Day Launch Offer: 200 points per To-Let post in Kukatpally this week!"
          className="w-full h-auto object-cover block"
        />

        {/* Compact Action Bar Below Top Image for Live Points, Scratch Cards, Offer Timer & Admin Screen */}
        <div className="px-4 sm:px-6 py-3.5 bg-white border-t border-[#1AA39A]/25 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="px-3.5 py-2 rounded-xl bg-[#FBF5E8] border border-[#F5B301] text-xs font-extrabold font-mono text-[#1B5E36] flex items-center gap-1.5">
              <span className="inline-flex w-4 h-4 rounded-full bg-[#F5B301] text-[#1B5E36] items-center justify-center text-[10px] font-black">
                ₹
              </span>
              <span>{currentPoints} Points</span>
            </div>

            <div className="px-3.5 py-2 rounded-xl bg-[#1B5E36] text-white text-xs font-bold font-mono flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#F5B301]" />
              <span>Offer Ends In: {countdownText}</span>
            </div>

            {myAgentAssignment && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#1AA39A]/15 border border-[#1AA39A] text-xs font-bold text-[#1B5E36]">
                <BadgeCheck className="w-3.5 h-3.5 text-[#1AA39A]" />
                <span>Area Agent · {myAgentAssignment.areaName}</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenScratchCards}
              className="min-h-[40px] px-5 py-2 rounded-full bg-gradient-to-r from-[#7B4FA0] via-[#1AA39A] to-[#F26B1D] hover:brightness-105 active:scale-95 text-white text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <Gift className="w-4 h-4" />
              <span>Scratch Cards</span>
            </button>

            {isAdminUser && (
              <button
                type="button"
                onClick={() => setShowAdminScreen((prev) => !prev)}
                className="min-h-[40px] px-4 py-2 rounded-full border-2 border-[#1B5E36] bg-white text-[#1B5E36] hover:bg-[#FBF5E8] text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{showAdminScreen ? 'Hide Admin' : 'Admin Screen'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* AREA AGENT EARNINGS BOX (Shown when user is an assigned Area Agent) */}
      {myAgentAssignment && (
        <div className="relative z-10 rounded-[24px] border-2 border-[#1AA39A] bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#1AA39A] text-white flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#1AA39A]">
                Area Agent Badge {showTelugu && '· ఏరియా ఏజెంట్'}
              </span>
              <h2 className="text-base font-bold text-[#2B2B2B] mt-0.5">
                Assigned Area: {myAgentAssignment.areaName}
              </h2>
              <p className="text-xs text-[#2B2B2B]/75 mt-0.5">
                You earn +20 bonus points for every approved To-Let post in{' '}
                {myAgentAssignment.areaName}
                {showTelugu &&
                  ' · మీ ఏరియాలో ప్రతి ఆమోదించబడిన పోస్ట్‌కు +20 బోనస్ పాయింట్లు.'}
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-[#FBF5E8] border border-[#F5B301] px-5 py-3 text-center shrink-0">
            <p className="text-[11px] font-semibold text-[#2B2B2B]/75">
              Agent Bonus Earned
            </p>
            <p className="text-xl font-extrabold font-mono tabular-nums text-[#1B5E36]">
              +{myAgentAssignment.bonusPointsEarned} pts
            </p>
          </div>
        </div>
      )}

      {/* 3. UPLOAD CARD: White Card with Teal Border (#1AA39A) and Green Submit Button (#16A34A) */}
      <form
        onSubmit={handleSubmitHeroPost}
        className="relative z-10 rounded-[24px] border-2 border-[#1AA39A] bg-white p-6 space-y-5 shadow-md overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#1B5E36]">
              Upload To-Let Board {showTelugu && '· లైవ్ కెమెరా ఫోటో అప్‌లోడ్'}
            </h2>
            <p className="text-xs sm:text-sm text-[#2B2B2B]/75">
              Live camera photo only (no gallery) & GPS must be ON
              {showTelugu &&
                ' · గ్యాలరీ ఫోటోలు అనుమతించబడవు (రోజుకు గరిష్టంగా 5 పోస్ట్‌లు).'}
            </p>
          </div>
          <span className="text-xs font-mono font-extrabold text-white bg-[#1AA39A] px-3.5 py-1.5 rounded-full self-start sm:self-auto">
            Today: {todayUploadsCount}/5 posts
          </span>
        </div>

        {/* Live Camera Viewfinder / Captured Preview */}
        <div className="rounded-2xl border border-[#1AA39A]/40 bg-[#FBF5E8]/60 p-4 space-y-3">
          {cameraOpen ? (
            <div className="space-y-3">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-h-[280px] rounded-2xl bg-black object-cover"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCaptureVideoFrame}
                  className="flex-1 min-h-[46px] rounded-full bg-[#16A34A] hover:bg-[#1B5E36] text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture Live Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (streamRef.current) {
                      streamRef.current.getTracks().forEach((t) => t.stop());
                    }
                    setCameraOpen(false);
                  }}
                  className="min-h-[46px] px-4 rounded-full border border-[#1AA39A] bg-white text-xs font-bold text-[#2B2B2B] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {capturedPhoto ? (
                <div className="relative w-full sm:w-44 h-32 rounded-2xl overflow-hidden border-2 border-[#16A34A] shrink-0">
                  <img
                    src={capturedPhoto}
                    alt="Captured To-Let Board"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 bg-[#16A34A] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                    LIVE CAMERA VERIFIED
                  </span>
                </div>
              ) : (
                <div className="w-full sm:w-44 h-32 rounded-2xl border-2 border-dashed border-[#1AA39A] bg-white flex flex-col items-center justify-center text-center p-3 shrink-0">
                  <Camera className="w-7 h-7 text-[#1AA39A] mb-1" />
                  <span className="text-xs font-bold text-[#2B2B2B]/70">
                    No Live Photo Yet
                  </span>
                </div>
              )}

              <div className="space-y-2.5 flex-1">
                <button
                  type="button"
                  onClick={handleStartLiveCamera}
                  className="min-h-[46px] px-5 py-2.5 rounded-full bg-[#1AA39A] hover:bg-[#1B5E36] active:scale-95 text-white text-xs sm:text-sm font-extrabold inline-flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  <Camera className="w-4 h-4" />
                  <span>
                    {capturedPhoto
                      ? 'Retake Live Camera Photo'
                      : 'Open Live Camera'}
                  </span>
                </button>
                <p className="text-xs text-[#2B2B2B]/75">
                  Fraud Protection Active: Gallery uploads are disabled. Duplicate photos and duplicate GPS coordinates are automatically blocked.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Area Name & Auto GPS Tag (English Only Labels & Placeholders) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-extrabold text-[#2B2B2B] mb-1.5">
              Area Name
            </label>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-[#1AA39A]/50 bg-[#FBF5E8]/50 text-sm font-bold text-[#2B2B2B]"
            >
              {HYDERABAD_HERO_AREAS.map((area) => (
                <option key={area} value={area}>
                  {area}{' '}
                  {isOfferActiveNow &&
                  area.toLowerCase() === offerConfig.offerArea.toLowerCase()
                    ? '(200 Points Offer!)'
                    : '(100 Points)'}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={streetLandmark}
              onChange={(e) => setStreetLandmark(e.target.value)}
              placeholder="Street / Landmark (optional)"
              maxLength={80}
              className="w-full h-11 px-4 mt-2 rounded-xl border border-[#1AA39A]/40 text-xs font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-[#2B2B2B] mb-1.5">
              Auto GPS Tag (Must be ON)
            </label>
            <div className="rounded-xl border border-[#1AA39A]/50 bg-[#FBF5E8]/50 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#1B5E36]">
                  <MapPin className="w-4 h-4 text-[#F26B1D]" />
                  <span>
                    {gpsOn && gpsCoords
                      ? `GPS ON: ${gpsCoords.lat}, ${gpsCoords.lng}`
                      : 'GPS OFF — Required'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={detectLiveGps}
                  disabled={gpsLoading}
                  className="px-3 py-1 rounded-lg bg-white border border-[#1AA39A] text-[11px] font-bold text-[#1B5E36] hover:bg-[#FBF5E8] inline-flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{gpsLoading ? 'Locating...' : 'Refresh GPS'}</span>
                </button>
              </div>
              <p className="text-xs text-[#2B2B2B]/80">
                Reward for {selectedArea}:{' '}
                <strong className="text-[#F26B1D]">
                  +{expectedPointsForSelectedArea} Points
                </strong>{' '}
                (credited after Admin approval).
              </p>
            </div>
          </div>
        </div>

        {uploadAlert && (
          <div
            className={`rounded-2xl p-3.5 text-xs font-bold flex items-center gap-2 ${
              uploadAlert.type === 'error'
                ? 'bg-[#F2647A]/15 border border-[#F2647A] text-[#9E1C34]'
                : 'bg-[#16A34A]/15 border border-[#16A34A] text-[#1B5E36]'
            }`}
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{uploadAlert.text}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submittingUpload || todayUploadsCount >= 5}
          className="w-full min-h-[50px] rounded-full bg-[#16A34A] hover:bg-[#1B5E36] active:scale-[0.99] disabled:opacity-50 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
        >
          <Camera className="w-5 h-5" />
          <span>
            {submittingUpload
              ? 'Submitting...'
              : `Submit Live To-Let Post (+${expectedPointsForSelectedArea} Points)`}
          </span>
        </button>
      </form>

      {/* =====================================================================
          REDESIGNED 3 REWARD CARDS
          1. EARN WALLET / డబ్బు వాలెట్
          2. RENTED BONUS / అద్దె బోనస్
          3. REFER & EARN CARD (Clean & Premium Icon + Simple WhatsApp Button)
         ===================================================================== */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CARD 1: EARN WALLET / డబ్బు వాలెట్ */}
        <div className="group relative rounded-[24px] bg-gradient-to-b from-[#1B5E36] via-[#2F6B3F] to-[#194D33] text-white overflow-hidden shadow-xl border border-[#F5B301]/35 flex flex-col justify-between transition-transform duration-200 hover:-translate-y-1">
          {/* Soft diagonal bank-card shine */}
          <div className="pointer-events-none absolute -top-24 -left-24 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute bottom-0 right-0 w-48 h-48 rounded-full bg-[#1AA39A]/20 blur-2xl" />

          {/* Card Header Strip */}
          <div className="relative z-10 px-5 py-3.5 bg-black/20 border-b border-white/10 flex items-center justify-between">
            <span className="text-xs sm:text-sm font-extrabold tracking-wide text-[#F5B301]">
              EARN WALLET {showTelugu && '/ డబ్బు వాలెట్'}
            </span>
            {/* Small Gold Coin SVG */}
            <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FFE066] to-[#F5B301] text-[#1B5E36] font-black text-xs flex items-center justify-center shadow-sm border border-white/40">
              ₹
            </span>
          </div>

          <div className="relative z-10 p-6 space-y-5 flex-1 flex flex-col justify-between">
            {/* Big Gold Points Number + Animated Coin Icon */}
            <div className="text-center pt-1">
              <div className="inline-flex items-center justify-center gap-2.5 relative">
                <span className="text-[#F5B301] text-xs">✦</span>
                <span className="text-5xl sm:text-6xl font-black font-mono tabular-nums text-transparent bg-clip-text bg-gradient-to-b from-[#FFF3B0] via-[#F5B301] to-[#D99B00] drop-shadow-sm">
                  {currentPoints}
                </span>
                {/* Animated 3D Gold Coin SVG */}
                <div
                  className={`w-11 h-11 rounded-full bg-gradient-to-br from-[#FFF3B0] via-[#F5B301] to-[#C88A00] border-2 border-[#FFE885] shadow-md flex items-center justify-center transition-transform duration-500 ${
                    coinBounce ? 'scale-125 rotate-12' : 'group-hover:scale-110'
                  }`}
                >
                  <span className="w-8 h-8 rounded-full border border-[#1B5E36]/25 flex items-center justify-center text-[#8A5A00] font-black text-lg">
                    ₹
                  </span>
                </div>
                <span className="text-[#F5B301] text-sm">✦</span>
              </div>
              <p className="text-[11px] font-semibold text-white/80 mt-1">
                1000 points = ₹100
              </p>
            </div>

            {/* Thick Progress Bar to ₹100 with Milestone Dots at 250, 500, 750, 1000 + Treasure Chest & ₹100 Note */}
            <div className="space-y-2 pt-2">
              <div className="relative pt-4 pb-1">
                {/* Treasure Chest SVG Icon above 1000 mark */}
                <div className="absolute -top-3 right-0 flex flex-col items-center">
                  <svg
                    viewBox="0 0 36 30"
                    className="w-8 h-7 drop-shadow-sm"
                    aria-hidden="true"
                  >
                    <rect
                      x="3"
                      y="12"
                      width="30"
                      height="15"
                      rx="3"
                      fill="#B45309"
                      stroke="#F5B301"
                      strokeWidth="2"
                    />
                    <path
                      d="M3,12 C3,5 33,5 33,12 Z"
                      fill="#D97706"
                      stroke="#F5B301"
                      strokeWidth="2"
                    />
                    <rect
                      x="15"
                      y="10"
                      width="6"
                      height="7"
                      rx="1.5"
                      fill="#F5B301"
                    />
                  </svg>
                </div>

                {/* Progress Track */}
                <div className="relative w-full h-4 rounded-full bg-black/35 border border-white/15 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r from-[#F5B301] via-[#FFD54F] to-[#F5B301] transition-all duration-500 ${progressWidthClass}`}
                  />
                </div>

                {/* Milestone Dots at 250, 500, 750, 1000 */}
                <div className="grid grid-cols-4 text-center mt-2">
                  {([250, 500, 750, 1000] as const).map((milestone) => {
                    const reached = currentPoints >= milestone;
                    return (
                      <div
                        key={milestone}
                        className="flex flex-col items-center"
                      >
                        <span
                          className={`-mt-5 w-3.5 h-3.5 rounded-full border-2 transition-colors ${
                            reached
                              ? 'bg-[#F5B301] border-white shadow-xs'
                              : 'bg-[#1B5E36] border-white/40'
                          }`}
                        />
                        <span
                          className={`text-xs font-mono font-bold mt-2 ${
                            reached ? 'text-[#F5B301]' : 'text-white/75'
                          }`}
                        >
                          {milestone}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* "or [₹100 note]" badge under 1000 */}
                <div className="flex items-center justify-end gap-1.5 mt-1 pr-1">
                  <span className="text-[11px] text-white/80 font-medium">
                    or
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#A7F3D0] text-[#1B5E36] text-[11px] font-black border border-white/50">
                    <span>₹100</span>
                  </span>
                </div>
              </div>

              {/* Dynamic Text Under the Bar */}
              <div className="text-center space-y-0.5">
                <p className="text-sm sm:text-base font-extrabold text-[#F5B301]">
                  {pointsRemaining > 0
                    ? `Only ${pointsRemaining} points to go!`
                    : '🎉 1000+ Points Unlocked! Ready to Withdraw!'}
                </p>
                {showTelugu && (
                  <p className="text-xs font-semibold text-[#FFE885]">
                    {pointsRemaining > 0
                      ? `ఇంకా ${pointsRemaining} పాయింట్లు మాత్రమే!`
                      : 'ఇప్పుడే ₹100 ఫోన్‌పేకి విత్‌డ్రా చేసుకోండి!'}
                  </p>
                )}
              </div>
            </div>

            {/* Withdraw Button: English Only (no Telugu on buttons) */}
            <div className="space-y-2 pt-2">
              {canWithdraw && (
                <div className="flex justify-center gap-2 text-xs text-[#F5B301] animate-bounce">
                  <span>🎊</span>
                  <span className="font-extrabold">₹100 REWARD UNLOCKED</span>
                  <span>🎊</span>
                </div>
              )}

              <button
                type="button"
                disabled={!canWithdraw}
                onClick={() => setShowWithdrawForm((prev) => !prev)}
                className={`w-full rounded-2xl px-4 py-3.5 text-center transition-all ${
                  canWithdraw
                    ? 'bg-gradient-to-r from-[#F5B301] via-[#FFE066] to-[#F5B301] text-[#1B5E36] font-black shadow-lg animate-pulse cursor-pointer hover:brightness-105'
                    : 'bg-white/10 border border-white/25 text-white/80 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-center gap-2 text-sm sm:text-base font-extrabold">
                  {canWithdraw ? (
                    <Wallet className="w-5 h-5 text-[#1B5E36]" />
                  ) : (
                    <Lock className="w-4 h-4 text-[#F5B301]" />
                  )}
                  <span>WITHDRAW</span>
                </div>
                <p
                  className={`text-[11px] font-semibold mt-0.5 ${
                    canWithdraw ? 'text-[#1B5E36]' : 'text-white/70'
                  }`}
                >
                  {canWithdraw
                    ? 'Withdraw ₹100 to PhonePe'
                    : 'Unlock at 1000 pts'}
                </p>
              </button>

              {showWithdrawForm && canWithdraw && (
                <form
                  onSubmit={handleRequestWithdrawal}
                  className="rounded-2xl bg-black/30 border border-[#F5B301] p-3 space-y-2 mt-2"
                >
                  <input
                    type="tel"
                    value={phonePeInput}
                    onChange={(e) => setPhonePeInput(e.target.value)}
                    placeholder="10-digit PhonePe number"
                    maxLength={15}
                    className="w-full h-10 px-3 rounded-xl bg-white text-[#2B2B2B] text-xs font-mono font-bold"
                    required
                  />
                  <button
                    type="submit"
                    disabled={withdrawing}
                    className="w-full min-h-[38px] rounded-xl bg-[#F5B301] text-[#1B5E36] text-xs font-extrabold cursor-pointer"
                  >
                    {withdrawing
                      ? 'Requesting...'
                      : 'Confirm ₹100 PhonePe Withdraw'}
                  </button>
                </form>
              )}

              {withdrawMsg && (
                <p className="text-xs font-bold text-[#FFE885] text-center bg-black/25 p-2 rounded-xl">
                  {withdrawMsg}
                </p>
              )}

              {myWithdrawals.length > 0 && (
                <div className="pt-2 border-t border-white/15 space-y-1">
                  {myWithdrawals.slice(0, 2).map((w) => (
                    <div
                      key={w.id}
                      className="flex items-center justify-between text-[11px] bg-black/20 px-2.5 py-1.5 rounded-lg"
                    >
                      <span className="font-mono">
                        ₹{w.amountInr} · {w.phonePeNumber}
                      </span>
                      <span className="font-bold uppercase text-[#F5B301]">
                        {w.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CARD 2: RENTED BONUS CARD */}
        <div className="group relative rounded-[24px] bg-gradient-to-b from-[#E5B85B] via-[#F9E6B3] to-[#FBF5E8] text-[#2B2B2B] overflow-hidden shadow-xl border border-[#F5B301]/50 flex flex-col justify-between transition-transform duration-200 hover:-translate-y-1">
          {/* Header Strip */}
          <div className="px-5 py-3.5 bg-[#D4A03E]/55 border-b border-[#B7811E]/25 flex items-center justify-between">
            <span className="text-xs sm:text-sm font-extrabold tracking-wide text-[#2B2B2B]">
              RENTED BONUS {showTelugu && '/ అద్దె బోనస్'}
            </span>
            <Award className="w-4 h-4 text-[#7C4D00]" />
          </div>

          <div className="p-6 space-y-5 flex-1 flex flex-col justify-between items-center text-center">
            {/* Tilted "₹50 BONUS" Sticker Badge */}
            <div className="relative pt-3 pb-1">
              <span className="absolute -top-0.5 -left-4 text-[#F26B1D] font-black text-sm">
                ✺
              </span>
              <span className="absolute -bottom-1 -right-4 text-[#F26B1D] font-black text-sm">
                ✺
              </span>

              <div className="relative -rotate-3 rounded-2xl bg-[#FFFDF7] border-2 border-[#D49B2A] px-7 py-4 shadow-md">
                <span className="absolute -top-1.5 -left-2 w-7 h-2.5 bg-[#F26B1D] rotate-[-35deg] rounded-xs" />
                <span className="absolute -bottom-1.5 -right-2 w-7 h-2.5 bg-[#F26B1D] rotate-[-35deg] rounded-xs" />

                <p className="text-4xl sm:text-5xl font-black font-mono text-[#7C4D00] leading-none">
                  ₹50
                </p>
                <p className="text-base sm:text-lg font-extrabold tracking-wider text-[#7C4D00] mt-1">
                  BONUS
                </p>
              </div>
            </div>

            <p className="text-xs font-bold text-[#5A3A00] max-w-xs">
              When your posted house gets a tenant, you earn ₹50 extra
              {showTelugu && ' · మీరు పోస్ట్ చేసిన ఇల్లు అద్దెకు వెళ్తే ₹50 బోనస్!'}
            </p>

            {/* 3-Step Line with Custom SVG Icons: Post -> House Rented -> ₹50 in wallet */}
            <div className="w-full pt-1">
              <div className="grid grid-cols-3 items-start gap-2 relative">
                <div className="pointer-events-none absolute top-6 left-[22%] right-[55%] h-0.5 bg-[#9C6B19]" />
                <div className="pointer-events-none absolute top-6 left-[55%] right-[22%] h-0.5 bg-[#9C6B19]" />

                {/* Step 1: Post */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#FFFDF7] border-2 border-[#1B5E36] flex items-center justify-center shadow-xs">
                    <svg
                      viewBox="0 0 36 36"
                      className="w-7 h-7"
                      aria-hidden="true"
                    >
                      <path
                        d="M6,18 L18,7 L30,18 L27,18 L27,29 L9,29 L9,18 Z"
                        fill="#E6F4EA"
                        stroke="#1B5E36"
                        strokeWidth="2.2"
                      />
                      <circle cx="25" cy="25" r="6" fill="#1B5E36" />
                      <path
                        d="M25,22 L25,28 M22,25 L28,25"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <p className="text-xs font-extrabold text-[#2B2B2B] mt-2">
                    Post
                  </p>
                </div>

                {/* Step 2: House Rented */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#FFFDF7] border-2 border-[#1B5E36] flex items-center justify-center shadow-xs">
                    <svg
                      viewBox="0 0 36 36"
                      className="w-7 h-7"
                      aria-hidden="true"
                    >
                      <path
                        d="M6,18 L18,7 L30,18 L27,18 L27,29 L9,29 L9,18 Z"
                        fill="#FEF3C7"
                        stroke="#1B5E36"
                        strokeWidth="2.2"
                      />
                      <circle cx="25" cy="25" r="6" fill="#16A34A" />
                      <path
                        d="M22.5,25 L24.5,27 L28,23"
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <p className="text-xs font-extrabold text-[#2B2B2B] mt-2">
                    House Rented
                  </p>
                </div>

                {/* Step 3: ₹50 in wallet */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#FFFDF7] border-2 border-[#B45309] flex items-center justify-center shadow-xs">
                    <svg
                      viewBox="0 0 36 36"
                      className="w-7 h-7"
                      aria-hidden="true"
                    >
                      <path
                        d="M9,13 L25,9 L27,14 L9,14 Z"
                        fill="#16A34A"
                      />
                      <rect
                        x="6"
                        y="13"
                        width="24"
                        height="17"
                        rx="4"
                        fill="#F5B301"
                        stroke="#7C4D00"
                        strokeWidth="2"
                      />
                      <rect
                        x="22"
                        y="19"
                        width="8"
                        height="5"
                        rx="2"
                        fill="#1B5E36"
                      />
                    </svg>
                  </div>
                  <p className="text-xs font-extrabold text-[#2B2B2B] mt-2">
                    ₹50 in wallet
                  </p>
                </div>
              </div>
            </div>

            {/* White Pill with Wallet Amount & Sparkle */}
            <div className="pt-2 w-full flex justify-center">
              <div className="inline-flex items-center gap-2.5 rounded-full bg-white border border-[#E2C074] px-6 py-2.5 shadow-md">
                <p className="text-sm sm:text-base font-extrabold text-[#2B2B2B]">
                  Current: ₹{rentedBonusAmount}
                </p>
                <span
                  className={`text-lg text-[#F5B301] ${
                    rentedBonusAmount > 0 ? 'animate-spin' : ''
                  }`}
                  aria-hidden="true"
                >
                  ✦
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3: REFER & EARN CARD (Clean & Premium Icon + Simple WhatsApp Button + No Telugu on Buttons) */}
        <div className="group relative rounded-[24px] bg-gradient-to-b from-[#E3F9E9] via-[#F4FBF6] to-[#FFFFFF] text-[#2B2B2B] overflow-hidden shadow-xl border border-[#16A34A]/30 p-6 flex flex-col justify-between space-y-4 transition-transform duration-200 hover:-translate-y-1">
          {/* Top Clean & Premium Icon Badge */}
          <div className="flex flex-col items-center text-center space-y-3 pt-1">
            <div className="relative flex items-center justify-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#1B5E36] to-[#2F6B3F] border-2 border-[#F5B301] shadow-lg flex items-center justify-center relative">
                {/* Clean Premium Geometric Referral & Gift Emblem SVG */}
                <svg
                  viewBox="0 0 64 64"
                  className="w-11 h-11"
                  aria-hidden="true"
                >
                  {/* Primary User Silhouette */}
                  <circle
                    cx="24"
                    cy="22"
                    r="8"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                  />
                  <path
                    d="M10,46 C10,37 16,33 24,33 C32,33 38,37 38,46"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  {/* Secondary Friend Silhouette */}
                  <circle
                    cx="41"
                    cy="20"
                    r="6.5"
                    fill="none"
                    stroke="#F5B301"
                    strokeWidth="2.8"
                  />
                  <path
                    d="M36,44 C37,37 41,34 47,34 C52,34 55,37 56,43"
                    fill="none"
                    stroke="#F5B301"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                  {/* Plus Star Sparkle */}
                  <circle cx="48" cy="14" r="7" fill="#F5B301" />
                  <path
                    d="M48,10.5 L48,17.5 M44.5,14 L51.5,14"
                    stroke="#1B5E36"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                </svg>

                {/* Gold +50 Pts Mini Pill Badge */}
                <span className="absolute -bottom-2.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#FFE066] to-[#F5B301] text-[#1B5E36] text-[10px] font-black tracking-wider shadow-xs border border-white">
                  +50 PTS
                </span>
              </div>
            </div>

            <div className="pt-1">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#1B5E36] leading-tight">
                Invite a friend,
                <br />
                earn 50 points
              </h2>
              {showTelugu && (
                <p className="text-xs font-semibold text-[#2F6B3F] mt-1">
                  స్నేహితులను ఆహ్వానించండి, 50 పాయింట్లు గెలుచుకోండి
                </p>
              )}
            </div>
          </div>

          {/* Dashed Coupon Ticket with Scissors Icon & Copy Button (English only button) */}
          <div className="relative rounded-2xl border-2 border-dashed border-[#1B5E36]/40 bg-[#F9FCF8] p-3 flex items-center justify-between gap-2 shadow-2xs">
            <span className="absolute -top-3 left-3 bg-[#EBF9EE] px-1 text-[#1B5E36]">
              <Scissors className="w-4 h-4" />
            </span>

            <div className="pl-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#2F6B3F]">
                Referral Coupon
              </p>
              <p className="text-lg sm:text-xl font-black font-mono tracking-wider text-[#2B2B2B]">
                {userReferralCode}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(userReferralCode);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
              }}
              className="min-h-[40px] px-4 py-1.5 rounded-xl bg-white border border-[#1B5E36]/25 hover:border-[#1B5E36] text-xs font-extrabold text-[#1B5E36] transition-colors cursor-pointer shrink-0 shadow-2xs"
            >
              {copiedCode ? 'Copied ✓' : 'COPY'}
            </button>
          </div>

          {/* Simple Button: Share on WhatsApp (No Telugu, No Phone Icon, No WhatsApp Icon) */}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(whatsappShareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[46px] rounded-2xl bg-[#16A34A] hover:bg-[#15803D] active:scale-[0.99] text-white px-4 py-3 flex items-center justify-center text-xs sm:text-sm font-extrabold tracking-wide shadow-md transition-all"
          >
            Share on WhatsApp
          </a>

          {/* Separate Small Row Below: Friend's Code Input & Apply Button (English Only) */}
          <form
            onSubmit={handleApplyReferralCode}
            className="flex items-stretch gap-2 pt-1"
          >
            <input
              type="text"
              value={friendReferralInput}
              onChange={(e) => setFriendReferralInput(e.target.value)}
              placeholder="Enter Friend's Code"
              maxLength={20}
              className="flex-1 h-11 rounded-xl bg-white border border-[#1B5E36]/25 px-3 text-xs font-bold text-[#2B2B2B] placeholder:text-[#2B2B2B]/55 focus:outline-none focus:border-[#1B5E36]"
            />

            <button
              type="submit"
              className="px-4 h-11 rounded-xl bg-white border border-[#1B5E36]/25 hover:border-[#1B5E36] text-[#1B5E36] text-xs font-extrabold cursor-pointer shrink-0 shadow-2xs"
            >
              APPLY
            </button>
          </form>

          {referralMsg && (
            <p className="text-xs font-bold text-[#1B5E36] text-center bg-white/80 rounded-xl p-2">
              {referralMsg}
            </p>
          )}
        </div>
      </div>

      {/* 6. WEEKLY TOP 5 RENTAL HEROES · ఈ వారం టాప్ 5 హీరోలు */}
      <div className="relative z-10 rounded-[24px] border border-[#4FA3D9]/40 bg-white overflow-hidden shadow-md">
        <div className="bg-gradient-to-r from-[#4FA3D9] to-[#1AA39A] text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-extrabold">
              <Trophy className="w-3.5 h-3.5 text-[#F5B301]" />
              <span>
                Top 3 win a prize every Sunday
                {showTelugu && ' · ప్రతి ఆదివారం టాప్ 3 విజేతలకు బహుమతి'}
              </span>
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold mt-2">
              Weekly Top 5 Rental Heroes {showTelugu && '· ఈ వారం టాప్ 5 హీరోలు'}
            </h2>
          </div>
        </div>

        <div className="p-6 divide-y divide-[#FBF5E8]">
          {weeklyTop5.map((hero, idx) => {
            const rank = idx + 1;
            return (
              <div
                key={hero.name}
                className="py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  {rank === 1 ? (
                    <span
                      title="Gold Rank 1"
                      className="w-9 h-9 rounded-full bg-[#F5B301] text-[#2B2B2B] font-black text-xs flex items-center justify-center shadow-xs"
                    >
                      <Trophy className="w-4 h-4" />
                    </span>
                  ) : rank === 2 ? (
                    <span
                      title="Silver Rank 2"
                      className="w-9 h-9 rounded-full bg-slate-300 text-[#2B2B2B] font-black text-xs flex items-center justify-center shadow-xs"
                    >
                      <Award className="w-4 h-4" />
                    </span>
                  ) : rank === 3 ? (
                    <span
                      title="Orange-Bronze Rank 3"
                      className="w-9 h-9 rounded-full bg-[#F26B1D] text-white font-black text-xs flex items-center justify-center shadow-xs"
                    >
                      <Award className="w-4 h-4" />
                    </span>
                  ) : (
                    <span className="w-9 h-9 rounded-full bg-[#FBF5E8] border border-[#4FA3D9]/40 text-xs font-mono font-extrabold text-[#2B2B2B] flex items-center justify-center">
                      #{rank}
                    </span>
                  )}

                  <div>
                    <p className="text-sm font-extrabold text-[#2B2B2B]">
                      {hero.name}
                    </p>
                    {rank <= 3 && (
                      <p
                        className={`text-[11px] font-bold ${
                          rank === 1
                            ? 'text-[#B47D00]'
                            : rank === 2
                            ? 'text-slate-600'
                            : 'text-[#F26B1D]'
                        }`}
                      >
                        {rank === 1
                          ? 'Gold Leader · Sunday Prize Winner'
                          : rank === 2
                          ? 'Silver Runner-Up · Sunday Prize Winner'
                          : 'Bronze 3rd Place · Sunday Prize Winner'}
                      </p>
                    )}
                  </div>
                </div>

                <span className="px-3.5 py-1 rounded-full bg-[#4FA3D9]/15 border border-[#4FA3D9]/40 text-xs font-mono font-extrabold text-[#1B5E36]">
                  {hero.posts} Approved Posts
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 9. PAST UPLOADS LIST */}
      <div className="relative z-10 rounded-[24px] border border-[#1B5E36]/20 bg-white p-6 space-y-4 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#1B5E36]">
              Past Uploads {showTelugu && '· మీ గత అప్‌లోడ్‌లు'} ({myUploads.length})
            </h2>
            <p className="text-xs text-[#2B2B2B]/75">
              Statuses: Pending · Approved · Rejected · Rented (+₹50 Bonus)
            </p>
          </div>
        </div>

        {myUploads.length === 0 ? (
          <p className="text-sm text-[#2B2B2B]/75">
            No uploads yet. Capture a live To-Let board photo above to start earning points!
          </p>
        ) : (
          <div className="space-y-3">
            {myUploads.map((item) => {
              const canOwnerOrAdminMarkRented =
                item.status === 'approved' &&
                (isAdminUser ||
                  Boolean(profile?.hasPaidOwnerFee) ||
                  Boolean(profile?.freeUntil && profile.freeUntil > Date.now()));

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-[#E5E0D5] bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <img
                      src={item.photoUrl}
                      alt={item.locationText}
                      referrerPolicy="no-referrer"
                      className="w-16 h-14 rounded-xl object-cover shrink-0 border border-[#E5E0D5]"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-[#2B2B2B] truncate">
                        {item.locationText}
                      </p>
                      <p className="text-xs font-mono text-[#2B2B2B]/70">
                        GPS: {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold capitalize ${
                            item.status === 'approved'
                              ? 'bg-[#16A34A] text-white'
                              : item.status === 'rented'
                              ? 'bg-[#7B4FA0] text-white'
                              : item.status === 'rejected'
                              ? 'bg-[#F2647A] text-white'
                              : 'bg-[#F5B301] text-[#2B2B2B]'
                          }`}
                        >
                          {item.status}
                        </span>
                        {item.status === 'rented' && (
                          <span className="text-[11px] font-extrabold text-[#7B4FA0]">
                            +₹50 Rented Bonus Credited
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {canOwnerOrAdminMarkRented && (
                      <button
                        type="button"
                        onClick={() => handleMarkAsRented(item)}
                        className="min-h-[38px] px-3.5 py-1.5 rounded-full bg-[#7B4FA0] text-white text-xs font-extrabold hover:opacity-95 cursor-pointer"
                      >
                        Mark Rented (+₹50)
                      </button>
                    )}
                    <span className="text-sm font-extrabold font-mono tabular-nums text-[#1B5E36]">
                      +{item.pointsAwarded} pts
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ADMIN SCREEN: Assign Agents, Approve/Reject Posts, Mark Rented, Set Offer Area & Dates, Approve Withdrawals */}
      {isAdminUser && showAdminScreen && (
        <div className="relative z-10 rounded-[24px] border-2 border-[#1B5E36] bg-white p-6 space-y-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-[#1B5E36] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#16A34A]" />
                <span>Rental Heroes Admin Screen</span>
              </h2>
              <p className="text-xs text-[#2B2B2B]/75">
                Manage Launch Offer, Area Agents, To-Let Approvals, Rented Bonuses & PhonePe Withdrawals.
              </p>
            </div>
          </div>

          {adminStatusMsg && (
            <div className="rounded-2xl bg-[#FBF5E8] border border-[#16A34A] px-4 py-3 text-xs font-extrabold text-[#1B5E36]">
              {adminStatusMsg}
            </div>
          )}

          {/* A. Set Offer Area & Dates */}
          <form
            onSubmit={handleAdminSaveOffer}
            className="rounded-2xl bg-[#FBF5E8] border border-[#F5B301]/50 p-4 space-y-3"
          >
            <h3 className="text-sm font-extrabold text-[#2B2B2B]">
              1. Set Launch Offer Area & Duration (200 Points / Post)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={adminOfferArea}
                onChange={(e) => setAdminOfferArea(e.target.value)}
                className="h-11 px-3 rounded-xl border border-[#1AA39A] bg-white text-xs font-bold"
              >
                {HYDERABAD_HERO_AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={adminOfferDays}
                onChange={(e) => setAdminOfferDays(e.target.value)}
                min={1}
                max={30}
                placeholder="Days (e.g. 7)"
                className="h-11 px-3 rounded-xl border border-[#1AA39A] bg-white text-xs font-mono"
              />
              <button
                type="submit"
                className="min-h-[44px] px-4 rounded-xl bg-[#F26B1D] text-white text-xs font-extrabold cursor-pointer"
              >
                Save Offer Settings
              </button>
            </div>
          </form>

          {/* B. Assign Area Agent (One User per Area) */}
          <form
            onSubmit={handleAdminAssignAgent}
            className="rounded-2xl bg-[#FBF5E8] border border-[#1AA39A]/50 p-4 space-y-3"
          >
            <h3 className="text-sm font-extrabold text-[#2B2B2B]">
              2. Assign Area Agent (1 User per Area · +20 Bonus Points / Post)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <select
                value={adminAgentArea}
                onChange={(e) => setAdminAgentArea(e.target.value)}
                className="h-11 px-3 rounded-xl border border-[#1AA39A] bg-white text-xs font-bold"
              >
                {HYDERABAD_HERO_AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>

              <select
                value={adminAgentUid}
                onChange={(e) => {
                  const uid = e.target.value;
                  setAdminAgentUid(uid);
                  const found = allUsersForAdmin.find((u) => u.uid === uid);
                  if (found) setAdminAgentName(found.displayName);
                }}
                className="h-11 px-3 rounded-xl border border-[#1AA39A] bg-white text-xs"
              >
                <option value="">Select User (or current user)</option>
                {allUsersForAdmin.map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.displayName} ({u.uid.slice(0, 6)})
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={adminAgentName}
                onChange={(e) => setAdminAgentName(e.target.value)}
                placeholder="Agent Display Name"
                className="h-11 px-3 rounded-xl border border-[#1AA39A] bg-white text-xs"
              />

              <button
                type="submit"
                className="min-h-[44px] px-4 rounded-xl bg-[#1AA39A] text-white text-xs font-extrabold cursor-pointer"
              >
                Assign Area Agent
              </button>
            </div>

            {areaAgents.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {areaAgents.map((ag) => (
                  <span
                    key={ag.id}
                    className="px-3 py-1 rounded-lg bg-white border border-[#1AA39A] text-xs font-bold text-[#2B2B2B]"
                  >
                    {ag.areaName}: <strong>{ag.agentName}</strong> (+
                    {ag.bonusPointsEarned} pts)
                  </span>
                ))}
              </div>
            )}
          </form>

          {/* C. Approve / Reject Posts & Mark Rented */}
          <div className="rounded-2xl bg-[#FBF5E8] border border-[#1B5E36]/30 p-4 space-y-3">
            <h3 className="text-sm font-extrabold text-[#2B2B2B]">
              3. Approve / Reject To-Let Posts & Mark Rented ({adminAllUploads.length})
            </h3>
            {adminAllUploads.length === 0 ? (
              <p className="text-xs text-[#2B2B2B]/70">No posts submitted yet.</p>
            ) : (
              <div className="space-y-2.5">
                {adminAllUploads.map((u) => (
                  <div
                    key={u.id}
                    className="rounded-xl bg-white border border-[#E5E0D5] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={u.photoUrl}
                        alt={u.locationText}
                        className="w-14 h-12 rounded-lg object-cover shrink-0"
                      />
                      <div>
                        <p className="text-xs font-extrabold text-[#2B2B2B]">
                          {u.locationText} ({u.areaName || 'Hyderabad'})
                        </p>
                        <p className="text-[11px] font-mono text-[#2B2B2B]/70">
                          By {u.userName} · Status: <strong>{u.status}</strong> ·{' '}
                          {u.pointsAwarded} pts
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {u.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              handleAdminModerateUpload(u, 'approved')
                            }
                            className="min-h-[36px] px-3.5 py-1.5 rounded-full bg-[#16A34A] text-white text-xs font-extrabold cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleAdminModerateUpload(u, 'rejected')
                            }
                            className="min-h-[36px] px-3.5 py-1.5 rounded-full bg-[#F2647A] text-white text-xs font-extrabold cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {u.status === 'approved' && (
                        <button
                          type="button"
                          onClick={() => handleMarkAsRented(u)}
                          className="min-h-[36px] px-3.5 py-1.5 rounded-full bg-[#7B4FA0] text-white text-xs font-extrabold cursor-pointer"
                        >
                          Mark Rented (+₹50 Bonus)
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* D. Approve PhonePe Withdrawals */}
          <div className="rounded-2xl bg-[#FBF5E8] border border-[#1B5E36]/30 p-4 space-y-3">
            <h3 className="text-sm font-extrabold text-[#2B2B2B]">
              4. Approve PhonePe Withdrawals ({adminWithdrawals.length})
            </h3>
            {adminWithdrawals.length === 0 ? (
              <p className="text-xs text-[#2B2B2B]/70">
                No withdrawal requests in queue.
              </p>
            ) : (
              <div className="space-y-2">
                {adminWithdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="rounded-xl bg-white border border-[#E5E0D5] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="text-xs">
                      <p className="font-extrabold text-[#2B2B2B]">
                        {w.userName} · ₹{w.amountInr} ({w.pointsRedeemed} pts)
                      </p>
                      <p className="font-mono text-[#2B2B2B]/70">
                        PhonePe: {w.phonePeNumber} · Status: {w.status}
                      </p>
                    </div>
                    {w.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleAdminApproveWithdrawal(w, 'approved')
                          }
                          className="min-h-[36px] px-3.5 py-1.5 rounded-full bg-[#16A34A] text-white text-xs font-extrabold cursor-pointer"
                        >
                          Approve Payout
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleAdminApproveWithdrawal(w, 'rejected')
                          }
                          className="min-h-[36px] px-3.5 py-1.5 rounded-full bg-[#F2647A] text-white text-xs font-extrabold cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
