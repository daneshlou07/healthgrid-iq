# HealthGrid IQ — Maintenance & Developer Guide

**Version**: 1.0.0
**Last Updated**: July 2026
**Purpose**: Complete guide for maintaining, editing, debugging, and extending HealthGrid IQ without AI assistance.

---

## Table of Contents

1. [How to Edit Pages](#1-how-to-edit-pages)
2. [How to Add New Features](#2-how-to-add-new-features)
3. [How to Handle Errors](#3-how-to-handle-errors)
4. [How to Make Updates](#4-how-to-make-updates)
5. [How to Handle Security Issues](#5-how-to-handle-security-issues)
6. [How to Handle Data Overloading](#6-how-to-handle-data-overloading)
7. [Mapping & Routing Issues](#7-mapping--routing-issues)
8. [Potential Issues & Known Limitations](#8-potential-issues--known-limitations)
9. [Maintenance Procedures](#9-maintenance-procedures)
10. [Emergency Procedures](#10-emergency-procedures)

---

## 1. How to Edit Pages

### Editing an Existing Page

Every page lives in `src/pages/<role>/PageName.tsx`.

| Role | Folder |
|------|--------|
| Doctor | `src/pages/doctor/` |
| Radiographer | `src/pages/radiographer/` |
| Radiologist | `src/pages/radiologist/` |
| Radiology Dept | `src/pages/department/` |
| Administrator | `src/pages/admin/` |
| Shared (Case/Patient detail) | `src/pages/shared/` |

**Example: Change a page title**
```tsx
// src/pages/doctor/DoctorCases.tsx
// Find this line:
<h1 className="page-title">My Cases</h1>
// Change to:
<h1 className="page-title">Imaging Cases</h1>
```

### Editing the Sidebar Navigation

File: `src/components/layout/Sidebar.tsx`

Find the role's section in `getNavGroups()`:
```tsx
case 'Doctor':
  return [
    { title: 'MAIN', items: [
      { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard /> },
      // Add or remove items here
    ]},
  ];
```

### Editing the Header

File: `src/components/layout/Header.tsx`

This contains: search bar, notifications dropdown, profile dropdown, change password modal.

### Editing the Login Page

File: `src/pages/LoginPage.tsx`

Contains: login form, forgot password flow, quick access role cards.

### Editing Styles

- **Global classes**: `src/index.css` (Tailwind `@layer components`)
- **Colors/fonts**: `tailwind.config.js`
- **Key classes to know**: `btn-primary`, `btn-secondary`, `card`, `input-field`, `select-field`, `badge-*`, `page-title`, `page-subtitle`, `section-title`, `table-header`, `table-cell`

### Editing Types

File: `src/types/index.ts`

If you add a field to any entity (Patient, Case, User, etc.), update the interface here FIRST, then the TypeScript compiler will tell you everywhere that needs updating.

---

## 2. How to Add New Features

### Adding a New Page

**Step 1**: Create the file
```tsx
// src/pages/admin/NewFeature.tsx
import React from 'react';

export default function NewFeature() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">New Feature</h1>
        <p className="page-subtitle">Description here</p>
      </div>
      <div className="card">
        {/* Content */}
      </div>
    </div>
  );
}
```

**Step 2**: Add lazy import in `src/App.tsx`
```tsx
const NewFeature = lazy(() => import('./pages/admin/NewFeature'));
```

**Step 3**: Add route in `src/App.tsx` (inside the MainLayout route block)
```tsx
<Route path="/new-feature" element={<ProtectedRoute allowedRoles={['Administrator']}><NewFeature /></ProtectedRoute>} />
```

**Step 4**: Add sidebar link in `src/components/layout/Sidebar.tsx`
```tsx
{ label: 'New Feature', path: '/new-feature', icon: <SomeIcon className="w-[18px] h-[18px]" /> },
```

### Adding a New Data Entity

**Step 1**: Define the type in `src/types/index.ts`
```typescript
export interface NewEntity {
  id: string;
  name: string;
  // ... fields
}
```

**Step 2**: Add mock data in `src/services/mockData.ts`
```typescript
export const mockNewEntities: NewEntity[] = [
  { id: 'ne-001', name: 'Example' },
];
```

**Step 3**: Add CRUD in `src/services/dataService.ts`
```typescript
export async function getNewEntities(): Promise<NewEntity[]> {
  if (useMock()) return [...mockNewEntities];
  // Firestore version when connected
}
```

**Step 4**: Add to DataContext (`src/context/DataContext.tsx`)
- Add state: `const [newEntities, setNewEntities] = useState<NewEntity[]>([]);`
- Add to `loadAll()`: load from service
- Add to persistence: include in `saveToStorage`
- Add mutations: `addNewEntity`, `editNewEntity`
- Add to Provider value

### Adding a New Column to a Table

Find the page's table columns array and add:
```tsx
<th className="table-header">New Column</th>
// ...
<td className="table-cell">{item.newField}</td>
```

### Adding a New Badge/Status

File: `src/index.css`
```css
.badge-custom {
  @apply badge bg-indigo-50 text-indigo-700 border border-indigo-200;
}
```

### Adding a New Icon

All icons come from `lucide-react`. Find icons at: https://lucide.dev/icons
```tsx
import { NewIcon } from 'lucide-react';
```

---

## 3. How to Handle Errors

### TypeScript Errors

Run:
```bash
npx tsc --noEmit
```

**Common errors and fixes:**

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot find name 'X'` | Missing import | Add `import { X } from '...'` |
| `Property does not exist on type` | Field not in interface | Add field to `src/types/index.ts` |
| `Type 'X' is not assignable to type 'Y'` | Wrong value type | Check the interface definition |
| `Cannot find module` | File doesn't exist or wrong path | Check the import path |
| `Unused variable` | Imported but not used | Remove the import |

### Runtime Errors (in browser)

**"Something went wrong" (ErrorBoundary)**
- Open DevTools (F12) → Console → read the red error
- Usually: accessing a property on `undefined`
- Fix: Add optional chaining (`?.`) or null checks

**"Cannot read properties of undefined"**
- Means you're accessing `.something` on a variable that's `undefined`
- Usually: a case/patient/user was deleted but something still references it
- Fix: Add null check before access

**"Page Not Found"**
- Route doesn't exist in `src/App.tsx`
- Fix: Add the missing `<Route>` entry

**Blank page with no error**
- Usually a Suspense boundary issue or lazy load failure
- Fix: Check browser console for chunk loading errors
- Try hard refresh: Ctrl+Shift+R

### Build Errors

```bash
npx vite build
```

If build fails with "chunk too large" warning — that's just a warning, not an error. The build still succeeds.

If it actually fails:
- Read the error message — usually a syntax error in a `.tsx` file
- Fix the syntax → rebuild

### Data Sync Issues

**Symptom**: Changes made on one page don't appear on another

**Cause**: The page is using `dataService` directly instead of `useData()` from DataContext

**Fix**: Replace:
```tsx
// BAD:
import { getCases } from '../../services/dataService';
const [cases, setCases] = useState([]);
useEffect(() => { getCases().then(setCases); }, []);

// GOOD:
import { useData } from '../../context/DataContext';
const { cases } = useData();
```

---

## 4. How to Make Updates

### Updating a Form

1. Find the page file
2. Find the form state: `const [form, setForm] = useState({...})`
3. Add/remove fields in the state object
4. Add/remove the input in the JSX
5. Update the submit handler to include the new field

### Updating a Table

1. Find the page file
2. Find `<thead>` and `<tbody>` sections
3. Add/remove `<th>` and `<td>` elements
4. If adding a column with data that doesn't exist, add it to the type first

### Updating Mock Data

File: `src/services/mockData.ts`

**IMPORTANT**: If you change mock data, users with existing localStorage won't see changes until they reset. Add a reset button or instruct them to clear localStorage.

### Updating the Color Theme

File: `tailwind.config.js`

```javascript
colors: {
  navy: { 600: '#1B2B5B' },     // Change primary color
  purple: { 500: '#8B2F8F' },   // Change accent
  emerald: { 500: '#10B981' },  // Change success/green
}
```

After changing, rebuild: `npm run build`

### Updating Dependencies

```bash
# Check for outdated packages
npm outdated

# Update a specific package
npm update react

# Update all
npm update
```

**CAUTION**: Major version bumps (e.g., React 18 → 19) may break things. Test thoroughly.

---

## 5. How to Handle Security Issues

### Authentication Bypass

**Risk**: Currently demo mode accepts any email that matches mockUsers without password verification.

**Fix (when connecting real Firebase)**:
1. Set up Firebase Auth in Firebase Console
2. Fill in `.env` with real credentials
3. The app automatically uses Firebase Auth when configured (check `isFirebaseConfigured()` in `src/services/firebase.ts`)

### XSS (Cross-Site Scripting)

**Risk**: User input rendered as HTML could execute scripts.

**Current protection**: React auto-escapes content in JSX. Never use `dangerouslySetInnerHTML`.

**Additional protection**: `src/utils/sanitize.ts` provides:
- `sanitizeHtml()` — escapes HTML entities
- `stripControlChars()` — removes control characters

**When to use**: If you ever render user content outside of React (e.g., in `window.open()` for PDF printing), sanitize first.

### CSV Injection

**Risk**: Exported CSV cells starting with `=`, `+`, `-`, `@` could execute formulas in Excel.

**Current protection**: `sanitizeCsvCell()` in `src/utils/sanitize.ts` prefixes dangerous cells with a single quote.

**Where it's used**: The `EnhancedDataTable` CSV export should use this (currently uses basic escaping).

### localStorage Tampering

**Risk**: Anyone with DevTools can modify localStorage data.

**Current status**: This is acceptable for demo mode.

**Fix for production**: Use Firestore with server-side security rules (`firestore.rules`). The client cannot bypass server-side rules.

### Rate Limiting

**Current**: 5 login attempts → 60s lockout (client-side in localStorage)

**Risk**: Can be bypassed by clearing localStorage.

**Fix for production**: Implement rate limiting on Firebase Auth (built-in) or add Firebase Functions for custom throttling.

### Firestore Security Rules

File: `firestore.rules`

Deploy with:
```bash
firebase deploy --only firestore:rules
```

Key rules:
- Audit logs: Can ONLY be created, never updated/deleted
- Reports: Locked after sign-off (only admin can modify)
- Users: Only admin can create/update/delete
- Patients: Doctors can create, only admin/dept can update

---

## 6. How to Handle Data Overloading

### Symptoms
- Page loads slowly
- Browser becomes unresponsive
- localStorage exceeds 5MB limit

### Prevention

**1. Limit localStorage size**

If data grows too large:
```typescript
// In DataContext, check size before saving
const dataStr = JSON.stringify(data);
if (dataStr.length > 4 * 1024 * 1024) { // 4MB limit
  console.warn('Data approaching localStorage limit');
  // Remove old audit logs to free space
  data.auditLogs = data.auditLogs.slice(0, 100);
}
```

**2. Pagination for large datasets**

The `EnhancedDataTable` component already paginates (10/25/50 per page). If you have 1000+ records, this prevents rendering all at once.

**3. Virtual scrolling (future)**

For tables with 5000+ rows, install `@tanstack/react-virtual` and replace the table body with a virtualized renderer.

**4. Firestore pagination**

When connected to real Firestore, use `limit()` and `startAfter()` queries:
```typescript
const q = query(collection(db, 'cases'), orderBy('createdAt', 'desc'), limit(50));
```

### Data Cleanup

- **Audit logs**: Keep last 1000 entries, archive older ones
- **Comments**: Keep last 50 per case
- **Trash**: Auto-delete items older than 30 days
- **Recently viewed**: Already limited to 10 items

### When localStorage is Full

The app catches `QuotaExceededError` silently. If it happens:
1. Old data stops persisting
2. App continues to work in memory
3. Fix: Clear old/unnecessary data or connect to Firestore

---

## 7. Mapping & Routing Issues

### Map Not Loading

**Symptom**: Grey/empty area where map should be

**Causes**:
1. Leaflet CSS not loaded — check `index.html` has the Leaflet stylesheet link
2. Map container has 0 height — ensure parent has `h-full` or explicit height
3. Internet connectivity — tiles load from OpenStreetMap CDN

**Fix**: Check browser console for 404 errors on tile requests.

### Routes Not Calculating

**Symptom**: Route shows 0 km / 0 min

**Causes**:
1. OSRM API unreachable (5s timeout) → falls back to Haversine
2. Patient has no lat/lng and geocoding failed
3. Clinic coordinates are wrong

**How routing works** (`src/services/routingService.ts`):
```
1. Try OSRM API (real road routing, 5s timeout)
2. If OSRM fails → Haversine distance × 1.3 road factor
3. Generate simulated polyline between two points
```

**Fix for bad geocoding**:
- Add more locations to the keyword fallback in `routingService.ts` → `locations` array
- Or ensure patients have lat/lng stored when registered

### Geocoding Failures

**Symptom**: Patient address not found on map

**How geocoding works** (`geocodeAddress()` in `routingService.ts`):
```
1. Try Nominatim API (OpenStreetMap geocoding)
2. If fails → match keywords in address (e.g., "Putrajaya" → [2.9264, 101.6964])
3. If no keyword match → default to central Selangor with random offset
```

**Fix**: Add the location to the keyword fallback:
```typescript
{ keywords: ['new-area-name'], lat: X.XXXX, lon: XXX.XXXX },
```

### Map Performance with Many Routes

**Current limit**: 25 routes drawn simultaneously

**If performance is slow**:
1. Reduce route count in `drawBulkRoutes()` → change `Math.min(scheduledCases.length, 25)` to lower number
2. Simplify polylines (fewer points per route)
3. Use canvas renderer instead of SVG: `L.map(el, { preferCanvas: true })`

### Adding a New Clinic Location

1. Add to `mockClinics` in `src/services/mockData.ts` with correct lat/lng
2. Add to `routingService.ts` geocoding fallback if the area is new
3. Add radiographer schedules for the new clinic in `mockRadioSchedules`
4. Clear localStorage for changes to take effect

---

## 8. Potential Issues & Known Limitations

### Known Limitations

| Issue | Impact | Workaround |
|-------|--------|------|
| localStorage 5MB limit | Can't store infinite data | Connect Firebase for production |
| No real authentication | Anyone can login as any role | Connect Firebase Auth |
| Profile pictures stored as base64 | Large images bloat localStorage | Use Firebase Storage |
| OSRM API is public demo | May rate-limit or go down | Haversine fallback handles this |
| Mock radiographer schedules are static | Slots don't update after booking | Would need real schedule management |
| No real-time push notifications | Must refresh to see updates | BroadcastChannel handles cross-tab |
| PDF print uses window.open | Some browsers block popups | User must allow popups |

### Potential Production Issues

**1. Concurrent editing conflicts**
- If two admins schedule the same case simultaneously
- Fix: Use Firestore transactions with optimistic locking

**2. Browser storage corruption**
- If localStorage gets corrupted (rare)
- Fix: The `loadFromStorage()` function validates data structure; if invalid, falls back to mock data

**3. Session hijacking**
- localStorage `healthgrid_user` can be copied between browsers
- Fix: Use Firebase Auth tokens (short-lived, server-validated)

**4. Timezone issues**
- All dates stored as ISO 8601 UTC
- Displayed using browser's local timezone via `toLocaleString()`
- If users in different timezones, ensure server stores UTC

**5. Memory leaks**
- Leaflet map instances must be destroyed on unmount
- The `useEffect` cleanup in `AISchedulerMap.tsx` handles this: `return () => { map.remove(); }`

---

## 9. Maintenance Procedures

### Daily

- Check audit logs for unusual activity
- Monitor browser console for JavaScript errors
- Verify map tiles are loading (OpenStreetMap availability)

### Weekly

- Review Recycle Bin — permanently delete items older than 30 days
- Check localStorage size in DevTools (Application → Local Storage)
- Verify all role logins work correctly

### Monthly

- Run `npm outdated` to check for security patches
- Update dependencies with `npm update`
- Review and clean up audit logs (archive old entries)
- Test the full workflow end-to-end (register → refer → schedule → scan → report)

### Before Deployment

1. Run: `npx tsc --noEmit` (must show 0 errors)
2. Run: `npm run build` (must succeed)
3. Test all 5 roles login correctly
4. Test AI Scheduler with at least 3 cases
5. Test PDF report printing
6. Test on mobile/tablet viewport
7. Clear localStorage and verify fresh-load works

### After Deployment

1. Verify the deployed URL loads correctly
2. Test login with each role
3. Check browser console for errors
4. Test one full case lifecycle
5. Verify map loads and routes calculate

---

## 10. Emergency Procedures

### System Won't Load (White Screen)

1. Open DevTools (F12) → Console
2. Look for red error messages
3. Common fixes:
   - Clear localStorage: `localStorage.clear()`
   - Hard refresh: Ctrl+Shift+R
   - Check if `index.html` is being served correctly

### Data Corruption

1. Clear localStorage: `localStorage.clear()`
2. Reload — system will reinitialize from mock data
3. If deployed with Firestore — data is safe in the cloud; only local cache is lost

### User Locked Out

1. Clear localStorage keys: `localStorage.removeItem('healthgrid_login_lock')`
2. Or wait 60 seconds for the lockout to expire

### Map Completely Broken

1. Check internet connectivity (tiles need internet)
2. Check if OpenStreetMap is down: https://status.openstreetmap.org/
3. Check if Leaflet CSS is loading (missing CSS = map controls overlap)
4. Check browser console for 403/429 errors (rate limiting)

### Build Fails in Production

1. `npx tsc --noEmit` — fix TypeScript errors first
2. `npm run build` — check the actual error message
3. Common: a file was deleted but still imported → remove the import
4. Common: circular dependency → restructure imports

### Need to Rollback

If you use Git:
```bash
git log --oneline -10       # Find the good commit
git checkout <commit-hash>  # Temporary rollback
git revert <bad-commit>     # Permanent rollback
```

If no Git — restore from your last known-good backup of the `src/` folder.

---

## Quick Command Reference

```bash
# Development
npm run dev              # Start dev server at localhost:5173
npm run build            # Production build → dist/
npm run preview          # Preview production build

# Type checking
npx tsc --noEmit         # Check for errors without building

# Find all files using old dataService (should return nothing)
grep -r "from '../../services/dataService'" src/pages/

# Find all TODO comments
grep -r "TODO" src/

# Check bundle size
ls -la dist/assets/*.js | sort -k5 -n

# Reset demo data (browser console)
localStorage.clear(); location.reload();
```

---

## File Quick Reference

| What you want to change | File to edit |
|---|---|
| Add/remove nav items | `src/components/layout/Sidebar.tsx` |
| Change header | `src/components/layout/Header.tsx` |
| Add a route | `src/App.tsx` |
| Add a data type | `src/types/index.ts` |
| Add mock data | `src/services/mockData.ts` |
| Change colors | `tailwind.config.js` |
| Change button/card styles | `src/index.css` |
| Fix data sync | `src/context/DataContext.tsx` |
| Fix auth | `src/context/AuthContext.tsx` |
| Fix map/routing | `src/services/routingService.ts` |
| Fix geocoding | `src/services/routingService.ts` → `locations` array |
| Fix AI scoring | `src/components/scheduling/RadiograperSelector.tsx` |
| Security rules | `firestore.rules` |
| Environment vars | `.env` (copy from `.env.example`) |

---

*End of Maintenance Guide — HealthGrid IQ v1.0.0*
