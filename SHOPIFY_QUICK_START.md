# 🚀 Quick Start - Test Shopify Integration

## ✅ Ce qui a été fait

1. ✅ Modèle `ShopifyShop` ajouté dans Prisma
2. ✅ App Shopify créée avec :
   - OAuth flow (`/shopify/install`, `/shopify/callback`)
   - Webhook `orders/create` → `/track/sale`
   - Webhook `app/uninstalled`
   - Validation HMAC des webhooks
3. ✅ Mapping Shopify Order → SaleEvent
4. ✅ Intégration avec l'API `/track/sale` existante
5. ✅ Guide de configuration créé (`GUIDE_SHOPIFY_SETUP.md`)

## 🔧 Prochaines étapes

### 1. Appliquer la migration Prisma

```bash
# Une fois la DB accessible
pnpm exec tsx scripts/apply-shopify-migration.ts
```

### 2. Configurer les variables d'environnement

Ajoutez dans `.env` :

```env
# Shopify App
SHOPIFY_API_KEY=votre_api_key
SHOPIFY_API_SECRET=votre_api_secret
SHOPIFY_SCOPES=read_orders,write_orders
SHOPIFY_APP_URL=http://traaaction.com:3001

# Workspace ID (pour lier les shops)
SHOPIFY_WORKSPACE_ID=votre_workspace_id
# OU
DEFAULT_WORKSPACE_ID=votre_workspace_id

# API URL (pour appeler /track/sale)
API_URL=http://traaaction.com:4000
```

### 3. Créer l'app dans Shopify Partners

1. Allez sur https://partners.shopify.com
2. Créez une nouvelle app
3. Configurez :
   - **App URL** : `http://traaaction.com:3001`
   - **Callback URL** : `http://traaaction.com:3001/shopify/callback`
   - **Webhook Order creation** : `http://traaaction.com:3001/shopify/webhooks/orders/create`
   - **Webhook App uninstalled** : `http://traaaction.com:3001/shopify/webhooks/uninstall`

4. Récupérez `API Key` et `API Secret Key`

### 4. Démarrer les services

```bash
# Tous les services
pnpm dev:all

# Ou individuellement :
pnpm --filter @tracking/api dev          # Port 4000
pnpm --filter @tracking/redirect dev     # Port 4100
pnpm --filter @tracking/shopify-app dev  # Port 3001
```

### 5. Installer l'app sur une boutique

```
http://traaaction.com:3001/shopify/install?shop=VOTRE_BOUTIQUE.myshopify.com
```

### 6. Tester le flow complet

1. **Créer un lien tracké** :
   ```
   http://traaaction.com:4100/mon-slug
   ```

2. **Cliquer sur le lien** (cookie créé)

3. **Créer une commande dans Shopify** (même navigateur)

4. **Vérifier** :
   - Logs de l'app Shopify
   - `SaleEvent` créé en DB
   - Attribution automatique via `clickId`

## 📝 Notes importantes

- **En local** : Utilisez un tunnel (ngrok) pour exposer l'app publiquement
- **Workspace ID** : Récupérez-le depuis votre DB ou créez-en un via l'API
- **Migration** : Appliquez-la une fois la DB accessible

## 🔍 Vérification

```sql
-- Vérifier les shops installés
SELECT * FROM "ShopifyShop";

-- Vérifier les ventes trackées
SELECT 
  se.*,
  ce."clickId",
  ce."partnerId"
FROM "SaleEvent" se
LEFT JOIN "ClickEvent" ce ON se."clickId" = ce."clickId"
ORDER BY se."createdAt" DESC;
```

---

**Guide complet** : Voir `GUIDE_SHOPIFY_SETUP.md`




