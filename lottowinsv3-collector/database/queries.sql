-- Select all states
SELECT id, code, name, created_at 
FROM states 
ORDER BY name;

-- Find a specific state by code
SELECT id, code, name, created_at 
FROM states 
WHERE code = 'ca';

-- Count total states
SELECT COUNT(*) AS total_states 
FROM states;

-- Insert a new state
INSERT INTO states (code, name) 
VALUES ('ny', 'New York');

-- Update a state name
UPDATE states 
SET name = 'California' 
WHERE code = 'ca';

-- Delete a state
DELETE FROM states 
WHERE code = 'ny';

-- Get states with names starting with 'A'
SELECT id, code, name 
FROM states 
WHERE name LIKE 'A%' 
ORDER BY name;

-- Truncate (clear) the table
-- TRUNCATE TABLE states;

-- Drop the table
-- DROP TABLE states; 