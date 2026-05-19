#!/bin/bash
# Usage: ./migrations/run.sh
# Runs all migration files in order against the nail_app database.

set -e

DB_NAME="${DB_NAME:-nail_app}"
DB_USER="${DB_USER:-postgres}"

echo "Creating database '$DB_NAME' if not exists..."
psql -U "$DB_USER" -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" \
  | grep -q 1 || psql -U "$DB_USER" -c "CREATE DATABASE $DB_NAME"

echo "Running migrations..."
for file in "$(dirname "$0")"/0*.sql; do
  echo "  -> $file"
  psql -U "$DB_USER" -d "$DB_NAME" -f "$file"
done

echo "Done."
