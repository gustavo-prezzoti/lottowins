-- SQL para adicionar as novas colunas à tabela game_predictions
ALTER TABLE game_predictions
ADD COLUMN IF NOT EXISTS hot_numbers VARCHAR(255),
ADD COLUMN IF NOT EXISTS cold_numbers VARCHAR(255),
ADD COLUMN IF NOT EXISTS overdue_numbers VARCHAR(255);

-- Comentário sobre como executar este script
-- Execute este script no banco de dados PostgreSQL usando:
-- psql -U seu_usuario -d seu_banco -f migration_add_columns.sql
-- ou através de ferramentas como pgAdmin, DBeaver, etc.
