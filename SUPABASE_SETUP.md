# Supabase Setup Guide

## 1. Create Supabase Project

1. Visit https://supabase.com and sign up/login
2. Click "New Project"
3. **Project name:** `colegio-ingreso-2026`
4. **Database password:** Generate a strong password (save it securely)
5. **Region:** Select closest to Argentina (São Paulo or us-east-1)
6. Wait for project to initialize (~2-3 minutes)

---

## 2. Run SQL Schema

Once your project is created:

1. Go to **SQL Editor** in Supabase dashboard
2. Click **"New Query"**
3. Paste the entire SQL schema below
4. Click **"Run"**

### Complete SQL Schema

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: admins (whitelist of authorized users)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT role_check CHECK (role IN ('admin', 'secretary'))
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: cycles (exam cycles)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.cycles (
  year INTEGER PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archived_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT status_check CHECK (status IN ('active', 'archived'))
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: students (with composite primary key)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.students (
  id TEXT NOT NULL,
  cycle_year INTEGER NOT NULL,
  apellido TEXT,
  nombre TEXT,
  dni TEXT,
  comision TEXT,
  Comisión TEXT,
  grades JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id, cycle_year),
  FOREIGN KEY (cycle_year) REFERENCES public.cycles(year) ON DELETE CASCADE
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTION: Check if user is whitelisted
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION is_whitelisted(p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admins WHERE email = p_email
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- ADMINS TABLE POLICIES
CREATE POLICY "Admins can view all admins"
  ON public.admins
  FOR SELECT
  USING (is_whitelisted(auth.jwt()->>'email'));

CREATE POLICY "Only admins can insert admins"
  ON public.admins
  FOR INSERT
  WITH CHECK (
    is_whitelisted(auth.jwt()->>'email')
    AND (SELECT role FROM public.admins WHERE email = auth.jwt()->>'email') = 'admin'
  );

-- CYCLES TABLE POLICIES
CREATE POLICY "Whitelisted users can view all cycles"
  ON public.cycles
  FOR SELECT
  USING (is_whitelisted(auth.jwt()->>'email'));

CREATE POLICY "Only admins can create cycles"
  ON public.cycles
  FOR INSERT
  WITH CHECK (
    is_whitelisted(auth.jwt()->>'email')
    AND (SELECT role FROM public.admins WHERE email = auth.jwt()->>'email') = 'admin'
  );

CREATE POLICY "Only admins can update cycles"
  ON public.cycles
  FOR UPDATE
  USING (
    is_whitelisted(auth.jwt()->>'email')
    AND (SELECT role FROM public.admins WHERE email = auth.jwt()->>'email') = 'admin'
  );

-- STUDENTS TABLE POLICIES
CREATE POLICY "Whitelisted users can view all students"
  ON public.students
  FOR SELECT
  USING (is_whitelisted(auth.jwt()->>'email'));

CREATE POLICY "Whitelisted users can insert students"
  ON public.students
  FOR INSERT
  WITH CHECK (is_whitelisted(auth.jwt()->>'email'));

CREATE POLICY "Whitelisted users can update students"
  ON public.students
  FOR UPDATE
  USING (is_whitelisted(auth.jwt()->>'email'));

-- ═══════════════════════════════════════════════════════════════════════════════
-- OPTIONAL: RPC FUNCTION FOR ATOMIC GRADE UPDATES (recommended for production)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_grade(
  p_student_id TEXT,
  p_cycle_year INTEGER,
  p_exam_key TEXT,
  p_value JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_updated_grades JSONB;
BEGIN
  -- Check authorization
  IF NOT is_whitelisted(auth.jwt()->>'email') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Update grades atomically
  UPDATE public.students
  SET grades = jsonb_set(
    COALESCE(grades, '{}'::JSONB),
    ARRAY[p_exam_key],
    p_value
  ),
  updated_at = NOW()
  WHERE id = p_student_id AND cycle_year = p_cycle_year
  RETURNING grades INTO v_updated_grades;

  RETURN v_updated_grades;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- CREATE INDEXES FOR PERFORMANCE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_students_cycle_year ON public.students(cycle_year);
CREATE INDEX IF NOT EXISTS idx_students_apellido ON public.students(apellido);
CREATE INDEX IF NOT EXISTS idx_admins_email ON public.admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_role ON public.admins(role);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SAMPLE DATA (optional - for testing)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Insert sample cycle
INSERT INTO public.cycles (year, status) 
VALUES (2026, 'active')
ON CONFLICT DO NOTHING;

-- Insert your admin email (REPLACE with actual email)
-- INSERT INTO public.admins (email, role) 
-- VALUES ('alvarezjoaquin.dev@proton.me', 'admin')
-- ON CONFLICT DO NOTHING;
```

---

## 3. Configure Google OAuth

In Supabase Dashboard:

1. Go to **Authentication** → **Providers**
2. Click **Google**
3. Enable the provider
4. Enter your Google OAuth credentials:
   - **Client ID:** (from Google Cloud Console)
   - **Client Secret:** (from Google Cloud Console)
5. Set **Redirect URL:**
   ```
   https://app.colegioubaescobar.gob.ar/auth/callback
   (or localhost:5173/auth/callback for development)
   ```
6. Save

---

## 4. Populate Admins Table

Run in SQL Editor (replace with actual emails):

```sql
INSERT INTO public.admins (email, role)
VALUES 
  ('alvarezjoaquin.dev@proton.me', 'admin'),
  ('other-admin@example.com', 'admin'),
  ('secretary@example.com', 'secretary')
ON CONFLICT (email) DO NOTHING;
```

---

## 5. Get API Keys

1. Go to **Settings** → **API**
2. Copy these values for `.env`:
   - **Project URL:** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

---

## 6. About API Keys: Publishable vs Anon Key

**TL;DR:** Yes, you can use the "Publishable key" - **it's the same as the "anon key"**.

Supabase uses the term **"anon key"** (anonymous key) for the client-side public key. Different Supabase docs may call it:
- **anon key** (JWT token for unauthenticated requests)
- **Publishable key** (newer naming in some docs)
- **Public API key** (same thing)

**All three refer to the same key** found in Settings → API → Project API keys.

### Key Types Explained:

| Key Type | Usage | Safe to Expose |
|----------|-------|---|
| **anon/publishable** | Client-side authentication & public reads | ✅ YES - it's public |
| **service_role** | Server-side, bypasses RLS | ❌ NO - keep secret |
| **JWT secret** | Signing & verifying tokens | ❌ NO - keep secret |

**For your app:** Use the **anon/publishable key** in `VITE_SUPABASE_ANON_KEY`. RLS policies enforce access control - the key itself doesn't restrict anything; the database does.

---

## 7. Local .env Setup

Create `.env` in project root:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 8. Verify Setup

Test locally:

```bash
npm install
npm run dev
```

Then:
1. Visit http://localhost:5173
2. Click **Login**
3. Sign in with Google (use whitelisted email)
4. If you see the dashboard, auth works ✅

---

## 9. Table Structure Reference

### admins
```
id (UUID)        → Auto-generated
email (TEXT)     → Unique, must be whitelisted
role (TEXT)      → 'admin' or 'secretary'
created_at       → Auto-timestamp
updated_at       → Auto-timestamp
```

### cycles
```
year (INT)       → PK, e.g., 2026
status (TEXT)    → 'active' or 'archived'
created_at       → Auto-timestamp
archived_at      → Set when archived
```

### students
```
id (TEXT)        → e.g., '2026-001' (composite PK with cycle_year)
cycle_year (INT) → Foreign key to cycles.year (composite PK)
apellido (TEXT)  → Last name
nombre (TEXT)    → First name
dni (TEXT)       → National ID
comision (TEXT)  → Section/commission
grades (JSONB)   → e.g., {"M1-2026": 85, "L2-2026": "Aus"}
created_at       → Auto-timestamp
updated_at       → Auto-timestamp
```

---

## 10. Realtime Subscriptions

Supabase Realtime is **enabled by default**. Your app uses it for:
- Student list updates (StudentsList.jsx)
- Grade updates in real-time (GradeBoard.jsx)
- Boletines generation (ReportsManager.jsx)
- Merit order updates (MeritOrder.jsx)

No additional config needed - just use the subscriptions in your code.

---

## Troubleshooting

### "Unauthorized" when accessing tables
- **Cause:** User email not in `admins` table
- **Fix:** Run: `INSERT INTO public.admins (email, role) VALUES ('your@email.com', 'admin');`

### "No rows found" when querying students
- **Cause:** RLS policy blocking access
- **Fix:** Make sure email is in `admins` table AND has valid role

### Auth callback fails
- **Cause:** Redirect URL mismatch
- **Fix:** Go to Settings → Auth → Redirect URLs and add:
  - `http://localhost:5173/auth/callback` (dev)
  - `https://app.colegioubaescobar.gob.ar/auth/callback` (prod)

### Realtime subscriptions not working
- **Cause:** Realtime disabled or wrong filter syntax
- **Fix:** Check that subscription filter uses correct field names (e.g., `cycle_year=eq.2026`)

