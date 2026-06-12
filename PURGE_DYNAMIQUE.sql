DO $$
DECLARE
    r RECORD;
BEGIN
    -- Generate TRUNCATE for all public tables (respects FK order using CASCADE)
    FOR r IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND table_name NOT IN ('users', 'audit_log', '_prisma_migrations')
        ORDER BY table_name
    LOOP
        EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', r.table_name);
        RAISE NOTICE 'Truncated: %', r.table_name;
    END LOOP;
END $$;

-- Reset all sequences
DO $$
DECLARE
    seq RECORD;
BEGIN
    FOR seq IN
        SELECT sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE format('ALTER SEQUENCE %I RESTART WITH 1', seq.sequence_name);
    END LOOP;
END $$;

-- Verify: count rows per table
SELECT
    relname AS table_name,
    n_live_tup AS lignes_restantes
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY relname;
