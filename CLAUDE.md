# PROMPT CLAUDE CODE — TRS Kiosk V3 (corrections + toutes fonctionnalités)

## Contexte

App tablette standalone pour la saisie TRS et le suivi production en atelier.
Repo : `trs-kiosk` (sebmichonpro-max)
Même Supabase qu'AgroPilot-IA (projet `bijyotwyzqsfcxdyppng`, org `3766d1da-9c03-4818-b8e9-1e3315cb661e`).
Stack : Next.js 15 + Tailwind + Supabase JS client.

Le kiosk est l'outil de l'OPÉRATEUR. Il capture, il ne fait pas d'analyse.

---

## BUGS À CORRIGER EN PRIORITÉ

### Bug 1 — Les produits ne s'affichent pas par ligne

Le hook qui récupère les produits par ligne ne fonctionne pas.
Le fetch doit faire :

```sql
SELECT p.* FROM products p
INNER JOIN line_products lp ON lp.product_id = p.id
WHERE lp.line_id = $1
AND lp.organization_id = $2
```

Vérifier que :
- Le hook filtre bien par `line_id` sélectionnée
- La jointure `line_products → products` est correcte
- La RLS policy sur `line_products` autorise le SELECT pour `anon`

### Bug 2 — Couleurs incorrectes

Palette de couleurs à appliquer partout :
- Vert principal : `#2d5a3d` (header, boutons action)
- Fond page : `#f8f9fa`
- Cartes / panels : `#ffffff` avec border `#e5e7eb`
- Texte principal : `#1a1a1a`
- Texte secondaire : `#6b7280`
- TRS bon (≥85%) : `#22c55e`
- TRS moyen (60-84%) : `#f59e0b`
- TRS mauvais (<60%) : `#ef4444`
- Boutons primaires : fond `#2d5a3d`, texte `#ffffff`, hover `#1e3f2b`
- Bouton arrêt : fond `#ef4444`, texte `#ffffff`
- Bouton pause/changement : fond `#f59e0b`, texte `#1a1a1a`

---

## FONCTIONNALITÉS EXISTANTES À AMÉLIORER

### 1. Chrono arrêt en cours

Quand un arrêt est déclaré :
- Chrono en GROS au centre (format MM:SS puis HH:MM:SS après 1h)
- Fond écran passe en rouge semi-transparent
- Cause de l'arrêt affichée sous le chrono
- Bouton vert "Fin d'arrêt"
- Chrono calculé côté client depuis `production_stops.started_at`
- Fin d'arrêt → update `production_stops.ended_at` + `duration_seconds`

### 2. Déclaration d'arrêt

Modal avec grille de boutons causes d'arrêt (depuis `stop_causes`) :
- Groupées par catégorie : 🔴 Disponibilité, 🟡 Performance, 🔵 Qualité
- Champ commentaire optionnel (textarea, max 200 car.)
- Un tap sur la cause = arrêt déclaré immédiatement

### 3. Changement de série (SMED)

- Bouton "Changement produit" (icône 🔄) visible en permanence
- Modal : chrono SMED + sélecteur nouveau produit + bouton "Série prête"
- Insert dans `production_stops` avec cause `changement_serie`

### 4. Jauge TRS temps réel

- Jauge circulaire SVG
- TRS en gros au centre (ex: "78%")
- Couleur dynamique selon seuil
- Sous la jauge : 3 mini-jauges D / P / Q

### 5. RAZ Session / Clôture finale

- Bouton "Clôturer la session" (icône ⏹)
- Modal : résumé (durée, quantité, rebuts, TRS final) + commentaire
- Clôture : `production_sessions.ended_at = now()`, `status = 'completed'`
- Retour à la sélection ligne/produit

### 6. Alerte visuelle TRS bas

- TRS < 60% : bordure rouge clignotante (CSS pulse)
- TRS 60-70% : bordure orange fixe
- Désactivable par tap (revient après 10 min si toujours bas)

---

## NOUVELLES FONCTIONNALITÉS

### 7. Clôtures partielles / Checkpoints de production

L'opérateur fait des points de contrôle réguliers sans clôturer la session.

**Bouton "Point de contrôle" (icône 📊) :**
- Ouvre un modal avec numpad
- Champ "Bonnes pièces depuis dernier point"
- Champ "Rebuts depuis dernier point"
- Commentaire optionnel
- Bouton "Valider le point"

**Comportement :**
- Insert dans `production_checkpoints` (nouvelle table)
- Les quantités s'AJOUTENT au cumul de la session
- Après validation, afficher un résumé rapide : "Total : 452 bonnes, 10 rebuts, cadence : 302/h"
- La barre objectif se met à jour
- Le TRS se recalcule

**Historique des checkpoints visible sur le kiosk :**
- Derniers 5 checkpoints affichés en bas de l'écran
- Format : "14:30 → +50 bonnes, +2 rebuts | 14:15 → +48 bonnes, +1 rebut"

**À la clôture finale :**
- Le total de la session = somme de tous les checkpoints
- Pas de saisie de total nécessaire

### 8. Réception de messages / instructions

L'admin envoie des messages depuis AgroPilot → ils s'affichent sur les tablettes en temps réel.

**Affichage sur le kiosk :**
- Bannière en haut de l'écran, sous le header
- Fond jaune pour info, fond rouge pour urgent
- Texte du message + heure de réception
- Bouton "✕" pour marquer comme lu (la bannière disparaît)
- Les messages non lus restent affichés

**Fonctionnement technique :**
- Supabase Realtime sur la table `shop_floor_messages`
- Filtre : `target = 'all'` OU `target = 'trs'` OU `target_line_id = [ligne sélectionnée]`
- Au tap sur "✕" → update `is_read = true`

### 9. Objectif de production (poussé depuis AgroPilot)

L'objectif du jour est défini par l'admin dans AgroPilot, pas saisi par l'opérateur.

**Barre de progression en haut de l'écran :**
- Texte : "452 / 2000 barquettes"
- Barre qui se remplit en vert
- Quand atteint : barre vert vif + icône ✅
- Si pas d'objectif défini : la barre est masquée

**Source des données :**
- Table `daily_production_targets` (nouvelle table)
- Fetch au démarrage de la session : cherche un objectif pour cette ligne + ce produit + aujourd'hui
- Supabase Realtime pour détecter un changement d'objectif en cours de journée

### 10. Contrôles qualité en ligne

L'opérateur effectue des contrôles qualité directement depuis le kiosk.

**Bouton "Contrôle qualité" (icône 🔬) visible en permanence :**

Au tap → ouvre une page/modal plein écran avec :

#### a) Contrôle O2 (atmosphère modifiée)
- Champ "Taux O2 (%)" → numpad
- Heure auto-remplie (modifiable)
- Seuils visuels : vert si < 1%, orange si 1-2%, rouge si > 2% (seuils configurables depuis AgroPilot)

#### b) Contrôle pesée (20 barquettes)
- Titre : "Pesée aléatoire — 20 barquettes"
- Poids théorique affiché (depuis le produit en cours)
- 20 champs de poids empilés verticalement, numérotés 1 à 20
- Numpad intégré : tap sur un champ → numpad apparaît → saisie → passe au champ suivant automatiquement
- Calculs automatiques affichés en direct :
  - Moyenne
  - Min / Max
  - Écart-type
  - Nombre hors tolérance (tolérance = poids théorique ± X%, configurable)
- Code couleur sur chaque champ : vert si dans la tolérance, rouge si hors

#### c) Commentaire + photo (optionnel)
- Champ texte libre
- Pas de photo pour l'instant (complexe sur web)

#### d) Validation et impression
- Bouton "Valider le contrôle" → insert dans `quality_controls` + `quality_control_weights`
- Bouton "Imprimer la fiche" → génère une fiche formatée et ouvre `window.print()`

**Fiche imprimable (format A4) :**
```
┌─────────────────────────────────────────┐
│  FICHE DE CONTRÔLE QUALITÉ              │
│  Date : 09/08/2026    Heure : 14:32     │
│  Ligne : Ligne Bol                      │
│  Produit : BISTROT POULET               │
│  Session : #2026-08-09-001              │
├─────────────────────────────────────────┤
│  CONTRÔLE ATMOSPHÈRE                    │
│  Taux O2 : 0.8%  ✅ Conforme            │
├─────────────────────────────────────────┤
│  CONTRÔLE PESÉE (20 barquettes)         │
│  Poids théorique : 250g (±5%)           │
│                                         │
│  1. 248g ✅    11. 252g ✅              │
│  2. 251g ✅    12. 247g ✅              │
│  3. 245g ✅    13. 255g ✅              │
│  4. 262g ❌    14. 249g ✅              │
│  5. 250g ✅    15. 253g ✅              │
│  6. 248g ✅    16. 246g ✅              │
│  7. 251g ✅    17. 250g ✅              │
│  8. 253g ✅    18. 251g ✅              │
│  9. 249g ✅    19. 248g ✅              │
│  10. 250g ✅   20. 252g ✅              │
│                                         │
│  Moyenne : 250.4g                       │
│  Min : 245g  Max : 262g                 │
│  Écart-type : 3.8g                      │
│  Hors tolérance : 1/20                  │
├─────────────────────────────────────────┤
│  Commentaire : RAS                      │
│                                         │
│  Contrôleur : ________________          │
│  Signature  : ________________          │
└─────────────────────────────────────────┘
```

Les champs "Contrôleur" et "Signature" sont vides → remplis à la main après impression.

---

## LAYOUT TABLETTE MIS À JOUR (paysage)

```
┌──────────────────────────────────────────────────────────────┐
│  ⚠️ INSTRUCTION : Priorité Bistrot Poulet, client urgent  ✕ │  ← Bannière message (si message actif)
├──────────────────────────────────────────────────────────────┤
│  🕐 14:32:05   Ligne Bol — BISTROT POULET    🔄 🔬 📊      │  ← Header : horloge, ligne/produit, boutons action
├──────────────────────────────────────────────────────────────┤
│  [████████████░░░░░░░] 452 / 2000 barquettes                │  ← Barre objectif
├────────────────────────────┬─────────────────────────────────┤
│                            │                                 │
│    JAUGE TRS               │   Cumul bonnes : 452            │
│      78%                   │   Cumul rebuts : 12             │
│                            │   Durée : 3h42                  │
│  D:92%  P:85%  Q:97%      │   Cadence : 302/h               │
│                            │                                 │
├────────────────────────────┴─────────────────────────────────┤
│  Derniers checkpoints :                                      │
│  14:30 → +50 bonnes, +2 rebuts | 14:15 → +48, +1 | 14:00   │
├──────────────────────────────────────────────────────────────┤
│ [📊 CHECKPOINT] [🔴 ARRÊT] [🔬 QUALITÉ] [⏹ CLÔTURER]      │  ← Boutons action
└──────────────────────────────────────────────────────────────┘
```

---

## NOUVELLES TABLES SUPABASE À CRÉER

```sql
-- Checkpoints de production (clôtures partielles)
CREATE TABLE IF NOT EXISTS production_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  session_id uuid NOT NULL REFERENCES production_sessions(id) ON DELETE CASCADE,
  good_quantity integer NOT NULL DEFAULT 0,
  reject_quantity integer NOT NULL DEFAULT 0,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE production_checkpoints ENABLE ROW LEVEL SECURITY;

-- Messages / instructions atelier
CREATE TABLE IF NOT EXISTS shop_floor_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  message text NOT NULL,
  priority text NOT NULL DEFAULT 'info' CHECK (priority IN ('info', 'urgent')),
  target text NOT NULL DEFAULT 'all' CHECK (target IN ('all', 'trs', 'pointage')),
  target_line_id uuid REFERENCES production_lines(id),
  sent_by uuid REFERENCES profiles(id),
  is_read boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE shop_floor_messages ENABLE ROW LEVEL SECURITY;

-- Objectifs de production journaliers
CREATE TABLE IF NOT EXISTS daily_production_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  line_id uuid NOT NULL REFERENCES production_lines(id),
  product_id uuid NOT NULL REFERENCES products(id),
  target_date date NOT NULL DEFAULT CURRENT_DATE,
  target_quantity integer NOT NULL,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, line_id, product_id, target_date)
);
ALTER TABLE daily_production_targets ENABLE ROW LEVEL SECURITY;

-- Contrôles qualité
CREATE TABLE IF NOT EXISTS quality_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  session_id uuid NOT NULL REFERENCES production_sessions(id),
  line_id uuid NOT NULL REFERENCES production_lines(id),
  product_id uuid NOT NULL REFERENCES products(id),
  control_type text NOT NULL CHECK (control_type IN ('o2', 'weight', 'combined')),
  o2_level numeric(5,2),
  o2_conformity boolean,
  weight_average numeric(8,2),
  weight_min numeric(8,2),
  weight_max numeric(8,2),
  weight_std_dev numeric(8,2),
  weight_out_of_tolerance integer DEFAULT 0,
  theoretical_weight numeric(8,2),
  tolerance_percent numeric(5,2) DEFAULT 5.0,
  comment text,
  controlled_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE quality_controls ENABLE ROW LEVEL SECURITY;

-- Pesées individuelles (20 barquettes)
CREATE TABLE IF NOT EXISTS quality_control_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id uuid NOT NULL REFERENCES quality_controls(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position BETWEEN 1 AND 20),
  weight numeric(8,2) NOT NULL,
  is_conforming boolean NOT NULL DEFAULT true
);
ALTER TABLE quality_control_weights ENABLE ROW LEVEL SECURITY;

-- Colonnes à ajouter sur production_sessions si manquantes
ALTER TABLE production_sessions ADD COLUMN IF NOT EXISTS daily_target integer;
ALTER TABLE production_sessions ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled'));

-- Colonne poids théorique sur products si manquante
ALTER TABLE products ADD COLUMN IF NOT EXISTS theoretical_weight numeric(8,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_tolerance_percent numeric(5,2) DEFAULT 5.0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS o2_threshold_warning numeric(5,2) DEFAULT 1.0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS o2_threshold_critical numeric(5,2) DEFAULT 2.0;
```

### RLS Policies pour les nouvelles tables

```sql
-- Checkpoints
CREATE POLICY "kiosk_select_checkpoints" ON production_checkpoints
  FOR SELECT TO anon USING (organization_id = '3766d1da-9c03-4818-b8e9-1e3315cb661e'::uuid);
CREATE POLICY "kiosk_insert_checkpoints" ON production_checkpoints
  FOR INSERT TO anon WITH CHECK (organization_id = '3766d1da-9c03-4818-b8e9-1e3315cb661e'::uuid);

-- Messages
CREATE POLICY "kiosk_select_messages" ON shop_floor_messages
  FOR SELECT TO anon USING (organization_id = '3766d1da-9c03-4818-b8e9-1e3315cb661e'::uuid);
CREATE POLICY "kiosk_update_messages" ON shop_floor_messages
  FOR UPDATE TO anon USING (organization_id = '3766d1da-9c03-4818-b8e9-1e3315cb661e'::uuid);

-- Objectifs
CREATE POLICY "kiosk_select_targets" ON daily_production_targets
  FOR SELECT TO anon USING (organization_id = '3766d1da-9c03-4818-b8e9-1e3315cb661e'::uuid);

-- Contrôles qualité
CREATE POLICY "kiosk_select_qc" ON quality_controls
  FOR SELECT TO anon USING (organization_id = '3766d1da-9c03-4818-b8e9-1e3315cb661e'::uuid);
CREATE POLICY "kiosk_insert_qc" ON quality_controls
  FOR INSERT TO anon WITH CHECK (organization_id = '3766d1da-9c03-4818-b8e9-1e3315cb661e'::uuid);

-- Pesées
CREATE POLICY "kiosk_select_weights" ON quality_control_weights
  FOR SELECT TO anon USING (true);
CREATE POLICY "kiosk_insert_weights" ON quality_control_weights
  FOR INSERT TO anon WITH CHECK (true);
```

### Activer Realtime sur les nouvelles tables

Dans Supabase Dashboard → Database → Replication, activer :
- `shop_floor_messages`
- `daily_production_targets`
- `production_checkpoints`

---

## UX TABLETTE

- Optimisé paysage
- Boutons min 56px (gants)
- Police min 18px texte, 48px+ TRS et chrono
- Numpad avec gros boutons (70px) pour les saisies poids et quantités
- Pas de scroll horizontal
- Debounce 500ms sur les boutons
- Transitions rapides
- Impression via `window.print()` avec CSS `@media print` dédié (masque tout sauf la fiche qualité)

---

## CE QUI NE DOIT PAS ÊTRE DANS LE KIOSK

- ❌ Pareto / graphiques analytiques
- ❌ Export PDF (sauf fiche qualité pour impression)
- ❌ Historique des sessions passées
- ❌ Configuration (lignes, produits, causes, seuils)
- ❌ Comparaison entre lignes
- ❌ Admin / PIN
- ❌ Envoi de messages (seulement réception)
- ❌ Définition des objectifs (seulement affichage)
- ❌ Lien vers AgroPilot

---

## RÉSUMÉ

**Le kiosk TRS V3 = outil opérateur complet :**
- Démarrer/clôturer une session
- Checkpoints réguliers (clôtures partielles)
- Déclarer des arrêts avec chrono
- Changements de série (SMED)
- Contrôles qualité (O2 + pesée 20 barquettes + impression fiche)
- Recevoir les instructions de l'admin
- Voir l'objectif du jour et sa progression
- Feedback visuel permanent (jauge TRS, barre objectif, alertes)

**Tout le reste (analyse, Pareto, export, config, envoi messages, définition objectifs) est dans AgroPilot.**
