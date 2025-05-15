"""
Game repository for database operations
"""
from mysql.connector import Error
from app.repositories.postgres_database import get_pg_connection, release_connection
from app.models.game import Game

class GameRepository:
    """
    Repository for game data storage and retrieval
    """
    
    @staticmethod
    def save(game):
        """
        Save a game to the database
        
        Args:
            game (Game): Game object to save
            
        Returns:
            dict: Result of the operation
        """
        connection = get_pg_connection()
        if connection is None:
            return {"success": False, "message": "Database connection failed"}
        
        try:
            cursor = connection.cursor()
            
            # Check if game already exists
            cursor.execute("SELECT id FROM games WHERE slug = %s", (game.slug,))
            result = cursor.fetchone()
            
            if result:
                # Update if it exists
                game.id = result[0]
                
                cursor.execute(
                    """UPDATE games SET 
                       name = %s, 
                       logo_url = %s
                       WHERE id = %s""",
                    (game.name, game.logo_url, game.id)
                )
                connection.commit()
                
                return {
                    "success": True, 
                    "action": "updated", 
                    "game": game.to_dict()
                }
            else:
                # Insert if it doesn't exist
                cursor.execute(
                    """INSERT INTO games 
                       (name, slug, logo_url) 
                       VALUES (%s, %s, %s)""",
                    (game.name, game.slug, game.logo_url)
                )
                connection.commit()
                
                # Get the inserted ID
                game.id = cursor.lastrowid
                
                return {
                    "success": True, 
                    "action": "inserted", 
                    "game": game.to_dict()
                }
                
        except Error as e:
            error_message = f"Error saving game to database: {e}"
            print(error_message)
            return {"success": False, "message": error_message}
        finally:
            cursor.close()
            release_connection(connection)
    
    @staticmethod
    def save_many(games, state_id=None):
        """
        Save multiple games to the database and optionally associate them with a state
        
        Args:
            games (list): List of Game objects to save
            state_id (int, optional): State ID to associate games with
            
        Returns:
            list: List of saved Game objects with their IDs
        """
        # Use global connection for batch operations
        connection = get_pg_connection()
        if connection is None:
            return []
        
        saved_games = []
        
        try:
            cursor = connection.cursor()
            
            # Prepare existing game slugs query to batch check
            all_slugs = [game.slug for game in games]
            
            # If there are no games, return empty list
            if not all_slugs:
                return []
                
            # Find all existing games in a single query
            format_strings = ','.join(['%s'] * len(all_slugs))
            cursor.execute(
                f"SELECT id, slug FROM games WHERE slug IN ({format_strings})",
                tuple(all_slugs)
            )
            
            # Create a map of slug to id for existing games
            existing_games = {row[1]: {'id': row[0]} for row in cursor.fetchall()}
            
            # For insert operations
            games_to_insert = []
            # For update operations
            games_to_update = []
            
            # Sort games into insert or update groups
            for game in games:
                if game.slug in existing_games:
                    game.id = existing_games[game.slug]['id']
                    games_to_update.append(game)
                else:
                    games_to_insert.append(game)
            
            # Execute batch insert
            if games_to_insert:
                insert_values = [(game.name, game.slug, game.logo_url) 
                              for game in games_to_insert]
                
                cursor.executemany(
                    """INSERT INTO games 
                       (name, slug, logo_url, created_at, updated_at) 
                       VALUES (%s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)""",
                    insert_values
                )
                connection.commit()
                
                # Get inserted IDs (have to query again for auto-increment values)
                new_slugs = [game.slug for game in games_to_insert]
                format_strings = ','.join(['%s'] * len(new_slugs))
                cursor.execute(
                    f"SELECT id, slug FROM games WHERE slug IN ({format_strings})",
                    tuple(new_slugs)
                )
                
                # Update the game objects with their new IDs
                new_game_ids = {row[1]: row[0] for row in cursor.fetchall()}
                for game in games_to_insert:
                    if game.slug in new_game_ids:
                        game.id = new_game_ids[game.slug]
            
            # Execute batch update
            if games_to_update:
                update_values = [(game.name, game.logo_url, game.id) 
                              for game in games_to_update]
                
                cursor.executemany(
                    """UPDATE games SET 
                       name = %s, 
                       logo_url = %s
                       WHERE id = %s""",
                    update_values
                )
                connection.commit()
            
            # Handle state association in batch if provided
            if state_id is not None:
                # Get IDs for all games
                game_ids = [game.id for game in games if game.id]
                
                if game_ids:
                    # Check existing associations in batch
                    format_strings = ','.join(['%s'] * len(game_ids))
                    cursor.execute(
                        f"""SELECT game_id FROM state_games 
                            WHERE state_id = %s AND game_id IN ({format_strings})""",
                        (state_id,) + tuple(game_ids)
                    )
                    
                    existing_associations = {row[0] for row in cursor.fetchall()}
                    
                    # Create new associations for games not already associated
                    associations_to_create = []
                    for game_id in game_ids:
                        if game_id not in existing_associations:
                            associations_to_create.append((state_id, game_id))
                    
                    if associations_to_create:
                        cursor.executemany(
                            "INSERT INTO state_games (state_id, game_id) VALUES (%s, %s)",
                            associations_to_create
                        )
                        connection.commit()
            
            # Combine all saved games
            saved_games = games_to_insert + games_to_update
            
            return saved_games
                
        except Error as e:
            error_message = f"Error saving multiple games to database: {e}"
            print(error_message)
            return []
        finally:
            cursor.close()
            release_connection(connection)
    
    @staticmethod
    def find_all():
        """
        Retrieve all games from the database
        
        Returns:
            list: List of Game objects
        """
        connection = get_pg_connection()
        if connection is None:
            return []
        
        try:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("""
                SELECT id, name, slug, logo_url, created_at, updated_at 
                FROM games 
                ORDER BY name
            """)
            
            games = []
            for row in cursor.fetchall():
                games.append(Game(
                    id=row['id'],
                    name=row['name'],
                    slug=row['slug'],
                    logo_url=row['logo_url'],
                    created_at=row['created_at'],
                    updated_at=row['updated_at']
                ))
                
            return games
                
        except Error as e:
            print(f"Error retrieving games from database: {e}")
            return []
        finally:
            cursor.close()
            release_connection(connection)
    
    @staticmethod
    def find_by_id(game_id):
        """
        Find a game by its ID
        
        Args:
            game_id (int): Game ID to search for
            
        Returns:
            Game or None: Found game or None if not found
        """
        connection = get_pg_connection()
        if connection is None:
            return None
        
        try:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("""
                SELECT id, name, slug, logo_url, created_at, updated_at 
                FROM games 
                WHERE id = %s
            """, (game_id,))
            
            row = cursor.fetchone()
            if row:
                return Game(
                    id=row['id'],
                    name=row['name'],
                    slug=row['slug'],
                    logo_url=row['logo_url'],
                    created_at=row['created_at'],
                    updated_at=row['updated_at']
                )
            return None
                
        except Error as e:
            print(f"Error finding game in database: {e}")
            return None
        finally:
            cursor.close()
            release_connection(connection)
    
    @staticmethod
    def find_by_slug(slug):
        """
        Find a game by its slug
        
        Args:
            slug (str): Game slug to search for
            
        Returns:
            Game or None: Found game or None if not found
        """
        connection = get_pg_connection()
        if connection is None:
            return None
        
        try:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("""
                SELECT id, name, slug, logo_url, created_at, updated_at 
                FROM games 
                WHERE slug = %s
            """, (slug,))
            
            row = cursor.fetchone()
            if row:
                return Game(
                    id=row['id'],
                    name=row['name'],
                    slug=row['slug'],
                    logo_url=row['logo_url'],
                    created_at=row['created_at'],
                    updated_at=row['updated_at']
                )
            return None
                
        except Error as e:
            print(f"Error finding game in database: {e}")
            return None
        finally:
            cursor.close()
            release_connection(connection)
    
    @staticmethod
    def find_games_by_state_id(state_id):
        """
        Find all games associated with a state
        
        Args:
            state_id (int): State ID to search for
            
        Returns:
            list: List of Game objects
        """
        connection = get_pg_connection()
        if connection is None:
            return []
        
        try:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("""
                SELECT g.id, g.name, g.slug, g.logo_url, g.created_at, g.updated_at 
                FROM games g
                JOIN state_games sg ON g.id = sg.game_id
                WHERE sg.state_id = %s
                ORDER BY g.name
            """, (state_id,))
            
            games = []
            for row in cursor.fetchall():
                games.append(Game(
                    id=row['id'],
                    name=row['name'],
                    slug=row['slug'],
                    logo_url=row['logo_url'],
                    created_at=row['created_at'],
                    updated_at=row['updated_at']
                ))
                
            return games
                
        except Error as e:
            print(f"Error finding games by state ID in database: {e}")
            return []
        finally:
            cursor.close()
            release_connection(connection)
    
    @staticmethod
    def associate_game_with_state(game_id, state_id):
        """
        Associate a game with a state
        
        Args:
            game_id (int): Game ID
            state_id (int): State ID
            
        Returns:
            dict: Result of the operation
        """
        connection = get_pg_connection()
        if connection is None:
            return {"success": False, "message": "Database connection failed"}
        
        try:
            cursor = connection.cursor()
            
            # Check if association already exists
            cursor.execute(
                "SELECT id FROM state_games WHERE state_id = %s AND game_id = %s", 
                (state_id, game_id)
            )
            result = cursor.fetchone()
            
            if result:
                return {
                    "success": True, 
                    "action": "unchanged", 
                    "message": "Association already exists"
                }
            
            # Create association
            cursor.execute(
                "INSERT INTO state_games (state_id, game_id) VALUES (%s, %s)",
                (state_id, game_id)
            )
            connection.commit()
            
            return {
                "success": True, 
                "action": "associated", 
                "message": "Game associated with state successfully"
            }
                
        except Error as e:
            error_message = f"Error associating game with state: {e}"
            print(error_message)
            return {"success": False, "message": error_message}
        finally:
            cursor.close()
            release_connection(connection) 