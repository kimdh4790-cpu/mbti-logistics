---
name: google-firebase
description: Firebase/Firestore best practices for this project. Use when working with Firestore queries, Firestore security rules, Firebase Auth, FCM push notifications, or Firebase cost optimization.
metadata:
  origin: google/skills (adapted)
---

# Firebase / Firestore — Project Patterns

## Project: mbti-logistics
- Firebase project: `mbti-logistics`
- Collections: filo_orders, filo_sales, filo_errors, members, attendance, companies, join_requests, drivers, delivery_sessions

## Firestore Query Patterns

### Cost-efficient reads
```js
// BAD: get() inside onSnapshot callback (N reads per update)
onSnapshot(q, snap => { snap.docs.forEach(d => db.collection('x').doc(d.id).get()) })

// GOOD: cache and reuse
const cache = new Map()
onSnapshot(q, snap => { /* use cache */ })
```

### Compound queries (requires index)
```js
// Needs composite index: dealerId ASC + date ASC + status ASC
db.collection('filo_orders')
  .where('dealerId', '==', id)
  .where('date', '==', today)
  .where('status', '!=', 'cancelled')
  .orderBy('status').orderBy('createdAt', 'desc')
```

### Pagination (5+ items rule per CLAUDE.md)
```js
let lastDoc = null
async function loadPage() {
  let q = db.collection('c').orderBy('createdAt', 'desc').limit(10)
  if (lastDoc) q = q.startAfter(lastDoc)
  const snap = await q.get()
  lastDoc = snap.docs[snap.docs.length - 1]
}
```

### Batch writes (max 500 per batch)
```js
const batch = db.batch()
items.forEach(item => batch.set(db.collection('c').doc(), item))
await batch.commit()
```

## FCM Push (server-side via _worker.js)
```js
// Send to specific tokens
await fetch('https://fcm.googleapis.com/fcm/send', {
  method: 'POST',
  headers: { Authorization: `key=${FCM_SERVER_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ registration_ids: tokens, notification: { title, body } })
})
```

## Firebase Auth (server-side token verify)
```js
// Verify ID token via REST (Cloudflare Worker compatible)
const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`, {
  method: 'POST',
  body: JSON.stringify({ idToken: token })
})
```

## Cost Optimization Rules
1. Replace `onSnapshot` with `get()` for data that doesn't need real-time updates
2. Add `date` / `dealerId` filters at DB level — never filter in JS
3. Cache member lists with TTL (5 min): `_membersCache` + `_membersCacheAt`
4. Use `select()` to fetch only needed fields: `.select('name', 'phone')`
5. Blaze plan required when reads exceed 50k/day
