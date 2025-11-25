# 🚀 Guide de Déploiement - Dashboard Traaaction

Ce guide explique comment déployer le dashboard sur Vercel et configurer les DNS pour un environnement de production.

## 📋 Prérequis

- Un compte Vercel
- Accès au DNS OVH pour `traaaction.com`
- Les services backend (API et Redirect) déjà déployés et accessibles

## 1️⃣ Déploiement sur Vercel

### Option A : Déploiement depuis le monorepo (recommandé)

1. **Connecter le repository GitHub à Vercel** :
   - Allez sur https://vercel.com
   - Cliquez sur "Add New Project"
   - Importez votre repository `tracking`

2. **Configuration du projet** :
   - **Framework Preset** : `Other` ou `Static Site`
   - **Root Directory** : `/web`
   - **Build Command** : (laisser vide, c'est un site statique)
   - **Output Directory** : `/web` (ou laisser vide)
   - **Install Command** : (laisser vide)

3. **Variables d'environnement** :
   - Aucune variable d'environnement nécessaire pour le dashboard (tout est côté client)

4. **Déployer** :
   - Cliquez sur "Deploy"
   - Vercel va déployer le contenu du dossier `/web`

### Option B : Déploiement manuel via CLI

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Dans le dossier web
cd web

# Déployer
vercel --prod
```

### Configuration Vercel (vercel.json)

Si nécessaire, créez un fichier `/web/vercel.json` :

```json
{
  "version": 2,
  "builds": [
    {
      "src": "index.html",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

## 2️⃣ Configuration DNS OVH

### 2.1 Domaine principal : traaaction.com → Vercel

1. **Récupérer les informations Vercel** :
   - Dans le dashboard Vercel, allez dans "Settings" → "Domains"
   - Ajoutez `traaaction.com` et `www.traaaction.com`
   - Vercel vous donnera des enregistrements DNS à configurer

2. **Configuration OVH** :
   - Connectez-vous à votre espace OVH
   - Allez dans "Domaines" → `traaaction.com` → "Zone DNS"

3. **Ajouter les enregistrements CNAME** :
   - **Type** : `CNAME`
   - **Sous-domaine** : `@` (ou laisser vide selon OVH)
   - **Cible** : `cname.vercel-dns.com` (ou la valeur fournie par Vercel)
   - **TTL** : 3600

   - **Type** : `CNAME`
   - **Sous-domaine** : `www`
   - **Cible** : `cname.vercel-dns.com` (ou la valeur fournie par Vercel)
   - **TTL** : 3600

   **OU** si Vercel demande des enregistrements A :
   - **Type** : `A`
   - **Sous-domaine** : `@`
   - **Cible** : `76.76.21.21` (IP Vercel, à vérifier dans la doc Vercel)
   - **TTL** : 3600

### 2.2 Sous-domaine API : api.traaaction.com → Serveur Backend

1. **Configuration OVH** :
   - **Type** : `A` (ou `AAAA` pour IPv6)
   - **Sous-domaine** : `api`
   - **Cible** : `77.158.216.106` (IP de votre serveur backend)
   - **TTL** : 3600

2. **Configuration du reverse proxy** :
   - Sur votre serveur, configurez Nginx/Caddy pour :
     - Écouter sur `api.traaaction.com`
     - Proxy vers `localhost:4000` (port de l'API Fastify)

   **Exemple Nginx** :
   ```nginx
   server {
       listen 80;
       listen [::]:80;
       server_name api.traaaction.com;

       location / {
           proxy_pass http://localhost:4000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

   **Exemple Caddy** :
   ```
   api.traaaction.com {
       reverse_proxy localhost:4000
   }
   ```

### 2.3 Sous-domaine Redirect : go.traaaction.com → Serveur Backend

1. **Configuration OVH** :
   - **Type** : `A` (ou `AAAA` pour IPv6)
   - **Sous-domaine** : `go`
   - **Cible** : `77.158.216.106` (même IP que l'API)
   - **TTL** : 3600

2. **Configuration du reverse proxy** :
   - Sur votre serveur, configurez Nginx/Caddy pour :
     - Écouter sur `go.traaaction.com`
     - Proxy vers `localhost:4100` (port du service Redirect)

   **Exemple Nginx** :
   ```nginx
   server {
       listen 80;
       listen [::]:80;
       server_name go.traaaction.com;

       location / {
           proxy_pass http://localhost:4100;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

   **Exemple Caddy** :
   ```
   go.traaaction.com {
       reverse_proxy localhost:4100
   }
   ```

### 2.4 Configuration HTTPS (SSL/TLS)

**Avec Caddy** : HTTPS automatique via Let's Encrypt
- Caddy configure automatiquement HTTPS pour tous les domaines

**Avec Nginx** : Utilisez Certbot
```bash
sudo certbot --nginx -d api.traaaction.com -d go.traaaction.com
```

**Avec Vercel** : HTTPS automatique
- Vercel configure automatiquement HTTPS pour tous les domaines connectés

## 3️⃣ Configuration CORS côté API

La configuration CORS a déjà été mise à jour dans `apps/api/src/index.ts` pour autoriser :
- `https://traaaction.com`
- `https://www.traaaction.com`
- Les prévisualisations Vercel (`*.vercel.app`)

**Vérification** :
- Assurez-vous que l'API en production utilise cette configuration
- Redéployez l'API si nécessaire

## 4️⃣ Configuration du Workspace ID

1. **Récupérer le Workspace ID** :
   - Connectez-vous à votre base de données
   - Exécutez : `SELECT id FROM "Workspace" LIMIT 1;`
   - Copiez l'ID (format : `clx...`)

2. **Mettre à jour index.html** :
   - Ouvrez `/web/index.html`
   - Trouvez la ligne : `<input type="text" id="workspaceId" value="REPLACE_WITH_REAL_WORKSPACE_ID" ...>`
   - Remplacez `REPLACE_WITH_REAL_WORKSPACE_ID` par le vrai Workspace ID
   - Commitez et redéployez sur Vercel

## 5️⃣ Tests du Flux Complet

### 5.1 Test de création de lien

1. **Accéder au dashboard** :
   - Ouvrez https://traaaction.com
   - Vérifiez que les URLs par défaut sont bien :
     - API : `https://api.traaaction.com`
     - Redirect : `https://go.traaaction.com`

2. **Créer un lien** :
   - Remplissez le formulaire "Créer un nouveau lien"
   - Cliquez sur "Créer le lien"
   - Vérifiez que le lien apparaît dans la liste

### 5.2 Test de redirection

1. **Cliquer sur "Tester"** :
   - Cliquez sur le bouton "🔗 Tester" d'un lien
   - Vérifiez que la redirection fonctionne vers l'URL de destination
   - Vérifiez que le cookie `cursor_click_id` est créé

2. **Vérifier le cookie** :
   - Dans les DevTools (F12) → Application → Cookies
   - Vérifiez que `cursor_click_id` est présent
   - Le champ "Click ID" du dashboard devrait se remplir automatiquement

### 5.3 Test de tracking Lead

1. **Simuler un lead** :
   - Assurez-vous d'avoir un `clickId` (via le test de lien)
   - Cliquez sur "📝 Simuler un Lead"
   - Vérifiez le message de succès

2. **Vérifier les stats** :
   - Cliquez sur "📊 Stats" du lien
   - Vérifiez que le compteur "Leads" s'incrémente

### 5.4 Test de tracking Sale

1. **Simuler une vente** :
   - Cliquez sur "💰 Simuler une Vente"
   - Vérifiez le message de succès

2. **Vérifier les stats** :
   - Cliquez sur "📊 Stats" du lien
   - Vérifiez que :
     - Le compteur "Ventes" s'incrémente
     - Le "Revenus" s'incrémente de $99.99

### 5.5 Test de mise à jour des stats

1. **Actualiser les stats** :
   - Cliquez sur "🔄 Statistiques actualisées"
   - Vérifiez que les stats se mettent à jour
   - Vérifiez le debounce (pas de spam si on clique plusieurs fois rapidement)

## 6️⃣ Vérifications Finales

### Checklist de validation

- [ ] Dashboard accessible sur https://traaaction.com
- [ ] API accessible sur https://api.traaaction.com
- [ ] Redirect accessible sur https://go.traaaction.com
- [ ] CORS configuré correctement (pas d'erreurs dans la console)
- [ ] Workspace ID configuré dans index.html
- [ ] Création de lien fonctionne
- [ ] Redirection fonctionne
- [ ] Cookie `cursor_click_id` créé correctement
- [ ] Tracking Lead fonctionne
- [ ] Tracking Sale fonctionne
- [ ] Stats se mettent à jour correctement
- [ ] HTTPS activé sur tous les domaines

## 7️⃣ Dépannage

### Erreur CORS

**Symptôme** : `Access to fetch at 'https://api.traaaction.com/...' from origin 'https://traaaction.com' has been blocked by CORS policy`

**Solution** :
- Vérifiez que la config CORS dans `apps/api/src/index.ts` inclut `https://traaaction.com`
- Redéployez l'API
- Vérifiez les logs de l'API pour voir les requêtes CORS

### Erreur 404 sur les liens

**Symptôme** : Les liens créés retournent 404 lors du clic

**Solution** :
- Vérifiez que le service Redirect est démarré sur le port 4100
- Vérifiez que le reverse proxy pour `go.traaaction.com` pointe vers `localhost:4100`
- Vérifiez les logs du service Redirect

### Cookie non créé

**Symptôme** : Le cookie `cursor_click_id` n'apparaît pas après un clic

**Solution** :
- Vérifiez que le domaine du cookie est correct (doit être `.traaaction.com` ou `go.traaaction.com`)
- Vérifiez que HTTPS est activé (les cookies sécurisés nécessitent HTTPS)
- Vérifiez les logs du service Redirect

### Stats ne se mettent pas à jour

**Symptôme** : Les stats affichent "--" ou restent à 0

**Solution** :
- Ouvrez la console du navigateur (F12) pour voir les erreurs
- Vérifiez que l'endpoint `/links/:id/stats` est accessible
- Vérifiez les logs de l'API

## 8️⃣ Maintenance

### Mise à jour du dashboard

1. Modifiez `/web/index.html`
2. Commitez les changements
3. Push vers GitHub
4. Vercel redéploie automatiquement

### Mise à jour de l'API

1. Modifiez le code de l'API
2. Redéployez l'API sur votre serveur
3. Redémarrez le service si nécessaire

### Monitoring

- **Vercel** : Dashboard Vercel pour les métriques du site
- **API/Redirect** : Logs serveur + monitoring (Sentry, DataDog, etc.)

---

**Date de création** : 2025-01-24  
**Version** : 1.0




