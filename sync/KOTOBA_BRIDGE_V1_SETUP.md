# Kotoba Bridge V1

This bridge is the first, read-only-from-Life-RPG synchronization layer between Kotoba Quest and the future Life RPG integration.

## What V1 does

- Keeps Kotoba Quest authoritative for SRS scheduling and grading.
- Creates stable activity events for new Kotoba study activity.
- Builds a compact Quick Training snapshot with current due counts/items for:
  - Core vocabulary
  - Mining vocabulary
  - Grammar skills
  - Particle skills
- Keeps an offline-safe local event queue in `kotobaQuestBridgeV1`.
- Syncs events and the Quick Training snapshot to Firestore when the existing Kotoba Google login is active.
- Does **not** yet allow Life RPG to submit SRS answers back to Kotoba.
- Does **not** retroactively fabricate events for study activity that happened before Bridge V1 was installed.

## Firestore paths

Bridge V1 uses subcollections below the existing signed-in Kotoba user:

- `users/{uid}/bridgeEvents/{eventId}`
- `users/{uid}/bridgeState/quickTraining`
- `users/{uid}/bridgeState/meta`

The existing `users/{uid}` backup document remains untouched by the bridge.

## Firestore rules required

Firestore rules do not automatically grant access to subcollections just because the parent `users/{uid}` document is allowed.

Merge these two rules into the existing `match /databases/{database}/documents { ... }` block. **Do not replace unrelated existing rules.**

```text
match /users/{userId}/bridgeEvents/{eventId} {
  allow read, write: if request.auth != null
                     && request.auth.uid == userId;
}

match /users/{userId}/bridgeState/{documentId} {
  allow read, write: if request.auth != null
                     && request.auth.uid == userId;
}
```

No API key or other secret is added for the bridge. It reuses the existing Firebase Authentication identity.

## Quick diagnostics

After opening `cloud.html` and signing in, the browser console can run:

```js
KotobaQuestBridge.getStatus()
KotobaQuestBridge.getQuickTrainingSnapshot()
KotobaQuestBridge.getPendingActivityEvents()
KotobaQuestBridge.getRecentActivityEvents()
await KotobaQuestBridge.syncNow()
```

Expected after successful Firestore permission setup:

- `signedIn: true`
- `pendingEvents: 0` after `syncNow()`
- `lastCloudError: ""`

If Firestore rules have not been updated yet, study events stay in the local pending queue and are retried later; Kotoba's normal SRS/save flow continues to work.

## Future V2

V1 intentionally exposes `reviewWriteBackAvailable: false`. V2 will add a guarded review-submission contract so Life RPG can complete a small real Kotoba review batch and write the result back to the same authoritative SRS state.
