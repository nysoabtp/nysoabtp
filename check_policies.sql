SELECT schemaname, tablename, policyname, permissive, cmd, roles, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('chantiers','pointage','materiels','journal','devis','caisse','commandes','personnel')
ORDER BY tablename, policyname;