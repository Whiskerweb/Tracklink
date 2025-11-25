# 🔧 Configuration DNS OVH pour traaaction.com

## 📋 Instructions étape par étape

### 1. Obtenir l'IP de votre serveur

```bash
# Sur votre serveur de production
curl ifconfig.me
```

Ou utilisez le script :
```bash
./scripts/get-server-ip.sh
```

Notez cette IP publique.

### 2. Configuration dans OVH Manager

1. **Connectez-vous** : https://www.ovh.com/manager/
2. **Allez dans** : **Domaines** (menu de gauche)
3. **Sélectionnez** : `traaaction.com`
4. **Cliquez sur** : **Zone DNS** (onglet)

### 3. Ajouter/Modifier l'entrée Type A

#### Pour le domaine principal (`traaaction.com`)

**Si l'entrée existe déjà** :
- Cliquez sur l'entrée Type A avec sous-domaine `@`
- Modifiez la **Cible** avec votre IP publique
- Cliquez sur **Valider**

**Si l'entrée n'existe pas** :
- Cliquez sur **Ajouter une entrée**
- Remplissez :
  - **Type** : `A`
  - **Sous-domaine** : `@` (ou laissez vide)
  - **TTL** : `3600` (ou laissez la valeur par défaut)
  - **Cible** : `VOTRE_IP_PUBLIQUE`
- Cliquez sur **Suivant** puis **Confirmer**

#### Pour www (`www.traaaction.com`) - Optionnel mais recommandé

- **Type** : `A`
- **Sous-domaine** : `www`
- **TTL** : `3600`
- **Cible** : `VOTRE_IP_PUBLIQUE` (même IP)

### 4. Vérifier la propagation DNS

Attendez **5 à 30 minutes** puis testez :

```bash
# Vérifier la résolution DNS
dig traaaction.com +short
# Doit retourner votre IP publique

# Ou avec nslookup
nslookup traaaction.com
```

**Outils en ligne** :
- https://dnschecker.org/#A/traaaction.com
- https://www.whatsmydns.net/#A/traaaction.com

### 5. Tester l'accès

Une fois la propagation terminée :

```bash
# Test HTTP
curl -I http://traaaction.com

# Test HTTPS (si configuré)
curl -I https://traaaction.com
```

## 🔒 Configuration HTTPS (Recommandé)

### Option A : Nginx + Let's Encrypt

```bash
# Installer
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx

# Configuration Nginx
sudo nano /etc/nginx/sites-available/traaaction
```

Contenu :

```nginx
server {
    listen 80;
    server_name traaaction.com www.traaaction.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name traaaction.com www.traaaction.com;

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

1. Créez un compte Cloudflare
2. Ajoutez `traaaction.com` à Cloudflare
3. Changez les **nameservers** chez OVH vers ceux de Cloudflare
4. Activez le **proxy Cloudflare** (orange cloud)
5. HTTPS automatique activé

## ✅ Checklist

- [ ] IP publique obtenue
- [ ] Entrée Type A créée/modifiée chez OVH
- [ ] Propagation DNS vérifiée (5-30 min)
- [ ] Test HTTP fonctionnel
- [ ] HTTPS configuré (Nginx ou Cloudflare)
- [ ] Test HTTPS fonctionnel
- [ ] Domaine créé dans la base via script
- [ ] Test de création de lien fonctionnel

## 🐛 Dépannage

### Le domaine ne résout pas

1. Vérifiez que l'IP est correcte dans OVH
2. Attendez 30 minutes maximum
3. Vérifiez avec plusieurs outils : https://dnschecker.org

### Erreur "This site can't be reached"

1. Vérifiez que votre serveur écoute sur le port 4100
2. Vérifiez le firewall : `sudo ufw status`
3. Vérifiez que le service redirect tourne : `pm2 status`

### HTTPS ne fonctionne pas

1. Vérifiez la configuration Nginx : `sudo nginx -t`
2. Vérifiez le certificat : `sudo certbot certificates`
3. Vérifiez les logs : `sudo tail -f /var/log/nginx/error.log`

---

**Une fois configuré, tous vos liens seront sur traaaction.com ! 🎉**


