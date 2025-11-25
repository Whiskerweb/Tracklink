# 🌐 Votre IP Publique

## ✅ IP de votre serveur

**Votre IP publique est : `77.158.216.106`**

## 📋 Configuration OVH DNS

Utilisez cette IP pour configurer votre domaine `traaaction.com` chez OVH :

### Entrée Type A à créer/modifier :

- **Type** : `A`
- **Sous-domaine** : `@` (ou laissez vide)
- **TTL** : `3600`
- **Cible** : `77.158.216.106`

### Optionnel - Pour www :

- **Type** : `A`
- **Sous-domaine** : `www`
- **TTL** : `3600`
- **Cible** : `77.158.216.106`

## 🔧 Commandes utiles

### Obtenir l'IP à nouveau :

```bash
# Méthode 1 (recommandée)
curl -s https://api.ipify.org

# Méthode 2
curl -s https://checkip.amazonaws.com

# Script
./scripts/get-server-ip.sh
```

### Vérifier la résolution DNS (après configuration) :

```bash
dig traaaction.com +short
# Doit retourner : 77.158.216.106
```

## ⚠️ Note importante

Si vous êtes derrière un NAT ou un VPN, cette IP peut être différente de l'IP de votre machine locale. Assurez-vous que :

1. Votre serveur de production est accessible depuis Internet
2. Le port 4100 (ou 80/443 si reverse proxy) est ouvert
3. Le firewall autorise les connexions entrantes

## 🧪 Test de connectivité

Une fois DNS configuré, testez :

```bash
# Test HTTP
curl -I http://traaaction.com

# Test HTTPS (si configuré)
curl -I https://traaaction.com
```

---

**IP actuelle : `77.158.216.106`** ✅


