# 🎯 Tracking Platform

Plateforme de tracking et d'affiliation inspirée de [Dub](https://dub.co).

## 📦 Structure du monorepo

```
tracking/
├── apps/
│   ├── api/          # API Fastify (création de liens, tracking)
│   └── redirect/     # Service de redirection (résolution slug → targetUrl)
├── packages/
│   ├── shared/       # Code partagé (Prisma client, types, constantes)
│   ├── tracking-sdk/ # SDK browser générique
│   └── react-sdk/    # SDK React
└── scripts/          # Scripts E2E de test
```

## 🚀 Quick Start

### 1. Installation

```bash
pnpm install
```

### 2. Configuration Supabase

Suivez le guide détaillé dans [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) :

1. Créer un projet Supabase
2. Récupérer `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
3. Copier `.env.example` vers `.env` et remplir les valeurs
4. Générer les secrets (`CLICK_COOKIE_SECRET`, `HASH_SALT`)

### 3. Initialiser la base de données

```bash
# Générer le client Prisma
pnpm --filter @tracking/shared prisma:generate

# Créer la première migration
cd packages/shared
pnpm prisma:migrate dev --name init
```

### 4. Démarrer les services

```bash
# Terminal 1: API
pnpm --filter @tracking/api dev

# Terminal 2: Redirect service
pnpm --filter @tracking/redirect dev
```

### 5. Tests E2E

```bash
# Créer un lien
pnpm tsx scripts/create-link.ts

# Simuler un clic
pnpm tsx scripts/simulate-click.ts [slug]

# Tracker un lead
pnpm tsx scripts/track-lead.ts [clickId] [customerId]

# Tracker une vente
pnpm tsx scripts/track-sale.ts [clickId] [customerId] [amount]
```

## 📋 Roadmap

### ✅ Phase 1 : Tracking (en cours)

- [x] Scaffolding monorepo
- [x] Schéma Prisma (workspaces, domains, links, events)
- [x] API de création de liens
- [x] Service de redirection avec tracking de clics
- [x] Endpoints `/track/lead` et `/track/sale`
- [x] SDK browser minimal
- [x] Intégration Supabase
- [ ] Tests unitaires & intégration
- [ ] SDK React complet
- [ ] Intégration Shopify

### 🔜 Phase 2 : Partenaires

- [ ] CRUD Partenaires
- [ ] Attribution automatique (partner_id sur les events)
- [ ] Analytics partenaires (clics, leads, ventes)
- [ ] Calcul de commissions
- [ ] Dashboard embarqué (`<PartnerDashboard />`)

## 🛠️ Commandes utiles

```bash
# Développement
pnpm dev                    # Démarrer tous les services
pnpm --filter @tracking/api dev
pnpm --filter @tracking/redirect dev

# Base de données
pnpm --filter @tracking/shared prisma:generate
pnpm --filter @tracking/shared prisma:migrate dev
pnpm --filter @tracking/shared prisma:studio

# Build
pnpm build

# Lint
pnpm lint
```

## 📚 Documentation

- [Setup Supabase](./SUPABASE_SETUP.md) - Guide d'initialisation Supabase
- [Domain Setup](./DOMAIN_SETUP.md) - Configuration domaine OVH
- [Deployment](./DEPLOYMENT.md) - Guide de déploiement production
- [Quick Domain Setup](./QUICK_DOMAIN_SETUP.md) - Configuration rapide domaine

## 🔒 Sécurité & RGPD

- IP et User-Agent sont hashés avant stockage
- Cookies signés pour le tracking
- Support de l'anonymisation des données utilisateur
- Pas de logs de données sensibles

## 📝 License

Private - Tous droits réservés
