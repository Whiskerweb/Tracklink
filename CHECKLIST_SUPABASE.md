# ✅ Checklist Vérification Supabase

## 🔍 Vérifications à faire dans Supabase Dashboard

### 1. Vérifier la restriction IP

**Chemin** : `Project Settings` → `Database` → `Network Restrictions`

**Vérifiez que** :
- [ ] L'IP `77.158.216.106/32` est bien présente dans la liste
- [ ] Le type est **IPv4** (colonne "Type" ou icône IPv4)
- [ ] Le format est exactement : `77.158.216.106/32` (avec le `/32`)
- [ ] L'état est **"Active"** ou **"Enabled"**

**Format correct** :
```
77.158.216.106/32
```

**Formats incorrects** :
- ❌ `77.158.216.106` (sans `/32`)
- ❌ `77.158.216.106/24` (trop large)
- ❌ `77.158.216.106/0` (toutes les IPs)

### 2. Vérifier l'ordre des règles

Si vous avez plusieurs règles :
- [ ] Vérifiez qu'il n'y a pas de règle "Deny all" **avant** votre IP
- [ ] Les règles sont appliquées dans l'ordre (de haut en bas)
- [ ] Votre IP doit être **avant** toute règle "Deny"

### 3. Vérifier le projet Supabase

- [ ] Le projet n'est pas en pause
- [ ] Le projet est actif (Dashboard > Overview)
- [ ] Pas de message d'erreur dans les logs

### 4. Vérifier la connexion (port 6543)

Le port **6543** est utilisé pour le connection pooling (pgbouncer).

**Si ça ne fonctionne pas** :
- Essayez temporairement d'ajouter `0.0.0.0/0` pour tester
- Si `0.0.0.0/0` fonctionne, le problème vient de la restriction IP
- Si `0.0.0.0/0` ne fonctionne pas, le problème vient d'ailleurs

## 🧪 Test de connexion

Après avoir vérifié, testez :

```bash
pnpm exec dotenv -e .env -- tsx scripts/test-db-connection.ts
```

## ⏱️ Délais de propagation

Les restrictions IP peuvent prendre :
- **Minimum** : 30 secondes
- **Moyen** : 2-3 minutes
- **Maximum** : 5 minutes

Si après 5 minutes ça ne fonctionne toujours pas, il y a probablement un problème de configuration.

## 🔧 Solution de contournement temporaire

Pour tester rapidement (développement uniquement) :

1. Ajoutez `0.0.0.0/0` (IPv4) dans Supabase
2. Testez la connexion
3. Si ça fonctionne :
   - Le problème vient de la restriction IP spécifique
   - Supprimez `0.0.0.0/0`
   - Vérifiez à nouveau le format de `77.158.216.106/32`
4. Si ça ne fonctionne pas :
   - Le problème vient d'ailleurs (firewall, réseau, etc.)

## 📸 Capture d'écran utile

Si possible, faites une capture d'écran de la page "Network Restrictions" dans Supabase pour vérifier :
- Le format exact de l'IP
- L'ordre des règles
- L'état (Active/Enabled)

---

**Format attendu** : `77.158.216.106/32` (IPv4)
**Délai de propagation** : 2-5 minutes
**Test de connexion** : `pnpm exec dotenv -e .env -- tsx scripts/test-db-connection.ts`

