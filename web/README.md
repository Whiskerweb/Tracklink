# 🎯 Dashboard Tracking - Traaaction

Dashboard web pour gérer et tester les liens de tracking Traaaction.

## 📋 Description

Ce dashboard permet de :
- Créer des liens de tracking
- Voir les statistiques (clics, leads, ventes, revenus)
- Tester manuellement des leads et sales
- Gérer les liens depuis une interface web

## 🚀 Déploiement

Voir [DEPLOY.md](./DEPLOY.md) pour les instructions complètes de déploiement sur Vercel.

## 🔧 Configuration

### Variables par défaut

Le dashboard détecte automatiquement l'environnement :
- **Production** (`traaaction.com`) :
  - API : `https://api.traaaction.com`
  - Redirect : `https://go.traaaction.com`
- **Développement** (localhost) :
  - API : `http://localhost:4000`
  - Redirect : `http://localhost:4100`

### Workspace ID

Le Workspace ID doit être configuré dans `index.html` :
```html
<input type="text" id="workspaceId" value="VOTRE_WORKSPACE_ID" ...>
```

## 📝 Utilisation

1. **Créer un lien** :
   - Remplissez le formulaire "Créer un nouveau lien"
   - Le slug est généré automatiquement si non fourni

2. **Tester un lien** :
   - Cliquez sur "🔗 Tester" pour ouvrir le lien dans un nouvel onglet
   - Le cookie `cursor_click_id` sera créé automatiquement

3. **Simuler des événements** :
   - **Lead** : Cliquez sur "📝 Simuler un Lead" (nécessite un clickId)
   - **Sale** : Cliquez sur "💰 Simuler une Vente" (nécessite un clickId)

4. **Voir les stats** :
   - Les stats se chargent automatiquement
   - Cliquez sur "📊 Stats" pour forcer le rechargement
   - Cliquez sur "🔄 Statistiques actualisées" pour tout recharger

## 🔍 Détails Techniques

### Cookie de tracking

Le dashboard utilise le cookie `cursor_click_id` (défini dans `@tracking/shared`).

### API Endpoints utilisés

- `POST /links` - Créer un lien
- `GET /links?workspaceId=...` - Lister les liens
- `GET /links/:id/stats` - Récupérer les stats d'un lien
- `POST /track/lead` - Tracker un lead
- `POST /track/sale` - Tracker une vente

### Compatibilité

- Compatible avec les réponses API contenant `revenue` ou `totalRevenue`
- Gestion d'erreurs robuste pour les stats
- Debounce sur le bouton de refresh pour éviter le spam

---

**Version** : 1.0  
**Dernière mise à jour** : 2025-01-24

