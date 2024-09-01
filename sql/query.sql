-- erase all data
DELETE FROM "user";

-- delete index table
DROP INDEX IF EXISTS "IDX_USER_EMAIL";

-- check if index table exists
SELECT *
FROM pg_indexes
WHERE indexname = 'IDX_USER_EMAIL'
;

-- check if index table exists
\di IDX_USER_EMAIL*

-- check if index table is working
-- if the output is "Index Scan" indicates index table working properly
-- on the contrary, it shows "Seq Scan"
EXPLAIN SELECT * FROM "user" WHERE email = 'john@example.com';
EXPLAIN ANALYZE SELECT * FROM "user" WHERE email = 'john@example.com';
