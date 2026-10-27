/**
 * Firestore Security Rules Test Suite verifying that all "Dirty Dozen"
 * adversarial payloads return PERMISSION_DENIED.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: {
    uid: string;
    email?: string;
    email_verified?: boolean;
  } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const dirtyDozenTests: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on House Creation',
    operation: 'create',
    path: '/houses/house_1',
    auth: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    payload: {
      ownerId: 'victim_uid',
      city: 'bengaluru',
      location: 'Indiranagar, Bengaluru',
      rentPrice: 18000,
      photos: ['data:image/svg+xml;utf8,<svg></svg>'],
      requirements: 'Family or working professionals',
      terms: '11 months agreement',
      status: 'active',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unpaid Seeker Reading Owner Phone PII',
    operation: 'get',
    path: '/houses/house_1/contact/info',
    auth: { uid: 'unpaid_seeker_uid', email: 'seeker@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Shadow Field Injection on User Profile',
    operation: 'update',
    path: '/users/user_1',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      hasPaidSeekerFee: true,
      isAdmin: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Self-Approving Hero Upload by Non-Admin',
    operation: 'update',
    path: '/heroUploads/upload_1',
    auth: { uid: 'uploader_uid', email: 'hero@example.com', email_verified: true },
    payload: {
      status: 'approved',
      pointsAwarded: 100,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Terminal State Re-Scratch Attack',
    operation: 'update',
    path: '/scratchCards/card_1',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      isScratched: true,
      rewardLabel: '₹10000 Cash',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Denial-of-Wallet Oversized String Poisoning',
    operation: 'create',
    path: '/houses/house_2',
    auth: { uid: 'owner_1', email: 'owner@example.com', email_verified: true },
    payload: {
      ownerId: 'owner_1',
      city: 'bengaluru',
      location: 'Koramangala',
      rentPrice: 15000,
      photos: ['data:image/svg+xml;utf8,<svg></svg>'],
      requirements: 'A'.repeat(5000),
      terms: 'Standard terms',
      status: 'active',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Empty Photo Array on House Listing',
    operation: 'create',
    path: '/houses/house_3',
    auth: { uid: 'owner_1', email: 'owner@example.com', email_verified: true },
    payload: {
      ownerId: 'owner_1',
      city: 'bengaluru',
      location: 'HSR Layout',
      rentPrice: 20000,
      photos: [],
      requirements: 'Working professionals',
      terms: '2 months deposit',
      status: 'active',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Orphaned Contact Subdocument Creation',
    operation: 'create',
    path: '/houses/non_existent_house/contact/info',
    auth: { uid: 'owner_1', email: 'owner@example.com', email_verified: true },
    payload: {
      houseId: 'non_existent_house',
      ownerId: 'owner_1',
      ownerPhone: '9876543210',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Timestamp Forgery on Payment Record',
    operation: 'create',
    path: '/payments/pay_1',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      userId: 'user_1',
      paymentType: 'seeker_fee',
      amount: 49,
      method: 'upi',
      referenceId: 'UPI_998877',
      status: 'completed',
      createdAt: '2020-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Unverified Email Admin Spoofing',
    operation: 'update',
    path: '/heroUploads/upload_1',
    auth: {
      uid: 'spoof_admin',
      email: 'ruchitvacloudkitchen@gmail.com',
      email_verified: false,
    },
    payload: {
      status: 'approved',
      pointsAwarded: 100,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Cross-User Profile PII Read',
    operation: 'get',
    path: '/users/victim_uid',
    auth: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unfiltered List Scraping on Hero Uploads',
    operation: 'list',
    path: '/heroUploads',
    auth: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
];
