-- Script SQL completo para recriar todo o esquema do banco de dados
-- Use este script apenas se deseja recriar todas as tabelas do zero

-- 1. Remover tabelas existentes em ordem inversa de dependência (para evitar erros de chave estrangeira)
DROP TABLE IF EXISTS collection_log;
DROP TABLE IF EXISTS game_results;
DROP TABLE IF EXISTS state_games;
DROP TABLE IF EXISTS games;
DROP TABLE IF EXISTS states;

-- 2. Criar tabela de estados
CREATE TABLE states (
    id SERIAL PRIMARY KEY,
    code VARCHAR(2) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- 3. Criar tabela de jogos
CREATE TABLE games (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    logo_url VARCHAR(200),
    description TEXT,
    is_multi_state BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Criar tabela de associação entre estados e jogos
CREATE TABLE state_games (
    id SERIAL PRIMARY KEY,
    state_id INTEGER NOT NULL REFERENCES states(id) ON DELETE CASCADE,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (state_id, game_id)
);

-- 5. Criar tabela de resultados de jogos
CREATE TABLE game_results (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    state_id INTEGER NOT NULL REFERENCES states(id) ON DELETE CASCADE,
    draw_date DATE NOT NULL,
    draw_time TIME WITHOUT TIME ZONE,
    timezone VARCHAR(10),
    numbers TEXT,
    jackpot VARCHAR(100),
    next_draw_date DATE,
    next_draw_time TIME WITHOUT TIME ZONE,
    next_jackpot VARCHAR(100),
    collected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (game_id, state_id, draw_date, draw_time)
);

-- 6. Criar índices para melhorar performance
CREATE INDEX idx_game_results_game_id ON game_results(game_id);
CREATE INDEX idx_game_results_state_id ON game_results(state_id);
CREATE INDEX idx_game_results_draw_date ON game_results(draw_date);
CREATE INDEX idx_state_games_state_id ON state_games(state_id);
CREATE INDEX idx_state_games_game_id ON state_games(game_id);

-- 7. Criar tabela de log de coleta
CREATE TABLE collection_log (
    id SERIAL PRIMARY KEY,
    state_code VARCHAR(2) NOT NULL,
    url VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL,
    start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    games_collected INTEGER DEFAULT 0,
    error_message TEXT
);

-- 8. Função para atualizar o timestamp de updated_at automaticamente
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- 9. Triggers para atualizar automaticamente o campo updated_at
CREATE TRIGGER update_games_timestamp BEFORE UPDATE
ON games FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_states_timestamp BEFORE UPDATE
ON states FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- 10. Criar índices adicionais para consultas frequentes
CREATE INDEX idx_games_slug ON games(slug);
CREATE INDEX idx_states_code ON states(code);
CREATE INDEX idx_collection_log_state ON collection_log(state_code);
CREATE INDEX idx_game_results_next_draw ON game_results(next_draw_date);

-- 11. Criar view para jogos recentes
CREATE OR REPLACE VIEW recent_game_results AS
SELECT gr.id, g.name as game_name, s.name as state_name, s.code as state_code,
       gr.draw_date, gr.draw_time, gr.timezone, gr.numbers, gr.jackpot,
       gr.next_draw_date, gr.next_draw_time, gr.next_jackpot
FROM game_results gr
JOIN games g ON gr.game_id = g.id
JOIN states s ON gr.state_id = s.id
WHERE gr.draw_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY gr.draw_date DESC, gr.draw_time DESC; 