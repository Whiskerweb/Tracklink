# 🧪 GUIDE DE TEST COMPLET - Toutes les Fonctionnalités

**Date** : 2025-11-24  
**Dashboard** : http://localhost:3000/dashboard-test.html

---

## 📋 CHECKLIST DE TEST

- [ ] **1. Création et gestion de liens**
- [ ] **2. Redirection et tracking des clics**
- [ ] **3. Enrichissement automatique des données**
- [ ] **4. Tracking des Leads (inscriptions)**
- [ ] **5. Tracking des Sales (commandes)**
- [ ] **6. Attribution automatique**
- [ ] **7. Statistiques en temps réel**
- [ ] **8. Cookie persistence**
- [ ] **9. Customer lifecycle**
- [ ] **10. UTM parameters**

---

## 🎯 TEST 1 : Création et Gestion de Liens

### Objectif
Vérifier que vous pouvez créer, voir et gérer vos liens de tracking.

### Étapes

1. **Créer un lien avec slug automatique** :
   - URL de destination : `https://example.com/produit-1`
   - Slug : Laissez vide
   - Cliquez "Créer le lien"
   - ✅ Vérifiez : Un slug unique est généré automatiquement

2. **Créer un lien avec slug personnalisé** :
   - URL de destination : `https://example.com/produit-2`
   - Slug : `mon-produit-special`
   - Cliquez "Créer le lien"
   - ✅ Vérifiez : Le slug personnalisé est utilisé

3. **Vérifier l'affichage des liens** :
   - ✅ Vérifiez : Tous vos liens apparaissent dans "Mes liens de tracking"
   - ✅ Vérifiez : Chaque lien montre :
     - Le lien de tracking : `http://localhost:4100/[slug]`
     - L'URL de destination
     - Les statistiques (Clics, Leads, Sales, Revenue)

4. **Supprimer un lien** :
   - Cliquez sur "🗑️" sur un lien
   - Confirmez la suppression
   - ✅ Vérifiez : Le lien disparaît de la liste

---

## 🎯 TEST 2 : Redirection et Tracking des Clics

### Objectif
Vérifier que les clics sont bien trackés et que la redirection fonctionne.

### Étapes

1. **Tester la redirection** :
   - Cliquez sur "🧪 Tester" sur un lien
   - ✅ Vérifiez : Vous êtes redirigé vers l'URL de destination
   - ✅ Vérifiez : Un cookie `cursor_click_id` est créé

2. **Vérifier le tracking du clic dans la DB** :
   ```sql
   SELECT 
     "clickId",
     "pageUrl",
     "referrer",
     "device",
     "browser",
     "os",
     "browserLanguage",
     "utmSource",
     "utmCampaign",
     "createdAt"
   FROM "ClickEvent"
   ORDER BY "createdAt" DESC
   LIMIT 1;
   ```
   - ✅ Vérifiez : Un `ClickEvent` a été créé
   - ✅ Vérifiez : Les données sont enrichies (device, browser, os, etc.)

3. **Vérifier les statistiques** :
   - Retournez sur le dashboard
   - ✅ Vérifiez : Le nombre de "Clics" a augmenté de 1

4. **Tester plusieurs clics** :
   - Cliquez plusieurs fois sur "🧪 Tester"
   - ✅ Vérifiez : Chaque clic est compté
   - ✅ Vérifiez : Les stats se mettent à jour

---

## 🎯 TEST 3 : Enrichissement Automatique des Données

### Objectif
Vérifier que les données sont automatiquement enrichies lors d'un clic.

### Étapes

1. **Tester avec UTM parameters** :
   - Créez un lien : `https://example.com/test-utm`
   - Cliquez sur "🧪 Tester" MAIS modifiez l'URL dans le navigateur :
     ```
     http://localhost:4100/[slug]?utm_source=google&utm_medium=cpc&utm_campaign=test
     ```
   - ✅ Vérifiez dans la DB :
     ```sql
     SELECT "utmSource", "utmMedium", "utmCampaign" 
     FROM "ClickEvent" 
     ORDER BY "createdAt" DESC 
     LIMIT 1;
     ```
     - `utmSource` = "google"
     - `utmMedium` = "cpc"
     - `utmCampaign` = "test"

2. **Vérifier l'enrichissement automatique** :
   - Cliquez sur "🧪 Tester" normalement
   - ✅ Vérifiez dans la DB que ces champs sont remplis :
     - `pageUrl` : URL complète de la page
     - `device` : mobile/tablet/desktop
     - `browser` : Chrome/Firefox/Safari
     - `os` : macOS/Windows/Linux
     - `browserLanguage` : fr/en/etc.

---

## 🎯 TEST 4 : Tracking des Leads (Inscriptions)

### Objectif
Vérifier que les leads sont trackés et attribués au bon clic.

### Étapes

1. **Initialiser le tracking** :
   - Dans le dashboard, cliquez "1. Initialiser Tracking"
   - ✅ Vérifiez : Un Click ID apparaît dans la config

2. **Simuler un Lead** :
   - Cliquez "2. Simuler Lead (Inscription)"
   - ✅ Vérifiez : Message vert "✅ Lead tracké !"
   - ✅ Vérifiez : La stat "Leads" augmente de 1

3. **Vérifier dans la DB** :
   ```sql
   SELECT 
     "id",
     "clickId",
     "customerExternalId",
     "eventName",
     "partnerId",
     "createdAt"
   FROM "LeadEvent"
   ORDER BY "createdAt" DESC
   LIMIT 1;
   ```
   - ✅ Vérifiez : Un `LeadEvent` a été créé
   - ✅ Vérifiez : Le `clickId` correspond au cookie

4. **Vérifier le Customer** :
   ```sql
   SELECT 
     "externalId",
     "leadCount",
     "saleCount",
     "firstSeenClickId",
     "lastSeenClickId"
   FROM "Customer"
   ORDER BY "createdAt" DESC
   LIMIT 1;
   ```
   - ✅ Vérifiez : Un `Customer` a été créé
   - ✅ Vérifiez : `leadCount` = 1
   - ✅ Vérifiez : `firstSeenClickId` et `lastSeenClickId` sont remplis

5. **Tester plusieurs leads** :
   - Cliquez plusieurs fois "2. Simuler Lead"
   - ✅ Vérifiez : Seul le premier lead est créé (idempotency)
   - ✅ Vérifiez : `leadCount` reste à 1

---

## 🎯 TEST 5 : Tracking des Sales (Commandes)

### Objectif
Vérifier que les ventes sont trackées et attribuées au bon clic.

### Étapes

1. **Simuler une Sale** :
   - Cliquez "3. Simuler Sale (Commande)"
   - ✅ Vérifiez : Message vert "✅ Sale trackée !"
   - ✅ Vérifiez : Les stats "Sales" et "Revenue" augmentent

2. **Vérifier dans la DB** :
   ```sql
   SELECT 
     "id",
     "clickId",
     "customerExternalId",
     "amount",
     "currency",
     "invoiceId",
     "partnerId",
     "createdAt"
   FROM "SaleEvent"
   ORDER BY "createdAt" DESC
   LIMIT 1;
   ```
   - ✅ Vérifiez : Un `SaleEvent` a été créé
   - ✅ Vérifiez : `amount` = 99.99
   - ✅ Vérifiez : `currency` = "USD"
   - ✅ Vérifiez : Le `clickId` correspond au cookie

3. **Vérifier le Customer mis à jour** :
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
   - ✅ Vérifiez : `saleCount` = 1
   - ✅ Vérifiez : `totalRevenue` = 9999 (99.99 * 100 cents)

4. **Tester plusieurs sales** :
   - Cliquez plusieurs fois "3. Simuler Sale"
   - ✅ Vérifiez : Chaque sale est créée (pas d'idempotency pour les sales)
   - ✅ Vérifiez : `saleCount` et `totalRevenue` augmentent

---

## 🎯 TEST 6 : Attribution Automatique

### Objectif
Vérifier que les leads et sales sont automatiquement attribués au bon clic.

### Étapes

1. **Scénario complet** :
   - Créez un nouveau lien
   - Cliquez "🧪 Tester" (créé un clic avec cookie)
   - Cliquez "1. Initialiser Tracking" (récupère le cookie)
   - Cliquez "2. Simuler Lead"
   - Cliquez "3. Simuler Sale"

2. **Vérifier l'attribution** :
   ```sql
   SELECT 
     "eventType",
     "model",
     "windowDays",
     "reason",
     "chosenClickId",
     "createdAt"
   FROM "AttributionLog"
   ORDER BY "createdAt" DESC
   LIMIT 2;
   ```
   - ✅ Vérifiez : Un `AttributionLog` pour le lead
   - ✅ Vérifiez : Un `AttributionLog` pour la sale
   - ✅ Vérifiez : `reason` = "valid_click"
   - ✅ Vérifiez : `chosenClickId` correspond au cookie

3. **Tester avec clic expiré** :
   - Créez un clic manuellement avec une date ancienne :
     ```sql
     INSERT INTO "ClickEvent" (
       "id", "workspaceId", "linkId", "clickId", 
       "userAgentHash", "ipHash", "createdAt"
     ) VALUES (
       'test-expired', 
       'cmidm26nm0000za0elfln3o8m',
       (SELECT id FROM "Link" LIMIT 1),
       'expired-click-id',
       'hash123',
       'hash456',
       NOW() - INTERVAL '31 days'
     );
     ```
   - Essayez de tracker un lead avec ce clickId expiré
   - ✅ Vérifiez : L'attribution utilise le fallback (default partner ou UTM)

---

## 🎯 TEST 7 : Statistiques en Temps Réel

### Objectif
Vérifier que les statistiques se mettent à jour automatiquement.

### Étapes

1. **Vérifier l'actualisation automatique** :
   - Créez un lien
   - Cliquez "🧪 Tester" plusieurs fois
   - Attendez 10 secondes
   - ✅ Vérifiez : Les stats "Clics" se mettent à jour automatiquement

2. **Vérifier l'actualisation manuelle** :
   - Cliquez "🔄 Actualiser Stats"
   - ✅ Vérifiez : Les stats se mettent à jour immédiatement

3. **Vérifier toutes les stats** :
   - Pour un lien, vérifiez que vous voyez :
     - **Clics** : Nombre de clics
     - **Leads** : Nombre de leads
     - **Sales** : Nombre de ventes
     - **Revenue** : Montant total en dollars

4. **Comparer avec la DB** :
   ```sql
   -- Pour un lien spécifique (remplacez LINK_ID)
   SELECT 
     (SELECT COUNT(*) FROM "ClickEvent" WHERE "linkId" = 'LINK_ID') as clicks,
     (SELECT COUNT(*) FROM "LeadEvent" le 
      JOIN "ClickEvent" ce ON le."clickId" = ce."clickId" 
      WHERE ce."linkId" = 'LINK_ID') as leads,
     (SELECT COUNT(*) FROM "SaleEvent" se 
      JOIN "ClickEvent" ce ON se."clickId" = ce."clickId" 
      WHERE ce."linkId" = 'LINK_ID') as sales,
     (SELECT COALESCE(SUM("amount"), 0) FROM "SaleEvent" se 
      JOIN "ClickEvent" ce ON se."clickId" = ce."clickId" 
      WHERE ce."linkId" = 'LINK_ID') as revenue;
   ```
   - ✅ Vérifiez : Les chiffres correspondent aux stats du dashboard

---

## 🎯 TEST 8 : Cookie Persistence

### Objectif
Vérifier que le cookie persiste entre les sessions.

### Étapes

1. **Créer un cookie** :
   - Cliquez "🧪 Tester" sur un lien
   - ✅ Vérifiez : Un cookie `cursor_click_id` est créé

2. **Vérifier la persistance** :
   - Fermez le navigateur
   - Rouvrez le navigateur
   - Allez sur le dashboard
   - Cliquez "4. Vérifier Cookie"
   - ✅ Vérifiez : Le cookie est toujours présent

3. **Tester avec plusieurs onglets** :
   - Ouvrez plusieurs onglets
   - Cliquez "🧪 Tester" dans chaque onglet
   - ✅ Vérifiez : Le même cookie est utilisé dans tous les onglets

4. **Tester la durée de vie** :
   - Le cookie est configuré pour durer 90 jours
   - ✅ Vérifiez : Le cookie persiste après un refresh

---

## 🎯 TEST 9 : Customer Lifecycle

### Objectif
Vérifier que le cycle de vie du customer est correctement suivi.

### Étapes

1. **Créer un customer** :
   - Cliquez "2. Simuler Lead"
   - ✅ Vérifiez : Un customer est créé avec `leadCount = 1`

2. **Ajouter une sale** :
   - Cliquez "3. Simuler Sale"
   - ✅ Vérifiez : Le customer est mis à jour :
     - `saleCount = 1`
     - `totalRevenue = 9999`

3. **Vérifier firstSeen et lastSeen** :
   ```sql
   SELECT 
     "externalId",
     "firstSeenAt",
     "lastSeenAt",
     "firstSeenClickId",
     "lastSeenClickId"
   FROM "Customer"
   ORDER BY "createdAt" DESC
   LIMIT 1;
   ```
   - ✅ Vérifiez : `firstSeenAt` et `lastSeenAt` sont remplis
   - ✅ Vérifiez : `firstSeenClickId` et `lastSeenClickId` sont remplis

4. **Tester plusieurs interactions** :
   - Cliquez plusieurs fois "🧪 Tester"
   - Cliquez "2. Simuler Lead" (idempotent, ne crée pas de doublon)
   - Cliquez "3. Simuler Sale" plusieurs fois
   - ✅ Vérifiez : `saleCount` et `totalRevenue` augmentent

---

## 🎯 TEST 10 : UTM Parameters

### Objectif
Vérifier que les paramètres UTM sont correctement capturés et utilisés.

### Étapes

1. **Tester avec UTM dans l'URL** :
   - Créez un lien
   - Modifiez l'URL dans le navigateur :
     ```
     http://localhost:4100/[slug]?utm_source=facebook&utm_medium=social&utm_campaign=promo
     ```
   - ✅ Vérifiez dans la DB :
     ```sql
     SELECT "utmSource", "utmMedium", "utmCampaign" 
     FROM "ClickEvent" 
     ORDER BY "createdAt" DESC 
     LIMIT 1;
     ```
     - `utmSource` = "facebook"
     - `utmMedium` = "social"
     - `utmCampaign` = "promo"

2. **Tester l'attribution avec UTM** :
   - Créez un clic avec UTM
   - Cliquez "2. Simuler Lead"
   - ✅ Vérifiez : Le lead est attribué au clic avec UTM

3. **Tester le fallback UTM** :
   - Créez un clic sans UTM et sans clickId valide
   - Cliquez "2. Simuler Lead" avec UTM dans le payload
   - ✅ Vérifiez : L'attribution utilise les UTM du payload

---

## 📊 RÉSUMÉ DES TESTS

### Tests de Base
- ✅ Création de liens
- ✅ Redirection
- ✅ Tracking des clics

### Tests Avancés
- ✅ Enrichissement automatique
- ✅ Tracking des leads
- ✅ Tracking des sales
- ✅ Attribution automatique
- ✅ Statistiques en temps réel

### Tests de Persistance
- ✅ Cookie persistence
- ✅ Customer lifecycle
- ✅ UTM parameters

---

## 🔍 VÉRIFICATIONS DANS LA BASE DE DONNÉES

### Requêtes SQL Utiles

```sql
-- Voir tous les clics récents
SELECT * FROM "ClickEvent" ORDER BY "createdAt" DESC LIMIT 10;

-- Voir tous les leads récents
SELECT * FROM "LeadEvent" ORDER BY "createdAt" DESC LIMIT 10;

-- Voir toutes les sales récentes
SELECT * FROM "SaleEvent" ORDER BY "createdAt" DESC LIMIT 10;

-- Voir tous les customers
SELECT * FROM "Customer" ORDER BY "createdAt" DESC LIMIT 10;

-- Voir les logs d'attribution
SELECT * FROM "AttributionLog" ORDER BY "createdAt" DESC LIMIT 10;

-- Statistiques complètes pour un lien
SELECT 
  l.slug,
  COUNT(DISTINCT ce.id) as clicks,
  COUNT(DISTINCT le.id) as leads,
  COUNT(DISTINCT se.id) as sales,
  COALESCE(SUM(se.amount), 0) as revenue
FROM "Link" l
LEFT JOIN "ClickEvent" ce ON ce."linkId" = l.id
LEFT JOIN "LeadEvent" le ON le."clickId" = ce."clickId"
LEFT JOIN "SaleEvent" se ON se."clickId" = ce."clickId"
WHERE l.id = 'LINK_ID'
GROUP BY l.id, l.slug;
```

---

## ✅ CHECKLIST FINALE

Après avoir effectué tous les tests, vérifiez :

- [ ] Tous les liens peuvent être créés et supprimés
- [ ] Tous les clics sont trackés et redirigent correctement
- [ ] Les données sont enrichies automatiquement
- [ ] Les leads sont trackés et attribués
- [ ] Les sales sont trackées et attribuées
- [ ] Les statistiques se mettent à jour en temps réel
- [ ] Les cookies persistent entre les sessions
- [ ] Le customer lifecycle fonctionne correctement
- [ ] Les UTM parameters sont capturés et utilisés

---

**Guide créé le** : 2025-11-24  
**Version** : 1.0



