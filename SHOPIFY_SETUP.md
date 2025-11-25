# 🛍️ Guide de Configuration Shopify App

Ce guide explique comment configurer et déployer l'intégration Shopify pour tracker automatiquement les ventes.

## 📋 Prérequis

- Un compte Shopify Partners (gratuit) : https://partners.shopify.com
- Une boutique Shopify de test (ou une vraie boutique)
- Les services API et Redirect doivent être démarrés
- Un workspace Traaaction configuré (ID : `cmidnossz0000ldeb0f5ciff0` pour le workspace Shopify)

## 🔧 Étape 1 : Variables d'environnement

Ajoutez dans votre fichier `.env` à la racine du projet :

```env
# Shopify App Configuration
SHOPIFY_API_KEY=votre_api_key
SHOPIFY_API_SECRET=votre_api_secret
SHOPIFY_SCOPES=read_orders,read_customers
SHOPIFY_APP_URL=https://shopify.traaaction.com  # ou URL ngrok pour dev

# Workspace pour mapper les shops Shopify
SHOPIFY_WORKSPACE_ID=cmidnossz0000ldeb0f5ciff0

# API URL de tracking (pour que l'app Shopify appelle /track/sale)
API_URL=https://api.traaaction.com
```

**Note** : Si vous n'avez pas encore créé l'app dans Shopify Partners, laissez `SHOPIFY_API_KEY` et `SHOPIFY_API_SECRET` vides pour l'instant.

## 🗄️ Étape 2 : Migration Base de Données

Appliquez la migration pour créer la table `ShopifyShop` :

```bash
# Générer le client Prisma
pnpm db:generate

# Appliquer la migration Shopify
pnpm exec tsx scripts/apply-shopify-migration.ts

# Vérifier (optionnel)
pnpm db:studio
# Vérifiez que la table ShopifyShop est bien présente
```

## 🚀 Étape 3 : Démarrage de l'App Shopify

### Option A : Développement avec ngrok (recommandé pour tester)

1. **Démarrer l'app Shopify** :
   ```bash
   pnpm --filter @tracking/shopify-app dev
   ```
   L'app écoute sur le port 3001.

2. **Exposer avec ngrok** :
   ```bash
   ngrok http 3001
   ```

3. **Récupérer l'URL ngrok** (ex: `https://abcd-1234.eu.ngrok.io`)

4. **Mettre à jour `.env`** :
   ```env
   SHOPIFY_APP_URL=https://abcd-1234.eu.ngrok.io
   ```

5. **Redémarrer l'app Shopify** pour prendre en compte la nouvelle URL.

### Option B : Production avec shopify.traaaction.com

1. **Configurer DNS OVH** :
   - **Type** : `A`
   - **Sous-domaine** : `shopify`
   - **Cible** : `77.158.216.106`
   - **TTL** : 3600

2. **Configurer le reverse proxy** (Caddy) :
   ```
   shopify.traaaction.com {
       reverse_proxy localhost:3001
   }
   ```

3. **Mettre à jour `.env`** :
   ```env
   SHOPIFY_APP_URL=https://shopify.traaaction.com
   ```

4. **Démarrer l'app en production** :
   ```bash
   # Avec PM2
   pm2 start "pnpm --filter @tracking/shopify-app dev" --name shopify-app

   # Ou avec systemd
   # Créer un service systemd pour l'app Shopify
   ```

## 🏪 Étape 4 : Créer l'App dans Shopify Partners

1. **Connectez-vous** : https://partners.shopify.com

2. **Créez une nouvelle app** :
   - Cliquez sur "Apps" → "Create app"
   - Choisissez "Custom app"
   - Nommez votre app : **Traaaction Tracking**

3. **Configurez les URLs** :
   - **App URL** : `SHOPIFY_APP_URL` (ex: `https://shopify.traaaction.com`)
   - **Allowed redirection URL(s)** : 
     - `SHOPIFY_APP_URL/shopify/callback`
     - Exemple : `https://shopify.traaaction.com/shopify/callback`

4. **Configurez les Webhooks** :
   - Dans la section "Webhooks", ajoutez :
     - **Event** : `Order creation`
     - **URL** : `SHOPIFY_APP_URL/shopify/webhooks/orders/create`
     - **Format** : JSON
   
   - Ajoutez aussi :
     - **Event** : `App uninstalled`
     - **URL** : `SHOPIFY_APP_URL/shopify/webhooks/uninstall`
     - **Format** : JSON

5. **Récupérez vos credentials** :
   - **API Key** (Client ID)
   - **API Secret Key** (Client Secret)

6. **Mettez à jour `.env`** :
   ```env
   SHOPIFY_API_KEY=votre_api_key
   SHOPIFY_API_SECRET=votre_api_secret
   ```

7. **Redémarrez l'app Shopify** pour prendre en compte les nouvelles credentials.

## 🧪 Étape 5 : Installer l'App sur une Boutique

1. **Créez l'URL d'installation** :
   ```
   SHOPIFY_APP_URL/shopify/install?shop=VOTRE_BOUTIQUE.myshopify.com
   ```
   
   Exemple : `https://shopify.traaaction.com/shopify/install?shop=ma-boutique.myshopify.com`

2. **Ouvrez cette URL dans votre navigateur**
   - Vous serez redirigé vers Shopify pour autoriser l'app
   - Acceptez les permissions
   - Vous serez redirigé vers `/shopify/callback`
   - Le shop sera enregistré dans la base de données

3. **Vérifiez l'installation** :
   ```bash
   pnpm db:studio
   # Vérifiez que le shop apparaît dans la table ShopifyShop
   ```

## 🧪 Étape 6 : Tester le Flow Complet

### 6.1 Créer un lien tracké

1. **Créez un lien** via le dashboard Traaaction (https://traaaction.com) :
   - Remplissez le formulaire "Créer un nouveau lien"
   - Notez le slug généré

2. **Notez l'URL du lien** : `https://go.traaaction.com/[slug]`

### 6.2 Simuler un clic sur le lien

1. **Ouvrez le lien** dans un navigateur :
   ```
   https://go.traaaction.com/[slug]
   ```

2. **Vérifiez qu'un ClickEvent a été créé** :
   - Le cookie `cursor_click_id` devrait être créé
   - Un `ClickEvent` devrait être enregistré en DB

### 6.3 Créer une commande dans Shopify

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

### 6.4 Vérifier l'attribution

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
WHERE se."workspaceId" = 'cmidnossz0000ldeb0f5ciff0'
ORDER BY se."createdAt" DESC;
```

## 🔍 Dépannage

### L'app ne s'installe pas

- Vérifiez que `SHOPIFY_API_KEY` et `SHOPIFY_API_SECRET` sont corrects
- Vérifiez que l'URL de callback est bien configurée dans Shopify Partners
- Vérifiez les logs de l'app Shopify pour voir les erreurs
- Vérifiez que `SHOPIFY_WORKSPACE_ID` est défini

### Les webhooks ne fonctionnent pas

- Vérifiez que les URLs de webhooks sont accessibles publiquement
- En local, utilisez un tunnel (ngrok) :
  ```bash
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
- Vérifiez que `API_URL` est correct dans `.env`

### Erreur "No workspace configured"

- Vérifiez que `SHOPIFY_WORKSPACE_ID` est défini dans `.env`
- Vérifiez que la valeur correspond à un workspace existant en DB
- Redémarrez l'app Shopify après avoir modifié `.env`

## 📝 Notes Importantes

1. **Mapping Shop → Workspace** :
   - Actuellement, tous les shops Shopify sont mappés au même workspace (`SHOPIFY_WORKSPACE_ID`)
   - Pour la production, vous pouvez implémenter un système de mapping plus flexible (table de mapping, API admin, etc.)

2. **Attribution** :
   - L'attribution se fait automatiquement via le cookie `cursor_click_id` si présent
   - Si aucun cookie n'est présent, l'attribution utilisera les fallbacks (UTM, default partner)
   - Le `clickId` peut aussi être stocké dans les `note_attributes` de la commande Shopify (si implémenté côté frontend)

3. **Sécurité** :
   - Le `accessToken` est stocké en clair dans la DB (pour l'instant)
   - En production, chiffrez-le avec une clé de chiffrement
   - Les webhooks sont validés via HMAC avec `SHOPIFY_API_SECRET`

4. **Customer External ID** :
   - Format : `shopify:${shopDomain}:${customerId}`
   - Permet d'identifier de manière unique chaque client Shopify

## ✅ Checklist de Validation

- [ ] Variables d'environnement configurées
- [ ] Migration Prisma appliquée
- [ ] App Shopify démarrée (port 3001)
- [ ] URL publique accessible (ngrok ou shopify.traaaction.com)
- [ ] App créée dans Shopify Partners
- [ ] Webhooks configurés
- [ ] App installée sur une boutique
- [ ] Lien tracké créé
- [ ] Clic sur le lien testé
- [ ] Commande créée dans Shopify
- [ ] SaleEvent créé en DB
- [ ] Attribution correcte (partnerId, commission)

---

**Date de création** : 2025-01-24  
**Version** : 1.0


