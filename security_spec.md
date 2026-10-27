# RENTBOX Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants

1. **Master Gate & Relational Sync (`/houses/{houseId}/contact/{contactId}`)**:
   - A `HouseContact` subdocument (`contactId == 'info'`) cannot exist without an existing parent `/houses/{houseId}` document owned by the same `ownerId`.
   - Reading `/houses/{houseId}/contact/{contactId}` is strictly prohibited unless the requester is the listing's `ownerId`, an `isAdmin()`, or has a `/users/$(request.auth.uid)` profile where `hasPaidSeekerFee == true`.
2. **PII Isolation (`/users/{userId}` & `/houses/{houseId}/contact/{contactId}`)**:
   - User profiles contain `phone` PII and may only be read (`get`) by the document owner (`request.auth.uid == userId`) or `isAdmin()`. Blanket `list` on `/users` is forbidden.
   - Public `/houses/{houseId}` documents never contain `ownerPhone`.
3. **Validation Blueprints (`isValid*` Helpers)**:
   - Every `create` and `update` operation across all collections validates exact key sets (`hasAll` + `hasOnly`), field types, string/list size limits, regex ID patterns, and `request.time` timestamps.
4. **Action-Based Updates & Terminal State Locking**:
   - `HeroUpload` starts as `status == 'pending'` and `pointsAwarded == 0`. Once transitioned to `'approved'` or `'rejected'`, non-admins can never modify it, and only `isAdmin()` can transition status.
   - `ScratchCard` can only be updated from `isScratched == false` to `isScratched == true` by its owner (`affectedKeys().hasOnly(['isScratched', 'updatedAt'])`). Once `isScratched == true`, further updates by non-admins are locked.
   - `PaymentRecord` documents are strictly append-only (`allow update, delete: if false`) and must have `amount == 49` and `status == 'completed'`.
5. **Secure List Queries**:
   - `/houses`: `allow list: if resource.data.status == 'active' || (isSignedIn() && resource.data.ownerId == request.auth.uid);`
   - `/heroUploads`: `allow list: if isSignedIn() && (resource.data.userId == request.auth.uid || isAdmin());`
   - `/scratchCards`: `allow list: if isSignedIn() && (resource.data.userId == request.auth.uid || isAdmin());`
   - `/payments`: `allow list: if isSignedIn() && (resource.data.userId == request.auth.uid || isAdmin());`

---

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 (Identity Spoofing on House Creation)**:
   `POST /houses/house_1` with `{ ownerId: "victim_uid", city: "Bengaluru", ... }` by `attacker_uid` -> `PERMISSION_DENIED`.
2. **Payload 2 (Unpaid Seeker Reading Owner Phone PII)**:
   `GET /houses/house_1/contact/info` by `seeker_uid` where `/users/seeker_uid.hasPaidSeekerFee == false` -> `PERMISSION_DENIED`.
3. **Payload 3 (Shadow Field Injection on User Profile)**:
   `PATCH /users/user_1` with `{ hasPaidSeekerFee: true, isAdmin: true, updatedAt: request.time }` -> `PERMISSION_DENIED`.
4. **Payload 4 (Self-Approving Hero Upload)**:
   `PATCH /heroUploads/upload_1` with `{ status: "approved", pointsAwarded: 100, updatedAt: request.time }` by non-admin uploader -> `PERMISSION_DENIED`.
5. **Payload 5 (Terminal State Re-Scratch Attack)**:
   `PATCH /scratchCards/card_1` where `existing().isScratched == true` attempting to change `rewardLabel: "₹10000 Cash"` -> `PERMISSION_DENIED`.
6. **Payload 6 (Denial-of-Wallet Oversized String Poisoning)**:
   `POST /houses/house_2` with `requirements` length = 5000 chars (exceeds 500 max) -> `PERMISSION_DENIED`.
7. **Payload 7 (Empty Photo Array on House Listing)**:
   `POST /houses/house_3` with `photos: []` (violates "Show only houses that have photos" `photos.size() >= 1`) -> `PERMISSION_DENIED`.
8. **Payload 8 (Orphaned Contact Subdocument Creation)**:
   `POST /houses/non_existent_house/contact/info` without parent house -> `PERMISSION_DENIED`.
9. **Payload 9 (Timestamp Forgery)**:
   `POST /payments/pay_1` with client backdated `createdAt: Timestamp(2020, 1, 1)` (`createdAt != request.time`) -> `PERMISSION_DENIED`.
10. **Payload 10 (Unverified Email Admin Spoofing)**:
    Request from token `{ email: "ruchitvacloudkitchen@gmail.com", email_verified: false }` attempting admin approval on `/heroUploads/upload_1` -> `PERMISSION_DENIED`.
11. **Payload 11 (Cross-User Profile PII Read)**:
    `GET /users/victim_uid` by `attacker_uid` -> `PERMISSION_DENIED`.
12. **Payload 12 (Unfiltered List Scraping on Hero Uploads)**:
    `LIST /heroUploads` without `where('userId', '==', request.auth.uid)` by non-admin -> `PERMISSION_DENIED`.
