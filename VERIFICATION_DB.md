# 🔍 Vérification Connexion Base de Données

## ✅ Ce qui est vérifié

1. **IP Publique** : `77.158.216.106` ✅
2. **Variables d'environnement** : Toutes présentes ✅
3. **DATABASE_URL** : Format correct (port 6543, pgbouncer=true) ✅

## ❌ Problème actuel

La connexion à Supabase échoue avec :
```
Can't reach database server at aws-1-eu-central-2.pooler.supabase.com:6543
```

## 🔧 Vérifications à faire dans Supabase

### 1. Vérifier la restriction IP

Dans Supabase Dashboard :
- **Project Settings** → **Database** → **Network Restrictions**

Vérifiez que :
- ✅ L'IP `77.158.216.106/32` est bien ajoutée
- ✅ Le type est **IPv4** (pas IPv6)
- ✅ Le format est correct : `77.158.216.106/32` (avec `/32`)

### 2. Vérifier le format de la restriction

**Format correct** :
```
77.158.216.106/32
```

**Formats incorrects** :
- ❌ `77.158.216.106` (sans /32)
- ❌ `77.158.216.106/24` (trop large)
- ❌ `77.158.216.106/0` (toutes les IPs)

### 3. Attendre la propagation

Les restrictions IP peuvent prendre **1-5 minutes** pour être actives après ajout.

### 4. Vérifier les autres restrictions

Assurez-vous qu'il n'y a pas d'autres règles qui bloquent :
- Vérifiez s'il y a une règle "Deny all" qui pourrait bloquer
- Vérifiez l'ordre des règles (les règles sont appliquées dans l'ordre)

## 🧪 Tests à effectuer

### Test 1 : Vérifier la connexion directe (port 5432)

Si le port 6543 (pooler) ne fonctionne pas, testez avec DIRECT_URL :

```bash
# Vérifier que DIRECT_URL est dans .env
grep DIRECT_URL .env
```

### Test 2 : Tester avec Prisma Studio

```bash
pnpm db:studio
```

Si Prisma Studio s'ouvre, la connexion fonctionne.

### Test 3 : Vérifier le firewall local

```bash
# Tester la connexion réseau
nc -zv aws-1-eu-central-2.pooler.supabase.com 6543
# ou
telnet aws-1-eu-central-2.pooler.supabase.com 6543
```

### Test 4 : Vérifier depuis un autre réseau

Si possible, testez depuis un autre réseau (téléphone en hotspot) pour voir si c'est un problème de réseau local.

## 📋 Checklist de vérification

- [ ] IP `77.158.216.106/32` ajoutée dans Supabase (IPv4)
- [ ] Format correct : `77.158.216.106/32` (avec `/32`)
- [ ] Attendu 2-3 minutes après ajout
- [ ] Pas de règle "Deny all" qui bloque
- [ ] Port 6543 non bloqué par firewall local
- [ ] DATABASE_URL correct dans `.env`

## 🚀 Solution temporaire (développement uniquement)

Pour tester rapidement, vous pouvez temporairement autoriser toutes les IPs :

**Dans Supabase** :
- Ajoutez : `0.0.0.0/0` (IPv4)
- ⚠️ **ATTENTION** : C'est moins sécurisé, à utiliser uniquement pour tester

Une fois que ça fonctionne, supprimez `0.0.0.0/0` et gardez seulement `77.158.216.106/32`.

## 📞 Si ça ne fonctionne toujours pas

1. Vérifiez les logs Supabase (Dashboard > Logs)
2. Vérifiez que le projet Supabase est actif (pas en pause)
3. Contactez le support Supabase si nécessaire

---

**Dernière vérification** : Connexion échouée
**IP configurée** : `77.158.216.106/32`
**Action recommandée** : Attendre 2-3 minutes, puis réessayer

