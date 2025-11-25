# 🔧 Solution Temporaire - Connexion Base de Données

## ❌ Problème identifié

Le port **6543** (connection pooling) est bloqué par la restriction IP dans Supabase.

**Test réseau** : `nc` timeout sur le port 6543 → Confirme que l'IP n'est pas autorisée.

## ✅ Solutions

### Solution 1 : Utiliser DIRECT_URL temporairement (Recommandé)

Modifiez temporairement le code pour utiliser `DIRECT_URL` au lieu de `DATABASE_URL` :

**Avantages** :
- Port 5432 (direct) peut avoir des restrictions différentes
- Permet de continuer le développement
- Pas besoin de modifier Supabase

**Inconvénients** :
- Moins performant (pas de pooling)
- À utiliser uniquement pour le développement

### Solution 2 : Autoriser temporairement toutes les IPs

Dans Supabase Dashboard :
1. **Project Settings** → **Database** → **Network Restrictions**
2. Ajoutez temporairement : `0.0.0.0/0` (IPv4)
3. Testez la connexion
4. Si ça fonctionne, le problème vient du format de votre IP
5. Supprimez `0.0.0.0/0` et corrigez votre IP

### Solution 3 : Vérifier le format de l'IP dans Supabase

**Format correct** : `77.158.216.106/32`

**Vérifications** :
- [ ] Le `/32` est présent
- [ ] Pas d'espaces avant/après
- [ ] Type IPv4 (pas IPv6)
- [ ] État "Active" ou "Enabled"

## 🧪 Test avec DIRECT_URL

Pour tester si DIRECT_URL fonctionne :

```bash
# Modifier temporairement DATABASE_URL dans .env
# Remplacer DATABASE_URL par DIRECT_URL pour tester
```

## 📋 Checklist de résolution

1. [ ] Testé avec `0.0.0.0/0` temporairement → Résultat ?
2. [ ] Vérifié le format exact dans Supabase → Format ?
3. [ ] Attendu 5 minutes après modification → Toujours bloqué ?
4. [ ] Testé DIRECT_URL (port 5432) → Fonctionne ?

## 🚀 Prochaines étapes

Une fois la connexion fonctionnelle :

1. **Tester la connexion** :
   ```bash
   pnpm exec dotenv -e .env -- tsx scripts/test-db-connection.ts
   ```

2. **Démarrer les services** :
   ```bash
   pnpm dev
   ```

3. **Test complet** :
   ```bash
   pnpm test:status
   pnpm test:full
   ```

---

**Problème** : Port 6543 bloqué (timeout)
**Cause probable** : Restriction IP mal configurée ou non propagée
**Solution immédiate** : Tester avec `0.0.0.0/0` pour diagnostiquer

