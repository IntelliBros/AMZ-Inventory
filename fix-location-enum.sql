-- FIX SCRIPT: Update location_type enum if migration already ran with wrong values
-- Run this if you already ran the migration and got "invalid input value for enum location_type: production"

-- Step 1: Drop the default constraint if exists
ALTER TABLE inventory_locations ALTER COLUMN location_type DROP DEFAULT;

-- Step 2: Rename current enum
ALTER TYPE location_type RENAME TO location_type_old;

-- Step 3: Create new enum with correct values
CREATE TYPE location_type AS ENUM ('warehouse', 'en_route', 'storage', 'production');

-- Step 4: Update the column with data migration
ALTER TABLE inventory_locations
ALTER COLUMN location_type TYPE location_type USING
  CASE
    WHEN location_type::text = 'in_storage' THEN 'storage'::location_type
    WHEN location_type::text = 'in_production' THEN 'production'::location_type
    WHEN location_type::text = 'warehouse' THEN 'warehouse'::location_type
    WHEN location_type::text = 'en_route' THEN 'en_route'::location_type
    ELSE 'storage'::location_type  -- Default fallback
  END;

-- Step 5: Drop old enum
DROP TYPE location_type_old;

-- Step 6: Update enum in database.types if needed
COMMENT ON TYPE location_type IS 'Valid values: warehouse, en_route, storage, production';
