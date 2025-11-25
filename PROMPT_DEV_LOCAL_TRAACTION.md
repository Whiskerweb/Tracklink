# 🎯 PROMPT POUR DÉVELOPPEUR - Configuration Dev Local avec traaaction.com

## 📋 OBJECTIF

Permettre de tester l'application en développement local en utilisant le domaine `traaaction.com` au lieu de `localhost`.

## ✅ C'EST POSSIBLE - Explication Simple

**Pourquoi c'est possible :**
- On peut configurer le DNS local pour que `traaaction.com` pointe vers `127.0.0.1`
- Les services peuvent écouter sur `traaaction.com` en local
- Les liens seront créés avec le domaine `traaaction.com` et fonctionneront en local

**Avantages :**
- ✅ Test dans un environnement proche de la production
- ✅ Les liens créés fonctionnent directement avec le vrai domaine
- ✅ Pas besoin de fallback localhost dans le redirect
- ✅ Test des cookies et domaines comme en production

---

## 🔧 MODIFICATIONS NÉCESSAIRES

### 1. Configuration DNS Local (à faire manuellement)

L'utilisateur devra modifier son fichier `/etc/hosts` pour ajouter :
```
127.0.0.1 traaaction.com
127.0.0.1 www.traaaction.com
```

### 2. Configuration des Services

#### A. Service Redirect (apps/redirect/src/index.ts)

**Problème actuel :**
- Le redirect cherche les liens par `host` exact
- En local, si on accède via `traaaction.com`, il faut que ça fonctionne

**Solution :**
- Le code actuel devrait déjà fonctionner si le domaine est bien configuré
- Vérifier que le redirect accepte `traaaction.com` comme host valide
- S'assurer que les liens sont créés avec le domaine `traaaction.com` (déjà le cas via DEFAULT_DOMAIN)

#### B. Service API (apps/api/src/routes/links.ts)

**État actuel :**
- Les liens sont créés avec `DEFAULT_DOMAIN = "traaaction.com"` ✅
- C'est déjà correct, pas de modification nécessaire

**Vérification :**
- S'assurer que `env.DEFAULT_DOMAIN` est bien utilisé partout
- Vérifier que le domaine `traaaction.com` existe bien en DB pour le workspace

#### C. Dashboard (dashboard-test.html)

**Modification nécessaire :**
- Changer l'URL de redirect par défaut de `http://localhost:4100` vers `http://traaaction.com:4100`
- Ou mieux : détecter automatiquement le domaine depuis `window.location.hostname`

**Code à modifier :**
```javascript
// Actuellement :
const redirectUrl = 'http://localhost:4100';

// Devrait être :
const redirectUrl = window.location.protocol + '//' + window.location.hostname + ':4100';
// Ou simplement utiliser le hostname actuel
```

---

## 📝 CHECKLIST POUR LE DÉVELOPPEUR

### Étape 1 : Vérifier la Configuration Actuelle

- [ ] Vérifier que `DEFAULT_DOMAIN="traaaction.com"` dans `.env`
- [ ] Vérifier que le domaine `traaaction.com` existe en DB pour le workspace
- [ ] Vérifier que les liens sont créés avec le bon domaine

### Étape 2 : Modifier le Dashboard

- [ ] Modifier `dashboard-test.html` pour utiliser `traaaction.com` au lieu de `localhost`
- [ ] Utiliser `window.location.hostname` pour détecter automatiquement le domaine
- [ ] Tester que les URLs générées utilisent `traaaction.com`

### Étape 3 : Vérifier le Redirect

- [ ] Vérifier que le redirect fonctionne avec `traaaction.com` comme host
- [ ] Tester qu'un lien créé avec domaine `traaaction.com` fonctionne quand on accède via `traaaction.com:4100`
- [ ] Supprimer le fallback localhost si plus nécessaire (ou le garder pour compatibilité)

### Étape 4 : Documentation

- [ ] Créer un fichier `SETUP_LOCAL_DOMAIN.md` avec les instructions pour modifier `/etc/hosts`
- [ ] Expliquer comment tester que tout fonctionne

---

## 🧪 TESTS À EFFECTUER

### Test 1 : Configuration DNS
```bash
# Vérifier que traaaction.com pointe vers localhost
ping traaaction.com
# Devrait retourner 127.0.0.1
```

### Test 2 : Création de Lien
1. Accéder au dashboard via `http://traaaction.com:3000/dashboard-test.html`
2. Créer un lien
3. Vérifier que le lien généré est `http://traaaction.com:4100/[slug]`

### Test 3 : Redirection
1. Cliquer sur "Tester" dans le dashboard
2. Vérifier que la redirection fonctionne
3. Vérifier que le cookie est créé avec le bon domaine

### Test 4 : Tracking
1. Initialiser le tracking
2. Simuler un lead
3. Simuler une sale
4. Vérifier que tout fonctionne comme avant

---

## 🔍 POINTS D'ATTENTION

1. **Ports** : Les services doivent toujours écouter sur les mêmes ports (4000, 4100, 3000)
2. **Cookies** : Les cookies doivent être créés avec le bon domaine (`traaaction.com`)
3. **CORS** : Vérifier que les requêtes CORS fonctionnent avec le nouveau domaine
4. **HTTPS** : En local, on utilisera HTTP, mais en production ce sera HTTPS

---

## 📋 FICHIERS À MODIFIER

1. **dashboard-test.html**
   - Ligne avec `redirectUrl` : utiliser `window.location.hostname` au lieu de `localhost`

2. **apps/redirect/src/index.ts** (si nécessaire)
   - Vérifier que le matching de domaine fonctionne correctement
   - Le code actuel devrait déjà fonctionner

3. **Documentation**
   - Créer `SETUP_LOCAL_DOMAIN.md` avec instructions pour `/etc/hosts`

---

## ✅ RÉSULTAT ATTENDU

Après les modifications :
- ✅ Le dashboard est accessible via `http://traaaction.com:3000/dashboard-test.html`
- ✅ Les liens créés sont `http://traaaction.com:4100/[slug]`
- ✅ Les redirections fonctionnent correctement
- ✅ Le tracking fonctionne comme avant
- ✅ Les cookies sont créés avec le domaine `traaaction.com`

---

## 🚨 NOTES IMPORTANTES

1. **Modification /etc/hosts** : L'utilisateur doit le faire manuellement (nécessite droits admin)
2. **Compatibilité** : Garder le fallback localhost pour compatibilité si nécessaire
3. **Production** : Ces modifications n'affectent pas la production, c'est juste pour le dev local

---

**Date de création** : 2025-11-24  
**Priorité** : Moyenne (amélioration UX dev, pas bloquant)



