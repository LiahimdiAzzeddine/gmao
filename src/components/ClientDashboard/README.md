# Client Dashboard Components

Ce dossier contient tous les composants du dashboard client, refactorisés pour une meilleure maintenabilité.

## 📁 Structure

```
ClientDashboard/
├── types.ts                        # Types TypeScript partagés
├── MachineStatusDonutChart.tsx     # Diagramme donut machines par statut
├── MaintenanceActivityChart.tsx    # Graphique activité maintenance (7 jours)
├── InterventionValidationBar.tsx   # Barres de validation client/admin
├── OTNonTraitesChart.tsx          # Graphique OT non traités par type
├── index.ts                        # Export centralisé
└── README.md                       # Cette documentation
```

## 🎯 Composants

### `types.ts`
Définit tous les types TypeScript utilisés dans le dashboard client :
- `DailyActivity` : Activité quotidienne (OT créés, interventions terminées)
- `OTByType` : OT groupés par type (préventif, correctif, curatif)
- `ClientStats` : Statistiques complètes du client
- `emptyClientStats` : Valeurs par défaut

### `MachineStatusDonutChart.tsx`
**Props:** `{ stats: ClientStats }`

Affiche un diagramme en donut SVG montrant :
- 🟢 Machines en service
- 🔴 Machines en panne
- ⚪ Machines hors service

**Features:**
- Graphique SVG natif (pas de lib externe)
- Centre affiche le total
- Calcul automatique des pourcentages

### `MaintenanceActivityChart.tsx`
**Props:** `{ activity: DailyActivity[] }`

Graphique à barres doubles pour les 7 derniers jours :
- 🔴 Barres rouges : OT créés
- 🔵 Barres bleues : Interventions terminées

**Features:**
- Tooltips interactifs au survol
- Hauteurs normalisées dynamiquement
- Animations de transition

### `InterventionValidationBar.tsx`
**Props:** `{ label, value, color, maxValue }`

Barre verticale pour afficher les validations d'interventions.

**Features:**
- Hauteur proportionnelle au maxValue
- Couleur personnalisable
- Valeur affichée au centre

### `OTNonTraitesChart.tsx`
**Props:** `{ otByType: OTByType[] }`

Affiche les OT non traités groupés par type :
- Barres horizontales avec pourcentages
- Cartes récapitulatives en bas
- Couleurs par type

**Features:**
- 🔵 Préventif (bleu)
- 🟠 Correctif (orange)
- 🔴 Curatif (rouge)

## 📖 Utilisation

```typescript
import {
  MachineStatusDonutChart,
  MaintenanceActivityChart,
  InterventionValidationBar,
  OTNonTraitesChart,
  ClientStats,
  emptyClientStats
} from './ClientDashboard';

// Dans votre composant
<MachineStatusDonutChart stats={clientStats} />
<MaintenanceActivityChart activity={stats.activiteMaintenance} />
<OTNonTraitesChart otByType={stats.otNonTraitesParType} />
```

## 🎨 Design

### Couleurs
- **En service** : `#10b981` (Emerald 500)
- **En panne** : `#ef4444` (Red 500)
- **Hors service** : `#94a3b8` (Slate 400)
- **Préventif** : `#3b82f6` (Blue 500)
- **Correctif** : `#f59e0b` (Orange 500)
- **Curatif** : `#ef4444` (Red 500)

### Classes Tailwind
Tous les composants utilisent Tailwind CSS pour le styling avec :
- Responsive design (mobile-first)
- Animations de transition
- Tooltips interactifs

## 🔧 Maintenance

### Ajouter un nouveau composant
1. Créer le fichier dans `ClientDashboard/`
2. Ajouter les types nécessaires dans `types.ts`
3. Exporter dans `index.ts`
4. Importer dans `Dashboard.tsx`

### Modifier un composant
Les composants sont **indépendants** et peuvent être modifiés sans affecter les autres.

## ✅ Avantages de cette structure

- ✅ **Séparation des responsabilités** : Chaque composant a un rôle précis
- ✅ **Réutilisabilité** : Les composants peuvent être utilisés ailleurs
- ✅ **Maintenabilité** : Plus facile de localiser et corriger les bugs
- ✅ **Testabilité** : Chaque composant peut être testé individuellement
- ✅ **Lisibilité** : Fichiers plus petits et plus compréhensibles
