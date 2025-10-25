-- Check constraints using PostgreSQL system catalog
SELECT
    con.conname AS constraint_name,
    con.contype AS constraint_type,
    rel.relname AS table_name,
    att.attname AS column_name,
    fnrel.relname AS foreign_table_name,
    fnatt.attname AS foreign_column_name,
    nsp.nspname AS table_schema,
    fnnsp.nspname AS foreign_table_schema
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
LEFT JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
LEFT JOIN pg_class fnrel ON fnrel.oid = con.confrelid
LEFT JOIN pg_namespace fnnsp ON fnnsp.oid = fnrel.relnamespace
LEFT JOIN pg_attribute fnatt ON fnatt.attrelid = con.confrelid AND fnatt.attnum = ANY(con.confkey)
WHERE rel.relname = 'suppliers'
  AND con.contype = 'f'
  AND nsp.nspname = 'public';
