-- Adiciona a coluna special_number à tabela game_results
ALTER TABLE game_results ADD COLUMN IF NOT EXISTS special_number VARCHAR(255);

-- Comentário na coluna
COMMENT ON COLUMN game_results.special_number IS 'Número especial destacado (ex: Mega Ball, Powerball)';

-- Índice para consultas por número especial
CREATE INDEX IF NOT EXISTS idx_game_results_special_number ON game_results(special_number);

-- Log da migração
INSERT INTO migrations (name, applied_at) 
VALUES ('add_special_number_column', NOW())
ON CONFLICT (name) DO NOTHING; 