-- Fix validations RLS + cleanup duplicates
-- Use TO public for the insert policy since authenticated role issue
DROP POLICY IF EXISTS insert_all_validations ON validations;
DROP POLICY IF EXISTS authenticated_insert_validations ON validations;
DROP POLICY IF EXISTS admin_insert_validations ON validations;
DROP POLICY IF EXISTS admin_select_validations ON validations;
DROP POLICY IF EXISTS admin_update_validations ON validations;

ALTER TABLE validations DISABLE ROW LEVEL SECURITY;
ALTER TABLE validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY insert_validations ON validations
  FOR INSERT
  TO public
  WITH CHECK (auth.jwt() IS NOT NULL);

CREATE POLICY select_validations ON validations
  FOR SELECT
  TO public
  USING (auth.jwt() IS NOT NULL);

CREATE POLICY update_validations ON validations
  FOR UPDATE
  TO public
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
