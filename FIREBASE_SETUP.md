# Firebase Setup Guide

Complete setup guide for the Firebase project backing `app.colegioubaescobar.gob.ar`. Covers project creation, Firestore, Google Authentication, security rules, initial data, and GitHub Secrets.

---

## Overview

This app uses two Firebase services:

| Service | Used for |
|---|---|
| **Firebase Authentication** | Google OAuth login |
| **Cloud Firestore** | Database (cycles, students, admins whitelist) |

Both are accessed client-side only. No Firebase Admin SDK or server-side code is required.

---

## Step 1 — Create the Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project**
3. Enter a project name (e.g. `colegio-uba-escobar`)
4. Disable Google Analytics (not needed) → **Create project**
5. Wait for provisioning to finish → **Continue**

---

## Step 2 — Register a Web App

1. On the project overview page, click the **Web** icon (`</>`)
2. Enter an app nickname (e.g. `app.colegioubaescobar.gob.ar`)
3. Leave "Also set up Firebase Hosting" **unchecked** (we use Apache on EC2)
4. Click **Register app**
5. Firebase shows a `firebaseConfig` object — copy all the values:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "...",
  appId: "1:...:web:..."
}
```

These values go into your `.env` file (local dev) and GitHub Secrets (production).

---

## Step 3 — Enable Google Authentication

1. In the Firebase Console, go to **Authentication** (left sidebar)
2. Click **Get started**
3. Under **Sign-in method** tab, click **Google**
4. Toggle **Enable** to on
5. Set **Project support email** to your institutional email
6. Click **Save**

### Add Authorized Domains

Still in **Authentication → Settings → Authorized domains**, add:

| Domain |
|---|
| `localhost` (already listed — for local dev) |
| `app.colegioubaescobar.gob.ar` |

Click **Add domain** for the production domain. Without this, the Google OAuth popup will be blocked with an `auth/unauthorized-domain` error.

---

## Step 4 — Create the Firestore Database

1. Go to **Firestore Database** (left sidebar)
2. Click **Create database**
3. Choose **Production mode** (we'll write the rules manually)
4. Select a region — choose `us-east1` or the closest to Argentina (`southamerica-east1`)
5. Click **Enable**

---

## Step 5 — Firestore Security Rules

Go to **Firestore Database → Rules** and replace the default rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Only authenticated users can read the admins whitelist
    match /admins/{docId} {
      allow read: if request.auth != null;
      allow write: if false;  // manage admins manually in the console
    }

    // Cycles and their students subcollection — authenticated users only
    match /cycles/{year} {
      allow read, write: if request.auth != null;

      match /students/{studentId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

Click **Publish**.

> **Why `allow write: if false` on admins?** The app never writes to the `admins` collection — users are managed manually in the Firebase Console. This prevents any authenticated user from adding themselves as admin.

---

## Step 6 — Create the Admins Collection

The `admins` collection is the access whitelist. Add one document per authorized user.

1. Go to **Firestore Database → Data**
2. Click **Start collection**
3. Collection ID: `admins`
4. For the first document, click **Auto-ID**
5. Add these fields:

| Field | Type | Value |
|---|---|---|
| `email` | string | `usuario@dominio.com` |
| `role` | string | `admin` |

6. Click **Save**

Repeat for each additional user, changing `email` and `role` as needed.

**Valid roles:**

| Role | Access |
|---|---|
| `admin` | Full access — import students, manage grades, manage cycles |
| `secretary` | Partial access — grade entry, view lists, print reports |

---

## Step 7 — Firestore Data Model Reference

The database has three top-level collections/paths:

```
admins/
  {auto-id}/
    email:    "user@domain.com"
    role:     "admin" | "secretary"

cycles/
  {year}/                         # document ID is the year string, e.g. "2026"
    status:     "active" | "archived"
    createdAt:  "2026-01-01T00:00:00.000Z"
    archivedAt: null | "2026-12-31T23:59:59.000Z"

    students/                     # subcollection
      {studentId}/                # document ID = student ID, e.g. "2026-001"
        id:        "2026-001"
        apellido:  "García"
        nombre:    "Juan"
        dni:       "12345678"
        comision:  "A"
        grades:    {              # map/object, keys are exam IDs
          "M1-2026": 85,
          "M2-2026": 70,
          "L1-2026": "Aus"
        }
        createdAt: "2026-03-01T10:00:00.000Z"
        updatedAt: "2026-03-01T10:00:00.000Z"
```

**Exam ID format:** `{subject}{number}-{year}` where subject is `M` (Matemática) or `L` (Lengua), e.g. `M1-2026`, `RL-2026` (Recuperatorio Lengua).

**Creating the first cycle:** Use the app's "Gestión de Ciclos" section after logging in — it creates the `cycles/{year}` document automatically. Alternatively, create it manually in Firestore with `status: "active"`.

---

## Step 8 — Local Development Setup

Copy `.env.example` to `.env` and fill in the values from Step 2:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=634585469878
VITE_FIREBASE_APP_ID=1:634585469878:web:a77dfcb...
```

Then run:

```bash
npm install
npm run dev
# → http://localhost:5173
```

For Google OAuth to work locally, `localhost` must be in the authorized domains list (it is by default).

---

## Step 9 — GitHub Secrets (Production)

These secrets are injected at build time by GitHub Actions. Go to the repository → **Settings → Secrets and variables → Actions** and create:

| Secret name | Where to find the value |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Console → Project settings → Your apps → `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Console → Project settings → `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Console → Project settings → `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Console → Project settings → `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Console → Project settings → `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | Firebase Console → Project settings → Your apps → `appId` |

To reach the config object: **Firebase Console → Project settings** (gear icon) → scroll down to **Your apps** → click the web app → **SDK setup and configuration**.

For SSH and server secrets, see `DEPLOYMENT_SETUP.md`.

---

## Troubleshooting

### `auth/unauthorized-domain`

The domain making the OAuth request is not in the authorized list.

- For production: add `app.colegioubaescobar.gob.ar` to **Authentication → Settings → Authorized domains**
- For local dev: `localhost` should already be there; if not, add it

### `auth/popup-blocked`

The browser blocked the Google sign-in popup.

- Ensure the site is served over HTTPS in production
- In development, allow popups for `localhost` in the browser settings

### User can log in with Google but gets rejected by the app

The Google account is valid but the email is not in the `admins` Firestore collection.

1. Go to **Firestore → admins** collection
2. Verify a document exists with `email` matching the Google account exactly (case-sensitive)
3. Add a new document if missing

### `PERMISSION_DENIED` reading Firestore

The security rules are not published, or the user is not authenticated when the query runs.

1. Check **Firestore → Rules** — ensure the rules from Step 5 are published
2. Open browser DevTools → Console — look for auth errors before the Firestore query

### Firebase credentials not working after GitHub Actions deploy

The secrets may be wrong or missing.

1. Go to **GitHub → Settings → Secrets → Actions** and verify all 6 `VITE_FIREBASE_*` secrets exist
2. Trigger a new workflow run — the old bundle may have been built before the secrets were set
3. In the Actions log, the Build step should show `VITE_FIREBASE_API_KEY` as `***` (masked) — if it's blank, the secret is not set

---

## Managing Users

All user management is done directly in the Firebase Console — there is no admin UI in the app for this.

**Add a user:**
1. Firestore → `admins` collection → **Add document**
2. Use auto-generated ID
3. Add `email` (string) and `role` (string: `admin` or `secretary`)

**Remove a user:**
1. Firestore → `admins` collection → find the document by email → **Delete document**
2. The user will be rejected on their next sign-in attempt (or immediately if they try a fresh login)

**Change a user's role:**
1. Firestore → `admins` → find the document → click `role` field → edit value

> The app checks the `admins` collection on every sign-in. There is no session cache for the role — changes take effect on the next login.
