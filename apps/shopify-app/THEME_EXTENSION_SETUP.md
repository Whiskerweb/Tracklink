# 🎨 Configuration Theme App Extension pour Traaaction

Ce guide explique comment configurer l'injection du script de tracking via Theme App Extensions (App Embed Blocks) dans Shopify.

## 📋 Vue d'ensemble

L'extension injecte automatiquement le cookie `cursor_click_id` dans le panier Shopify comme attribut `_traaaction_click_id`. Cet attribut est ensuite transmis à la commande et accessible via le webhook `orders/create`.

## 🔧 Configuration dans Shopify Admin

### Étape 1 : Activer l'App Embed Block

1. Connectez-vous à votre **Shopify Admin**
2. Allez dans **Apps** > **App and sales channel settings**
3. Trouvez votre app Traaaction
4. Dans les paramètres de l'app, activez **App Embed Blocks**

### Étape 2 : Ajouter le Block au Thème

#### Option A : Via l'éditeur de thème (Recommandé)

1. Allez dans **Online Store** > **Themes**
2. Cliquez sur **Customize** pour votre thème actif
3. Dans le panneau de gauche, allez dans **App embeds**
4. Trouvez **Traaaction Analytics** et activez-le
5. Le script sera automatiquement injecté sur toutes les pages

#### Option B : Via le code Liquid (Avancé)

Si vous préférez l'ajouter manuellement, ajoutez ce code dans votre fichier `theme.liquid` (dans la section `<head>` ou avant `</body>`) :

```liquid
{% if shop.metafields.traaaction.enabled %}
  <script>
    (function() {
      const CLICK_COOKIE_NAME = 'cursor_click_id';
      
      function getCookie(name) {
        const value = '; ' + document.cookie;
        const parts = value.split('; ' + name + '=');
        if (parts.length === 2) {
          return parts.pop().split(';').shift();
        }
        return null;
      }
      
      async function injectClickIdToCart() {
        const clickId = getCookie(CLICK_COOKIE_NAME);
        
        if (!clickId) {
          return;
        }
        
        try {
          const response = await fetch('/cart/update.js', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              attributes: {
                _traaaction_click_id: clickId,
              },
            }),
          });
          
          if (!response.ok) {
            console.warn('[Traaaction] Failed to inject clickId to cart:', response.status);
            return;
          }
          
          if (window.location.hostname === 'localhost' || window.location.search.includes('debug=true')) {
            console.log('[Traaaction] ClickId injected to cart:', clickId);
          }
        } catch (error) {
          console.warn('[Traaaction] Error injecting clickId:', error);
        }
      }
      
      function initClickIdInjection() {
        injectClickIdToCart();
        
        let lastUrl = location.href;
        new MutationObserver(function() {
          const url = location.href;
          if (url !== lastUrl) {
            lastUrl = url;
            injectClickIdToCart();
          }
        }).observe(document, { subtree: true, childList: true });
        
        document.addEventListener('cart:updated', function() {
          injectClickIdToCart();
        });
      }
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initClickIdInjection);
      } else {
        initClickIdInjection();
      }
      
      if (typeof window !== 'undefined') {
        window.traaactionInjectClickId = injectClickIdToCart;
      }
    })();
  </script>
{% endif %}
```

### Étape 3 : Vérifier l'injection

1. Ouvrez votre boutique en mode **Preview**
2. Ouvrez la console du navigateur (F12)
3. Ajoutez `?debug=true` à l'URL pour activer les logs
4. Vous devriez voir : `[Traaaction] ClickId injected to cart: <clickId>`

## 🔍 Comment ça fonctionne

1. **Cookie détection** : Le script lit le cookie `cursor_click_id` depuis le navigateur
2. **Injection dans le panier** : Utilise l'API AJAX `/cart/update.js` pour ajouter l'attribut `_traaaction_click_id`
3. **Transmission à la commande** : Lors du checkout, Shopify inclut automatiquement les attributs du panier dans les `note_attributes` de la commande
4. **Webhook** : Le webhook `orders/create` lit `_traaaction_click_id` depuis `note_attributes` et l'utilise pour l'attribution

## 🧪 Test

### Test manuel

1. Visitez un lien tracké : `https://go.traaaction.com/votre-slug`
2. Vérifiez que le cookie `cursor_click_id` est présent
3. Ajoutez un produit au panier
4. Dans la console, vérifiez que le script a injecté le clickId
5. Passez une commande de test
6. Vérifiez dans les logs du webhook que `_traaaction_click_id` est présent dans `note_attributes`

### Test avec curl

```bash
# Vérifier que le script est servi
curl https://votre-app-url.com/extension/analytics-script.js

# Vérifier le template Liquid
curl https://votre-app-url.com/extension/app-embed.liquid
```

## ⚙️ Configuration des Scopes

Assurez-vous que votre app a les scopes suivants :

- `read_orders` : Pour lire les commandes
- `write_orders` : Pour modifier les commandes (si nécessaire)
- `read_customers` : Pour lire les informations clients

Ces scopes sont configurés dans `SHOPIFY_SCOPES` dans votre `.env` :

```env
SHOPIFY_SCOPES=read_orders,write_orders,read_customers
```

## 🐛 Dépannage

### Le clickId n'est pas injecté

1. Vérifiez que le cookie `cursor_click_id` existe
2. Vérifiez la console pour les erreurs JavaScript
3. Vérifiez que l'App Embed Block est activé dans le thème
4. Testez avec `?debug=true` pour voir les logs

### Le clickId n'apparaît pas dans le webhook

1. Vérifiez que l'attribut est bien dans le panier avant le checkout
2. Vérifiez les logs du webhook pour voir le payload complet
3. Vérifiez que le webhook lit bien `_traaaction_click_id` depuis `note_attributes`

### Le script ne se charge pas

1. Vérifiez que l'URL de l'app est correcte dans les paramètres Shopify
2. Vérifiez que la route `/extension/analytics-script.js` est accessible
3. Vérifiez les CORS si vous servez depuis un domaine différent

## 📚 Références

- [Shopify App Embed Blocks Documentation](https://shopify.dev/docs/apps/online-store/app-embeds)
- [Shopify Cart API](https://shopify.dev/docs/api/ajax/reference/cart)
- [Shopify Webhooks](https://shopify.dev/docs/api/admin-graphql/latest/resources/webhook)

