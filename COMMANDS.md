# 📝 Commandes utiles

## 🗄️ Base de données (Prisma)

```bash
# Générer le client Prisma
pnpm db:generate

# Créer une nouvelle migration
pnpm db:migrate dev --name [nom-migration]

# Appliquer les migrations (production)
pnpm db:migrate deploy

# Ouvrir Prisma Studio (interface graphique)
pnpm db:studio

# Créer des données de test (workspace + domain)
pnpm db:seed
```

## 🚀 Développement

```bash
# Démarrer tous les services en mode watch
pnpm dev

# Démarrer uniquement l'API
pnpm --filter @tracking/api dev

# Démarrer uniquement le redirect service
pnpm --filter @tracking/redirect dev
```

## 🧪 Tests E2E

```bash
# 1. Créer un lien
pnpm test:e2e:create-link

# 2. Simuler un clic sur un lien
pnpm test:e2e:click [slug]

# 3. Tracker un lead
pnpm test:e2e:lead [clickId] [customerId]

# 4. Tracker une vente
pnpm test:e2e:sale [clickId] [customerId] [amount]
```

## 📦 Build & Lint

```bash
# Build tous les packages
pnpm build

# Linter tous les packages
pnpm lint

# Formater le code
pnpm format
```

## 🔧 Initialisation complète (première fois)

```bash
# 1. Installer les dépendances
pnpm install

# 2. Configurer .env (voir SUPABASE_SETUP.md)
cp .env.example .env
# Éditer .env avec vos credentials Supabase

# 3. Générer le client Prisma
pnpm db:generate

# 4. Créer la première migration
cd packages/shared
pnpm prisma:migrate dev --name init

# 5. Créer des données de test
cd ../..
pnpm db:seed

# 6. Démarrer les services
pnpm dev
```


