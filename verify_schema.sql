-- ============================================================
-- SQL DE VÉRIFICATION - NySoa BTP
-- Exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. VÉRIFIER LES TABLES CRITIQUES
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN (
    'journal_global', 'dotations_felana', 'credits_fournisseurs',
    'chantiers', 'budgets_chantiers', 'recettes_clients'
)
ORDER BY table_name;

-- 2. VÉRIFIER COLONNES DOTATIONS_FELANA
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'dotations_felana'
ORDER BY ordinal_position;

-- 3. VÉRIFIER COLONNES JOURNAL_GLOBAL
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'journal_global'
ORDER BY ordinal_position;

-- 4. VÉRIFIER COLONNES CREDITS_FOURNISSEURS
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'credits_fournisseurs'
ORDER BY ordinal_position;

-- 5. VÉRIFIER CONTRAINTES CHECK
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'dotations_felana'::regclass
   OR conrelid = 'credits_fournisseurs'::regclass
   OR conrelid = 'journal_global'::regclass;

-- 6. VÉRIFIER CLAÉS ÉTRANGÈRES
SELECT
    tc.table_name, tc.constraint_name, kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('journal_global', 'dotations_felana', 'credits_fournisseurs');

-- 7. VÉRIFIER POLITIQUES RLS
SELECT schemaname, tablename, policyname, cmd, permissive, roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('journal_global', 'dotations_felana', 'credits_fournisseurs')
ORDER BY tablename, policyname;

-- 8. VÉRIFIER INDEX
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('journal_global', 'dotations_felana', 'credits_fournisseurs', 'chantiers');

-- 9. TEST: Requête dotations avec chantier
-- Devrait retourner les dotations avec nom du chantier
SELECT d.id, d.montant, d.motif, d.hors_chantier, c.nom as chantier_nom
FROM dotations_felana d
LEFT JOIN chantiers c ON d.chantier_id = c.id
LIMIT 5;

-- 10. TEST: Vérifier cohérence dotations_felana.journal_id
SELECT d.id, d.journal_id, j.id as journal_exists
FROM dotations_felana d
LEFT JOIN journal_global j ON d.journal_id = j.id
WHERE d.journal_id IS NOT NULL
AND j.id IS NULL;

-- 11. TEST: Vérifier que credits a le bon statut
SELECT DISTINCT statut FROM credits_fournisseurs;

-- 12. TEST: Montants négatifs dans credits?
SELECT id, fournisseur, montant_total 
FROM credits_fournisseurs 
WHERE montant_total < 0;

-- 13. TEST: Montants négatifs dans journal_global?
SELECT id, designation, montant 
FROM journal_global 
WHERE montant < 0;

-- 14. TEST: Vérifier visible_daf sur dotations
SELECT type_ecriture, visible_daf, COUNT(*) as cnt
FROM journal_global
WHERE type_ecriture IN ('dotation_felana', 'depense_daf', 'paiement_credit')
GROUP BY type_ecriture, visible_daf;

-- 15. TEST: Requête solde Felana
SELECT 
    COALESCE(SUM(CASE WHEN type_ecriture = 'dotation_felana' THEN montant ELSE 0 END), 0) as total_dotations,
    COALESCE(SUM(CASE WHEN type_ecriture IN ('depense_daf', 'paiement_credit') THEN montant ELSE 0 END), 0) as total_depenses,
    COALESCE(SUM(CASE WHEN type_ecriture = 'dotation_felana' THEN montant ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN type_ecriture IN ('depense_daf', 'paiement_credit') THEN montant ELSE 0 END), 0) as solde
FROM journal_global
WHERE visible_daf = TRUE
AND statut = 'VALIDE';