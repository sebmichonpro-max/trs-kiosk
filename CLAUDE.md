# PROMPT CLAUDE CODE — PROD'PULSE Kiosk (app tablette TRS)

## Objectif

Créer une app Next.js **séparée** et légère, dédiée uniquement à la saisie TRS sur tablette en production.
Elle se connecte à la **même base Supabase** qu'AgroPilot-IA (projet `bijyotwyzqsfcxdyppng`) et utilise les **mêmes tables PROD'PULSE**.
Les sessions de production saisies ici apparaissent en temps réel dans AgroPilot-IA côté PC (dashboard TRS).

**Aucun accès à AgroPilot n'est exposé.** L'app ne montre QUE l'interface de saisie TRS.

---

## Stack

- Next.js 15 (App Router)
- Tailwind CSS 4
- Supabase JS client (`@supabase/supabase-js`) — même projet, mêmes tables
- Déploiement : Vercel (nouveau projet, repo GitHub `trs-kiosk`)
- Pas de shadcn/ui → composants custom tactiles ultra simples pour perf tablette
- Icônes : Lucide React

---

## Variables d'environnement (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=https://bijyotwyzqsfcxdyppng.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<même clé anon qu'AgroPilot>
NEXT_PUBLIC_ORGANIZATION_ID=3766d1da-9c03-4818-b8e9-1e3315cb661e
```

---

## Tables Supabase existantes (NE PAS recréer)

Les tables suivantes existent déjà dans le schéma PROD'PULSE d'AgroPilot. L'app kiosk les utilise en lecture ET écriture via les RLS policies `anon`.

### Lecture seule (référentiels)

```sql
-- production_lines : lignes de production
-- Colonnes utiles : id, organization_id, name, hourly_cost_cents, is_active

-- products : produits
-- Colonnes utiles : id, organization_id, name, cycle_time_ms, unit_label, is_active

-- line_products : association ligne ↔ produit (N:N)
-- Colonnes utiles : line_id, product_id, cycle_time_override_ms

-- stop_causes : causes d'arrêt personnalisables
-- Colonnes utiles : id, organization_id, name, category ('availability'|'performance'|'quality'), icon, display_order, is_planned, is_active

-- trs_thresholds : seuils TRS
-- Colonnes utiles : organization_id, excellent_min, good_min, warning_min (en basis points, ex: 8500 = 85.00%)

-- opening_hours : horaires d'ouverture
-- Colonnes utiles : organization_id, line_id, day_of_week, start_time, end_time
```

### Lecture + écriture (données de production)

```sql
-- production_sessions : sessions de production
-- Colonnes : id, organization_id, line_id, product_id, started_at, ended_at,
--   qty_produced, qty_conforming, cycle_time_used_ms,
--   trs, availability, performance, quality, trs_level,
--   created_by, created_at, updated_at

-- production_stops : arrêts pendant une session
-- Colonnes : id, organization_id, session_id, cause_id,
--   started_at, ended_at, duration_seconds, notes, created_at
```

---

## Migration SQL requise (RLS pour accès anon kiosk)

**À exécuter dans Supabase SQL Editor :**

```sql
-- RLS policies pour accès anon (kiosk tablette)
-- Même pattern que Point'Age Kiosk

-- Lecture référentiels
CREATE POLICY "kiosk_read_lines" ON production_lines
  FOR SELECT TO anon
  USING (organization_id = '3766d1da-9c03-4818-b8e9-1e3315cb661e' AND is_active = true AND deleted_at IS NULL);

CREATE POLICY "kiosk_read_products" ON products
  FOR SELECT TO anon
  USING (organization_id = '3766d1da-9c03-4818-b8e9-1e3315cb661e' AND is_active = true AND deleted_at IS NULL);

CREATE POLICY "kiosk_read_line_products" ON line_products
  FOR SELECT TO anon
  USING (organization_id = '3766d1da-9c03-4818-b8e9-1e3315cb661e');

CREATE POLICY "kiosk_read_stop_causes" ON stop_causes
  FOR SELECT TO anon
  USING (organization_id = '3766d1da-9c03-4818-b8e9-1e3315cb661e' AND is_active = true AND deleted_at IS NULL);

CREATE POLICY "kiosk_read_thresholds" ON trs_thresholds
  FOR SELECT TO anon
  USING (organization_id = '3766d1da-9c03-4818-b8e9-1e3315cb661e');

CREATE POLICY "kiosk_read_opening_hours" ON opening_hours
  FOR SELECT TO anon
  USING (organization_id = '3766d1da-9c03-4818-b8e9-1e3315cb661e');

-- Lecture + écriture sessions
CREATE POLICY "kiosk_read_sessions" ON production_sessions
  FOR SELECT TO anon
  USING (organization_id = '3766d1da-9c03-4818-b8e9-1e3315cb661e');

CREATE POLICY "kiosk_insert_sessions" ON production_sessions
  FOR INSERT TO anon
  WITH CHECK (organization_id = '3766d1da-9c03-4818-b8e9-1e3315cb661e');

CREATE POLICY "kiosk_update_sessions" ON production_sessions
  FOR UPDATE TO anon
  USING (organization_id = '3766d1da-9c03-4818-b8e9-1e3315cb661e');

-- Lecture + écriture arrêts
CREATE POLICY "kiosk_read_stops" ON production_stops
  FOR SELECT TO anon
  USING (organization_id = '3766d1da-9c03-4818-b8e9-1e3315cb661e');

CREATE POLICY "kiosk_insert_stops" ON production_stops
  FOR INSERT TO anon
  WITH CHECK (organization_id = '3766d1da-9c03-4818-b8e9-1e3315cb661e');

CREATE POLICY "kiosk_update_stops" ON production_stops
  FOR UPDATE TO anon
  USING (organization_id = '3766d1da-9c03-4818-b8e9-1e3315cb661e');
```

---

## Structure du projet

```
trs-kiosk/
├── CLAUDE.md              ← ce fichier
├── .env.local
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── src/
│   ├── app/
│   │   ├── layout.tsx         ← layout global, fonte Inter, thème dark
│   │   ├── page.tsx           ← page d'accueil (sélection ligne)
│   │   ├── globals.css
│   │   └── session/
│   │       └── page.tsx       ← écran session active (saisie TRS)
│   ├── components/
│   │   ├── Header.tsx         ← logo PROD'PULSE Kiosk + horloge + ligne active
│   │   ├── LineSelector.tsx   ← grille de sélection des lignes
│   │   ├── ProductSelector.tsx ← sélection produit (filtrée par ligne)
│   │   ├── SessionPanel.tsx   ← panneau session en cours (chrono, compteurs)
│   │   ├── StopModal.tsx      ← modale de saisie d'arrêt (causes + durée)
│   │   ├── NumPad.tsx         ← pavé numérique tactile (grosses touches)
│   │   ├── TRSGauges.tsx      ← jauges circulaires Dispo/Perf/Qualité/TRS
│   │   ├── StopHistory.tsx    ← liste des arrêts de la session
│   │   ├── CloseSessionModal.tsx ← modale de clôture (saisie quantités)
│   │   └── ConfirmScreen.tsx  ← écran de confirmation post-validation
│   ├── lib/
│   │   ├── supabase.ts        ← client Supabase (createClient avec anon key)
│   │   ├── trs-calc.ts        ← fonctions de calcul TRS
│   │   └── types.ts           ← types TypeScript des tables
│   └── hooks/
│       ├── useLines.ts        ← fetch lignes actives
│       ├── useProducts.ts     ← fetch produits par ligne
│       ├── useStopCauses.ts   ← fetch causes d'arrêt
│       ├── useSession.ts      ← gestion session (CRUD + temps réel)
│       └── useThresholds.ts   ← fetch seuils TRS
```

---

## Fonctionnalités détaillées

### 1. Page d'accueil — Sélection ligne (`/`)

- **Header** : logo "PROD'PULSE" + horloge temps réel (gros format HH:MM:SS) + date en français
- **Grille de lignes** : fetch `production_lines` actives, affichage en grosses cartes tactiles
  - Chaque carte : nom de la ligne, icône usine, indicateur "session en cours" si une session est ouverte (check `production_sessions WHERE line_id = X AND ended_at IS NULL`)
  - Si session en cours → tap = reprend la session existante
  - Sinon → tap = lance le flow de nouvelle session
- **Design** : fond sombre (#0B1120), cartes avec bordures subtiles, couleur primaire bleu (#2563EB)
- **Tout est tactile** : boutons minimum 56px de hauteur, espacement généreux

### 2. Nouvelle session — Sélection produit

Après sélection de la ligne, l'opérateur choisit le produit :

- Fetch `products` liés à la ligne via `line_products`
- Affichage en grille (2 colonnes), chaque carte montre : nom produit, unité, cadence théorique
- La cadence affichée tient compte du `cycle_time_override_ms` de `line_products` si défini
- Bouton retour pour changer de ligne

### 3. Session active (`/session?line=UUID&product=UUID`)

Cet écran est le cœur de l'app. Layout en **2 colonnes sur tablette** :

**Colonne gauche (60%) — Contrôle session :**

- **Chrono** : temps écoulé depuis `started_at`, affiché en gros (HH:MM:SS)
- **Statut** : badge "EN PRODUCTION" (vert) ou "EN ARRÊT" (rouge clignotant)
- **Bouton ARRÊT** (gros, rouge) : ouvre la modale de saisie d'arrêt
  - Si un arrêt est en cours (rouge) → le bouton devient "REPRISE" (vert) : ferme l'arrêt en cours (`ended_at = now()`, calcule `duration_seconds`)
- **Bouton CLÔTURER** (en bas) : ouvre la modale de clôture de session
- **Infos session** : ligne, produit, équipe, heure de début

**Colonne droite (40%) — TRS temps réel :**

- **4 jauges circulaires** : Disponibilité, Performance, Qualité, TRS global
  - Calculées en temps réel pendant la session
  - Disponibilité = (temps total - temps arrêts) / temps total
  - Performance = ne peut pas être calculée avant la clôture (afficher "—" ou estimation si on veut)
  - Qualité = idem, besoin des quantités
  - TRS = Dispo seule tant que session ouverte
- **Liste des arrêts** de la session : cause, durée, notes, bouton supprimer
- **Pareto mini** : barre horizontale montrant la répartition des arrêts par cause

### 4. Modale de saisie d'arrêt (`StopModal`)

- **Grille de causes** : fetch `stop_causes` actives, triées par `display_order`
  - Chaque cause = grosse carte avec icône + nom + catégorie (badge couleur)
  - Catégories : Disponibilité (bleu), Performance (violet), Qualité (vert)
- **2 modes de saisie** :
  - **Temps réel** (par défaut) : l'opérateur tape la cause, l'arrêt commence (`started_at = now()`, `ended_at = NULL`), il tape REPRISE quand c'est fini
  - **Saisie manuelle** : l'opérateur entre la durée via le NumPad (en minutes), utile pour les arrêts passés oubliés
- **Champ notes** : textarea optionnel (ex: "moteur ligne 2 HS")
- **Bouton Valider** : insère dans `production_stops`

### 5. Modale de clôture session (`CloseSessionModal`)

Quand l'opérateur clôture la session :

1. **Vérifier** qu'aucun arrêt n'est en cours (sinon forcer la clôture de l'arrêt d'abord)
2. **Saisie quantités** via NumPad :
   - "Pièces produites totales" → `qty_produced`
   - "Pièces non conformes" → on en déduit `qty_conforming = qty_produced - non_conformes`
3. **Récapitulatif pré-validation** :
   - Durée totale session
   - Temps d'arrêt total
   - Quantités saisies
   - **Calcul TRS final** avec les 4 jauges
4. **Bouton VALIDER** : update `production_sessions` avec `ended_at`, quantités, et calculs TRS

### 6. Calcul TRS (`trs-calc.ts`)

```typescript
interface TRSInput {
  sessionStartedAt: Date;
  sessionEndedAt: Date;
  totalStopSeconds: number;    // somme des duration_seconds des stops
  plannedStopSeconds: number;  // stops où cause.is_planned = true
  qtyProduced: number;
  qtyConforming: number;
  cycleTimeMs: number;         // temps de cycle théorique (ou override)
}

interface TRSResult {
  availability: number;   // 0-1
  performance: number;    // 0-1
  quality: number;        // 0-1
  trs: number;            // 0-1
  trsLevel: 'excellent' | 'good' | 'warning' | 'critical';
}

function calculateTRS(input: TRSInput, thresholds: TRSThresholds): TRSResult {
  const totalSeconds = (input.sessionEndedAt.getTime() - input.sessionStartedAt.getTime()) / 1000;
  const requiredTime = totalSeconds - input.plannedStopSeconds; // temps requis = total - arrêts planifiés
  const operatingTime = requiredTime - (input.totalStopSeconds - input.plannedStopSeconds); // temps de fonctionnement

  const availability = requiredTime > 0 ? operatingTime / requiredTime : 0;

  const theoreticalQty = (operatingTime * 1000) / input.cycleTimeMs; // pièces théoriques
  const performance = theoreticalQty > 0 ? input.qtyProduced / theoreticalQty : 0;

  const quality = input.qtyProduced > 0 ? input.qtyConforming / input.qtyProduced : 0;

  const trs = availability * performance * quality;
  const trsBasisPoints = Math.round(trs * 10000);

  let trsLevel: TRSResult['trsLevel'] = 'critical';
  if (trsBasisPoints >= thresholds.excellent_min) trsLevel = 'excellent';
  else if (trsBasisPoints >= thresholds.good_min) trsLevel = 'good';
  else if (trsBasisPoints >= thresholds.warning_min) trsLevel = 'warning';

  return {
    availability: Math.min(availability, 1),
    performance: Math.min(performance, 1),
    quality: Math.min(quality, 1),
    trs: Math.min(trs, 1),
    trsLevel,
  };
}
```

### 7. Écran de confirmation (`ConfirmScreen`)

Après validation :
- ✅ gros check vert
- Résumé : ligne, produit, durée, TRS final avec jauge
- Bouton "Nouveau pointage" → retour à la page d'accueil

---

## Design — Directives strictes

### Palette
- **Background principal** : `#0B1120` (dark navy)
- **Cards** : `#151D2E` avec border `#1E293B`
- **Primaire** : `#2563EB` (bleu)
- **Succès** : `#22C55E` (vert)
- **Warning** : `#F59E0B` (orange)
- **Danger** : `#EF4444` (rouge)
- **Texte principal** : `#E2E8F0`
- **Texte secondaire** : `#94A3B8`

### Typographie
- Font : Inter (Google Fonts)
- Chiffres : `font-variant-numeric: tabular-nums` partout
- Tailles : horloge 48px, compteurs 36px, boutons 17px, labels 13px

### Tactile
- **Minimum touch target** : 56px hauteur
- **Espacement boutons** : 12px minimum
- **Border-radius cartes** : 20px
- **Border-radius boutons** : 16px
- **Padding cartes** : 24px
- **NumPad** : touches 72×58px minimum

### Animations
- Transitions douces sur les jauges (0.8s ease)
- Clignotement status "EN ARRÊT" (CSS animation pulse)
- Aucune animation bloquante

---

## Temps réel (Supabase Realtime)

L'app utilise Supabase Realtime pour que si deux tablettes sont ouvertes sur la même ligne, les données se synchronisent :

```typescript
// Écouter les changements sur production_stops pour la session en cours
supabase
  .channel('stops-realtime')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'production_stops',
    filter: `session_id=eq.${sessionId}`
  }, (payload) => {
    // Refresh la liste des arrêts
  })
  .subscribe();
```

---

## Sécurité

- Accès via `anon` key uniquement (pas d'auth utilisateur sur le kiosk)
- RLS filtre tout par `organization_id` hardcodé
- Pas d'accès aux autres tables AgroPilot (RH, qualité, etc.)
- Pas de lien vers AgroPilot visible

---

## Déploiement Vercel

1. Créer repo GitHub : `sebmichonpro-max/trs-kiosk`
2. Connecter sur Vercel → nouveau projet
3. Variables d'environnement : les 3 du `.env.local`
4. URL résultante : `trs-kiosk.vercel.app`

---

## Étapes d'implémentation (ordre recommandé)

1. **Init projet** : `npx create-next-app@latest trs-kiosk` avec App Router + Tailwind + TypeScript
2. **Supabase client** : `lib/supabase.ts` avec les env vars
3. **Types** : `lib/types.ts` avec les interfaces des tables
4. **Hooks** : `useLines`, `useProducts`, `useStopCauses`, `useThresholds`
5. **Page accueil** : Header + LineSelector + détection sessions en cours
6. **ProductSelector** : grille produits filtrés par ligne
7. **SessionPanel** : chrono + statut + boutons arrêt/reprise
8. **StopModal** : sélection cause + NumPad durée + notes
9. **TRS Gauges** : composant jauge circulaire SVG réutilisable
10. **CloseSessionModal** : saisie quantités + calcul TRS final + validation
11. **ConfirmScreen** : résumé post-validation
12. **Realtime** : abonnement Supabase pour sync multi-tablettes
13. **Polish** : animations, responsive tablette, tests

---

## Ce que cette app NE FAIT PAS

- Pas de login / authentification
- Pas d'accès au dashboard TRS (c'est dans AgroPilot)
- Pas de configuration (lignes, produits, causes → tout se fait dans AgroPilot)
- Pas d'export Excel/PDF (c'est dans AgroPilot)
- Pas de lien vers AgroPilot visible
- Pas de shadcn/ui (trop lourd pour kiosk)
