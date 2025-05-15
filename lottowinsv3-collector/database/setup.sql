-- Create database if not exists
CREATE DATABASE IF NOT EXISTS lotterydata;

-- Use the database
USE lotterydata;

-- Create states table
CREATE TABLE IF NOT EXISTS states (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add index on code for faster lookups
CREATE INDEX idx_states_code ON states(code);

-- Add comment to the table
ALTER TABLE states COMMENT 'Stores US state information collected from lotterycorner.com';

-- Create games table
CREATE TABLE IF NOT EXISTS games (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    logo_url VARCHAR(255),
    description TEXT,
    is_multi_state BOOLEAN DEFAULT FALSE, -- Flag for multi-state games
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comment to the table
ALTER TABLE games COMMENT 'Stores lottery games information';

-- Create state_games table for many-to-many relationship
CREATE TABLE IF NOT EXISTS state_games (
    id INT AUTO_INCREMENT PRIMARY KEY,
    state_id INT NOT NULL,
    game_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_state_game (state_id, game_id),
    FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE CASCADE,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comment to the table
ALTER TABLE state_games COMMENT 'Links states to their available lottery games';

-- Create game_results table
CREATE TABLE IF NOT EXISTS game_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_id INT NOT NULL,
    state_id INT NOT NULL,
    draw_date DATE NOT NULL,
    draw_time TIME,
    timezone VARCHAR(10), -- Armazena o fuso horário do sorteio (ex: -0700)
    numbers VARCHAR(255) NOT NULL,
    jackpot VARCHAR(50),
    next_draw_date DATE,
    next_draw_time TIME,
    next_jackpot VARCHAR(50),
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE CASCADE,
    -- Índice tradicional para buscas normais
    INDEX idx_game_state_date (game_id, state_id, draw_date),
    -- Índice único para jogos regulares (não multi-state)
    UNIQUE KEY uk_regular_game_results (game_id, state_id, draw_date, draw_time),
    -- Índice para jogos multi-estado (não afeta jogos regulares devido à condição WHERE)
    INDEX idx_multi_state_games (game_id, draw_date, numbers(100), jackpot(20))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comment to the table
ALTER TABLE game_results COMMENT 'Stores lottery game results including winning numbers and jackpot information';

-- Create table to store scheduled collection tasks
CREATE TABLE IF NOT EXISTS collection_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    state_code VARCHAR(10) NOT NULL,
    url VARCHAR(255) NOT NULL,
    status ENUM('pending', 'success', 'failed') NOT NULL DEFAULT 'pending',
    start_time TIMESTAMP NULL,
    end_time TIMESTAMP NULL,
    games_collected INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (state_code) REFERENCES states(code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comment to the table
ALTER TABLE collection_log COMMENT 'Logs collection jobs for tracking and debugging purposes';

-- Add timezone column if it doesn't exist yet (para updates em bancos existentes)
ALTER TABLE game_results 
ADD COLUMN IF NOT EXISTS timezone VARCHAR(10) AFTER draw_time;

-- Update script to fix duplicates
DELIMITER //

-- Create procedure to remove duplicate game results
CREATE PROCEDURE IF NOT EXISTS fix_duplicate_game_results()
BEGIN
    -- Create a temporary table for multi-state games
    CREATE TEMPORARY TABLE IF NOT EXISTS tmp_multi_state_games (
        id INT PRIMARY KEY
    );
    
    -- Insert the IDs of multi-state games
    INSERT INTO tmp_multi_state_games
    SELECT id FROM games WHERE is_multi_state = TRUE;
    
    -- Create a temporary table to store the IDs to keep
    CREATE TEMPORARY TABLE IF NOT EXISTS tmp_keep_ids (
        id INT PRIMARY KEY
    );
    
    -- For multi-state games, keep only one result per game per draw date (the most recent one)
    INSERT INTO tmp_keep_ids 
    SELECT MIN(gr.id)
    FROM game_results gr
    JOIN games g ON gr.game_id = g.id
    WHERE g.is_multi_state = TRUE
    GROUP BY gr.game_id, gr.draw_date;
    
    -- For regular games, keep one result per game per state per draw date
    INSERT INTO tmp_keep_ids 
    SELECT MIN(gr.id)
    FROM game_results gr
    JOIN games g ON gr.game_id = g.id
    WHERE g.is_multi_state = FALSE
    GROUP BY gr.game_id, gr.state_id, gr.draw_date;
    
    -- Delete all rows except the ones to keep
    DELETE FROM game_results 
    WHERE id NOT IN (SELECT id FROM tmp_keep_ids);
    
    -- Drop temporary tables
    DROP TEMPORARY TABLE IF EXISTS tmp_multi_state_games;
    DROP TEMPORARY TABLE IF EXISTS tmp_keep_ids;
    
    -- Show how many rows remain
    SELECT COUNT(*) AS remaining_rows FROM game_results;
END //

-- Adicionar trigger para garantir unicidade baseada no tipo de jogo
CREATE TRIGGER before_insert_game_result
BEFORE INSERT ON game_results
FOR EACH ROW
BEGIN
    DECLARE is_multi BOOLEAN;
    
    -- Verificar se é um jogo multi-estado
    SELECT is_multi_state INTO is_multi FROM games WHERE id = NEW.game_id;
    
    IF is_multi THEN
        -- Para jogos multi-estado, verificar unicidade por game_id, draw_date, numbers e jackpot
        IF EXISTS (
            SELECT 1 FROM game_results 
            WHERE game_id = NEW.game_id 
            AND draw_date = NEW.draw_date 
            AND numbers = NEW.numbers 
            AND ((jackpot = NEW.jackpot) OR (jackpot IS NULL AND NEW.jackpot IS NULL))
        ) THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = 'Duplicate multi-state game result';
        END IF;
    END IF;
END//

DELIMITER ; 