# 🛍️ Guide de Configuration Shopify App

Ce guide vous explique comment configurer et tester l'intégration Shopify pour tracker automatiquement les ventes.

## 📋 Prérequis

1. Un compte Shopify Partners (gratuit) : https://partners.shopify.com
2. Une boutique Shopify de test (ou une vraie boutique)
3. Les services API et Redirect doivent être démarrés

## 🔧 Étape 1 : Créer l'App dans Shopify Partners

1. **Connectez-vous à Shopify Partners** : https://partners.shopify.com
2. **Créez une nouvelle app** :
   - Cliquez sur "Apps" → "Create app"
   - Choisissez "Custom app"
   - Nommez votre app (ex: "Traaaction Tracking")
   - Sélectionnez "Public app" ou "Custom app" selon vos besoins

3. **Configurez les URLs de redirection** :
   - **App URL** : `http://traaaction.com:3001` (ou votre URL de production)
   - **Allowed redirection URL(s)** : 
     - `http://traaaction.com:3001/shopify/callback`
     - `https://votre-domaine.com/shopify/callback` (pour la production)

4. **Configurez les Webhooks** :
   - Dans la section "Webhooks", ajoutez :
     - **Event** : `Order creation`
     - **URL** : `http://traaaction.com:3001/shopify/webhooks/orders/create`
     - **Format** : JSON
   
   - Ajoutez aussi :
     - **Event** : `App uninstalled`
     - **URL** : `http://traaaction.com:3001/shopify/webhooks/uninstall`
     - **Format** : JSON

5. **Récupérez vos credentials** :
   - **API Key** (Client ID)
   - **API Secret Key** (Client Secret)
   - Notez-les, vous en aurez besoin pour `.env`

## 🔧 Étape 2 : Configuration Locale

### 2.1 Variables d'environnement

Ajoutez dans votre fichier `.env` :

```env
# Shopify App Configuration
SHOPIFY_API_KEY=votre_api_key
SHOPIFY_API_SECRET=votre_api_secret
SHOPIFY_SCOPES=read_orders,write_orders
SHOPIFY_APP_URL=http://traaaction.com:3001

# Workspace ID (pour lier les shops Shopify à un workspace)
SHOPIFY_WORKSPACE_ID=votre_workspace_id
# OU utilisez DEFAULT_WORKSPACE_ID si vous avez un workspace par défaut
DEFAULT_WORKSPACE_ID=votre_workspace_id

# API URL (pour appeler /track/sale en interne)
API_URL=http://traaaction.com:4000
```

### 2.2 Appliquer la migration Prisma

```bash
# Générer le client Prisma
pnpm db:generate

# Appliquer la migration (créer la table ShopifyShop)
pnpm exec tsx scripts/apply-shopify-migration.ts
```

## 🚀 Étape 3 : Démarrer les Services

```bash
# Démarrer tous les services (API, Redirect, Shopify App)
pnpm dev:all

# Ou individuellement :
pnpm --filter @tracking/api dev          # Port 4000
pnpm --filter @tracking/redirect dev     # Port 4100
pnpm --filter @tracking/shopify-app dev  # Port 3001
```

## 🧪 Étape 4 : Installer l'App sur une Boutique

### 4.1 Via l'URL d'installation

1. **Créez l'URL d'installation** :
   ```
   http://traaaction.com:3001/shopify/install?shop=VOTRE_BOUTIQUE.myshopify.com
   ```
   
   Remplacez `VOTRE_BOUTIQUE` par le nom de votre boutique Shopify.

2. **Ouvrez cette URL dans votre navigateur**
   - Vous serez redirigé vers Shopify pour autoriser l'app
   - Acceptez les permissions
   - Vous serez redirigé vers `/shopify/callback`
   - Le shop sera enregistré dans la base de données

### 4.2 Vérifier l'installation

Vérifiez dans votre base de données que le shop a été créé :

```sql
SELECT * FROM "ShopifyShop";
```

Ou via Prisma Studio :
```bash
pnpm db:studio
```

## 🧪 Étape 5 : Tester le Flow Complet

### 5.1 Créer un lien tracké

1. **Créez un lien avec un partenaire** (via l'API ou le dashboard) :
   ```bash
   curl -X POST http://traaaction.com:4000/links \
     -H "Content-Type: application/json" \
     -d '{
       "workspaceId": "votre_workspace_id",
       "slug": "test-shopify",
       "targetUrl": "https://votre-boutique.myshopify.com/products/test"
     }'
   ```

2. **Notez l'URL du lien** : `http://traaaction.com:4100/test-shopify`

### 5.2 Simuler un clic sur le lien

1. **Ouvrez le lien** dans un navigateur :
   ```
   http://traaaction.com:4100/test-shopify
   ```

2. **Vérifiez qu'un ClickEvent a été créé** :
   - Le cookie `cursor_click_id` devrait être créé
   - Un `ClickEvent` devrait être enregistré en DB

### 5.3 Créer une commande dans Shopify

1. **Dans votre boutique Shopify** :
   - Ajoutez un produit au panier
   - Passez commande avec le même navigateur (pour garder le cookie)
   - Complétez la commande

2. **Vérifiez les logs** :
   - Les logs de l'app Shopify devraient afficher :
     ```
     Shopify order tracked as sale
     shopDomain: votre-boutique.myshopify.com
     orderId: 123456
     ```

3. **Vérifiez dans la base de données** :
   - Un `SaleEvent` devrait être créé
   - L'attribution devrait être faite automatiquement (via le `clickId` du cookie)
   - Une `Commission` devrait être créée si un partenaire est associé

### 5.4 Vérifier l'attribution

```sql
-- Vérifier les ventes trackées
SELECT 
  se.*,
  ce.clickId,
  ce.partnerId,
  p.name as partner_name
FROM "SaleEvent" se
LEFT JOIN "ClickEvent" ce ON se."clickId" = ce."clickId"
LEFT JOIN "Partner" p ON ce."partnerId" = p.id
WHERE se."workspaceId" = 'votre_workspace_id'
ORDER BY se."createdAt" DESC;
```

## 🔍 Dépannage

### L'app ne s'installe pas

- Vérifiez que `SHOPIFY_API_KEY` et `SHOPIFY_API_SECRET` sont corrects
- Vérifiez que l'URL de callback est bien configurée dans Shopify Partners
- Vérifiez les logs de l'app Shopify pour voir les erreurs

### Les webhooks ne fonctionnent pas

- Vérifiez que les URLs de webhooks sont accessibles publiquement
- En local, utilisez un tunnel (ngrok, Cloudflare Tunnel, etc.) :
  ```bash
  # Exemple avec ngrok
  ngrok http 3001
  # Utilisez l'URL ngrok dans Shopify Partners
  ```

- Vérifiez la signature HMAC dans les logs
- Vérifiez que `SHOPIFY_API_SECRET` est correct

### Les ventes ne sont pas trackées

- Vérifiez que le shop est bien installé (`ShopifyShop` en DB)
- Vérifiez que `workspaceId` est correct
- Vérifiez les logs de l'app Shopify
- Vérifiez que l'API `/track/sale` est accessible depuis l'app Shopify
- Vérifiez que le cookie `cursor_click_id` est présent lors de la commande

## 📝 Notes Importantes

1. **En développement local** :
   - Utilisez un tunnel (ngrok) pour exposer l'app Shopify publiquement
   - Les webhooks Shopify nécessitent une URL HTTPS en production

2. **Mapping Shop → Workspace** :
   - Actuellement, le mapping se fait via `SHOPIFY_WORKSPACE_ID` ou `DEFAULT_WORKSPACE_ID`
   - Pour la production, implémentez un système de mapping plus flexible (table de mapping, API admin, etc.)

3. **Sécurité** :
   - Le `accessToken` est stocké en clair dans la DB (pour l'instant)
   - En production, chiffrez-le avec une clé de chiffrement

4. **Attribution** :
   - L'attribution se fait automatiquement via le cookie `cursor_click_id`
   - Si aucun cookie n'est présent, l'attribution utilisera les fallbacks (UTM, default partner)

## ✅ Checklist de Validation

- [ ] App créée dans Shopify Partners
- [ ] Webhooks configurés
- [ ] Variables d'environnement configurées
- [ ] Migration Prisma appliquée
- [ ] Services démarrés
- [ ] App installée sur une boutique
- [ ] Lien tracké créé
- [ ] Clic sur le lien testé
- [ ] Commande créée dans Shopify
- [ ] SaleEvent créé en DB
- [ ] Attribution correcte (partnerId, commission)

---

**Date de création** : 2025-01-24  
**Version** : 1.0

