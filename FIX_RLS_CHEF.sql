-- ============================================================
-- FIX RLS POLICY FOR CHEF ROLE ON PERSONNEL TABLE
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Check current RLS policies on personnel
SELECT * FROM pg_policies WHERE tablename = 'personnel';

-- 2. Enable RLS if not already enabled
ALTER TABLE personnel ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing restrictive policies if any (optional)
-- DROP POLICY IF EXISTS "Enable read for authenticated users" ON personnel;

-- 4. Add policy: Chef can read personnel on their assigned chantier
CREATE POLICY "Chef read own chantier personnel" ON personnel
FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' = 'chef'
    AND chantier = auth.jwt()->'user_metadata'->>'chantier'
);

-- 5. Add policy: RH/Admin/DAF can read all personnel
CREATE POLICY "RH Admin DAF read all personnel" ON personnel
FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' IN ('rh', 'admin', 'daf')
);

-- 6. Add policy: Chef can insert personnel on their chantier
CREATE POLICY "Chef insert own chantier personnel" ON personnel
FOR INSERT WITH CHECK (
    auth.jwt()->'user_metadata'->>'role' = 'chef'
    AND chantier = auth.jwt()->'user_metadata'->>'chantier'
);

-- 7. Add policy: RH/Admin can insert/update/delete all personnel
CREATE POLICY "RH Admin manage personnel" ON personnel
FOR ALL USING (
    auth.jwt()->'user_metadata'->>'role' IN ('rh', 'admin')
);

-- 8. Verify policies
SELECT * FROM pg_policies WHERE tablename = 'personnel';

-- ============================================================
-- ALSO ADD POLICIES FOR POINTAGE_ATTENDANCE TABLE
-- ============================================================

ALTER TABLE pointage_attendance ENABLE ROW LEVEL SECURITY;

-- Chef can insert pointage on their chantier
CREATE POLICY "Chef insert pointage own chantier" ON pointage_attendance
FOR INSERT WITH CHECK (
    auth.jwt()->'user_metadata'->>'role' = 'chef'
    AND chantier = auth.jwt()->'user_metadata'->>'chantier'
);

-- Chef can read pointage on their chantier
CREATE POLICY "Chef read pointage own chantier" ON pointage_attendance
FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' = 'chef'
    AND chantier = auth.jwt()->'user_metadata'->>'chantier'
);

-- RH/Admin/DAF can read all pointage
CREATE POLICY "RH Admin DAF read all pointage" ON pointage_attendance
FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' IN ('rh', 'admin', 'daf')
);

-- RH can insert pointage (sync hebdo)
CREATE POLICY "RH insert pointage" ON pointage_attendance
FOR INSERT WITH CHECK (
    auth.jwt()->'user_metadata'->>'role' = 'rh'
);

-- ============================================================
-- POLICIES FOR SALAIRES TABLE
-- ============================================================

ALTER TABLE salaires ENABLE ROW LEVEL SECURITY;

-- RH can insert/read all salaires
CREATE POLICY "RH manage salaires" ON salaires
FOR ALL USING (
    auth.jwt()->'user_metadata'->>'role' = 'rh'
);

-- DAF/Admin can read salaires
CREATE POLICY "DAF Admin read salaires" ON salaires
FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' IN ('daf', 'admin')
);

-- ============================================================
-- POLICIES FOR CHANTIERS TABLE
-- ============================================================

ALTER TABLE chantiers ENABLE ROW LEVEL SECURITY;

-- Chef can read their chantier
CREATE POLICY "Chef read own chantier" ON chantiers
FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' = 'chef'
    AND nom = auth.jwt()->'user_metadata'->>'chantier'
);

-- Admin/DAF/RH can read all chantiers
CREATE POLICY "Admin DAF RH read all chantiers" ON chantiers
FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' IN ('admin', 'daf', 'rh')
);

-- Admin can insert/update chantiers
CREATE POLICY "Admin manage chantiers" ON chantiers
FOR ALL USING (
    auth.jwt()->'user_metadata'->>'role' = 'admin'
);

-- ============================================================
-- POLICIES FOR CONTROLES_INOPINES TABLE
-- ============================================================

ALTER TABLE controles_inopines ENABLE ROW LEVEL SECURITY;

-- Controleur can insert their inspections
CREATE POLICY "Controleur insert inspections" ON controles_inopines
FOR INSERT WITH CHECK (
    auth.jwt()->'user_metadata'->>'role' = 'controleur'
);

-- Controleur/Admin can read all inspections
CREATE POLICY "Controleur Admin read inspections" ON controles_inopines
FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' IN ('controleur', 'admin')
);

-- ============================================================
-- POLICIES FOR RAPPORTS_CHANTIER TABLE
-- ============================================================

ALTER TABLE rapports_chantier ENABLE ROW LEVEL SECURITY;

-- Chef can insert reports on their chantier
CREATE POLICY "Chef insert rapports own chantier" ON rapports_chantier
FOR INSERT WITH CHECK (
    auth.jwt()->'user_metadata'->>'role' = 'chef'
    AND chantier = auth.jwt()->'user_metadata'->>'chantier'
);

-- Chef/Admin/DAF can read reports
CREATE POLICY "Chef Admin DAF read rapports" ON rapports_chantier
FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' IN ('chef', 'admin', 'daf')
);

-- ============================================================
-- POLICIES FOR VALIDATIONS TABLE
-- ============================================================

ALTER TABLE validations ENABLE ROW LEVEL SECURITY;

-- Chef can insert validation requests
CREATE POLICY "Chef insert validations" ON validations
FOR INSERT WITH CHECK (
    auth.jwt()->'user_metadata'->>'role' = 'chef'
);

-- Admin can read/update all validations
CREATE POLICY "Admin manage validations" ON validations
FOR ALL USING (
    auth.jwt()->'user_metadata'->>'role' = 'admin'
);

-- ============================================================
-- VERIFY ALL POLICIES
-- ============================================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;