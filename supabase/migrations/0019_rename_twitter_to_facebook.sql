-- Remplace le champ twitter_username par facebook_username dans la table profiles.
-- Aucune donnée existante n'est perdue : PostgreSQL effectue un simple renommage
-- de colonne sans toucher aux valeurs stockées.

ALTER TABLE profiles
    RENAME COLUMN twitter_username TO facebook_username;
