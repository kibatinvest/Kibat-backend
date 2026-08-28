# 🌱 Kibat Invest

Plateforme d'investissement participatif multi-domaines — Côte d'Ivoire 🇨🇮 & Afrique de l'Ouest.

## 🗺️ Domaines d'activité
Agriculture 🌾 | Élevage 🐔 | Transformation alimentaire 🏭 | Transport 🚚
Transit & Logistique 🚢 | Immobilier 🏗️ | Commerce 🏪 | Pêche 🐟 | Énergie ☀️ | Artisanat 🧵

## 💳 Moyens de paiement
Orange Money CI 🟠 | Wave 🌊 | MTN MoMo CI 🟡 | Moov Money CI 🔵 | Carte bancaire 💳

## 🧩 Architecture
src/
├── prisma/      → la base de données (utilisateurs, projets, transactions)
├── auth/        → connexion par SMS + tickets JWT sécurisés
├── projects/    → les projets (création, collecte, investissement sous séquestre)
├── payments/    → dépôts et retraits mobile money + cartes
└── kelas/       → l'IA coach qui conseille les investisseurs

## 🚀 Démarrer
1. npm install
2. Copier .env.example en .env et remplir les clés
3. npx prisma generate && npx prisma db push
4. npm run build && npm start

## 🔒 Sécurité
- Mots de passe hashés (bcrypt)
- Tickets JWT pour accéder aux routes protégées
- Argent investi placé SOUS SÉQUESTRE jusqu'à la fin de la collecte
- Anti-spam (Throttler) sur toutes les routes
