# 🚀 Setup Supabase pour le projet Tracking

Ce guide vous explique comment connecter le projet à Supabase et initialiser la base de données.

## 📋 Prérequis

1. Un compte Supabase (https://supabase.com)
2. Un nouveau projet Supabase créé
3. Node.js 18+ et pnpm installés

## 🔧 Étape 1 : Récupérer les credentials Supabase

### 1.1. DATABASE_URL et DIRECT_URL

Supabase utilise deux types de connexions :

**1. DATABASE_URL (Connection Pooling)** - Pour l'application
- Port **6543** avec `pgbouncer=true`
- Utilisé par l'API et le redirect service
- Meilleure performance pour les requêtes fréquentes

**2. DIRECT_URL (Connexion directe)** - Pour les migrations Prisma
- Port **5432** (connexion directe)
- Utilisé uniquement par Prisma migrate
- Nécessaire car pgbouncer ne supporte pas certaines opérations de migration

**Comment récupérer :**

1. Allez dans votre projet Supabase Dashboard
2. **Project Settings** > **Database**
3. Dans la section **Connection string**, vous verrez :
   - **Connection pooling** (port 6543) → `DATABASE_URL`
   - **Direct connection** (port 5432) → `DIRECT_URL`

**Exemple :**
```env
# Connection pooling (pour l'application)
DATABASE_URL="postgresql://postgres.dwexipiunzmtdgkiwofd:[PASSWORD]@aws-1-eu-central-2.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Connexion directe (pour les migrations)
DIRECT_URL="postgresql://postgres.dwexipiunzmtdgkiwofd:[PASSWORD]@aws-1-eu-central-2.pooler.supabase.com:5432/postgres"
```

### 1.2. SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

1. Toujours dans **Project Settings** > **API**
2. Copiez :
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ gardez-la secrète !)

## 🔧 Étape 2 : Configurer le fichier .env

1. Copiez `.env.example` vers `.env` :
   ```bash
   cp .env.example .env
   ```

2. Remplissez les valeurs récupérées depuis Supabase :
   ```bash
   # Éditez .env avec vos valeurs
   DATABASE_URL="postgresql://postgres.dwexipiunzmtdgkiwofd:[PASSWORD]@aws-1-eu-central-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.dwexipiunzmtdgkiwofd:[PASSWORD]@aws-1-eu-central-2.pooler.supabase.com:5432/postgres"
   SUPABASE_URL="https://..."
   SUPABASE_ANON_KEY="..."
   SUPABASE_SERVICE_ROLE_KEY="..."
   ```

3. Générez les secrets :
   ```bash
   # Générer CLICK_COOKIE_SECRET
   openssl rand -base64 32
   
   # Générer HASH_SALT
   openssl rand -base64 24
   ```

## 🔧 Étape 3 : Installer les dépendances

```bash
pnpm install
```

## 🔧 Étape 4 : Générer le client Prisma

Le schéma Prisma est dans `packages/shared/prisma/schema.prisma`.

```bash
# Générer le client Prisma
cd packages/shared
pnpm prisma:generate
```

Ou depuis la racine :
```bash
pnpm --filter @tracking/shared prisma:generate
```

## 🔧 Étape 5 : Créer la première migration

```bash
cd packages/shared
pnpm prisma:migrate dev --name init
```

Cette commande va :
- Créer le dossier `prisma/migrations/`
- Appliquer le schéma à votre base Supabase via `DIRECT_URL` (connexion directe)
- Générer automatiquement le client Prisma

**Note importante :** Prisma utilise automatiquement `DIRECT_URL` pour les migrations car le connection pooling (pgbouncer) ne supporte pas certaines opérations de migration. L'application utilise `DATABASE_URL` (pooling) pour toutes les requêtes normales.

**Note :** Si vous préférez appliquer manuellement le schéma SQL, vous pouvez utiliser :
```bash
pnpm prisma db push
```

## 🔧 Étape 6 : Vérifier la connexion

### Option A : Prisma Studio (recommandé)

```bash
cd packages/shared
pnpm prisma:studio
```

Ouvrez http://localhost:5555 dans votre navigateur. Vous devriez voir toutes vos tables.

### Option B : Test de connexion

```bash
# Démarrer l'API (vérifie la connexion au démarrage)
pnpm --filter @tracking/api dev
```

## 🔧 Étape 7 : Créer des données de test (optionnel)

Pour tester les scripts E2E, vous devez créer un Workspace et un Domain :

```sql
-- Via Prisma Studio ou directement dans Supabase SQL Editor

-- 1. Créer un Workspace
INSERT INTO "Workspace" (id, name) 
VALUES ('clx00000000000000000000000', 'Test Workspace');

-- 2. Créer un Domain
INSERT INTO "Domain" (id, "workspaceId", host, verified) 
VALUES ('clx00000000000000000000001', 'clx00000000000000000000000', 'localhost', true);
```

Ou utilisez Prisma Studio pour créer ces entrées via l'interface.

## ✅ Vérification finale

1. ✅ `.env` configuré avec les bonnes valeurs
2. ✅ Client Prisma généré
3. ✅ Migration appliquée (tables créées dans Supabase)
4. ✅ Prisma Studio accessible
5. ✅ API démarre sans erreur

## 🧪 Tests E2E

Une fois la DB initialisée, vous pouvez exécuter les scripts de test :

```bash
# 1. Créer un lien
pnpm tsx scripts/create-link.ts

# 2. Simuler un clic
pnpm tsx scripts/simulate-click.ts [slug]

# 3. Tracker un lead
pnpm tsx scripts/track-lead.ts [clickId] [customerId]

# 4. Tracker une vente
pnpm tsx scripts/track-sale.ts [clickId] [customerId] [amount]
```

## 📚 Ressources

- [Documentation Supabase](https://supabase.com/docs)
- [Documentation Prisma](https://www.prisma.io/docs)
- [Prisma + Supabase Guide](https://www.prisma.io/docs/guides/database/using-prisma-with-supabase)

## 🐛 Dépannage

### Erreur : "Can't reach database server"

- Vérifiez que `DATABASE_URL` (port 6543) et `DIRECT_URL` (port 5432) sont corrects
- Vérifiez que `pgbouncer=true` est présent dans `DATABASE_URL`
- Vérifiez que votre IP est autorisée dans Supabase (Settings > Database > Connection Pooling)
- Pour les migrations, Prisma utilise `DIRECT_URL` automatiquement

### Erreur : "Schema validation failed"

- Vérifiez que toutes les variables d'environnement sont définies
- Vérifiez les longueurs minimales (CLICK_COOKIE_SECRET ≥ 32, HASH_SALT ≥ 16)

### Erreur : "Migration failed"

- Vérifiez que `DIRECT_URL` est correct (port 5432, pas 6543)
- Vérifiez que la base est vide ou que vous acceptez de réinitialiser
- Utilisez `prisma db push` pour un reset complet (⚠️ supprime les données)
- Les migrations nécessitent une connexion directe (pas de pooling)

