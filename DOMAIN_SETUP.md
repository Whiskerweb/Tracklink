# 🌐 Configuration Domaine OVH Cloud

Guide pour connecter votre domaine OVH à la plateforme de tracking.

## 📋 Prérequis

1. Un domaine enregistré chez OVH
2. Accès au panneau DNS OVH
3. Un serveur avec IP publique (ou service cloud)
4. Le service redirect démarré et accessible

## 🔧 Étape 1 : Créer le domaine dans la base de données

### Option A : Via API

```bash
curl -X POST "http://localhost:4000/domains" \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "VOTRE_WORKSPACE_ID",
    "host": "votre-domaine.com"
  }'
```

### Option B : Via Prisma Studio

```bash
pnpm db:studio
```

Puis créer un nouveau Domain avec :
- `workspaceId` : votre workspace ID
- `host` : votre domaine (ex: `mon-domaine.com` ou `links.mon-domaine.com`)
- `verified` : `false` (sera vérifié après configuration DNS)

## 🔧 Étape 2 : Configuration DNS chez OVH

### 2.1. Accéder au panneau DNS OVH

1. Connectez-vous à votre compte OVH
2. Allez dans **Domaines** > Votre domaine
3. Cliquez sur **Zone DNS**

### 2.2. Configuration selon votre architecture

#### Option A : Domaine principal (ex: `mon-domaine.com`)

Si vous voulez utiliser votre domaine principal :

**Type A** :
- **Sous-domaine** : `@` (ou laissez vide)
- **TTL** : 3600
- **Cible** : IP publique de votre serveur

**Type AAAA** (si IPv6) :
- **Sous-domaine** : `@`
- **TTL** : 3600
- **Cible** : IPv6 de votre serveur

#### Option B : Sous-domaine (ex: `links.mon-domaine.com`)

**Type A** :
- **Sous-domaine** : `links`
- **TTL** : 3600
- **Cible** : IP publique de votre serveur

**Type AAAA** (si IPv6) :
- **Sous-domaine** : `links`
- **TTL** : 3600
- **Cible** : IPv6 de votre serveur

### 2.3. Configuration HTTPS (Recommandé)

Pour activer HTTPS, vous avez deux options :

#### Option A : Reverse Proxy (Nginx/Traefik)

Configurez un reverse proxy avec Let's Encrypt :

```nginx
# /etc/nginx/sites-available/tracking
server {
    listen 80;
    server_name votre-domaine.com;

    location / {
        proxy_pass http://localhost:4100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Puis activez HTTPS avec Certbot :
```bash
sudo certbot --nginx -d votre-domaine.com
```

#### Option B : Cloudflare (Recommandé)

1. Ajoutez votre domaine à Cloudflare
2. Changez les nameservers chez OVH vers Cloudflare
3. Activez le proxy Cloudflare (orange cloud)
4. Cloudflare gère automatiquement HTTPS

## 🔧 Étape 3 : Vérifier le domaine

### 3.1. Vérification DNS

Attendez la propagation DNS (5-30 minutes), puis testez :

```bash
# Vérifier que le domaine pointe vers votre IP
dig votre-domaine.com +short
# ou
nslookup votre-domaine.com
```

### 3.2. Marquer le domaine comme vérifié

Une fois le DNS configuré et le domaine accessible :

```bash
# Via API
curl -X PATCH "http://localhost:4000/domains/DOMAIN_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "verified": true
  }'
```

Ou via Prisma Studio, mettez `verified` à `true`.

## 🔧 Étape 4 : Créer des liens avec votre domaine

Une fois le domaine vérifié, créez des liens :

```bash
curl -X POST "http://localhost:4000/links" \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "VOTRE_WORKSPACE_ID",
    "domainId": "VOTRE_DOMAIN_ID",
    "slug": "test",
    "targetUrl": "https://example.com"
  }'
```

Votre lien sera accessible sur : `https://votre-domaine.com/test`

## 🔧 Étape 5 : Configuration Production

### Variables d'environnement

Assurez-vous que votre `.env` contient :

```env
# Redirect service
REDIRECT_PORT=4100

# Si vous utilisez un reverse proxy, le port peut être différent
# Le service doit écouter sur 0.0.0.0 pour être accessible
```

### Démarrer le service redirect

```bash
# En production
pnpm --filter @tracking/redirect start

# Ou avec PM2
pm2 start "pnpm --filter @tracking/redirect start" --name tracking-redirect
```

### Firewall

Assurez-vous que le port 4100 (ou 80/443 si reverse proxy) est ouvert :

```bash
# UFW (Ubuntu)
sudo ufw allow 4100/tcp

# Ou pour HTTPS
sudo ufw allow 443/tcp
```

## 🧪 Test

1. **Test DNS** :
   ```bash
   curl -I http://votre-domaine.com/test
   ```

2. **Test HTTPS** (si configuré) :
   ```bash
   curl -I https://votre-domaine.com/test
   ```

3. **Vérifier la redirection** :
   - Le lien doit rediriger vers `targetUrl`
   - Un cookie `cursor_click_id` doit être créé
   - Un `ClickEvent` doit être enregistré dans la base

## 📝 Notes importantes

### Hostname dans le code

Le service redirect utilise `request.hostname` pour identifier le domaine. Cela fonctionne automatiquement avec :
- Domaine principal : `mon-domaine.com`
- Sous-domaines : `links.mon-domaine.com`, `go.mon-domaine.com`, etc.

### Multi-domaines

Vous pouvez avoir plusieurs domaines pour le même workspace :
- `mon-domaine.com`
- `links.mon-domaine.com`
- `go.mon-domaine.com`

Chaque domaine peut avoir ses propres liens avec le même slug.

### Sécurité

- ✅ Utilisez HTTPS en production
- ✅ Configurez `secure: true` pour les cookies (déjà fait)
- ✅ Utilisez un reverse proxy pour gérer SSL/TLS
- ✅ Configurez rate limiting si nécessaire

## 🐛 Dépannage

### Le domaine ne résout pas

1. Vérifiez la propagation DNS : https://dnschecker.org
2. Vérifiez que l'IP est correcte dans OVH
3. Attendez 30 minutes pour la propagation complète

### Erreur 404 "Link not found"

1. Vérifiez que le domaine est bien créé dans la base
2. Vérifiez que `host` correspond exactement au domaine utilisé
3. Vérifiez que le lien est bien associé au bon `domainId`

### HTTPS ne fonctionne pas

1. Vérifiez la configuration du reverse proxy
2. Vérifiez que le certificat SSL est valide
3. Vérifiez que le port 443 est ouvert

## 📚 Ressources

- [Documentation OVH DNS](https://docs.ovh.com/fr/domaines/editer-ma-zone-dns/)
- [Let's Encrypt](https://letsencrypt.org/)
- [Cloudflare](https://www.cloudflare.com/)


