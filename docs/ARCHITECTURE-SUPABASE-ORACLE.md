# Architecture du backend Supabase sur Oracle Cloud

```mermaid
flowchart TB
    users[Utilisateurs de l'application]
    admins[Administrateurs]
    frontend[Frontend GMAO<br/>gestion.facilitysolutiongroup.ma]
    dns[DNS public<br/>gmao.supabase.facilitysolutiongroup.ma]

    users --> frontend
    frontend -->|API HTTPS| dns
    admins -->|Studio HTTPS<br/>Basic Auth| dns

    subgraph oci[Oracle Cloud Infrastructure - Always Free]
        publicIp[IP publique<br/>51.170.137.61]
        network[VCN et sous-réseau public<br/>Entrée autorisée : 22, 80, 443]

        subgraph vm[VM supabase-gmao - Ubuntu ARM64]
            firewall[Pare-feu Ubuntu<br/>SSH, HTTP, HTTPS uniquement]
            caddy[Caddy<br/>TLS automatique et reverse proxy]

            subgraph docker[Docker Compose - réseau privé Supabase]
                gateway[API Gateway / Envoy<br/>127.0.0.1:8000]
                studio[Supabase Studio]
                auth[Auth / GoTrue]
                rest[API REST / PostgREST]
                realtime[Realtime]
                functions[Edge Functions]
                storage[Storage API]
                imgproxy[Transformation d'images<br/>imgproxy]
                meta[Postgres Meta]
                pooler[Supavisor<br/>127.0.0.1:5432 et 6543]
                postgres[(PostgreSQL 17)]
                files[(Volume Storage<br/>Fichiers persistants)]

                gateway --> studio
                gateway --> auth
                gateway --> rest
                gateway --> realtime
                gateway --> functions
                gateway --> storage

                studio --> meta
                meta --> postgres
                auth --> postgres
                rest --> postgres
                realtime --> postgres
                functions --> auth
                functions --> rest
                functions --> storage
                storage --> postgres
                storage --> files
                storage --> imgproxy
                pooler --> postgres
            end

            firewall --> caddy
            health[supabase-health.sh<br/>CPU, RAM, disque, TLS,<br/>API, Docker et PostgreSQL]
            health -. surveillance .-> docker
        end

        publicIp --> network --> firewall
    end

    dns --> publicIp
```

## Principes de sécurité

- Seuls SSH (`22`), HTTP (`80`) et HTTPS (`443`) sont accessibles depuis Internet.
- Caddy redirige HTTP vers HTTPS et renouvelle automatiquement le certificat TLS.
- La passerelle Supabase (`8000`) et PostgreSQL/Supavisor (`5432`, `6543`) écoutent uniquement sur `127.0.0.1`.
- Supabase Studio est protégé par un nom d'utilisateur et un mot de passe distincts des comptes de l'application.
- Les secrets restent dans `/home/ubuntu/supabase-project/.env` et ne sont jamais intégrés au dépôt Git.

## Persistance et surveillance

- PostgreSQL conserve les tables, Auth, fonctions RPC, triggers et politiques RLS dans un volume Docker persistant.
- Storage conserve les métadonnées dans PostgreSQL et les fichiers dans le volume Storage de la VM.
- Le script `/home/ubuntu/supabase-health.sh` contrôle les ressources et la disponibilité des services.
- Les sauvegardes de migration restent séparées de l'instance et doivent être complétées par des sauvegardes périodiques.
