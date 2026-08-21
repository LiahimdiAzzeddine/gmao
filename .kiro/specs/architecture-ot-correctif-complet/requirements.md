# Document d'Exigences - Architecture Complète des OT Correctifs

## Introduction

Ce document définit les exigences pour l'architecture complète du système de gestion des ordres de travail (OT) correctifs avec le nouveau statut "clôturé_avec_anomalie". Le système permet de détecter les non-conformités lors des interventions, de créer automatiquement des OT correctifs, et d'assurer une traçabilité complète entre les interventions sources et les OT correctifs générés.

La Phase 1 (interface de détection) est déjà complétée. Ce document couvre les Phases 2 à 5 : migrations base de données, logique de création, formulaire de demande, et affichage avec navigation.

## Glossaire

- **OT**: Ordre de Travail - Document planifiant une intervention de maintenance
- **OT_Correctif**: Ordre de travail créé suite à la détection de non-conformités
- **OT_Parent**: Ordre de travail initial qui a généré un OT correctif
- **Intervention_Source**: Intervention ayant détecté les non-conformités
- **Non_Conformité**: Étape de gamme avec statut "Action corrective requise"
- **Système_Base_Données**: Système de gestion de base de données PostgreSQL/Supabase
- **Système_Interface**: Interface utilisateur React/TypeScript
- **Étape_Non_Conforme**: Étape de gamme nécessitant une action corrective
- **Statut_OT**: État actuel d'un ordre de travail (prévu, en_cours, terminé, annulé, clôturé_avec_anomalie)

## Exigences

### Exigence 1: Extension du Statut des Ordres de Travail

**User Story:** En tant qu'administrateur système, je veux que les ordres de travail puissent avoir le statut "clôturé_avec_anomalie", afin de distinguer les OT terminés avec des non-conformités détectées.

#### Critères d'Acceptation

1. THE Système_Base_Données SHALL ajouter le statut "clôturé_avec_anomalie" à la contrainte CHECK de la colonne statut dans la table ordres_travail
2. THE Système_Base_Données SHALL maintenir les statuts existants (prévu, en_cours, terminé, annulé) dans la contrainte CHECK
3. WHEN une migration est exécutée, THE Système_Base_Données SHALL préserver toutes les données existantes sans perte
4. THE Système_Base_Données SHALL permettre la mise à jour du statut d'un OT vers "clôturé_avec_anomalie"

### Exigence 2: Traçabilité vers l'Intervention Source

**User Story:** En tant qu'administrateur, je veux que chaque OT correctif soit lié à l'intervention qui a détecté les non-conformités, afin de maintenir une traçabilité complète.

#### Critères d'Acceptation

1. THE Système_Base_Données SHALL ajouter une colonne intervention_source_id de type UUID dans la table ordres_travail
2. THE Système_Base_Données SHALL créer une contrainte de clé étrangère entre intervention_source_id et interventions.id
3. THE Système_Base_Données SHALL permettre des valeurs NULL pour intervention_source_id (pour les OT non correctifs)
4. WHEN un OT correctif est créé, THE Système_Interface SHALL enregistrer l'ID de l'intervention source dans intervention_source_id

### Exigence 3: Stockage des Étapes Non-Conformes

**User Story:** En tant qu'administrateur, je veux que les étapes non-conformes soient stockées de manière persistante, afin de pouvoir les consulter et les traiter ultérieurement.

#### Critères d'Acceptation

1. THE Système_Base_Données SHALL créer une table etapes_non_conformes avec les colonnes suivantes:
   - id (UUID, clé primaire)
   - ordre_travail_id (UUID, clé étrangère vers ordres_travail)
   - etape_gamme_id (UUID, clé étrangère vers etapes_gamme)
   - statut (TEXT avec valeur "Action corrective requise")
   - commentaire_technicien (TEXT nullable)
   - ordre (INTEGER)
   - created_at (TIMESTAMP avec valeur par défaut now())
2. THE Système_Base_Données SHALL créer un index sur ordre_travail_id pour optimiser les requêtes
3. THE Système_Base_Données SHALL créer une contrainte de clé étrangère avec suppression en cascade pour ordre_travail_id
4. THE Système_Base_Données SHALL créer une contrainte de clé étrangère avec suppression en cascade pour etape_gamme_id

### Exigence 4: Préparation et Création d'OT Correctif

**User Story:** En tant qu'administrateur, je veux préparer un OT correctif depuis une intervention avec non-conformités, afin de planifier les actions correctives avec les détails appropriés.

#### Critères d'Acceptation

1. WHEN l'administrateur clique sur le bouton "OT" d'une intervention avec non-conformités, THE Système_Interface SHALL ouvrir un dialog de préparation d'OT correctif
2. THE Système_Interface SHALL afficher dans le dialog:
   - Les informations de l'intervention source (machine, client, technicien, date)
   - La liste détaillée des étapes non-conformes avec leurs commentaires
   - Un champ "Date d'intervention souhaitée" modifiable (par défaut: date du jour)
   - Un champ "Priorité" modifiable (par défaut: "haute")
   - Un champ "Observations" modifiable pour ajouter des détails
   - Une description auto-générée modifiable
3. WHEN l'administrateur clique sur "Créer l'OT Correctif" dans le dialog, THE Système_Interface SHALL:
   - Mettre à jour le statut de l'OT parent à "clôturé_avec_anomalie"
   - Créer un nouvel OT correctif avec les propriétés suivantes:
     * type: "correctif"
     * priorite: valeur saisie par l'admin
     * statut: "prévu"
     * date_programmee: date saisie par l'admin
     * observations: observations saisies par l'admin
     * machine_id: identique à l'intervention source
     * ot_parent_id: ID de l'OT parent
     * intervention_source_id: ID de l'intervention
   - Insérer toutes les étapes non-conformes dans la table etapes_non_conformes
4. WHEN toutes les données sont enregistrées avec succès, THE Système_Interface SHALL afficher un message de confirmation et fermer le dialog
5. THE Système_Interface SHALL mettre à jour l'affichage de la ligne d'intervention pour indiquer qu'un OT correctif a été créé
6. IF une erreur survient pendant la création, THEN THE Système_Interface SHALL annuler toutes les modifications (rollback) et afficher un message d'erreur

### Exigence 5: Pré-remplissage du Formulaire de Demande Corrective

**User Story:** En tant qu'administrateur, je veux que le formulaire de demande corrective soit pré-rempli automatiquement, afin de gagner du temps lors de la création d'un OT correctif.

#### Critères d'Acceptation

1. WHEN le formulaire de demande corrective reçoit les paramètres URL (machine_id, intervention_source_id, ot_id), THE Système_Interface SHALL charger les données de l'intervention source
2. WHEN les données sont chargées, THE Système_Interface SHALL charger les étapes non-conformes depuis la table etapes_non_conformes
3. THE Système_Interface SHALL pré-remplir le champ Machine avec la valeur de l'intervention source et le rendre non modifiable
4. THE Système_Interface SHALL pré-remplir le champ Type avec "Correctif" et le rendre non modifiable
5. THE Système_Interface SHALL pré-remplir le champ Priorité avec "Haute" tout en permettant la modification
6. THE Système_Interface SHALL afficher un champ "Date d'intervention souhaitée" (date_programmee) modifiable avec la date du jour par défaut
7. WHEN les étapes non-conformes sont chargées, THE Système_Interface SHALL générer automatiquement une description contenant:
   - La référence à l'OT parent
   - La liste des étapes non-conformes avec leurs numéros d'ordre
   - Les commentaires des techniciens pour chaque étape
8. THE Système_Interface SHALL permettre à l'administrateur de modifier la description générée automatiquement
9. THE Système_Interface SHALL afficher les étapes non-conformes dans une section dédiée avec leur description, statut et commentaire
10. THE Système_Interface SHALL permettre à l'administrateur de modifier le champ "Observations" (observations) pour ajouter des détails supplémentaires

### Exigence 6: Affichage du Statut Clôturé avec Anomalie

**User Story:** En tant qu'utilisateur, je veux voir clairement quand un OT est clôturé avec anomalie, afin d'identifier rapidement les interventions nécessitant un suivi.

#### Critères d'Acceptation

1. WHEN un OT a le statut "clôturé_avec_anomalie", THE Système_Interface SHALL afficher un badge visuel avec le texte "Clôturé avec anomalie"
2. THE Système_Interface SHALL utiliser une couleur distinctive (orange/rouge) pour le badge "Clôturé avec anomalie"
3. THE Système_Interface SHALL afficher le badge dans la page de détails de l'OT
4. THE Système_Interface SHALL afficher le badge dans les listes d'OT

### Exigence 7: Navigation vers l'OT Correctif Créé

**User Story:** En tant qu'utilisateur, je veux accéder facilement à l'OT correctif depuis l'OT parent, afin de suivre les actions correctives entreprises.

#### Critères d'Acceptation

1. WHEN un OT a le statut "clôturé_avec_anomalie", THE Système_Interface SHALL afficher une section "OT Correctif créé"
2. THE Système_Interface SHALL afficher dans cette section un lien cliquable vers l'OT correctif enfant
3. THE Système_Interface SHALL afficher la date de création de l'OT correctif
4. THE Système_Interface SHALL afficher le statut actuel de l'OT correctif
5. WHEN l'utilisateur clique sur le lien, THE Système_Interface SHALL naviguer vers la page de détails de l'OT correctif

### Exigence 8: Affichage des Étapes Non-Conformes dans l'OT Parent

**User Story:** En tant qu'utilisateur, je veux voir les étapes non-conformes directement dans l'OT parent, afin de comprendre pourquoi un OT correctif a été créé.

#### Critères d'Acceptation

1. WHEN un OT a le statut "clôturé_avec_anomalie", THE Système_Interface SHALL afficher une section "Étapes non-conformes"
2. THE Système_Interface SHALL afficher pour chaque étape non-conforme:
   - Le numéro d'ordre de l'étape
   - La description de l'étape
   - Le statut "Action corrective requise"
   - Le commentaire du technicien si disponible
3. THE Système_Interface SHALL afficher un lien vers l'intervention source
4. WHEN l'utilisateur clique sur le lien de l'intervention, THE Système_Interface SHALL naviguer vers la page de détails de l'intervention

### Exigence 9: Navigation depuis l'OT Correctif vers l'OT Parent

**User Story:** En tant qu'utilisateur, je veux accéder facilement à l'OT parent depuis un OT correctif, afin de comprendre le contexte de l'intervention corrective.

#### Critères d'Acceptation

1. WHEN un OT a une valeur non-NULL dans ot_parent_id, THE Système_Interface SHALL afficher une section "OT Parent"
2. THE Système_Interface SHALL afficher un lien cliquable vers l'OT parent
3. THE Système_Interface SHALL afficher la référence de l'OT parent
4. WHEN l'utilisateur clique sur le lien, THE Système_Interface SHALL naviguer vers la page de détails de l'OT parent

### Exigence 10: Navigation depuis l'OT Correctif vers l'Intervention Source

**User Story:** En tant qu'utilisateur, je veux accéder à l'intervention source depuis un OT correctif, afin de consulter les détails de la détection des non-conformités.

#### Critères d'Acceptation

1. WHEN un OT a une valeur non-NULL dans intervention_source_id, THE Système_Interface SHALL afficher une section "Intervention source"
2. THE Système_Interface SHALL afficher un lien cliquable vers l'intervention source
3. THE Système_Interface SHALL afficher la date de l'intervention source
4. THE Système_Interface SHALL afficher le nom du technicien de l'intervention source
5. WHEN l'utilisateur clique sur le lien, THE Système_Interface SHALL naviguer vers la page de détails de l'intervention

### Exigence 11: Intégrité des Données lors de la Création d'OT Correctif

**User Story:** En tant qu'administrateur système, je veux que la création d'un OT correctif soit une opération atomique, afin d'éviter les incohérences de données.

#### Critères d'Acceptation

1. WHEN la création d'un OT correctif est initiée, THE Système_Interface SHALL exécuter toutes les opérations dans une transaction unique
2. IF une opération échoue dans la transaction, THEN THE Système_Interface SHALL annuler toutes les modifications précédentes
3. THE Système_Interface SHALL vérifier que l'OT parent existe avant de créer l'OT correctif
4. THE Système_Interface SHALL vérifier que l'intervention source existe avant de créer l'OT correctif
5. THE Système_Interface SHALL vérifier que les étapes non-conformes existent avant de les insérer dans la table

### Exigence 12: Mise à Jour des Types TypeScript

**User Story:** En tant que développeur, je veux que les types TypeScript reflètent les nouvelles structures de données, afin de bénéficier de la vérification de types à la compilation.

#### Critères d'Acceptation

1. THE Système_Interface SHALL ajouter le statut "clôturé_avec_anomalie" au type Statut_OT
2. THE Système_Interface SHALL ajouter le champ intervention_source_id au type OrdreTravail
3. THE Système_Interface SHALL créer un nouveau type EtapeNonConforme avec les propriétés appropriées
4. THE Système_Interface SHALL exporter tous les nouveaux types depuis les fichiers de types appropriés

### Exigence 13: Parseur et Sérialiseur des Paramètres URL

**User Story:** En tant que développeur, je veux parser et sérialiser correctement les paramètres URL, afin de transmettre les données entre les composants de manière fiable.

#### Critères d'Acceptation

1. THE Système_Interface SHALL parser les paramètres URL (machine_id, intervention_source_id, ot_id) depuis l'URL
2. THE Système_Interface SHALL valider que les paramètres sont des UUID valides
3. THE Système_Interface SHALL sérialiser les paramètres en format URL lors de la navigation
4. FOR ALL paramètres valides, THE Système_Interface SHALL garantir que parser puis sérialiser puis parser produit des valeurs équivalentes (propriété round-trip)
5. IF un paramètre est invalide, THEN THE Système_Interface SHALL afficher un message d'erreur et ne pas tenter de charger les données

### Exigence 14: Gestion des Erreurs de Chargement

**User Story:** En tant qu'utilisateur, je veux être informé clairement en cas d'erreur de chargement, afin de comprendre ce qui ne fonctionne pas.

#### Critères d'Acceptation

1. IF le chargement de l'intervention source échoue, THEN THE Système_Interface SHALL afficher un message d'erreur descriptif
2. IF le chargement des étapes non-conformes échoue, THEN THE Système_Interface SHALL afficher un message d'erreur descriptif
3. IF les paramètres URL sont manquants, THEN THE Système_Interface SHALL afficher un message indiquant les paramètres requis
4. THE Système_Interface SHALL logger toutes les erreurs dans la console pour faciliter le débogage
5. THE Système_Interface SHALL permettre à l'utilisateur de retourner à la page précédente en cas d'erreur
