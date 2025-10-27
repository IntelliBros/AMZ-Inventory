#!/bin/bash

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
  echo "Error: psql is not installed. Please install PostgreSQL client tools."
  exit 1
fi

echo "Running migration: 20251027_add_teams_for_existing_users.sql"

# Parse Supabase URL to get connection details
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL not found in .env.local"
  echo "Please add your Supabase database connection string to .env.local"
  echo "Format: DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres"
  exit 1
fi

psql "$DATABASE_URL" -f supabase/migrations/20251027_add_teams_for_existing_users.sql

echo "Migration completed!"
