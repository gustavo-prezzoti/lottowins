-- Query all game predictions with related data
SELECT 
    gp.id,
    g.name as game_name,
    s.name as state_name,
    u.email as user_email,
    gp.predicted_numbers,
    gp.predicted_special_number,
    gp.confidence_score,
    gp.created_at,
    gp.updated_at
FROM game_predictions gp
JOIN games g ON gp.game_id = g.id
JOIN states s ON gp.state_id = s.id
JOIN users u ON gp.user_id = u.id
ORDER BY gp.created_at DESC;

-- Count predictions per game
SELECT 
    g.name as game_name,
    COUNT(*) as prediction_count
FROM game_predictions gp
JOIN games g ON gp.game_id = g.id
GROUP BY g.name
ORDER BY prediction_count DESC;

-- Count predictions per state
SELECT 
    s.name as state_name,
    COUNT(*) as prediction_count
FROM game_predictions gp
JOIN states s ON gp.state_id = s.id
GROUP BY s.name
ORDER BY prediction_count DESC;

-- Get average confidence score per game
SELECT 
    g.name as game_name,
    AVG(gp.confidence_score) as avg_confidence
FROM game_predictions gp
JOIN games g ON gp.game_id = g.id
GROUP BY g.name
ORDER BY avg_confidence DESC;

-- Check for a specific user's predictions
SELECT 
    g.name as game_name,
    s.name as state_name,
    gp.predicted_numbers,
    gp.confidence_score,
    gp.created_at
FROM game_predictions gp
JOIN games g ON gp.game_id = g.id
JOIN states s ON gp.state_id = s.id
WHERE gp.user_id = 1  -- Replace with the actual user ID
ORDER BY gp.created_at DESC; 