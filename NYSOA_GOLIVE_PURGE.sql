-- ================================================================
-- NYSOA BTP — SCRIPT DE PURGE GO-LIVE v22
-- Auteur  : Moteur de déploiement ERP
-- Date    : 2026-06-12
-- Objet   : Vider TOUTES les données métier, réinitialiser les
--           séquences d'ID, conserver la structure (tables, RLS,
--           triggers, contraintes, fonctions SQL).
-- ⚠ À exécuter UNE SEULE FOIS dans Supabase SQL Editor
--   AVANT toute saisie de données de production.
-- ================================================================

-- ── 0. DÉSACTIVER TEMPORAIREMENT LES TRIGGERS ET FK CHECKS ─────
-- PostgreSQL ne supporte pas SET FOREIGN_KEY_CHECKS, on utilise
-- TRUNCATE ... CASCADE qui gère l'ordre automatiquement.
-- Les triggers de type BEFORE/AFTER sont désactivés sur chaque
-- table le temps du TRUNCATE, puis réactivés.
SET session_replication_role = 'replica';  -- désactive triggers + FK checks

-- ================================================================
-- 1. PURGE — TABLES ENFANTS EN PREMIER (ordre de dépendances FK)
-- ================================================================

-- ── Niveau 3 : feuilles (aucune table ne les référence) ─────────
TRUNCATE TABLE
    devis_lignes,
    devis_lots,
    antoka_paiements,
    credits_paiements,
    mouvements_stock,
    echeances_credit,
    candidatures,
    planning_tasks,
    interventions,
    evaluations,
    besoins_stock,
    demandes_budget,
    validations,
    controles_inopines,
    gantt_taches,
    rapports_chantier,
    pointage_attendance,
    pointage,
    salaires,
    avances_salaire,
    conges,
    formations,
    offres_emploi,
    logistique,
    achats,
    projets,
    controles
RESTART IDENTITY CASCADE;

-- ── Niveau 2 : tables intermédiaires ────────────────────────────
TRUNCATE TABLE
    journal,
    journal_global,
    recettes_clients,
    dotations_felana,
    budget_felana,
    budgets,
    budgets_chantiers,
    credits_fournisseurs,
    credits_fournisseur,
    devis,
    commandes,
    caisse,
    antoka,
    stocks,
    materiels,
    catalogue_prix,
    prix_catalogue,
    contrats,
    contrats_prestataires,
    avances_salaire,
    retenues
RESTART IDENTITY CASCADE;

-- ── Niveau 1 : tables parentes (référencées par les autres) ─────
TRUNCATE TABLE
    personnel,
    chantiers
RESTART IDENTITY CASCADE;

-- ── Tables système (à purger séparément — pas de RESTART IDENTITY)
-- ⚠ NE PAS purger 'users' : les comptes Supabase Auth sont gérés
--   via le Dashboard Auth, pas via cette table.
-- TRUNCATE TABLE users RESTART IDENTITY CASCADE;  ← INTENTIONNELLEMENT COMMENTÉ

-- ================================================================
-- 2. RÉINITIALISER TOUTES LES SÉQUENCES À 1
-- ================================================================
-- Sécurité supplémentaire : forcer les séquences même si TRUNCATE
-- RESTART IDENTITY a déjà été appliqué (certaines séquences nommées
-- différemment du pattern <table>_id_seq peuvent être oubliées).

DO $$
DECLARE
    seq RECORD;
BEGIN
    FOR seq IN
        SELECT sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
          AND sequence_name NOT LIKE 'auth%'
          AND sequence_name NOT LIKE 'storage%'
    LOOP
        EXECUTE format('ALTER SEQUENCE %I RESTART WITH 1', seq.sequence_name);
    END LOOP;
END $$;

-- ================================================================
-- 3. RÉACTIVER LES TRIGGERS ET FK CHECKS
-- ================================================================
SET session_replication_role = 'origin';  -- réactive triggers + FK

-- ================================================================
-- 4. VÉRIFICATION POST-PURGE
-- ================================================================
-- Exécuter ce SELECT après la purge pour confirmer que toutes
-- les tables sont vides (count = 0 attendu pour chaque ligne).

SELECT
    schemaname,
    relname                AS table_name,
    n_live_tup             AS lignes_restantes
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND relname NOT IN ('users')   -- users Supabase Auth exclus
ORDER BY n_live_tup DESC, relname;

-- ================================================================
-- 5. VÉRIFICATION DES SÉQUENCES (toutes doivent afficher 1)
-- ================================================================
SELECT
    sequence_name,
    start_value,
    minimum_value
FROM information_schema.sequences
WHERE sequence_schema = 'public'
ORDER BY sequence_name;

-- ================================================================
-- FIN DU SCRIPT DE PURGE
-- Durée estimée : < 5 secondes sur une base de dev/staging.
-- ================================================================
