# 📋 Résumé du Problème de Connexion

## ❌ Problème actuel

La connexion à Supabase échoue avec :
```
Can't reach database server at aws-1-eu-central-2.pooler.supabase.com:6543
```

## 🔍 Diagnostic effectué

1. ✅ **IP publique vérifiée** : `77.158.216.106`
2. ✅ **Variables d'environnement** : Toutes présentes
3. ✅ **Format DATABASE_URL** : Correct (port 6543, pgbouncer=true)
4. ❌ **Test réseau port 6543** : Timeout (port bloqué)
5. ❌ **Connexion Prisma** : Échoue

## 🎯 Cause probable

La restriction IP dans Supabase bloque votre connexion. Le timeout réseau confirme que le port 6543 est inaccessible.

## ✅ Solutions à essayer

### Solution 1 : Vérifier le format dans Supabase (PRIORITAIRE)

Dans Supabase Dashboard → Project Settings → Database → Network Restrictions :

**Format exact requis** :
```
77.158.216.106/32
```

**Vérifications** :
- [ ] Le `/32` est présent (pas juste `77.158.216.106`)
- [ ] Pas d'espaces avant/après
- [ ] Type : **IPv4** (pas IPv6)
- [ ] État : **Active** ou **Enabled**

### Solution 2 : Test avec 0.0.0.0/0 (diagnostic)

Pour confirmer que c'est bien un problème de restriction IP :

1. Ajoutez temporairement `0.0.0.0/0` (IPv4) dans Supabase
2. Attendez 2-3 minutes
3. Testez : `pnpm exec dotenv -e .env -- tsx scripts/test-db-connection.ts`

**Si ça fonctionne** → Le problème vient du format de votre IP spécifique
**Si ça ne fonctionne pas** → Le problème vient d'ailleurs (firewall, réseau, etc.)

### Solution 3 : Utiliser DIRECT_URL temporairement

Si vous devez continuer le développement, on peut modifier temporairement le code pour utiliser `DIRECT_URL` (port 5432) qui peut avoir des restrictions différentes.

## 📝 Actions immédiates

1. **Vérifiez dans Supabase** que l'IP est exactement `77.158.216.106/32` (avec `/32`)
2. **Testez avec `0.0.0.0/0`** pour diagnostiquer
3. **Attendez 5 minutes** après toute modification (propagation)

## 🧪 Commandes de test

```bash
# Test connexion pooling (port 6543)
pnpm exec dotenv -e .env -- tsx scripts/test-db-connection.ts

# Test connexion directe (port 5432) - si script corrigé
pnpm exec dotenv -e .env -- tsx scripts/test-db-direct-simple.ts

# Vérifier le statut général
pnpm test:status
```

## ⚠️ Important

- Les restrictions IP peuvent prendre **2-5 minutes** pour être actives
- Le format `/32` est **obligatoire** (signifie une seule IP)
- Vérifiez qu'il n'y a pas de règle "Deny all" qui bloque avant votre IP

---

**Dernière erreur** : Port 6543 timeout
**IP configurée** : `77.158.216.106/32` (à vérifier)
**Action recommandée** : Vérifier le format exact dans Supabase

