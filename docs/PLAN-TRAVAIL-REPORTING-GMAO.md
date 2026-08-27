# Plan de travail — Reporting d'activité GMAO

## 1. Objet du document

Ce document présente le plan de travail proposé pour intégrer dans l'application GMAO un module de reporting capable de produire des indicateurs, tableaux et graphiques similaires au rapport Excel actuel.

L'objectif est de conserver le fonctionnement opérationnel existant de l'application et de construire le reporting à partir des données déjà enregistrées dans Supabase/PostgreSQL.

Ce document sert de base de discussion et de validation avec le client avant le démarrage des développements.

Le modèle fonctionnel associé est disponible dans [DIAGRAMME-CLASSES-RAPPORT-ACTIVITE.md](./DIAGRAMME-CLASSES-RAPPORT-ACTIVITE.md).

---

## 2. Objectifs du projet

Le futur module devra permettre de :

- suivre l'activité de maintenance par période ;
- comparer les interventions préventives, correctives et curatives ;
- analyser les interventions par client, site, lot, machine et technicien ;
- identifier les pannes et anomalies les plus fréquentes ;
- mesurer les délais de prise en charge et de résolution ;
- suivre le respect du planning de maintenance préventive ;
- présenter les faits marquants de la période ;
- générer un rapport professionnel au format PDF ;
- exporter les données détaillées au format Excel ;
- conserver la confidentialité des données de chaque client.

---

## 3. Situation actuelle

### 3.1 Données déjà disponibles

L'application possède déjà les principaux objets nécessaires :

- clients ;
- sites ;
- bâtiments, secteurs, domaines et postes techniques ;
- lots ;
- machines et équipements ;
- utilisateurs et techniciens ;
- demandes d'intervention ;
- ordres de travail ;
- interventions ;
- plans de maintenance ;
- gammes de maintenance ;
- étapes de gamme ;
- photos avant et après intervention ;
- pièces remplacées ;
- validation administrateur ;
- validation client ;
- plans d'action et modes de défaillance.

### 3.2 Limites du reporting actuel

La page actuelle de reporting présente principalement des compteurs généraux. Elle ne permet pas encore de :

- choisir une période complète ;
- croiser plusieurs filtres ;
- analyser les tendances mensuelles ;
- calculer le respect des délais contractuels ;
- afficher les principales familles de pannes ;
- enregistrer les faits marquants ;
- produire automatiquement un rapport complet similaire au fichier Excel.

### 3.3 Principe retenu

Les résultats ne seront pas saisis manuellement dans des tableaux mensuels comme dans Excel. Ils seront calculés automatiquement à partir des demandes, OT et interventions enregistrés dans la base de données.

---

## 4. Périmètre fonctionnel proposé

### 4.1 Filtres du rapport

Le module proposera les filtres suivants :

- client ;
- site ;
- bâtiment ou poste technique ;
- lot ;
- machine ;
- technicien ;
- type d'OT ;
- priorité ;
- résultat de l'intervention ;
- statut de validation ;
- date de début et date de fin ;
- type de période : mensuelle, trimestrielle, quadrimestrielle ou annuelle.

Les filtres devront s'appliquer simultanément aux cartes, graphiques, tableaux et exports.

### 4.2 Indicateurs principaux

Le tableau de bord devra présenter au minimum :

- nombre total de demandes ;
- nombre total d'OT ;
- nombre total d'interventions ;
- nombre d'interventions validées ;
- taux de validation client ;
- nombre d'OT préventifs prévus ;
- nombre d'OT préventifs réalisés ;
- taux de réalisation du préventif ;
- nombre d'interventions correctives ;
- nombre d'anomalies ayant généré un OT correctif ;
- durée moyenne des interventions ;
- nombre de machines opérationnelles, dégradées et hors service ;
- taux de traitement dans les délais, si les règles SLA sont validées.

### 4.3 Graphiques proposés

Le module pourra contenir les graphiques suivants :

1. Évolution mensuelle du nombre d'interventions.
2. Répartition des interventions par lot.
3. Répartition préventif/correctif/curatif.
4. Répartition des résultats : réussi, partiel et échec.
5. État des machines après intervention.
6. Top 5 des familles de problèmes.
7. Top 5 des modes de défaillance.
8. Interventions par technicien.
9. Durée moyenne par lot ou technicien.
10. OT préventifs prévus contre réalisés.
11. Respect des délais de traitement.
12. Machines ayant généré le plus d'interventions.

La liste finale sera validée avec le client afin de limiter le tableau de bord aux indicateurs réellement utiles.

### 4.4 Tableaux détaillés

Des tableaux complémentaires pourront présenter :

- les demandes reçues pendant la période ;
- les interventions réalisées ;
- les OT non terminés ;
- les OT annulés ;
- les OT replanifiés ;
- les machines présentant plusieurs anomalies ;
- les actions correctives recommandées ;
- les interventions hors délai ;
- les validations client en attente.

### 4.5 Faits marquants

Une interface permettra à un administrateur d'enregistrer les faits importants de la période :

- date ;
- client et site ;
- domaine ou lot ;
- titre ;
- description ;
- niveau d'importance ;
- intervention associée, si nécessaire ;
- photo ou document facultatif.

Ces faits marquants pourront être insérés automatiquement dans le rapport PDF.

---

## 5. Évolutions de la base de données

### 5.1 Classification des problèmes

Le catalogue de familles et modes de défaillance existe déjà. Il faudra le relier aux demandes ou aux interventions.

Champs proposés :

```text
problem_family_id
failure_mode_id
```

Le choix recommandé est d'enregistrer la classification sur la demande initiale, puis de la rendre accessible depuis l'OT et l'intervention.

### 5.2 Gestion des délais de service

Une table de règles de délai est proposée :

```text
sla_policies
- id
- client_id
- priorite
- type_intervention
- delai_prise_en_charge_minutes
- delai_resolution_minutes
- actif
- created_at
- updated_at
```

Champs complémentaires sur la demande ou l'OT :

```text
pris_en_charge_le
date_limite_prise_en_charge
date_limite_resolution
cloture_le
```

Les délais ne pourront être développés qu'après validation des règles métier par le client.

### 5.3 Gestion des faits marquants

Table proposée :

```text
faits_marquants
- id
- client_id
- site_id
- domaine_id
- intervention_id
- date_evenement
- titre
- description
- niveau_importance
- document_url
- created_by
- created_at
- updated_at
```

### 5.4 Périodes et rapports enregistrés

Cette partie est optionnelle. Elle est utile si le client souhaite figer officiellement un rapport afin que ses chiffres ne changent plus après sa publication.

```text
report_periods
- id
- client_id
- nom
- type_periode
- date_debut
- date_fin
- statut
- commentaire_synthese
- created_by
- created_at
```

Un rapport peut avoir les statuts `brouillon`, `validé` et `publié`.

### 5.5 Contrats de maintenance

Le contrat doit devenir un objet métier de la GMAO lorsqu'il sert à déterminer :

- le client concerné ;
- la durée de la prestation ;
- les sites, lots et équipements couverts ;
- les prestations incluses et exclues ;
- les fréquences de maintenance préventive ;
- les niveaux de priorité ;
- les délais contractuels de prise en charge et de résolution ;
- les indicateurs à présenter au client ;
- les documents contractuels associés.

Le projet contient d'anciennes tables `contracts`, mais elles sont liées au modèle de devis et facturation de l'ancienne application de gestion. Elles utilisent notamment un autre référentiel client. Il est déconseillé de les connecter directement à la GMAO actuelle.

Pour éviter de casser l'existant, une table distincte est proposée :

```text
maintenance_contracts
- id (UUID)
- client_id
- numero_contrat
- nom
- description
- date_debut
- date_fin
- statut
- type_couverture
- heures_ouvrables
- reconduction
- document_url
- created_by
- created_at
- updated_at
```

Valeurs possibles pour `statut` :

```text
brouillon
actif
suspendu
expire
resilie
```

Valeurs possibles pour `type_couverture` :

```text
forfaitaire
regie
mixte
```

Le périmètre du contrat doit être représenté par des tables de liaison afin qu'un contrat puisse couvrir plusieurs sites et plusieurs lots :

```text
maintenance_contract_sites
- contract_id
- site_id

maintenance_contract_lots
- contract_id
- lot_id
```

Une liaison facultative aux machines peut être ajoutée si certains équipements d'un même site sont exclus du contrat :

```text
maintenance_contract_machines
- contract_id
- machine_id
- inclus
- commentaire
```

La politique SLA doit être rattachée au contrat plutôt que directement au client lorsque plusieurs contrats peuvent avoir des engagements différents :

```text
sla_policies
- id
- contract_id
- priorite
- type_intervention
- delai_prise_en_charge_minutes
- delai_resolution_minutes
- calendrier_service
- actif
```

Les demandes, OT et plans de maintenance devront conserver la référence du contrat applicable :

```text
demande_intervention.contract_id
ordres_travail.contract_id
plans_maintenance.contract_id
```

La référence doit être enregistrée au moment de la création de l'objet. Elle ne doit pas être uniquement recalculée à partir du contrat actuellement actif, sinon l'historique d'un ancien rapport pourrait changer après un renouvellement de contrat.

Le contrat permettra notamment de produire les indicateurs suivants :

- demandes et interventions par contrat ;
- taux de respect des SLA contractuels ;
- taux de réalisation du préventif contractuel ;
- interventions hors périmètre ;
- consommation par site et par lot ;
- équipements couverts et non couverts ;
- échéances et contrats arrivant à expiration ;
- comparaison entre les engagements et les réalisations.

La gestion financière détaillée — devis, factures, règlements et marges — doit rester hors du périmètre de cette évolution si elle est déjà gérée dans l'application séparée. La GMAO pourra conserver uniquement une référence externe vers cette application, par exemple `external_contract_id`, sans dupliquer la facturation.

---

## 6. Corrections préalables

Avant de développer les nouveaux graphiques, les points suivants doivent être corrigés :

1. Uniformiser les types d'OT : éviter de mélanger `préventif`, `préventive`, `preventif` et `preventive`.
2. Uniformiser les statuts avec une liste de valeurs commune à la base et à l'interface.
3. Corriger le calcul des machines actives, qui utilise actuellement un champ `statut` alors que les machines utilisent principalement le champ `etat`.
4. Centraliser les types TypeScript `Machine`, `Client`, `OT` et `Intervention` afin d'éviter des définitions contradictoires.
5. Vérifier que chaque intervention possède une machine, un OT, un technicien et des dates cohérentes.
6. Vérifier les anciennes données avant de calculer les premiers indicateurs.
7. Ajouter les index PostgreSQL nécessaires sur les dates et clés utilisées par les filtres.

---

## 7. Architecture technique proposée

### 7.1 Calcul des indicateurs

Les indicateurs seront calculés dans PostgreSQL avec des vues ou fonctions RPC dédiées.

Exemples :

```text
report_interventions_by_month
report_interventions_by_lot
report_failure_modes
report_preventive_completion
report_sla_compliance
report_machine_availability
report_technician_performance
```

Cette approche évite de télécharger toutes les interventions dans le navigateur et améliore les performances.

### 7.2 Sécurité

Les règles RLS devront garantir que :

- l'administrateur peut consulter tous les clients autorisés ;
- le client voit uniquement ses machines et ses données ;
- le technicien voit uniquement les données nécessaires à son travail ;
- les vues de reporting ne permettent pas de contourner les règles existantes.

### 7.3 Interface

Le module sera ajouté à la page d'administration existante. Il utilisera la bibliothèque de graphiques déjà présente dans le projet afin d'éviter une dépendance supplémentaire.

### 7.4 Exports

Deux exports sont proposés :

- PDF : document de présentation avec page de garde, indicateurs, graphiques, commentaires et annexes ;
- Excel : données détaillées filtrées, destinées aux analyses complémentaires.

---

## 8. Phases de réalisation

### Phase 1 — Cadrage fonctionnel

Travaux :

- réunion avec le client ;
- validation des indicateurs ;
- validation des périodes ;
- validation des règles SLA ;
- sélection des graphiques ;
- choix du contenu PDF ;
- validation des droits d'accès.

Livrables :

- périmètre validé ;
- liste définitive des KPI ;
- maquette fonctionnelle ;
- règles de calcul documentées.

Estimation indicative : 1 à 2 jours.

### Phase 2 — Audit et fiabilisation des données

Travaux :

- audit des demandes, OT et interventions ;
- détection des valeurs incohérentes ;
- uniformisation des types et statuts ;
- correction des requêtes de statistiques existantes ;
- identification des données historiques incomplètes.

Livrables :

- rapport de qualité des données ;
- scripts de correction validés ;
- dictionnaire des statuts et types.

Estimation indicative : 2 à 4 jours, selon la qualité des anciennes données.

### Phase 3 — Évolution de la base

Travaux :

- création des champs de classification ;
- création des objets SLA si validés ;
- création des contrats de maintenance et de leur périmètre si validés ;
- rattachement des demandes, OT et plans au contrat applicable ;
- création des faits marquants ;
- création facultative des périodes de rapport ;
- ajout des index ;
- mise en place des politiques RLS.

Livrables :

- migrations SQL ;
- politiques de sécurité ;
- documentation du modèle de données.

Estimation indicative : 3 à 6 jours si la gestion des contrats est incluse, sinon 2 à 4 jours.

### Phase 4 — Services de reporting

Travaux :

- développement des vues et RPC ;
- calcul des KPI ;
- regroupements par mois, client, site, lot, machine et technicien ;
- contrôle des résultats par comparaison avec un échantillon Excel ;
- optimisation des requêtes.

Livrables :

- fonctions de reporting ;
- résultats de comparaison ;
- tests des calculs.

Estimation indicative : 4 à 7 jours.

### Phase 5 — Dashboard et graphiques

Travaux :

- création de la barre de filtres ;
- création des cartes KPI ;
- création des graphiques retenus ;
- création des tableaux détaillés ;
- gestion du chargement, des erreurs et de l'absence de données ;
- adaptation ordinateur, tablette et mobile.

Livrables :

- dashboard administrateur ;
- vue client limitée à ses données, si validée ;
- graphiques interactifs.

Estimation indicative : 5 à 8 jours.

### Phase 6 — Génération des rapports

Travaux :

- conception du modèle PDF ;
- insertion des indicateurs et graphiques ;
- ajout des faits marquants ;
- ajout des commentaires de synthèse ;
- génération des annexes ;
- export Excel détaillé.

Livrables :

- rapport PDF ;
- export Excel ;
- règles de nommage et d'archivage.

Estimation indicative : 4 à 7 jours.

### Phase 7 — Recette et mise en production

Travaux :

- tests avec plusieurs clients et périodes ;
- contrôle des droits ;
- comparaison avec les chiffres attendus ;
- correction des écarts ;
- sauvegarde avant déploiement ;
- mise en production ;
- formation courte des utilisateurs.

Livrables :

- procès-verbal de recette ;
- version déployée ;
- guide utilisateur ;
- procédure de sauvegarde et retour arrière.

Estimation indicative : 2 à 4 jours.

### Estimation globale indicative

L'ensemble représente environ **21 à 38 jours de travail** lorsque la gestion des contrats de maintenance est incluse, selon :

- le nombre final de graphiques ;
- la qualité des données historiques ;
- la complexité des règles SLA ;
- le niveau de fidélité demandé par rapport au document Excel ;
- la nécessité ou non d'un processus de validation et publication des rapports.
- la complexité du périmètre contractuel et des règles SLA.

Cette estimation doit être ajustée après la phase de cadrage.

---

## 9. Critères de recette proposés

Le module pourra être considéré comme conforme lorsque :

- tous les filtres validés fonctionnent ensemble ;
- les chiffres correspondent aux données de la base ;
- un même filtre produit les mêmes résultats dans les KPI, graphiques et exports ;
- les calculs sont vérifiés sur une période de référence ;
- un client ne peut pas consulter les données d'un autre client ;
- le rapport PDF est lisible et correctement paginé ;
- l'export Excel contient les données détaillées attendues ;
- le chargement reste acceptable sur une période annuelle ;
- l'interface fonctionne sur ordinateur et tablette ;
- aucune fonctionnalité actuelle de la GMAO n'est dégradée.

---

## 10. Décisions attendues du client

Les points suivants doivent être validés avant le développement :

1. Quels graphiques sont obligatoires ?
2. Le rapport est-il mensuel, trimestriel, quadrimestriel, annuel ou configurable ?
3. Faut-il produire un rapport global et un rapport par client ?
4. Les clients peuvent-ils télécharger eux-mêmes leurs rapports ?
5. Quels sont les délais SLA selon la priorité et le type d'intervention ?
6. Quelle date marque officiellement la clôture d'une demande ?
7. Qui peut créer et modifier les faits marquants ?
8. Un rapport publié doit-il être figé ou toujours recalculé ?
9. Faut-il intégrer les devis et travaux dans la GMAO malgré la séparation de l'application de gestion ?
10. Quel modèle graphique et quelle charte visuelle doivent être utilisés pour le PDF ?
11. Quelles annexes doivent apparaître dans le rapport final ?
12. Combien d'années de données historiques doivent être reprises ?
13. Un client peut-il posséder plusieurs contrats actifs en même temps ?
14. Le périmètre d'un contrat est-il défini par site, lot, machine ou combinaison de ces éléments ?
15. Les SLA varient-ils selon le contrat, la priorité, le lot ou les heures ouvrables ?
16. Comment traiter une intervention réalisée hors du périmètre contractuel ?
17. Faut-il seulement référencer le contrat financier géré dans l'autre application ou synchroniser certaines informations ?

---

## 11. Risques et points d'attention

- Les anciennes données peuvent ne pas contenir toutes les dates nécessaires aux calculs SLA.
- Les variantes de statuts et types peuvent fausser les statistiques tant qu'elles ne sont pas normalisées.
- Les chiffres du fichier Excel peuvent contenir des saisies ou corrections manuelles impossibles à reproduire automatiquement.
- Un rapport trop volumineux peut devenir difficile à lire et lent à générer.
- La reprise des devis et contrats doit rester séparée si ces fonctions appartiennent désormais à une autre application.
- La coexistence de plusieurs contrats actifs nécessite une règle claire pour sélectionner le contrat applicable à une demande ou un OT.
- Une modification ou un renouvellement de contrat ne doit pas modifier rétroactivement les anciens rapports.
- Les calculs doivent être réalisés côté base de données pour éviter de charger toutes les interventions dans le navigateur.
- Les vues et fonctions de reporting doivent impérativement respecter les règles RLS.

---

## 12. Proposition de première version

Pour réduire les risques, une première version peut contenir uniquement :

- filtres client, site, lot, technicien et période ;
- huit KPI principaux ;
- six graphiques ;
- top des pannes ;
- suivi préventif prévu/réalisé ;
- faits marquants ;
- export PDF ;
- export Excel.

Les SLA, les rapports figés et les analyses financières pourraient être ajoutés dans une seconde version après validation de la première.

---

## 13. Résultat attendu

À la fin du projet, les responsables pourront sélectionner une période et un client, visualiser immédiatement les indicateurs, analyser les écarts, puis générer un rapport professionnel sans recopier manuellement les données dans Excel.

L'application GMAO restera la source principale des données, tandis que les exports PDF et Excel serviront à la communication, à l'archivage et aux réunions de suivi.
