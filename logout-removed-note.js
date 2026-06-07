// Fonction de LOGOUT sécurisée
// ✅ Remplace l'ancienne logout() synchrone
// Utilise maintenant la fonction centralisée dans supabase.js
// qui appelle db.auth.signOut() + nettoie tout

// La fonction logout() vient de supabase-auth.js (fusionné dans supabase.js)
// Appel: onclick="logout()"

console.log('[script.js] Logout sécurisé activé via supabase.js');
