# Audit des tables liées à Lgestion

Date de l'audit : 22 août 2026.

Cet audit compare les 40 tables initiales du schéma `public` de l'instance Oracle avec les appels Supabase du frontend, des Edge Functions et les dépendances PostgreSQL.

## Statut

La suppression a été exécutée avec succès le 22 août 2026 par la migration `20260822002000_remove_legacy_lgestion.sql`.

- 24 tables Lgestion supprimées.
- 11 fonctions SQL Lgestion supprimées.
- 16 tables GMAO conservées et vérifiées.
- Tous les services Supabase sont restés sains après l'opération.
- Le code de l'application Lgestion a ensuite été retiré du frontend principal : 62 fichiers exclusifs supprimés et aucun appel restant vers ses tables.
- Sauvegarde complète avant suppression : `supabase-backup/oracle/pre-lgestion-delete-20260822.dump`.
- SHA-256 : `095f6362909d7b23cecfe626f77d43e0939ecec3c657f4567f96da66cd5deb07`.

## Tables supprimées

Les 24 tables suivantes forment le bloc fonctionnel devis, contrats, facturation, achats et chantiers de l'ancienne application Lgestion :

| Groupe | Tables |
|---|---|
| Devis | `devis`, `devis_lignes`, `validity_notes`, `type_devis`, `domaines_activite`, `monetaire` |
| Clients commerciaux | `clients_devis`, `contacts`, `interlocuteurs`, `sites_client`, `emetteurs` |
| Chantiers et achats | `chantiers`, `achats`, `fournisseurs`, `travaux_compteur` |
| Contrats | `contracts`, `contract_periods`, `contract_period_correctifs`, `contrat_compteur` |
| Facturation | `factures`, `bons_livraison`, `config_facturation`, `facture_compteur` |
| Configuration documentaire | `settings` |

Ces tables sont reliées entre elles, mais aucune clé étrangère ne relie ce bloc aux tables actives de maintenance GMAO.

## Fonctions SQL associées

Les fonctions suivantes appartiennent également à Lgestion et devront être archivées ou supprimées avec les tables :

- `create_contract_periods()`
- `generate_code_chantier_auto(bigint)`
- `generate_code_chantier_contract(bigint, text)`
- `generate_num_devis()`
- `generate_numero_bl()`
- `generate_numero_facture()`
- `get_next_num_devis()`
- `increment_travaux_compteur()`
- `renew_contract(bigint)`
- `trg_generate_chantier_code()`
- `trg_set_code_chantier()`

## Tables GMAO à conserver

- `clients`
- `domaines`
- `etapes_gamme`
- `gammes_maintenance`
- `interventions`
- `lots`
- `machines`
- `ordres_travail`
- `plan_action_failure_modes`
- `plan_action_lots`
- `plan_action_problem_families`
- `plans_maintenance`
- `postes_techniques`
- `profiles`
- `secteurs`
- `sites`

Les trois vues publiques actuelles dépendent uniquement de ces tables GMAO et doivent être conservées.

## Points à valider avant suppression

1. Confirmer que la nouvelle application Lgestion utilise une base distincte et n'accède plus à cette instance.
2. Produire une sauvegarde SQL dédiée des 24 tables, de leurs données, fonctions et séquences.
3. Retirer du dépôt principal `src/gestion` ainsi que les hooks et générateurs PDF associés, pour éviter de conserver du code mort.
4. Tester Auth, machines, maintenance, ordres de travail, rapports et Storage.
5. Exécuter ensuite une migration SQL transactionnelle, sans `CASCADE` implicite non contrôlé.

La suppression libérerait peu d'espace : l'intérêt principal est la simplification du schéma et la réduction de la surface de maintenance, pas un gain important de stockage.
