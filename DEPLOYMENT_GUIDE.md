# HealthGrid IQ — Production Deployment & Learning Guide

---

## Part 1: Deploy to Production

### Option A: Firebase Hosting (Recommended for Malaysian market)

```bash
# 1. Install Firebase CLI
npm install -g firebase-tools

# 2. Login to your Firebase account
firebase login

# 3. Initialize Firebase in your project
firebase init
# Select: Hosting
# Public directory: dist
# Configure as single-page app: Yes
# Overwrite dist/index.html: No

# 4. Build for production
npm run build

# 5. Deploy
firebase deploy

# Your app will be live at: https://your-project.web.app
```

### Option B: Vercel (Fastest deployment)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy (follow prompts)
vercel

# 3. Production deploy
vercel --prod

# Your app will be live at: https://your-project.vercel.app
```

### Option C: Custom Domain (e.g., opt.maia.com.my)

After deploying to Firebase/Vercel:
1. Go to your hosting dashboard
2. Add custom domain: `opt.maia.com.my`
3. Update DNS: Add CNAME record pointing to your hosting provider
4. Wait for SSL certificate to propagate (5-30 minutes)

### Pre-Deployment Checklist

- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npm run build` — succeeds
- [ ] Test all 5 roles login
- [ ] Test AI Scheduler (single + bulk)
- [ ] Test PDF print
- [ ] Test forgot password flow
- [ ] Clear localStorage and verify fresh start works
- [ ] Check no `console.log` statements left in production code
- [ ] Verify `firestore.rules` is deployed (if using Firebase)

---

## Part 2: Connect Real Firebase (When Ready)

### Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com
2. Create new project: "healthgrid-iq"
3. Enable:
   - Authentication → Email/Password
   - Firestore Database → Start in production mode
   - Hosting

### Step 2: Get Configuration

1. Project Settings → General → Your apps → Web app
2. Copy the config object
3. Create `.env` file:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=healthgrid-iq.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=healthgrid-iq
VITE_FIREBASE_STORAGE_BUCKET=healthgrid-iq.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### Step 3: Deploy Security Rules

```bash
firebase deploy --only firestore:rules
```

### Step 4: Create Users in Firebase Auth

For each user, create them in Firebase Console → Authentication:
- sarah.chen@healthgrid.my (Doctor)
- ahmad.razak@healthgrid.my (Radiographer)
- priya.nair@healthgrid.my (Radiologist)
- nurul.aisyah@healthgrid.my (Radiology Dept)
- weiming.tan@healthgrid.my (Administrator)

### Step 5: Seed Firestore Data

Run the mock data through a seeding script or manually add via Firebase Console.

---

## Part 3: What Features to Add Next

### Priority 1 (Before real hospital use)
| Feature | Why | Difficulty |
|---------|-----|------|
| Real Firebase connection | Multi-user data persistence | Medium |
| Real email for password reset | Security requirement | Easy |
| Image upload to Firebase Storage | PACS scans need real storage | Medium |
| SSL/HTTPS | HIPAA requirement | Auto with Firebase Hosting |

### Priority 2 (Within first month)
| Feature | Why | Difficulty |
|---------|-----|------|
| Email notifications | Alert staff of new cases/reports | Medium |
| Report versioning (draft/amend/final) | Clinical workflow requirement | Medium |
| DICOM viewer integration | View medical images properly | Hard |
| Audit log export (PDF) | Compliance requirement | Easy |

### Priority 3 (Within 3 months)
| Feature | Why | Difficulty |
|---------|-----|------|
| Bahasa Malaysia translation | KKM requirement | Medium |
| HL7/FHIR integration | Hospital system interop | Hard |
| Mobile app (React Native) | Field radiographers | Hard |
| SMS notifications | Rural areas without email | Easy |
| Automated backup | Data protection | Medium |

---

## Part 4: What You Need to Learn

### Essential Skills (You MUST know these)

| Skill | Why | Resources |
|-------|-----|------|
| **React basics** | The entire UI is React | https://react.dev/learn |
| **TypeScript** | Every file uses types | https://typescriptlang.org/docs |
| **Tailwind CSS** | All styling | https://tailwindcss.com/docs |
| **React Router** | All page navigation | https://reactrouter.com |
| **React Context** | State management (DataContext) | https://react.dev/learn/passing-data-deeply-with-context |

### Important Skills (Learn within first month)

| Skill | Why | Resources |
|-------|-----|------|
| **Firebase Firestore** | Production database | https://firebase.google.com/docs/firestore |
| **Firebase Auth** | Real authentication | https://firebase.google.com/docs/auth |
| **Git** | Version control | https://git-scm.com/book |
| **Leaflet.js** | Map customization | https://leafletjs.com/reference.html |
| **Vite** | Build configuration | https://vitejs.dev/guide |

### Good to Know (For advanced features)

| Skill | Why | Resources |
|-------|-----|------|
| **Firebase Functions** | Server-side logic (email, scheduled tasks) | Firebase docs |
| **React Testing Library** | Automated tests | https://testing-library.com |
| **Playwright** | End-to-end tests | https://playwright.dev |
| **DICOM standard** | Medical imaging format | https://dicom.nema.org |
| **HL7 FHIR** | Healthcare interoperability | https://hl7.org/fhir |

### Learning Path (Recommended Order)

```
Week 1: React basics + TypeScript
Week 2: Tailwind CSS + component patterns
Week 3: React Router + Context API
Week 4: Firebase (Auth + Firestore)
Week 5-6: Build a small feature end-to-end yourself
Week 7-8: Security, testing, deployment
```

---

## Part 5: How to Add a Feature (Step-by-Step Template)

### Example: Adding "SMS Notifications"

**1. Plan**
- What triggers an SMS? (case scheduled, report ready)
- What service? (Twilio, AWS SNS)
- Where in the code does it fire?

**2. Create service file**
```typescript
// src/services/smsService.ts
export async function sendSMS(phone: string, message: string): Promise<void> {
  // API call to Twilio/AWS
}
```

**3. Integrate into existing workflow**
```typescript
// In DataContext or the page that triggers it:
await editCase(id, { status: 'SCHEDULED', ... });
await sendSMS(patient.phone, `Your imaging appointment is scheduled for ${date}`);
```

**4. Add configuration**
```env
VITE_TWILIO_SID=...
VITE_TWILIO_TOKEN=...
```

**5. Test**
- Unit test the service
- Integration test the workflow
- Verify SMS arrives

---

## Part 6: Security Hardening Checklist (Before Real Hospital Use)

- [ ] Connect Firebase Auth (no more mock login)
- [ ] Deploy firestore.rules
- [ ] Enable HTTPS (automatic with Firebase Hosting)
- [ ] Remove all `console.log` statements
- [ ] Add Content-Security-Policy headers
- [ ] Enable Firebase App Check (prevents API abuse)
- [ ] Set up Firebase Auth rate limiting
- [ ] Review all API keys are restricted in Firebase Console
- [ ] Enable 2FA for admin accounts
- [ ] Set up automated Firestore backups
- [ ] Add error monitoring (Sentry or Firebase Crashlytics)
- [ ] Conduct penetration testing
- [ ] Get HIPAA compliance audit
- [ ] Document data retention policy
- [ ] Set up incident response plan

---

## Part 7: Common Operations

### Resetting Demo Data
1. Login as Admin
2. Go to System Settings
3. Click "Reset System to Demo State"
4. Confirm

### Adding a New Hospital/Clinic
1. Login as Admin → Clinic Management → Add Clinic
2. Enter name, address, coordinates (get from Google Maps)
3. Add radiographer schedules for the new clinic in mock data (or Firebase)
4. Add to geocoding fallback in `routingService.ts` if needed

### Adding a New Radiographer
1. Login as Admin → User Management → Create User
2. Role: Radiographer
3. Add their schedule profile in `mockRadioSchedules` (or Firebase)
4. Deploy them to a clinic

### Investigating a Bug
1. Open browser DevTools (F12)
2. Check Console for red errors
3. Check Network tab for failed API calls
4. Check Application → Local Storage for data state
5. If data is corrupt: System Settings → Reset

---

## Part 8: Architecture Decisions (Why Things Are The Way They Are)

| Decision | Reason |
|----------|--------|
| localStorage instead of Firestore | Fast demo, no setup needed, works offline |
| React Context instead of Redux | Simpler for this app size, less boilerplate |
| Tailwind instead of CSS modules | Faster development, consistent design system |
| Leaflet instead of Google Maps | Free, no API key needed, open source |
| OSRM instead of Google Directions | Free, no billing, good enough for routing |
| Code splitting with React.lazy | Reduces initial load from 1MB to 120KB |
| BroadcastChannel for tab sync | Native API, no library needed |
| Soft delete with Recycle Bin | Prevents accidental data loss |
| SLA timers per status | Ensures accountability in the workflow |

---

## Part 9: Cost Estimates (Production)

### Firebase (Pay-as-you-go)

| Service | Free Tier | Estimated Monthly (100 users) |
|---------|-----------|------|
| Hosting | 10GB transfer | $0 |
| Auth | 50K monthly auth | $0 |
| Firestore | 50K reads/day | $5-15 |
| Storage | 5GB | $0-5 |
| **Total** | | **$5-20/month** |

### Domain
- `.com.my` domain: ~RM150/year
- SSL: Free with Firebase Hosting

### Third-Party Services (if needed)
- SendGrid (email): Free for 100 emails/day
- Twilio (SMS): ~RM0.20 per SMS
- Sentry (error monitoring): Free for 5K events/month

---

*This guide was created for HealthGrid IQ v1.0.0. Keep it updated as the system evolves.*
