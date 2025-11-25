# 🌐 Configuration traaaction.com pour Production

## 🎯 Objectif

Tous les utilisateurs utilisent automatiquement le domaine **traaaction.com** pour leurs liens courts. Aucun utilisateur ne peut créer de domaine personnalisé.

## ✅ Ce qui a été configuré

1. **Domaine par défaut** : `traaaction.com` (configurable via `DEFAULT_DOMAIN` dans `.env`)
2. **Création automatique** : Le domaine est créé automatiquement pour chaque workspace
3. **Création de liens simplifiée** : Plus besoin de spécifier `domainId`, il est automatique
4. **API restreinte** : Les utilisateurs ne peuvent plus créer leurs propres domaines

## 🔧 Configuration DNS OVH

### Étape 1 : Obtenir l'IP de votre serveur

```bash
# Sur votre serveur de production
curl ifconfig.me
```

Notez cette IP publique.

### Étape 2 : Configurer chez OVH

1. **Connectez-vous à OVH Manager**
2. Allez dans **Domaines** > **traaaction.com** > **Zone DNS**
3. **Ajoutez ou modifiez l'entrée Type A** :

   **Pour domaine principal** (`traaaction.com`) :
   - **Type** : `A`
   - **Sous-domaine** : `@` (ou laissez vide)
   - **TTL** : `3600`
   - **Cible** : `VOTRE_IP_PUBLIQUE`

   **Pour www** (`www.traaaction.com`) :
   - **Type** : `A`
   - **Sous-domaine** : `www`
   - **TTL** : `3600`
   - **Cible** : `VOTRE_IP_PUBLIQUE`

### Étape 3 : Attendre la propagation DNS

```bash
# Vérifier la propagation
dig traaaction.com +short
# ou
nslookup traaaction.com
```

La propagation peut prendre **5 à 30 minutes**.

## 🚀 Configuration Production

### 1. Variables d'environnement

Ajoutez dans votre `.env` :

```env
# Domain par défaut (déjà configuré)
DEFAULT_DOMAIN=traaaction.com
```

### 2. Initialiser le domaine dans la base

```bash
# Récupérez votre workspace ID
pnpm domain:setup-production VOTRE_WORKSPACE_ID
```

**Exemple** :
```bash
pnpm domain:setup-production clx00000000000000000000000
```

Ce script :
- ✅ Crée le domaine `traaaction.com` pour votre workspace
- ✅ Le marque comme vérifié
- ✅ Affiche les instructions DNS

### 3. Créer des liens (plus besoin de domainId)

```bash
curl -X POST "http://localhost:4000/links" \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "VOTRE_WORKSPACE_ID",
    "slug": "test",
    "targetUrl": "https://example.com"
  }'
```

Le `domainId` est automatique ! Le lien sera sur : `https://traaaction.com/test`

## 🔒 Configuration HTTPS (Recommandé)

### Option A : Nginx + Let's Encrypt

```bash
# Installer Nginx et Certbot
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx
```

Configuration Nginx (`/etc/nginx/sites-available/traaaction`):

```nginx
# HTTP -> HTTPS redirect
server {
    listen 80;
    server_name traaaction.com www.traaaction.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name traaaction.com www.traaaction.com;

    ssl_certificate /etc/letsencrypt/live/traaaction.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/traaaction.com/privkey.pem;

    location / {
        proxy_pass http://localhost:4100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Activer et obtenir le certificat :

```bash
sudo ln -s /etc/nginx/sites-available/traaaction /etc/nginx/sites-enabled/
sudo nginx -t
sudo certbot --nginx -d traaaction.com -d www.traaaction.com
sudo systemctl reload nginx
```

### Option B : Cloudflare (Plus simple)

1. Ajoutez `traaaction.com` à Cloudflare
2. Changez les nameservers chez OVH vers Cloudflare
3. Activez le proxy Cloudflare (orange cloud)
4. HTTPS automatique activé

## 🧪 Test

### 1. Vérifier DNS

```bash
dig traaaction.com +short
# Doit retourner votre IP publique
```

### 2. Tester la redirection

```bash
# Créer un lien de test
curl -X POST "http://localhost:4000/links" \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "VOTRE_WORKSPACE_ID",
    "slug": "test-dns",
    "targetUrl": "https://example.com"
  }'

# Tester la redirection
curl -I https://traaaction.com/test-dns
# Doit retourner 302 avec Location: https://example.com
```

## 📝 Changements dans l'API

### Avant
```json
{
  "workspaceId": "...",
  "domainId": "...",  // ❌ Obligatoire
  "slug": "test",
  "targetUrl": "..."
}
```

### Maintenant
```json
{
  "workspaceId": "...",
  // domainId optionnel - utilise traaaction.com automatiquement
  "slug": "test",
  "targetUrl": "..."
}
```

## 🔐 Sécurité

- ✅ Les utilisateurs ne peuvent plus créer de domaines
- ✅ Tous les liens utilisent `traaaction.com`
- ✅ Le domaine est auto-créé et vérifié pour chaque workspace
- ✅ HTTPS recommandé en production

## 📊 Multi-workspaces

Chaque workspace a automatiquement son propre domaine `traaaction.com` :
- Workspace A → `traaaction.com` (domaine créé automatiquement)
- Workspace B → `traaaction.com` (domaine créé automatiquement)

Les slugs sont uniques par workspace, donc pas de conflit.

## 🐛 Dépannage

### Le domaine ne résout pas

1. Vérifiez la propagation : https://dnschecker.org/#A/traaaction.com
2. Vérifiez l'IP dans OVH
3. Attendez 30 minutes maximum

### Erreur 404 "Link not found"

1. Vérifiez que le domaine existe : `GET /domains?workspaceId=...`
2. Vérifiez que le slug est correct
3. Vérifiez que le lien appartient au bon workspace

### HTTPS ne fonctionne pas

1. Vérifiez la configuration Nginx
2. Vérifiez le certificat : `sudo certbot certificates`
3. Vérifiez que le port 443 est ouvert

---

**✅ Une fois configuré, tous les liens seront automatiquement sur traaaction.com !**


