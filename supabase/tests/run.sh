#!/usr/bin/env bash
# Runs the schema + RLS + credit-ledger tests against a throwaway local Postgres database.
# Usage: PGHOST=localhost PGPORT=5432 PGUSER=postgres ./supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")"
DB=clipforge_test_$$
psql -q -c "create database $DB"
trap 'psql -q -c "drop database if exists $DB"' EXIT
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f 00_supabase_stub.sql
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f ../migrations/20261113000001_init.sql
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f 01_credits_rls.test.sql
