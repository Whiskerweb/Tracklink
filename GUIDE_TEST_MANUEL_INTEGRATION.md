# 🧪 GUIDE DE TEST MANUEL - INTÉGRATION API

**Objectif** : Tester l'intégration complète de l'API dans un site réel  
**Durée estimée** : 15-20 minutes

---

## 📋 PRÉREQUIS

1. ✅ Services démarrés :
   ```bash
   # Terminal 1: API
   pnpm --filter @tracking/api dev
   
   # Terminal 2: Redirect
   pnpm --filter @tracking/redirect dev
   ```

2. ✅ Workspace ID disponible (ex: `cmidm26nm0000za0elfln3o8m`)

3. ✅ URL de l'API : `http://localhost:4000` (ou votre URL de production)

---

## 🚀 ÉTAPE 1 : CRÉER UN LIEN DE TRACKING

### 1.1 Créer le lien via API

```bash
curl -X POST http://localhost:4000/links \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "cmidm26nm0000za0elfln3o8m",
    "slug": "mon-produit",
    "targetUrl": "http://localhost:3000/produit"
  }'
```

**Réponse** :
```json
{
  "id": "cmidxxx...",
  "slug": "mon-produit",
  "targetUrl": "http://localhost:3000/produit",
  "domainId": "..."
}
```

### 1.2 URL de tracking générée

Votre lien de tracking sera : `http://traaaction.com/mon-produit`

**Note** : En production, remplacez `localhost:4100` par votre domaine réel.

---

## 🌐 ÉTAPE 2 : CRÉER UN SITE DE TEST

### 2.1 Créer un fichier HTML simple

Créez un fichier `test-site.html` :

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Site de Test - Tracking</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
    }
    button {
      background: #007bff;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      margin: 10px 5px;
    }
    button:hover {
      background: #0056b3;
    }
    .info {
      background: #f0f0f0;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
    }
    .success {
      background: #d4edda;
      color: #155724;
      padding: 10px;
      border-radius: 4px;
      margin: 10px 0;
    }
    .error {
      background: #f8d7da;
      color: #721c24;
      padding: 10px;
      border-radius: 4px;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <h1>🧪 Site de Test - Tracking API</h1>
  
  <div class="info">
    <strong>Workspace ID:</strong> <span id="workspaceId">cmidm26nm0000za0elfln3o8m</span><br>
    <strong>Click ID:</strong> <span id="clickId">-</span><br>
    <strong>Status:</strong> <span id="status">Non initialisé</span>
  </div>

  <h2>Actions de Test</h2>
  
  <button onclick="initTracking()">1. Initialiser Tracking</button>
  <button onclick="trackLead()">2. Tracker Lead (Inscription)</button>
  <button onclick="trackSale()">3. Tracker Sale (Commande)</button>
  <button onclick="checkCookie()">4. Vérifier Cookie</button>

  <div id="results"></div>

  <script>
    // Configuration
    const API_BASE_URL = 'http://localhost:4000';
    const WORKSPACE_ID = 'cmidm26nm0000za0elfln3o8m';
    let clickId = null;

    // Fonction pour afficher les résultats
    function showResult(message, isError = false) {
      const resultsDiv = document.getElementById('results');
      const div = document.createElement('div');
      div.className = isError ? 'error' : 'success';
      div.textContent = message;
      resultsDiv.appendChild(div);
      
      // Scroll to bottom
      resultsDiv.scrollTop = resultsDiv.scrollHeight;
      
      // Auto-remove after 5 seconds
      setTimeout(() => div.remove(), 5000);
    }

    // Fonction pour récupérer le clickId depuis le cookie
    function getClickIdFromCookie() {
      const match = document.cookie.match(/(?:^| )cursor_click_id=([^;]+)/);
      return match ? match[1] : null;
    }

    // 1. Initialiser le tracking
    async function initTracking() {
      try {
        document.getElementById('status').textContent = 'Initialisation...';
        
        // Récupérer ou créer clickId
        clickId = getClickIdFromCookie();
        
        if (!clickId) {
          // Générer un nouveau clickId
          clickId = crypto.randomUUID();
          // Sauvegarder dans un cookie (90 jours)
          document.cookie = `cursor_click_id=${clickId}; path=/; max-age=${60 * 60 * 24 * 90}; samesite=lax`;
        }
        
        document.getElementById('clickId').textContent = clickId;
        document.getElementById('status').textContent = 'Initialisé ✅';
        
        showResult(`✅ Tracking initialisé ! Click ID: ${clickId}`);
      } catch (error) {
        showResult(`❌ Erreur: ${error.message}`, true);
      }
    }

    // 2. Tracker un lead (inscription)
    async function trackLead() {
      try {
        if (!clickId) {
          showResult('❌ Veuillez d\'abord initialiser le tracking', true);
          return;
        }

        const customerId = `customer-${Date.now()}`;
        
        // Enrichir avec les données de la page
        const payload = {
          workspaceId: WORKSPACE_ID,
          customerExternalId: customerId,
          eventName: 'signup',
          clickId: clickId,
          email: 'test@example.com',
          name: 'Test User',
          // Données auto-collectées
          pageUrl: window.location.href,
          referrer: document.referrer,
          utmSource: new URLSearchParams(window.location.search).get('utm_source') || undefined,
          utmMedium: new URLSearchParams(window.location.search).get('utm_medium') || undefined,
          utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign') || undefined,
          browserLanguage: navigator.language,
          screen: `${window.screen.width}x${window.screen.height}`,
        };

        const response = await fetch(`${API_BASE_URL}/track/lead`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = await response.json();
          showResult(`✅ Lead tracké ! ID: ${data.id}, Customer: ${customerId}`);
        } else {
          const error = await response.json();
          showResult(`❌ Erreur: ${JSON.stringify(error)}`, true);
        }
      } catch (error) {
        showResult(`❌ Erreur: ${error.message}`, true);
      }
    }

    // 3. Tracker une vente (commande)
    async function trackSale() {
      try {
        if (!clickId) {
          showResult('❌ Veuillez d\'abord initialiser le tracking', true);
          return;
        }

        const customerId = `customer-${Date.now()}`;
        const invoiceId = `invoice-${Date.now()}`;
        
        const payload = {
          workspaceId: WORKSPACE_ID,
          customerExternalId: customerId,
          amount: 99.99,
          currency: 'USD',
          invoiceId: invoiceId,
          clickId: clickId,
          // Données auto-collectées
          pageUrl: window.location.href,
          referrer: document.referrer,
          utmSource: new URLSearchParams(window.location.search).get('utm_source') || undefined,
          utmMedium: new URLSearchParams(window.location.search).get('utm_medium') || undefined,
          utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign') || undefined,
          browserLanguage: navigator.language,
          screen: `${window.screen.width}x${window.screen.height}`,
        };

        const response = await fetch(`${API_BASE_URL}/track/sale`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = await response.json();
          showResult(`✅ Sale trackée ! ID: ${data.id}, Montant: 99.99 USD, Invoice: ${invoiceId}`);
        } else {
          const error = await response.json();
          showResult(`❌ Erreur: ${JSON.stringify(error)}`, true);
        }
      } catch (error) {
        showResult(`❌ Erreur: ${error.message}`, true);
      }
    }

    // 4. Vérifier le cookie
    function checkCookie() {
      const cookie = getClickIdFromCookie();
      if (cookie) {
        showResult(`✅ Cookie trouvé: ${cookie}`);
        clickId = cookie;
        document.getElementById('clickId').textContent = clickId;
      } else {
        showResult('⚠️ Aucun cookie trouvé. Cliquez sur "Initialiser Tracking"', true);
      }
    }

    // Auto-initialiser au chargement si cookie existe
    window.addEventListener('load', () => {
      const cookie = getClickIdFromCookie();
      if (cookie) {
        clickId = cookie;
        document.getElementById('clickId').textContent = clickId;
        document.getElementById('status').textContent = 'Initialisé ✅ (depuis cookie)';
      }
    });
  </script>
</body>
</html>
```

### 2.2 Servir le fichier

**Option A : Serveur Python simple**
```bash
cd /Users/lucasroncey/Desktop/tracking
python3 -m http.server 3000
```

**Option B : Serveur Node.js**
```bash
npx serve -p 3000
```

**Option C : Ouvrir directement**
Ouvrez `test-site.html` dans votre navigateur (moins idéal pour les cookies).

---

## 🧪 ÉTAPE 3 : TESTER LE FLOW COMPLET

### 3.1 Test 1 : Accéder via le lien de tracking

1. **Ouvrez votre navigateur** et allez sur :
   ```
   http://traaaction.com/mon-produit?utm_source=google&utm_campaign=test
   ```
   
   **Note** : Si vous testez en local, utilisez :
   ```
   http://localhost:4100/mon-produit?utm_source=google&utm_campaign=test
   ```

2. **Vérifiez la redirection** : Vous devriez être redirigé vers `http://localhost:3000/produit`

3. **Vérifiez le cookie** : Ouvrez les DevTools (F12) → Application → Cookies
   - Vous devriez voir `cursor_click_id` avec une valeur UUID

### 3.2 Test 2 : Initialiser le tracking sur le site

1. **Ouvrez** `http://localhost:3000/test-site.html` (ou votre fichier HTML)

2. **Cliquez sur "1. Initialiser Tracking"**
   - Le Click ID devrait apparaître
   - Status devrait passer à "Initialisé ✅"

### 3.3 Test 3 : Tracker un lead (inscription)

1. **Cliquez sur "2. Tracker Lead (Inscription)"**
   - Vous devriez voir un message de succès avec l'ID du lead

2. **Vérifiez dans la DB** :
   ```sql
   SELECT * FROM "LeadEvent" ORDER BY "createdAt" DESC LIMIT 1;
   SELECT * FROM "Customer" ORDER BY "createdAt" DESC LIMIT 1;
   ```

### 3.4 Test 4 : Tracker une vente (commande)

1. **Cliquez sur "3. Tracker Sale (Commande)"**
   - Vous devriez voir un message de succès avec l'ID de la vente

2. **Vérifiez dans la DB** :
   ```sql
   SELECT * FROM "SaleEvent" ORDER BY "createdAt" DESC LIMIT 1;
   SELECT * FROM "Customer" WHERE "externalId" LIKE 'customer-%' ORDER BY "createdAt" DESC LIMIT 1;
   -- Vérifier : saleCount=1, totalRevenue=9999
   ```

### 3.5 Test 5 : Vérifier l'attribution

```sql
-- Vérifier que le lead et la sale sont attribués au même click
SELECT 
  le."id" as lead_id,
  le."clickId" as lead_click_id,
  se."id" as sale_id,
  se."clickId" as sale_click_id,
  al."reason" as attribution_reason
FROM "LeadEvent" le
LEFT JOIN "SaleEvent" se ON se."customerExternalId" = le."customerExternalId"
LEFT JOIN "AttributionLog" al ON al."eventId" = le."id" AND al."eventType" = 'lead'
ORDER BY le."createdAt" DESC
LIMIT 1;
```

---

## 🔍 ÉTAPE 4 : VÉRIFICATIONS DANS LA BASE DE DONNÉES

### 4.1 Vérifier le ClickEvent

```sql
SELECT 
  "clickId",
  "pageUrl",
  "referrer",
  "utmSource",
  "utmCampaign",
  "device",
  "browser",
  "os",
  "browserLanguage"
FROM "ClickEvent"
ORDER BY "createdAt" DESC
LIMIT 1;
```

**Vérifications** :
- ✅ `pageUrl` doit contenir l'URL complète
- ✅ `utmSource` et `utmCampaign` doivent être remplis (si passés dans l'URL)
- ✅ `browserLanguage` doit être rempli
- ✅ `device`, `browser`, `os` doivent être parsés

### 4.2 Vérifier le Customer

```sql
SELECT 
  "externalId",
  "leadCount",
  "saleCount",
  "totalRevenue",
  "firstSeenClickId",
  "lastSeenClickId",
  "email",
  "name"
FROM "Customer"
ORDER BY "createdAt" DESC
LIMIT 1;
```

**Vérifications** :
- ✅ `leadCount` = 1 (après track lead)
- ✅ `saleCount` = 1 (après track sale)
- ✅ `totalRevenue` = 9999 (99.99 * 100 cents)
- ✅ `firstSeenClickId` et `lastSeenClickId` doivent être remplis

### 4.3 Vérifier l'AttributionLog

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

## 🎯 SCÉNARIO COMPLET DE TEST

### Scénario : Client arrive via lien → S'inscrit → Passe commande

1. **Créer le lien** :
   ```bash
   curl -X POST http://localhost:4000/links \
     -H "Content-Type: application/json" \
     -d '{
       "workspaceId": "cmidm26nm0000za0elfln3o8m",
       "slug": "mon-produit",
       "targetUrl": "http://localhost:3000/test-site.html"
     }'
   ```

2. **Accéder via le lien** :
   ```
   http://localhost:4100/mon-produit?utm_source=facebook&utm_campaign=summer
   ```
   - Cookie `cursor_click_id` créé automatiquement
   - ClickEvent créé avec UTM

3. **Sur le site** :
   - Cliquer "1. Initialiser Tracking" (récupère le cookie)
   - Cliquer "2. Tracker Lead" (inscription)
   - Cliquer "3. Tracker Sale" (commande)

4. **Vérifier dans la DB** :
   - ClickEvent avec UTM = facebook, campaign = summer
   - Customer avec leadCount=1, saleCount=1, totalRevenue=9999
   - AttributionLog avec reason="valid_click"

---

## 🐛 DÉPANNAGE

### Problème : Cookie non créé

**Solution** :
- Vérifiez que le redirect service est démarré
- Vérifiez que vous accédez via `http://localhost:4100` (pas directement)
- Vérifiez les DevTools → Network pour voir la redirection

### Problème : CORS Error

**Solution** :
- L'API doit avoir CORS activé (déjà fait dans le code)
- Vérifiez que l'API est bien démarrée sur le port 4000

### Problème : ClickId non trouvé

**Solution** :
- Vérifiez que le cookie `cursor_click_id` existe dans les DevTools
- Si absent, cliquez sur "Initialiser Tracking" pour en créer un

### Problème : UTM non capturés

**Solution** :
- Vérifiez que vous passez les UTM dans l'URL du lien de tracking
- Exemple : `http://localhost:4100/mon-produit?utm_source=google&utm_campaign=test`
- Vérifiez dans la DB que `utmSource` et `utmCampaign` sont remplis

---

## ✅ CHECKLIST DE VALIDATION

- [ ] Lien créé avec succès
- [ ] Redirection fonctionne
- [ ] Cookie `cursor_click_id` créé
- [ ] ClickEvent créé avec pageUrl, UTM, browserLanguage
- [ ] Lead tracké avec succès
- [ ] Customer créé avec leadCount=1
- [ ] Sale trackée avec succès
- [ ] Customer mis à jour avec saleCount=1, totalRevenue=9999
- [ ] AttributionLog créé avec reason="valid_click"
- [ ] Tous les champs enrichis sont remplis

---

## 📝 NOTES

### Utilisation du SDK (Optionnel)

Pour une intégration plus propre, vous pouvez utiliser le SDK :

```html
<script type="module">
  import { initTracking, cursorTrack } from './tracking-sdk/dist/index.js';
  
  initTracking({
    apiBaseUrl: 'http://localhost:4000',
    workspaceId: 'cmidm26nm0000za0elfln3o8m',
    debug: true,
  });
  
  // Tracker un lead
  await cursorTrack('lead', {
    workspaceId: 'cmidm26nm0000za0elfln3o8m',
    customerExternalId: 'customer-123',
    eventName: 'signup',
  });
</script>
```

**Note** : Le SDK auto-collecte pageUrl, referrer, UTM, browserLanguage, etc.

---

**Guide créé le** : 2025-11-24  
**Version** : 1.0



