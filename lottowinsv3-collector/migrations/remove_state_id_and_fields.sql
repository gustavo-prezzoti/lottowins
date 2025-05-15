-- Migração para remover state_id de game_results e remover description e is_multi_state de games
-- ATENÇÃO: Execute esta migração com cautela, pois irá remover dados existentes nas colunas

-- Primeiro, crie a relação entre game_results e estados através da tabela state_games
-- Para cada resultado de jogo, garanta que exista um registro correspondente em state_games
-- Isso deve ser feito antes de remover a coluna state_id de game_results
INSERT INTO state_games (state_id, game_id)
SELECT DISTINCT gr.state_id, gr.game_id
FROM game_results gr
LEFT JOIN state_games sg ON sg.state_id = gr.state_id AND sg.game_id = gr.game_id
WHERE sg.id IS NULL;

-- Remover a view que depende de game_results.state_id
DROP VIEW IF EXISTS recent_game_results;

-- Agora podemos remover a coluna state_id de game_results
-- 1. Primeiro vamos remover as chaves estrangeiras e índices relacionados
ALTER TABLE game_results DROP CONSTRAINT IF EXISTS game_results_state_id_fkey;
DROP INDEX IF EXISTS idx_game_state_date;
DROP INDEX IF EXISTS uk_regular_game_results;

-- 2. Remover a coluna state_id com CASCADE para remover todas as dependências
ALTER TABLE game_results DROP COLUMN state_id CASCADE;

-- 3. Criar novos índices sem state_id
CREATE INDEX idx_game_date ON game_results(game_id, draw_date);
ALTER TABLE game_results ADD CONSTRAINT uk_game_results UNIQUE (game_id, draw_date, draw_time);

-- Agora vamos remover as colunas description e is_multi_state da tabela games
ALTER TABLE games DROP COLUMN description;
ALTER TABLE games DROP COLUMN is_multi_state;

-- 4. Atualizar os triggers e procedimentos que usavam is_multi_state

-- Primeiro vamos remover o trigger que usava is_multi_state
DROP TRIGGER IF EXISTS before_insert_game_result;

-- Criar uma nova versão do trigger que não depende de is_multi_state
-- Agora a unicidade será baseada apenas no game_id, draw_date, draw_time
CREATE OR REPLACE FUNCTION check_game_result_uniqueness()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar se já existe um resultado para este jogo, data e hora
    IF EXISTS (
        SELECT 1 FROM game_results 
        WHERE game_id = NEW.game_id 
        AND draw_date = NEW.draw_date 
        AND (
            (draw_time IS NULL AND NEW.draw_time IS NULL) OR
            (draw_time = NEW.draw_time)
        )
        AND id != COALESCE(NEW.id, 0)
    ) THEN
        RAISE EXCEPTION 'Duplicate game result for game_id %, draw_date %, draw_time %', 
                        NEW.game_id, NEW.draw_date, NEW.draw_time;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_game_result_uniqueness_trigger
BEFORE INSERT OR UPDATE ON game_results
FOR EACH ROW EXECUTE FUNCTION check_game_result_uniqueness();

-- 5. Recriar a view recent_game_results sem dependência de state_id
-- Agora vamos obter o estado através da tabela state_games
CREATE OR REPLACE VIEW recent_game_results AS
SELECT gr.id, g.name as game_name, s.name as state_name, s.code as state_code,
       gr.draw_date, gr.draw_time, gr.timezone, gr.numbers, gr.jackpot,
       gr.next_draw_date, gr.next_draw_time, gr.next_jackpot
FROM game_results gr
JOIN games g ON gr.game_id = g.id
JOIN state_games sg ON sg.game_id = g.id
JOIN states s ON sg.state_id = s.id
WHERE gr.draw_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY gr.draw_date DESC, gr.draw_time DESC; 