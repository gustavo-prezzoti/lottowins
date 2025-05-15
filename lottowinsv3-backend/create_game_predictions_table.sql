-- Create game_predictions table
CREATE TABLE IF NOT EXISTS game_predictions (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL,
    state_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    predicted_numbers VARCHAR(255) NOT NULL,
    predicted_special_number VARCHAR(100),
    confidence_score DECIMAL(5,2) NOT NULL,
    analysis_summary TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_game_prediction_game
        FOREIGN KEY (game_id)
        REFERENCES games (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_game_prediction_state
        FOREIGN KEY (state_id)
        REFERENCES states (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_game_prediction_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE
);

-- Create index on game_id and state_id
CREATE INDEX IF NOT EXISTS idx_game_prediction_game ON game_predictions (game_id);
CREATE INDEX IF NOT EXISTS idx_game_prediction_state ON game_predictions (state_id);
CREATE INDEX IF NOT EXISTS idx_game_prediction_user ON game_predictions (user_id);

-- Add a comment to the table
COMMENT ON TABLE game_predictions IS 'Stores AI-generated lottery number predictions';

-- Create or replace a trigger function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_game_prediction_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_game_prediction_timestamp
BEFORE UPDATE ON game_predictions
FOR EACH ROW
EXECUTE FUNCTION update_game_prediction_timestamp(); 