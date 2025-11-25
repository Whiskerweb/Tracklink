# 🚀 Guide de Déploiement Production

## 📋 Configuration pour Production avec Domaine OVH

### 1. Préparation du Serveur

#### Variables d'environnement

Créez un fichier `.env.production` :

```env
# Database
DATABASE_URL="postgresql://postgres:...@db.xxx.supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:...@db.xxx.supabase.co:5432/postgres?sslmode=require"

# Supabase
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."

# Security
CLICK_COOKIE_SECRET="[GENERATE-A-32-BYTE-SECRET]"
HASH_SALT="[GENERATE-A-STRONG-SALT]"

# Ports
API_PORT=4000
REDIRECT_PORT=4100

# Environment
NODE_ENV=production
LOG_LEVEL=info
```

### 2. Installation sur le Serveur

```bash
# Cloner le repo
git clone <your-repo-url>
cd tracking

# Installer les dépendances
pnpm install

# Build
pnpm build

# Générer Prisma client
pnpm db:generate
```

### 3. Configuration DNS OVH

#### Étape 1 : Obtenir l'IP de votre serveur

```bash
# Sur votre serveur
curl ifconfig.me
```

#### Étape 2 : Configurer chez OVH

1. Connectez-vous à OVH Manager
2. Allez dans **Domaines** > Votre domaine > **Zone DNS**
3. Ajoutez/modifiez :

**Pour domaine principal** (`mon-domaine.com`) :
- Type : `A`
- Sous-domaine : `@` (ou laissez vide)
- TTL : `3600`
- Cible : `VOTRE_IP_PUBLIQUE`

**Pour sous-domaine** (`links.mon-domaine.com`) :
- Type : `A`
- Sous-domaine : `links`
- TTL : `3600`
- Cible : `VOTRE_IP_PUBLIQUE`

### 4. Configuration Nginx (Reverse Proxy)

#### Installation

```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx
```

#### Configuration

Créez `/etc/nginx/sites-available/tracking` :

```nginx
# HTTP -> HTTPS redirect
server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name votre-domaine.com www.votre-domaine.com;

    ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to redirect service
    location / {
        proxy_pass http://localhost:4100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Activer le site

```bash
sudo ln -s /etc/nginx/sites-available/tracking /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Obtenir le certificat SSL

```bash
sudo certbot --nginx -d votre-domaine.com -d www.votre-domaine.com
```

### 5. Configuration PM2 (Process Manager)

#### Installation

```bash
npm install -g pm2
```

#### Configuration

Créez `ecosystem.config.js` à la racine :

```javascript
module.exports = {
  apps: [
    {
      name: "tracking-api",
      script: "pnpm",
      args: "--filter @tracking/api start",
      cwd: "/path/to/tracking",
      env: {
        NODE_ENV: "production",
      },
      error_file: "./logs/api-error.log",
      out_file: "./logs/api-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
    },
    {
      name: "tracking-redirect",
      script: "pnpm",
      args: "--filter @tracking/redirect start",
      cwd: "/path/to/tracking",
      env: {
        NODE_ENV: "production",
      },
      error_file: "./logs/redirect-error.log",
      out_file: "./logs/redirect-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
    },
  ],
};
```

#### Démarrer les services

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Pour démarrer au boot
```

### 6. Créer le domaine dans la base

```bash
# Via script
pnpm domain:create VOTRE_WORKSPACE_ID votre-domaine.com

# Ou via API
curl -X POST "http://localhost:4000/domains" \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "VOTRE_WORKSPACE_ID",
    "host": "votre-domaine.com"
  }'
```

### 7. Vérifier le domaine

Après configuration DNS et propagation :

```bash
# Tester la résolution DNS
dig votre-domaine.com +short

# Tester l'accès
curl -I https://votre-domaine.com

# Marquer comme vérifié
curl -X PATCH "http://localhost:4000/domains/DOMAIN_ID" \
  -H "Content-Type: application/json" \
  -d '{"verified": true}'
```

### 8. Firewall

```bash
# UFW
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 9. Monitoring

```bash
# PM2 monitoring
pm2 monit

# Logs
pm2 logs

# Status
pm2 status
```

## 🔒 Sécurité Production

1. ✅ HTTPS activé (Let's Encrypt)
2. ✅ Firewall configuré
3. ✅ Variables d'environnement sécurisées
4. ✅ Logs structurés
5. ✅ Rate limiting (à ajouter si nécessaire)

## 📊 Checklist Déploiement

- [ ] Serveur configuré avec Node.js 18+
- [ ] Variables d'environnement configurées
- [ ] DNS OVH pointant vers l'IP du serveur
- [ ] Nginx configuré avec SSL
- [ ] Services démarrés avec PM2
- [ ] Domaine créé dans la base de données
- [ ] Domaine marqué comme vérifié
- [ ] Test de redirection fonctionnel
- [ ] Firewall configuré
- [ ] Monitoring en place

## 🐛 Dépannage

### Le domaine ne résout pas

```bash
# Vérifier DNS
dig votre-domaine.com
nslookup votre-domaine.com

# Vérifier propagation
# https://dnschecker.org
```

### Erreur 502 Bad Gateway

- Vérifiez que le service redirect tourne : `pm2 status`
- Vérifiez les logs : `pm2 logs tracking-redirect`
- Vérifiez que le port 4100 est accessible localement

### HTTPS ne fonctionne pas

- Vérifiez le certificat : `sudo certbot certificates`
- Renouvelez si nécessaire : `sudo certbot renew`


