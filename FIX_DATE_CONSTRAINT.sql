-- =============================================================================
-- FIX_DATE_CONSTRAINT.sql
-- =============================================================================
-- Bug : La validation date_echeance >= today n'existe que côté JS (admin.html).
--        L'API REST accepte TOUTES les dates (HTTP 201) — contournable via curl.
--
-- Découverte : 2026-06-20 via test API REST (compte DAF).
-- Impact     : Un utilisateur authentifié peut insérer une date d'échéance
--              dépassée, contournant la protection UI.
--
-- Fix       : CHECK constraint côté base de données.
--              Pas de lignes existantes à bloquer (audit 2026-06-20 : 0 lignes
--              avec date_echeance < CURRENT_DATE) → contrainte normale, pas NOT VALID.
--
-- IMPORTANT  : Exécuter via Supabase Dashboard → SQL Editor (service_role requis).
--              Ne PAS exécuter via OpenHands (anon key insuffisante pour DDL).
--
-- Confirmation pre-fix : 0 lignes avec date_echeance < CURRENT_DATE (2026-06-20)
-- =============================================================================

-- 1. Vérifier qu'aucune ligne existante ne viole la contrainte
SELECT 'Lignes avec date_echeance dans le passé:' AS info;
SELECT id, fournisseur, date_echeance, statut
FROM credits_fournisseurs
WHERE date_echeance IS NOT NULL
  AND date_echeance < CURRENT_DATE;

-- 2. Ajouter la CHECK constraint
ALTER TABLE credits_fournisseurs
ADD CONSTRAINT date_echeance_future
CHECK (date_echeance IS NULL OR date_echeance >= CURRENT_DATE);

-- 3. Vérifier que la contrainte est bien créée
SELECT 'Constraint créée:' AS info;
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'date_echeance_future';
