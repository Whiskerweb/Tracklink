# ⚡ Configuration Rapide Domaine OVH

## 🎯 Étapes Rapides

### 1. Créer le domaine dans la base

```bash
# Récupérez votre workspace ID depuis Prisma Studio ou la base
pnpm domain:create VOTRE_WORKSPACE_ID votre-domaine.com
```

**Exemple** :
```bash
pnpm domain:create clx00000000000000000000000 mon-domaine.com
```

### 2. Configurer DNS chez OVH

1. **OVH Manager** > **Domaines** > Votre domaine > **Zone DNS**
2. **Ajouter une entrée** :
   - **Type** : `A`
   - **Sous-domaine** : `@` (pour domaine principal) ou `links` (pour sous-domaine)
   - **TTL** : `3600`
   - **Cible** : `VOTRE_IP_PUBLIQUE` (IP de votre serveur)

### 3. Attendre la propagation DNS (5-30 min)

Vérifiez avec :
```bash
dig votre-domaine.com +short
# ou
nslookup votre-domaine.com
```

### 4. Marquer le domaine comme vérifié

```bash
# Récupérez le domainId depuis la réponse de l'étape 1
curl -X PATCH "http://localhost:4000/domains/DOMAIN_ID" \
  -H "Content-Type: application/json" \
  -d '{"verified": true}'
```

### 5. Créer un lien de test

```bash
pnpm test:e2e:create-link
# Utilisez le domainId créé à l'étape 1
```

### 6. Tester

```bash
# Si en local avec port
curl -I http://votre-domaine.com:4100/test

# Si avec reverse proxy (HTTPS)
curl -I https://votre-domaine.com/test
```

## 📝 Notes

- Le système détecte automatiquement le domaine via `request.hostname`
- Vous pouvez avoir plusieurs domaines pour le même workspace
- Les sous-domaines fonctionnent automatiquement (ex: `links.mon-domaine.com`)

## 🔧 Configuration Production

Pour la production complète avec HTTPS, voir `DEPLOYMENT.md`.


