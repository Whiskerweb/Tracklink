# 🧪 GUIDE DE TEST PRÉCIS - Dashboard Tracking

**Date** : 2025-11-24  
**Services démarrés** : ✅ API, Redirect, Dashboard

---

## 📋 ÉTAT DES SERVICES

- ✅ **API** : http://localhost:4000
- ✅ **Redirect** : http://localhost:4100  
- ✅ **Dashboard** : http://localhost:3000/dashboard-test.html
- ✅ **Workspace ID** : `cmidm26nm0000za0elfln3o8m`

---

## 🚀 ÉTAPE PAR ÉTAPE - TEST COMPLET

### ÉTAPE 1 : Ouvrir le Dashboard

1. **Ouvrez votre navigateur** (Chrome, Firefox, Safari)
2. **Allez sur** : `http://localhost:3000/dashboard-test.html`
3. **Vérifiez** que la page se charge correctement
   - Vous devriez voir "Dashboard Tracking - Test Manuel"
   - Section "Créer un nouveau lien de tracking"
   - Section "Mes liens de tracking"

---

### ÉTAPE 2 : Créer votre premier lien de tracking

1. **Dans le formulaire "Créer un nouveau lien de tracking"** :
   - **URL de destination** : Entrez `https://example.com/produit` (ou n'importe quelle URL)
   - **Slug** : Laissez vide (sera généré automatiquement) OU entrez `mon-test-1`
   
2. **Cliquez sur "Créer le lien"**

3. **Résultat attendu** :
   - ✅ Message vert : "✅ Lien créé avec succès !"
   - ✅ Le lien apparaît dans la section "Mes liens de tracking"
   - ✅ Vous voyez le lien de tracking : `http://localhost:4100/mon-test-1` (ou slug généré)
   - ✅ Vous voyez la destination : `→ https://example.com/produit`

**Exemple de lien créé** :
```
http://localhost:4100/mon-test-1 → https://example.com/produit
```

---

### ÉTAPE 3 : Tester le lien de tracking (Simuler un clic)

1. **Dans la carte du lien créé**, cliquez sur le bouton **"🧪 Tester"**

2. **Résultat attendu** :
   - ✅ Un nouvel onglet s'ouvre
   - ✅ Vous êtes redirigé vers `https://example.com/produit`
   - ✅ Un cookie `cursor_click_id` est créé automatiquement

3. **Vérifiez le cookie** (optionnel) :
   - Ouvrez les DevTools (F12)
   - Onglet "Application" → "Cookies" → `http://localhost:4100`
   - Vous devriez voir `cursor_click_id` avec une valeur UUID

---

### ÉTAPE 4 : Initialiser le tracking dans le dashboard

1. **Revenez sur le dashboard** (`http://localhost:3000/dashboard-test.html`)

2. **Dans la section "Tester les conversions"**, cliquez sur **"1. Initialiser Tracking"**

3. **Résultat attendu** :
   - ✅ Message vert : "✅ Tracking initialisé ! Click ID: xxx"
   - ✅ Le Click ID apparaît dans la section "Config" en haut
   - ✅ Status passe à "Initialisé ✅"

**Note** : Si vous avez cliqué sur "Tester" avant, le Click ID sera récupéré depuis le cookie automatiquement.

---

### ÉTAPE 5 : Simuler un Lead (Inscription)

1. **Cliquez sur "2. Simuler Lead (Inscription)"**

2. **Résultat attendu** :
   - ✅ Message vert : "✅ Lead tracké ! ID: xxx, Customer: customer-xxx"
   - ✅ Dans la section "Mes liens de tracking", les stats se mettent à jour :
     - **Leads** : passe à `1`
     - **Clics** : reste à `1` (ou augmente si vous avez cliqué plusieurs fois)

3. **Vérification dans la DB** (optionnel) :
   ```sql
   SELECT * FROM "LeadEvent" ORDER BY "createdAt" DESC LIMIT 1;
   SELECT * FROM "Customer" ORDER BY "createdAt" DESC LIMIT 1;
   ```
   - Vous devriez voir un LeadEvent créé
   - Vous devriez voir un Customer avec `leadCount = 1`

---

### ÉTAPE 6 : Simuler une Sale (Commande)

1. **Cliquez sur "3. Simuler Sale (Commande)"**

2. **Résultat attendu** :
   - ✅ Message vert : "✅ Sale trackée ! ID: xxx, Montant: 99.99 USD, Invoice: invoice-xxx"
   - ✅ Dans la section "Mes liens de tracking", les stats se mettent à jour :
     - **Sales** : passe à `1`
     - **Revenue** : passe à `$99.99`

3. **Vérification dans la DB** (optionnel) :
   ```sql
   SELECT * FROM "SaleEvent" ORDER BY "createdAt" DESC LIMIT 1;
   SELECT * FROM "Customer" ORDER BY "createdAt" DESC LIMIT 1;
   ```
   - Vous devriez voir un SaleEvent créé avec `amount = 99.99`
   - Le Customer devrait avoir `saleCount = 1` et `totalRevenue = 9999` (en cents)

---

### ÉTAPE 7 : Vérifier les statistiques en temps réel

1. **Les stats se mettent à jour automatiquement** toutes les 10 secondes

2. **Vous pouvez aussi cliquer sur "🔄 Actualiser Stats"** pour forcer la mise à jour

3. **Vérifiez que toutes les stats sont correctes** :
   - **Clics** : Nombre de fois que le lien a été cliqué
   - **Leads** : Nombre de leads trackés
   - **Sales** : Nombre de ventes trackées
   - **Revenue** : Montant total en dollars

---

## 🎯 SCÉNARIO COMPLET DE TEST

### Test End-to-End Complet

1. **Créer un lien** :
   - URL : `https://example.com/produit`
   - Slug : `test-complet`

2. **Cliquer sur "Tester"** :
   - Le lien s'ouvre dans un nouvel onglet
   - Cookie créé automatiquement

3. **Initialiser le tracking** :
   - Click ID récupéré depuis le cookie

4. **Simuler un lead** :
   - Lead tracké avec succès
   - Stats mises à jour : Leads = 1

5. **Simuler une sale** :
   - Sale trackée avec succès
   - Stats mises à jour : Sales = 1, Revenue = $99.99

6. **Vérifier l'attribution** :
   - Le lead et la sale sont attribués au même clickId
   - L'attribution est automatique via le cookie

---

## 🔍 VÉRIFICATIONS DANS LA BASE DE DONNÉES

### Vérifier le ClickEvent

```sql
SELECT 
  "clickId",
  "pageUrl",
  "utmSource",
  "utmCampaign",
  "browserLanguage",
  "device",
  "browser",
  "os"
FROM "ClickEvent"
ORDER BY "createdAt" DESC
LIMIT 1;
```

**Vérifications** :
- ✅ `pageUrl` doit contenir l'URL complète
- ✅ `utmSource` et `utmCampaign` doivent être remplis (si passés dans l'URL)
- ✅ `browserLanguage` doit être rempli
- ✅ `device`, `browser`, `os` doivent être parsés

### Vérifier le Customer

```sql
SELECT 
  "externalId",
  "leadCount",
  "saleCount",
  "totalRevenue",
  "firstSeenClickId",
  "lastSeenClickId"
FROM "Customer"
ORDER BY "createdAt" DESC
LIMIT 1;
```

**Vérifications** :
- ✅ `leadCount` = 1 (après track lead)
- ✅ `saleCount` = 1 (après track sale)
- ✅ `totalRevenue` = 9999 (99.99 * 100 cents)
- ✅ `firstSeenClickId` et `lastSeenClickId` doivent être remplis

### Vérifier l'AttributionLog

```sql
SELECT 
  "eventType",
  "model",
  "windowDays",
  "reason",
  "chosenClickId"
FROM "AttributionLog"
ORDER BY "createdAt" DESC
LIMIT 2;
```

**Vérifications** :
- ✅ `reason` = "valid_click"
- ✅ `model` = "last" (pour les leads)
- ✅ `chosenClickId` doit correspondre au clickId du cookie

---

## 🐛 DÉPANNAGE

### Problème : Le dashboard ne se charge pas

**Solution** :
- Vérifiez que le serveur est démarré : `lsof -ti:3000`
- Vérifiez les logs : `tail -f /tmp/dashboard.log`
- Redémarrez : `python3 -m http.server 3000`

### Problème : Erreur "Failed to fetch" lors de la création de lien

**Solution** :
- Vérifiez que l'API est démarrée : `curl http://localhost:4000/links?workspaceId=cmidm26nm0000za0elfln3o8m`
- Vérifiez les logs : `tail -f /tmp/api.log`
- Vérifiez le Workspace ID dans la config du dashboard

### Problème : Les stats ne s'affichent pas

**Solution** :
- Vérifiez que l'endpoint `/links/:id/stats` fonctionne : `curl http://localhost:4000/links/LINK_ID/stats`
- Redémarrez l'API si nécessaire
- Cliquez sur "🔄 Actualiser Stats"

### Problème : Cookie non créé lors du test

**Solution** :
- Vérifiez que le redirect service est démarré : `curl http://localhost:4100/test-404`
- Vérifiez les logs : `tail -f /tmp/redirect.log`
- Assurez-vous d'accéder via `http://localhost:4100` (pas directement)

---

## ✅ CHECKLIST DE VALIDATION

- [ ] Dashboard accessible sur http://localhost:3000/dashboard-test.html
- [ ] Lien créé avec succès
- [ ] Lien de tracking fonctionne (redirection OK)
- [ ] Cookie `cursor_click_id` créé
- [ ] Tracking initialisé (Click ID visible)
- [ ] Lead tracké avec succès
- [ ] Sale trackée avec succès
- [ ] Stats affichées correctement (Clics, Leads, Sales, Revenue)
- [ ] Stats se mettent à jour automatiquement

---

## 📝 NOTES IMPORTANTES

1. **Cookie** : Le cookie `cursor_click_id` est créé automatiquement lors du premier clic sur un lien de tracking
2. **Attribution** : Les leads et sales sont automatiquement attribués au clickId du cookie
3. **Stats** : Les statistiques se mettent à jour automatiquement toutes les 10 secondes
4. **Workspace ID** : Vérifiez que le Workspace ID dans la config correspond à votre workspace

---

**Guide créé le** : 2025-11-24  
**Version** : 1.0



