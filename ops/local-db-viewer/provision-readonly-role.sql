\set ON_ERROR_STOP on
\getenv viewer_password DB_VIEWER_PASSWORD
\getenv app_role POSTGRES_USER
\getenv database_name POSTGRES_DB

BEGIN;

SELECT format(
  'CREATE ROLE bdo_viewer LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 2 PASSWORD %L',
  :'viewer_password'
)
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bdo_viewer')
\gexec

SELECT format(
  'ALTER ROLE bdo_viewer WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 2 PASSWORD %L',
  :'viewer_password'
)
\gexec

SELECT format('REVOKE %I FROM bdo_viewer', parent.rolname)
FROM pg_auth_members AS membership
JOIN pg_roles AS parent ON parent.oid = membership.roleid
JOIN pg_roles AS member ON member.oid = membership.member
WHERE member.rolname = 'bdo_viewer'
\gexec

DO $guard$
DECLARE
  viewer_oid oid;
BEGIN
  SELECT oid INTO viewer_oid FROM pg_roles WHERE rolname = 'bdo_viewer';
  IF EXISTS (SELECT 1 FROM pg_class WHERE relowner = viewer_oid)
     OR EXISTS (SELECT 1 FROM pg_proc WHERE proowner = viewer_oid)
     OR EXISTS (SELECT 1 FROM pg_namespace WHERE nspowner = viewer_oid)
     OR EXISTS (SELECT 1 FROM pg_database WHERE datdba = viewer_oid) THEN
    RAISE EXCEPTION 'The dedicated viewer role already owns database objects; refusing to continue.';
  END IF;
END
$guard$;

ALTER ROLE bdo_viewer SET default_transaction_read_only = on;
ALTER ROLE bdo_viewer SET statement_timeout = '15s';
ALTER ROLE bdo_viewer SET idle_in_transaction_session_timeout = '30s';

REVOKE ALL PRIVILEGES ON DATABASE :"database_name" FROM bdo_viewer;
GRANT CONNECT ON DATABASE :"database_name" TO bdo_viewer;
REVOKE CREATE ON SCHEMA public FROM bdo_viewer;
GRANT USAGE ON SCHEMA public TO bdo_viewer;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM bdo_viewer;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM bdo_viewer;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM bdo_viewer;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO bdo_viewer;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO bdo_viewer;

ALTER DEFAULT PRIVILEGES FOR ROLE :"app_role" IN SCHEMA public
  REVOKE ALL ON TABLES FROM bdo_viewer;
ALTER DEFAULT PRIVILEGES FOR ROLE :"app_role" IN SCHEMA public
  GRANT SELECT ON TABLES TO bdo_viewer;
ALTER DEFAULT PRIVILEGES FOR ROLE :"app_role" IN SCHEMA public
  GRANT SELECT ON SEQUENCES TO bdo_viewer;

DO $guard$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class AS relation
    JOIN pg_namespace AS schema ON schema.oid = relation.relnamespace
    WHERE schema.nspname = 'public'
      AND relation.relkind IN ('r', 'p', 'v', 'm', 'f')
      AND (
        has_table_privilege('bdo_viewer', relation.oid, 'INSERT')
        OR has_table_privilege('bdo_viewer', relation.oid, 'UPDATE')
        OR has_table_privilege('bdo_viewer', relation.oid, 'DELETE')
        OR has_table_privilege('bdo_viewer', relation.oid, 'TRUNCATE')
      )
  ) THEN
    RAISE EXCEPTION 'The viewer role still has write privileges on a table.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_class AS sequence
    JOIN pg_namespace AS schema ON schema.oid = sequence.relnamespace
    WHERE schema.nspname = 'public'
      AND sequence.relkind = 'S'
      AND (
        has_sequence_privilege('bdo_viewer', sequence.oid, 'USAGE')
        OR has_sequence_privilege('bdo_viewer', sequence.oid, 'UPDATE')
      )
  ) THEN
    RAISE EXCEPTION 'The viewer role still has sequence mutation privileges.';
  END IF;
END
$guard$;

COMMIT;
