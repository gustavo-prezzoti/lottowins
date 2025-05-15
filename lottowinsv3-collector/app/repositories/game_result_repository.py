"""
GameResult repository for database operations
"""
import json
from mysql.connector import Error
from datetime import datetime
from app.repositories.postgres_database import get_pg_connection, release_connection
from app.models.game_result import GameResult

class GameResultRepository:
    """
    Repository for game result data storage and retrieval
    """
    
    @staticmethod
    def save(game_result):
        """
        Save a game result to the database
        
        Args:
            game_result (GameResult): GameResult object to save
            
        Returns:
            dict: Result of the operation
        """
        connection = get_pg_connection()
        if connection is None:
            return {"success": False, "message": "Database connection failed"}
        
        try:
            cursor = connection.cursor()
            
            # Convert numbers to JSON string if needed
            numbers_json = json.dumps(game_result.numbers) if game_result.numbers else None
            
            # Check if game result already exists
            cursor.execute(
                "SELECT id FROM game_results WHERE game_id = %s AND draw_date = %s AND draw_time IS NULL",
                (game_result.game_id, game_result.draw_date)
            )
            result = cursor.fetchone()
            
            if not result and game_result.draw_time:
                # Try with draw time if provided
                cursor.execute(
                    "SELECT id FROM game_results WHERE game_id = %s AND draw_date = %s AND draw_time = %s",
                    (game_result.game_id, game_result.draw_date, game_result.draw_time)
                )
                result = cursor.fetchone()
            
            if result:
                # Update if it exists
                game_result.id = result[0]
                
                cursor.execute(
                    """UPDATE game_results SET 
                       numbers = %s, 
                       timezone = %s,
                       jackpot = %s, 
                       next_draw_date = %s,
                       next_draw_time = %s,
                       next_jackpot = %s,
                       special_number = %s,
                       collected_at = CURRENT_TIMESTAMP
                       WHERE id = %s""",
                    (
                        numbers_json,
                        game_result.timezone,
                        game_result.jackpot,
                        game_result.next_draw_date,
                        game_result.next_draw_time,
                        game_result.next_jackpot,
                        game_result.special_number,
                        game_result.id
                    )
                )
                connection.commit()
                
                return {
                    "success": True, 
                    "action": "updated", 
                    "game_result_id": game_result.id
                }
            else:
                # Insert if it doesn't exist
                cursor.execute(
                    """INSERT INTO game_results 
                       (game_id, draw_date, draw_time, timezone, numbers, 
                       jackpot, next_draw_date, next_draw_time, next_jackpot, special_number) 
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    (
                        game_result.game_id,
                        game_result.draw_date,
                        game_result.draw_time,
                        game_result.timezone,
                        numbers_json,
                        game_result.jackpot,
                        game_result.next_draw_date,
                        game_result.next_draw_time,
                        game_result.next_jackpot,
                        game_result.special_number
                    )
                )
                connection.commit()
                
                # Get the inserted ID
                game_result.id = cursor.lastrowid
                
                return {
                    "success": True, 
                    "action": "inserted", 
                    "game_result_id": game_result.id
                }
                
        except Error as e:
            error_message = f"Error saving game result to database: {e}"
            print(error_message)
            return {"success": False, "message": error_message}
        finally:
            # Don't close the global connection
            cursor.close()
    
    @staticmethod
    def save_many(game_results):
        """
        Save multiple game results to the database in a batch
        
        Args:
            game_results (list): List of GameResult objects
            
        Returns:
            dict: Result with counts and status
        """
        if not game_results:
            return {"success": True, "inserted": 0, "updated": 0, "unchanged": 0, "total": 0}
            
        connection = get_pg_connection()
        if connection is None:
            return {"success": False, "message": "Database connection failed"}
        
        # Primeiros processamos os jogos que não têm game_id
        games_to_save = []
        for result in game_results:
            if hasattr(result, 'game_object') and result.game_id is None:
                games_to_save.append(result.game_object)

        # Se temos jogos para salvar, vamos salvá-los primeiro
        saved_game_ids = {}
        if games_to_save:
            try:
                from app.repositories.game_repository import GameRepository
                saved_games = GameRepository.save_many(games_to_save)
                
                # Mapear os slugs para IDs
                for game in saved_games:
                    if game.slug and game.id:
                        saved_game_ids[game.slug] = game.id
                
                # Atualizar os resultados com os IDs de jogos
                for result in game_results:
                    if hasattr(result, 'game_slug') and result.game_id is None:
                        if result.game_slug in saved_game_ids:
                            result.game_id = saved_game_ids[result.game_slug]
            except Exception as e:
                print(f"Erro ao salvar jogos antes dos resultados: {e}")
        
        try:
            cursor = connection.cursor()
            
            # Primeiro, identify multi-state games
            game_ids = list(set(gr.game_id for gr in game_results if gr.game_id is not None))
            
            # Se não há IDs válidos após o processamento, retorne
            if not game_ids:
                return {"success": True, "inserted": 0, "updated": 0, "unchanged": 0, "total": 0, "message": "No valid game IDs"}
            
            # Todos os jogos são considerados como não multi-state, já que essa coluna foi removida
            multi_state_games = {}  # Dicionário vazio, todos os jogos serão tratados como regulares
            
            format_strings = ','.join(['%s'] * len(game_ids))
            
            cursor.execute(
                f"SELECT id FROM games WHERE id IN ({format_strings})",
                tuple(game_ids)
            )
            
            # Todos os jogos são considerados como não multi-state, já que essa coluna foi removida
            multi_state_games = {}  # Dicionário vazio, todos os jogos serão tratados como regulares
            
            # Prepare data for batch operations
            to_insert = []
            to_update = []
            unchanged = 0
            update_details = []
            unchanged_details = []
            
            # Get existing results and prepare lookup dictionaries
            existing_regular_results = {}  # For regular games - key: (game_id, draw_date)
            existing_multi_results = {}    # For multi-state games - key: (game_id, draw_date, numbers, jackpot)
            
            # Build query for regular games
            regular_game_clauses = []
            regular_query_params = []
            
            # Build query for multi-state games
            multi_state_clauses = []
            multi_query_params = []
            
            for gr in game_results:
                # Ignore results without game_id
                if gr.game_id is None:
                    continue
                    
                # Todos os jogos são considerados como não multi-state  
                is_multi_state = False
                
                if is_multi_state:
                    # Multi-state game - use game_id, draw_date
                    multi_state_clauses.append("(game_id = %s AND draw_date = %s)")
                    multi_query_params.extend([gr.game_id, gr.draw_date])
                else:
                    # Regular game - use game_id, draw_date (removeu state_id)
                    regular_game_clauses.append("(game_id = %s AND draw_date = %s)")
                    regular_query_params.extend([gr.game_id, gr.draw_date])
            
            # Execute queries for regular games
            if regular_game_clauses:
                query = f"""
                    SELECT id, game_id, draw_date, draw_time, timezone, numbers, 
                           jackpot, next_draw_date, next_draw_time, next_jackpot, special_number
                    FROM game_results
                    WHERE {" OR ".join(regular_game_clauses)}
                """
                
                cursor.execute(query, regular_query_params)
                
                for row in cursor.fetchall():
                    # Primary key (game_id, draw_date)
                    primary_key = (row[1], row[2])
                    # Time key for more specific matching
                    time_key = (row[1], row[2], row[3]) if row[3] else primary_key
                    
                    existing_data = {
                        'id': row[0],
                        'draw_time': row[3],
                        'timezone': row[4],
                        'numbers': row[5],
                        'jackpot': row[6],
                        'next_draw_date': row[7],
                        'next_draw_time': row[8],
                        'next_jackpot': row[9],
                        'special_number': row[10] if len(row) > 10 else None
                    }
                    
                    existing_regular_results[primary_key] = existing_data
                    if row[3]:  # If draw_time is not null
                        existing_regular_results[time_key] = existing_data
            
            # Execute queries for multi-state games
            if multi_state_clauses:
                query = f"""
                    SELECT id, game_id, draw_date, draw_time, timezone, numbers, 
                           jackpot, next_draw_date, next_draw_time, next_jackpot, special_number
                    FROM game_results
                    WHERE {" OR ".join(multi_state_clauses)}
                """
                
                cursor.execute(query, multi_query_params)
                
                for row in cursor.fetchall():
                    # For multi-state, create composite keys based on game_id, draw_date, numbers and jackpot
                    game_id = row[1]
                    draw_date = row[2]
                    numbers = row[5]
                    jackpot = row[6]
                    
                    # Add to lookup with different key combinations
                    multi_key = (game_id, draw_date, numbers, jackpot)
                    
                    existing_data = {
                        'id': row[0],
                        'draw_time': row[3],
                        'timezone': row[4],
                        'numbers': numbers,
                        'jackpot': jackpot,
                        'next_draw_date': row[7],
                        'next_draw_time': row[8],
                        'next_jackpot': row[9],
                        'special_number': row[10] if len(row) > 10 else None
                    }
                    
                    # Add keys for multi-state games
                    existing_multi_results[multi_key] = existing_data
                    
                    # Also add simpler key for draw date check
                    date_key = (game_id, draw_date)
                    if date_key not in existing_multi_results:
                        existing_multi_results[date_key] = []
                    existing_multi_results[date_key].append(existing_data)
            
            # Process each game result
            for game_result in game_results:
                # Ignora resultados sem game_id
                if game_result.game_id is None:
                    continue
                    
                # Todos os jogos são tratados como regulares
                is_multi_state = False
                
                # Convert numbers to string format if needed
                numbers_str = game_result.numbers
                # Já é JSON - não precisamos converter de novo
                if isinstance(numbers_str, str):
                    numbers_json = numbers_str
                else:
                    numbers_json = json.dumps(numbers_str) if numbers_str else None
                
                if is_multi_state:
                    # For multi-state games, check for exact match based on game_id, draw_date, numbers, jackpot
                    multi_key = (game_result.game_id, game_result.draw_date, numbers_json, game_result.jackpot)
                    date_key = (game_result.game_id, game_result.draw_date)
                    
                    if multi_key in existing_multi_results:
                        # Exact duplicate found - keep existing
                        existing = existing_multi_results[multi_key]
                        game_result.id = existing['id']
                        unchanged += 1
                        unchanged_details.append({
                            'id': game_result.id,
                            'game_id': game_result.game_id,
                            'draw_date': str(game_result.draw_date),
                            'message': 'Multi-state exact match'
                        })
                    elif date_key in existing_multi_results:
                        # Check for existing result with same date but maybe different numbers/jackpot
                        existing_variants = existing_multi_results[date_key]
                        
                        # Check if we have an approximate match - similar enough to update
                        for existing in existing_variants:
                            needs_update = False
                            changed_fields = []
                            
                            # Compare numbers
                            if existing['numbers'] != numbers_json:
                                needs_update = True
                                changed_fields.append('numbers')
                            
                            # Compare jackpot
                            if existing['jackpot'] != game_result.jackpot:
                                needs_update = True
                                changed_fields.append('jackpot')
                            
                            # Compare other fields
                            if existing['next_draw_date'] != game_result.next_draw_date:
                                needs_update = True
                                changed_fields.append('next_draw_date')
                            
                            if existing['next_draw_time'] != game_result.next_draw_time:
                                needs_update = True
                                changed_fields.append('next_draw_time')
                            
                            if existing['next_jackpot'] != game_result.next_jackpot:
                                needs_update = True
                                changed_fields.append('next_jackpot')
                                
                            # Compare timezone
                            if existing['timezone'] != game_result.timezone:
                                needs_update = True
                                changed_fields.append('timezone')
                                
                            # Compare special_number
                            if existing['special_number'] != game_result.special_number:
                                needs_update = True
                                changed_fields.append('special_number')
                            
                            # If any field is different, update using the existing record's ID
                            if needs_update:
                                game_result.id = existing['id']
                                to_update.append((
                                    numbers_json,
                                    game_result.timezone,
                                    game_result.jackpot,
                                    game_result.next_draw_date,
                                    game_result.next_draw_time,
                                    game_result.next_jackpot,
                                    game_result.special_number,
                                    game_result.id
                                ))
                                update_details.append({
                                    'id': game_result.id,
                                    'game_id': game_result.game_id,
                                    'draw_date': str(game_result.draw_date),
                                    'changed_fields': changed_fields,
                                    'message': 'Multi-state partial match'
                                })
                                break
                            else:
                                # If fields match but different state, mark as unchanged
                                game_result.id = existing['id']
                                unchanged += 1
                                unchanged_details.append({
                                    'id': game_result.id,
                                    'game_id': game_result.game_id,
                                    'draw_date': str(game_result.draw_date),
                                    'message': 'Multi-state unchanged, different state'
                                })
                                break
                        else:
                            # No update needed, insert new result
                            to_insert.append((
                                game_result.game_id,
                                game_result.draw_date,
                                game_result.draw_time,
                                game_result.timezone,
                                numbers_json,
                                game_result.jackpot,
                                game_result.next_draw_date,
                                game_result.next_draw_time,
                                game_result.next_jackpot,
                                game_result.special_number
                            ))
                    else:
                        # No existing result with this date, insert new
                        to_insert.append((
                            game_result.game_id,
                            game_result.draw_date,
                            game_result.draw_time,
                            game_result.timezone,
                            numbers_json,
                            game_result.jackpot,
                            game_result.next_draw_date,
                            game_result.next_draw_time,
                            game_result.next_jackpot,
                            game_result.special_number
                        ))
                else:
                    # Regular game - use normal keys
                    primary_key = (game_result.game_id, game_result.draw_date)
                    time_key = (game_result.game_id, game_result.draw_date, game_result.draw_time) if game_result.draw_time else primary_key
                    
                    # Try to find with time key first, then fall back to primary key
                    existing = None
                    if time_key in existing_regular_results:
                        existing = existing_regular_results[time_key]
                    elif primary_key in existing_regular_results:
                        existing = existing_regular_results[primary_key]
                    
                    if existing:
                        game_result.id = existing['id']
                        
                        # Compare values to see if an update is needed
                        needs_update = False
                        changed_fields = []
                        
                        # Compare numbers
                        if existing['numbers'] != numbers_json:
                            needs_update = True
                            changed_fields.append('numbers')
                        
                        # Compare other fields
                        if existing['jackpot'] != game_result.jackpot:
                            needs_update = True
                            changed_fields.append('jackpot')
                        
                        if existing['next_draw_date'] != game_result.next_draw_date:
                            needs_update = True
                            changed_fields.append('next_draw_date')
                        
                        if existing['next_draw_time'] != game_result.next_draw_time:
                            needs_update = True
                            changed_fields.append('next_draw_time')
                        
                        if existing['next_jackpot'] != game_result.next_jackpot:
                            needs_update = True
                            changed_fields.append('next_jackpot')
                            
                        # Compare timezone
                        if existing['timezone'] != game_result.timezone:
                            needs_update = True
                            changed_fields.append('timezone')
                            
                        # Compare special_number
                        if existing['special_number'] != game_result.special_number:
                            needs_update = True
                            changed_fields.append('special_number')
                        
                        if needs_update:
                            # Only add to update if data actually changed
                            to_update.append((
                                numbers_json,
                                game_result.timezone,
                                game_result.jackpot,
                                game_result.next_draw_date,
                                game_result.next_draw_time,
                                game_result.next_jackpot,
                                game_result.special_number,
                                game_result.id
                            ))
                            update_details.append({
                                'id': game_result.id,
                                'game_id': game_result.game_id,
                                'draw_date': str(game_result.draw_date),
                                'changed_fields': changed_fields
                            })
                        else:
                            # Record is unchanged
                            unchanged += 1
                            unchanged_details.append({
                                'id': game_result.id,
                                'game_id': game_result.game_id,
                                'draw_date': str(game_result.draw_date)
                            })
                    else:
                        # Verificar mais uma vez se o resultado já existe no banco para jogos multi-estado
                        # Isso é para evitar duplicatas de jogos nacionais que aparecem em vários estados
                        try:
                            # Verifica se já existe um resultado com o mesmo game_id, draw_date e draw_time
                            check_query = """
                                SELECT id FROM game_results 
                                WHERE game_id = %s AND draw_date = %s
                            """
                            params = [game_result.game_id, game_result.draw_date]
                            
                            if game_result.draw_time:
                                check_query += " AND draw_time = %s"
                                params.append(game_result.draw_time)
                            else:
                                check_query += " AND draw_time IS NULL"
                                
                            cursor.execute(check_query, params)
                            existing_result = cursor.fetchone()
                            
                            if existing_result:
                                # Já existe um resultado com esta combinação, não inserir novamente
                                game_result.id = existing_result[0]
                                unchanged += 1
                                print(f"Duplicata detectada manualmente: game_id={game_result.game_id}, " +
                                      f"draw_date={game_result.draw_date}, draw_time={game_result.draw_time}")
                                unchanged_details.append({
                                    'id': game_result.id,
                                    'game_id': game_result.game_id,
                                    'draw_date': str(game_result.draw_date),
                                    'message': 'Duplicate entry detected'
                                })
                            else:
                                # Ainda não existe, podemos inserir
                                to_insert.append((
                                    game_result.game_id,
                                    game_result.draw_date,
                                    game_result.draw_time,
                                    game_result.timezone,
                                    numbers_json,
                                    game_result.jackpot,
                                    game_result.next_draw_date,
                                    game_result.next_draw_time,
                                    game_result.next_jackpot,
                                    game_result.special_number
                                ))
                        except Exception as e:
                            print(f"Erro ao verificar duplicata: {e}")
                            # Em caso de erro na verificação, não inserimos para evitar duplicatas
                            unchanged += 1
            
            # Execute batch operations
            inserted = 0
            updated = 0
            insert_errors = 0
            
            # Update batch
            if to_update:
                try:
                    cursor.executemany(
                        """UPDATE game_results SET 
                           numbers = %s, 
                           timezone = %s,
                           jackpot = %s, 
                           next_draw_date = %s,
                           next_draw_time = %s,
                           next_jackpot = %s,
                           special_number = %s,
                           collected_at = CURRENT_TIMESTAMP
                           WHERE id = %s""",
                        to_update
                    )
                    updated = len(to_update)
                except Exception as e:
                    print(f"Erro ao atualizar lote: {e}")
            
            # Insert batch - one at a time to avoid failure of entire batch
            if to_insert:
                # Em vez de inserir tudo em massa, vamos inserir um por um para evitar que uma falha interrompa todo o lote
                for item in to_insert:
                    try:
                        cursor.execute(
                            """INSERT INTO game_results 
                              (game_id, draw_date, draw_time, timezone, numbers, 
                              jackpot, next_draw_date, next_draw_time, next_jackpot, special_number) 
                              VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                            item
                        )
                        # Commit após cada inserção bem-sucedida
                        connection.commit()
                        inserted += 1
                    except Exception as e:
                        # Se houver erro (provavelmente duplicata), fazemos rollback e continuamos
                        connection.rollback()
                        
                        # Verificar se é um erro de duplicata e tentar fazer update se necessário
                        if "Duplicate" in str(e) or "duplicate" in str(e):
                            try:
                                # Obter o registro existente
                                game_id = item[0]
                                draw_date = item[1]
                                draw_time = item[2]
                                
                                # Consultar o registro existente
                                if draw_time:
                                    cursor.execute(
                                        """SELECT id, numbers, timezone, jackpot, next_draw_date, next_draw_time, next_jackpot, special_number 
                                           FROM game_results 
                                           WHERE game_id = %s AND draw_date = %s AND draw_time = %s""",
                                        (game_id, draw_date, draw_time)
                                    )
                                else:
                                    cursor.execute(
                                        """SELECT id, numbers, timezone, jackpot, next_draw_date, next_draw_time, next_jackpot, special_number 
                                           FROM game_results 
                                           WHERE game_id = %s AND draw_date = %s AND draw_time IS NULL""",
                                        (game_id, draw_date)
                                    )
                                
                                existing = cursor.fetchone()
                                if existing:
                                    existing_id = existing[0]
                                    existing_numbers = existing[1]
                                    existing_timezone = existing[2]
                                    existing_jackpot = existing[3]
                                    existing_next_draw_date = existing[4]
                                    existing_next_draw_time = existing[5]
                                    existing_next_jackpot = existing[6]
                                    existing_special_number = existing[7] if len(existing) > 7 else None
                                    
                                    # Verificar se há alterações
                                    needs_update = False
                                    
                                    # item[4] é numbers, item[3] é timezone, etc.
                                    if existing_numbers != item[4] or existing_timezone != item[3] or existing_jackpot != item[5] or \
                                       existing_next_draw_date != item[6] or existing_next_draw_time != item[7] or existing_next_jackpot != item[8] or \
                                       existing_special_number != item[9]:
                                        needs_update = True
                                    
                                    if needs_update:
                                        # Fazer update
                                        cursor.execute(
                                            """UPDATE game_results SET 
                                               numbers = %s, 
                                               timezone = %s,
                                               jackpot = %s, 
                                               next_draw_date = %s,
                                               next_draw_time = %s,
                                               next_jackpot = %s,
                                               special_number = %s,
                                               collected_at = CURRENT_TIMESTAMP
                                               WHERE id = %s""",
                                            (item[4], item[3], item[5], item[6], item[7], item[8], item[9], existing_id)
                                        )
                                        connection.commit()
                                        updated += 1
                                        print(f"Registro duplicado atualizado: game_id={game_id}, date={draw_date}")
                                    else:
                                        unchanged += 1
                                        print(f"Registro duplicado sem alterações: game_id={game_id}, date={draw_date}")
                            except Exception as update_error:
                                print(f"Erro ao tentar atualizar registro duplicado: {update_error}")
                                connection.rollback()
                                insert_errors += 1
                        else:
                            # Outro tipo de erro
                            print(f"Erro ao inserir item (game_id={item[0]}, date={item[1]}): {e}")
                            insert_errors += 1
            
            print(f"Game results: {inserted} inserted, {updated} updated, {unchanged} unchanged, {insert_errors} insert errors")
            
            return {
                "success": True,
                "inserted": inserted,
                "updated": updated,
                "unchanged": unchanged,
                "insert_errors": insert_errors,
                "total": inserted + updated + unchanged,
                "update_details": update_details if updated > 0 else [],
                "unchanged_details": unchanged_details if unchanged > 0 else []
            }
                
        except Error as e:
            error_message = f"Error saving game results to database: {e}"
            print(error_message)
            return {"success": False, "message": error_message}
        finally:
            # Don't close the global connection
            cursor.close()
    
    @staticmethod
    def find_by_id(result_id):
        """
        Find a game result by its ID
        
        Args:
            result_id (int): Result ID to search for
            
        Returns:
            GameResult or None: Found game result or None if not found
        """
        connection = get_pg_connection()
        if connection is None:
            return None
        
        try:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("""
                SELECT id, game_id, draw_date, draw_time, timezone, numbers, 
                       jackpot, next_draw_date, next_draw_time, next_jackpot, special_number, collected_at
                FROM game_results 
                WHERE id = %s
            """, (result_id,))
            
            row = cursor.fetchone()
            if row:
                # Parse JSON numbers
                numbers = json.loads(row['numbers']) if row['numbers'] else None
                
                return GameResult(
                    id=row['id'],
                    game_id=row['game_id'],
                    draw_date=row['draw_date'],
                    draw_time=row['draw_time'],
                    timezone=row['timezone'],
                    numbers=numbers,
                    jackpot=row['jackpot'],
                    next_draw_date=row['next_draw_date'],
                    next_draw_time=row['next_draw_time'],
                    next_jackpot=row['next_jackpot'],
                    special_number=row['special_number'],
                    collected_at=row['collected_at']
                )
            return None
                
        except Error as e:
            print(f"Error finding game result in database: {e}")
            return None
        finally:
            # Don't close the global connection
            cursor.close()
    
    @staticmethod
    def find_latest_by_game_and_state(game_id, state_id=None, limit=1):
        """
        Find the latest game results for a specific game (state_id é opcional agora)
        
        Args:
            game_id (int): Game ID
            state_id (int, optional): State ID (now optional)
            limit (int): Maximum number of results to return
            
        Returns:
            list: List of GameResult objects
        """
        connection = get_pg_connection()
        if connection is None:
            return []
        
        try:
            cursor = connection.cursor(dictionary=True)
            
            # Consulta agora ignora state_id que foi removido
            cursor.execute("""
                SELECT id, game_id, draw_date, draw_time, timezone, numbers, 
                       jackpot, next_draw_date, next_draw_time, next_jackpot, special_number, collected_at
                FROM game_results 
                WHERE game_id = %s
                ORDER BY draw_date DESC, draw_time DESC
                LIMIT %s
            """, (game_id, limit))
            
            results = []
            for row in cursor.fetchall():
                # Parse JSON numbers
                numbers = json.loads(row['numbers']) if row['numbers'] else None
                
                results.append(GameResult(
                    id=row['id'],
                    game_id=row['game_id'],
                    draw_date=row['draw_date'],
                    draw_time=row['draw_time'],
                    timezone=row['timezone'],
                    numbers=numbers,
                    jackpot=row['jackpot'],
                    next_draw_date=row['next_draw_date'],
                    next_draw_time=row['next_draw_time'],
                    next_jackpot=row['next_jackpot'],
                    special_number=row['special_number'],
                    collected_at=row['collected_at']
                ))
                
            return results
                
        except Error as e:
            print(f"Error finding latest game results in database: {e}")
            return []
        finally:
            # Don't close the global connection
            cursor.close()
    
    @staticmethod
    def find_by_date_range(game_id, state_id=None, start_date=None, end_date=None):
        """
        Find game results for a specific game within a date range (state_id é opcional agora)
        
        Args:
            game_id (int): Game ID
            state_id (int, optional): State ID (now optional)
            start_date (date): Start date
            end_date (date): End date
            
        Returns:
            list: List of GameResult objects
        """
        connection = get_pg_connection()
        if connection is None:
            return []
        
        try:
            cursor = connection.cursor(dictionary=True)
            
            # Query now ignores state_id
            query = """
                SELECT id, game_id, draw_date, draw_time, timezone, numbers, 
                    jackpot, next_draw_date, next_draw_time, next_jackpot, special_number, collected_at
                FROM game_results 
                WHERE game_id = %s
            """
                  
            params = [game_id]
            
            # Add date range filter if provided
            if start_date and end_date:
                query += " AND draw_date BETWEEN %s AND %s"
                params.extend([start_date, end_date])
            elif start_date:
                query += " AND draw_date >= %s"
                params.append(start_date)
            elif end_date:
                query += " AND draw_date <= %s"
                params.append(end_date)
                
            # Add order by
            query += " ORDER BY draw_date ASC, draw_time ASC"
            
            cursor.execute(query, params)
            
            results = []
            for row in cursor.fetchall():
                # Parse JSON numbers
                numbers = json.loads(row['numbers']) if row['numbers'] else None
                
                results.append(GameResult(
                    id=row['id'],
                    game_id=row['game_id'],
                    draw_date=row['draw_date'],
                    draw_time=row['draw_time'],
                    timezone=row['timezone'],
                    numbers=numbers,
                    jackpot=row['jackpot'],
                    next_draw_date=row['next_draw_date'],
                    next_draw_time=row['next_draw_time'],
                    next_jackpot=row['next_jackpot'],
                    special_number=row['special_number'],
                    collected_at=row['collected_at']
                ))
                
            return results
                
        except Error as e:
            print(f"Error finding game results by date range in database: {e}")
            return []
        finally:
            # Don't close the global connection
            cursor.close()
    
    @staticmethod
    def find_upcoming_draws():
        """
        Find upcoming draws (based on next_draw_date)
        
        Returns:
            list: List of GameResult objects
        """
        connection = get_pg_connection()
        if connection is None:
            return []
        
        try:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("""
                SELECT gr.id, gr.game_id, gr.draw_date, gr.draw_time, gr.timezone, gr.numbers, 
                       gr.jackpot, gr.next_draw_date, gr.next_draw_time, gr.next_jackpot, gr.special_number, gr.collected_at,
                       g.name as game_name, s.name as state_name, s.code as state_code, sg.state_id
                FROM game_results gr
                JOIN games g ON gr.game_id = g.id
                LEFT JOIN state_games sg ON gr.game_id = sg.game_id
                LEFT JOIN states s ON sg.state_id = s.id
                WHERE gr.next_draw_date >= CURDATE()
                ORDER BY gr.next_draw_date ASC, gr.next_draw_time ASC
                LIMIT 20
            """)
            
            results = []
            for row in cursor.fetchall():
                # Parse JSON numbers
                numbers = json.loads(row['numbers']) if row['numbers'] else None
                
                game_result = GameResult(
                    id=row['id'],
                    game_id=row['game_id'],
                    draw_date=row['draw_date'],
                    draw_time=row['draw_time'],
                    timezone=row['timezone'],
                    numbers=numbers,
                    jackpot=row['jackpot'],
                    next_draw_date=row['next_draw_date'],
                    next_draw_time=row['next_draw_time'],
                    next_jackpot=row['next_jackpot'],
                    special_number=row['special_number'],
                    collected_at=row['collected_at'],
                    state_id=row['state_id']  # Agora obtém o state_id da tabela associativa
                )
                
                # Add extra metadata
                game_result.game_name = row['game_name']
                game_result.state_name = row['state_name']
                game_result.state_code = row['state_code']
                
                results.append(game_result)
                
            return results
                
        except Error as e:
            print(f"Error finding upcoming draws in database: {e}")
            return []
        finally:
            # Don't close the global connection
            cursor.close()
                
    @staticmethod
    def log_collection_attempt(state_code, url, status="pending"):
        """
        Log a collection attempt
        
        Args:
            state_code (str): State code
            url (str): URL being collected
            status (str): Status of collection
            
        Returns:
            int or None: ID of the log entry
        """
        connection = get_pg_connection()
        if connection is None:
            return None
        
        try:
            cursor = connection.cursor()
            
            cursor.execute(
                """INSERT INTO collection_log 
                   (state_code, url, status, start_time) 
                   VALUES (%s, %s, %s, CURRENT_TIMESTAMP)""",
                (state_code, url, status)
            )
            connection.commit()
            
            # Get the inserted ID
            log_id = cursor.lastrowid
            return log_id
                
        except Error as e:
            print(f"Error logging collection attempt: {e}")
            return None
        finally:
            # Don't close the global connection
            cursor.close()
    
    @staticmethod
    def update_collection_log(log_id, status, games_collected=0, error_message=None):
        """
        Update a collection log entry
        
        Args:
            log_id (int): Log entry ID
            status (str): New status
            games_collected (int): Number of games collected
            error_message (str): Error message if any
            
        Returns:
            bool: Success or failure
        """
        connection = get_pg_connection()
        if connection is None:
            return False
        
        try:
            cursor = connection.cursor()
            
            cursor.execute(
                """UPDATE collection_log SET 
                   status = %s,
                   games_collected = %s,
                   error_message = %s,
                   end_time = CURRENT_TIMESTAMP
                   WHERE id = %s""",
                (status, games_collected, error_message, log_id)
            )
            connection.commit()
            
            return True
                
        except Error as e:
            print(f"Error updating collection log: {e}")
            return False
        finally:
            # Don't close the global connection
            cursor.close() 