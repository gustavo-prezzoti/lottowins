"""
Game collector service for fetching lottery game data
"""
import re
import json
import requests
import time
import os
from datetime import datetime, date, timedelta
from bs4 import BeautifulSoup
from app.models.game import Game
from app.models.game_result import GameResult
from app.repositories.game_repository import GameRepository
from app.repositories.game_result_repository import GameResultRepository
from app.repositories.state_repository import StateRepository
from app.repositories.db_engine import get_raw_connection, get_engine
import logging
import threading
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text
import traceback

logger = logging.getLogger(__name__)

class GameCollectorService:
    """
    Service for collecting lottery game data from lotterycorner.com
    """
    BASE_URL = "https://www.lotterycorner.com"
    IMAGES_DIR = "static/images/logos"  # Diretório onde as imagens serão salvas
    
    # Criar diretório de imagens se não existir
    os.makedirs(IMAGES_DIR, exist_ok=True)
    
    # List of common multi-state games for identification
    MULTI_STATE_GAMES = [
        "Powerball", "Mega Millions", "Lucky for Life", "Cash4Life", 
        "Lotto America", "2by2", "Tri-State"
    ]
    
    # Shared database connection for the entire collection process
    _shared_connection = None
    _connection_lock = threading.Lock()
    # Flag to track if we're in a batch collection
    _batch_collection_active = False
    
    @classmethod
    def _get_shared_connection(cls):
        """Get or create a shared database connection"""
        with cls._connection_lock:
            if cls._shared_connection is None:
                cls._shared_connection = get_raw_connection()
                if cls._shared_connection:
                    logger.info("Created shared database connection for collection process")
                else:
                    logger.error("Failed to create shared database connection")
            return cls._shared_connection
    
    @classmethod
    def _release_shared_connection(cls):
        """Release the shared database connection only if not in a batch collection"""
        with cls._connection_lock:
            # Only release if not in batch mode
            if not cls._batch_collection_active and cls._shared_connection:
                try:
                    cls._shared_connection.close()
                    cls._shared_connection = None
                    logger.info("Released shared database connection")
                except Exception as e:
                    logger.error(f"Error releasing shared connection: {e}")
                    cls._shared_connection = None
    
    @classmethod
    def start_batch_collection(cls):
        """Mark the beginning of a batch collection to keep the shared connection"""
        with cls._connection_lock:
            cls._batch_collection_active = True
            logger.info("Começando coleta em lote - mantendo conexão compartilhada")
    
    @classmethod
    def end_batch_collection(cls):
        """Mark the end of a batch collection and release the shared connection"""
        with cls._connection_lock:
            cls._batch_collection_active = False
            if cls._shared_connection:
                try:
                    cls._shared_connection.close()
                    cls._shared_connection = None
                    logger.info("Coleta em lote finalizada - conexão compartilhada liberada")
                except Exception as e:
                    logger.error(f"Erro ao finalizar coleta em lote: {e}")
                    cls._shared_connection = None
    
    @classmethod
    def _download_image(cls, image_url, state_code, game_slug):
        """
        Download an image and save it locally
        
        Args:
            image_url (str): URL of the image to download
            state_code (str): State code (não usado na estrutura de diretórios)
            game_slug (str): Game slug for filename
            
        Returns:
            str: Local path to the saved image or None if failed
        """
        try:
            # Ensure the URL is absolute
            if image_url.startswith('/'):
                image_url = f"https://www.lotterycorner.com{image_url}"
            
            # Create directory structure if it doesn't exist
            # Não usamos mais o estado na estrutura de diretórios para evitar duplicação
            os.makedirs(cls.IMAGES_DIR, exist_ok=True)
            
            # Determine file extension from URL
            extension = "webp"  # Default extension
            if "." in image_url.split("/")[-1]:
                extension = image_url.split(".")[-1]
                
            # Create filename - usando apenas o slug do jogo
            filename = f"{game_slug}.{extension}"
            # Usar sempre barras normais para caminhos de URL, mesmo no Windows
            local_path = os.path.join(cls.IMAGES_DIR, filename).replace('\\', '/')
            
            # Check if file already exists
            if os.path.exists(local_path):
                print(f"Imagem já existe localmente: {local_path}")
                return local_path
            
            # Download the image
            print(f"Baixando imagem de {image_url} para {local_path}")
            response = requests.get(image_url, timeout=10)
            response.raise_for_status()
            
            # Save the image
            with open(local_path, 'wb') as f:
                f.write(response.content)
                
            print(f"Imagem salva com sucesso: {local_path}")
            return local_path
        except Exception as e:
            print(f"Erro ao baixar imagem {image_url}: {e}")
            return None
    
    @classmethod
    def collect_games_by_state(cls, state_code, save_to_db=True):
        """
        Collect games and their results for a specific state
        
        Args:
            state_code (str): State code to collect games for
            save_to_db (bool): Whether to save results to database
            
        Returns:
            dict: Result of the operation
        """
        # Get shared database connection
        connection = cls._get_shared_connection()
        
        # Get state from database
        state = StateRepository.find_by_code(state_code)
        logger.info(f"Retrieving state with code: {state_code}, found: {state is not None}")
        
        if not state:
            logger.error(f"State with code '{state_code}' not found in database")
            return {
                "success": False,
                "message": f"State with code '{state_code}' not found in database"
            }
        
        # Verify that state is properly loaded with id and other attributes
        if not hasattr(state, 'id') or not state.id:
            logger.error(f"State object invalid for code '{state_code}': {state}")
            return {
                "success": False,
                "message": f"Invalid state data for code '{state_code}'"
            }
        
        logger.info(f"Successfully retrieved state: {state.code} (ID: {state.id}) - {state.name}")
        
        # Log collection attempt
        log_id = None
        if save_to_db:
            state_url = f"{cls.BASE_URL}/{state_code.lower()}"
            log_id = GameResultRepository.log_collection_attempt(
                state_code, state_url, "pending"
            )
        
        try:
            # Making HTTP request to state's page
            state_url = f"{cls.BASE_URL}/{state_code.lower()}"
            response = requests.get(state_url)
            response.raise_for_status()
            
            # Parsing HTML
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find the lottery games
            games_collected = 0
            games_data = []
            
            # Find game sections
            game_sections = soup.find_all('div', class_='card')
            if not game_sections:
                result = {
                    "success": False,
                    "message": f"No games found for state {state_code}",
                    "games_collected": 0
                }
                if log_id and save_to_db:
                    GameResultRepository.update_collection_log(log_id, "failed", 0, result["message"])
                return result
            
            # Get games to process
            game_sections_to_process = []
            for section in game_sections:
                # Skip ad placeholders and non-game cards
                if 'ads-placeholder' in str(section):
                    continue
                
                card_header = section.find('div', class_='card-header')
                if not card_header:
                    continue
                
                # Extract game info
                title_tag = card_header.find('h3')
                if not title_tag:
                    continue
                
                game_sections_to_process.append((section, card_header, title_tag))
            
            # Save all games at once and get their IDs
            if save_to_db and game_sections_to_process:
                # Prepare all games first
                games_to_save = []
                game_names = set()  # Track unique game names to avoid duplicates
                
                for section, card_header, title_tag in game_sections_to_process:
                    game_name = title_tag.text.strip()
                    
                    # Skip if we've already seen this game name in this batch
                    if game_name in game_names:
                        continue
                        
                    game_names.add(game_name)
                    game_slug = cls._generate_slug(game_name)
                    
                    # Find logo URL and download image
                    logo_url = None
                    local_image_path = None
                    img_tag = card_header.find('img')
                    if img_tag and 'src' in img_tag.attrs:
                        src_url = img_tag['src']
                        # Verificar se o URL é relativo e adicionar o domínio se necessário
                        if src_url.startswith('/'):
                            full_url = f"https://www.lotterycorner.com{src_url}"
                        else:
                            full_url = src_url
                            
                        # Baixar a imagem e obter o caminho local
                        local_image_path = cls._download_image(full_url, state_code, game_slug)
                        
                        # Usar o caminho local como logo_url se o download foi bem-sucedido
                        if local_image_path:
                            logo_url = local_image_path
                        else:
                            # Fallback para a URL original se o download falhar
                            logo_url = full_url
                            print(f"Usando URL original como fallback: {logo_url}")
                    else:
                        print(f"Nenhum logo encontrado para {game_name}")
                    
                    # Check if this is a multi-state game
                    is_multi_state = False
                    for mg_name in cls.MULTI_STATE_GAMES:
                        if mg_name.lower() in game_name.lower():
                            is_multi_state = True
                            break
                    
                    # Create game with multi-state flag
                    game = Game(
                        name=game_name, 
                        slug=game_slug, 
                        logo_url=logo_url,
                        is_multi_state=is_multi_state
                    )
                    games_to_save.append(game)
                
                # Save all games at once and get their IDs
                saved_games = GameRepository.save_many(games_to_save, state.id)
                
                # Create a map of game name to saved game for easy lookup
                game_map = {game.name: game for game in saved_games}
                
                # Collect game results in one batch
                game_results_to_save = []
                
                # Track unique game_id, state_id, draw_date combinations to avoid duplicates
                unique_result_keys = set()
                
                # Process game results with the saved game IDs
                for section, card_header, title_tag in game_sections_to_process:
                    game_name = title_tag.text.strip()
                    
                    # Get the saved game from our map
                    if game_name in game_map:
                        game = game_map[game_name]
                        
                        # Extract result data (dict)
                        result_data = cls._extract_game_results(section, game.id, state.id)
                        if result_data:
                            # Para jogos multi-state (verificamos pelo nome do jogo), use apenas game_id e draw_date como chave
                            is_multi_state = any(multi_name in game.name for multi_name in cls.MULTI_STATE_GAMES)
                            
                            if is_multi_state:
                                result_key = (game.id, str(result_data.get("draw_date")))
                                
                                # Check if this multi-state game result already exists in the database
                                # Compare draw_date, numbers, and jackpot to determine if it's the same result
                                if save_to_db:
                                    cursor = None
                                    try:
                                        cursor = connection.cursor()
                                        cursor.execute("""
                                            SELECT id, numbers, jackpot FROM game_results 
                                            WHERE game_id = %s AND draw_date = %s
                                        """, (game.id, result_data.get("draw_date")))
                                        
                                        existing_results = cursor.fetchall()
                                        skip_result = False
                                        
                                        if existing_results:
                                            # Compare numbers and jackpot to see if it's the same result
                                            current_numbers = result_data.get("numbers")
                                            current_jackpot = result_data.get("jackpot")
                                            
                                            for existing_id, existing_numbers, existing_jackpot in existing_results:
                                                # If numbers and jackpot are the same, it's a duplicate
                                                if (existing_numbers == current_numbers and
                                                    (existing_jackpot == current_jackpot or 
                                                     (existing_jackpot is None and current_jackpot is None))):
                                                    print(f"Skipping duplicate multi-state result for game {game_name} on {result_data.get('draw_date')} - same numbers and jackpot")
                                                    skip_result = True
                                        
                                        if skip_result:
                                            continue
                                    except Exception as e:
                                        print(f"Error checking for existing multi-state result: {e}")
                                    finally:
                                        if cursor:
                                            cursor.close()
                            else:
                                # Regular state-specific game
                                result_key = (game.id, state.id, str(result_data.get("draw_date")))
                            
                            # Skip if we've already processed this result in this batch
                            if result_key in unique_result_keys:
                                print(f"Skipping duplicate result for game {game_name} on {result_data.get('draw_date')}")
                                continue
                                
                            unique_result_keys.add(result_key)
                            games_collected += 1
                            
                            # Create and add to game results batch
                            game_result = GameResult(**result_data)
                            game_results_to_save.append(game_result)
                            
                            # Add to games data
                            games_data.append({
                                "game": game.to_dict(),
                                "result": result_data
                            })
                
                # Save all game results at once
                if game_results_to_save:
                    save_result = GameResultRepository.save_many(game_results_to_save)
                    print(f"Game results save stats: {save_result.get('inserted', 0)} inserted, {save_result.get('updated', 0)} updated, {save_result.get('unchanged', 0)} unchanged")
            else:
                # Process without saving to database
                for section, card_header, title_tag in game_sections_to_process:
                    game_name = title_tag.text.strip()
                    game_slug = cls._generate_slug(game_name)
                    
                    # Find logo URL and download image
                    logo_url = None
                    local_image_path = None
                    img_tag = card_header.find('img')
                    if img_tag and 'src' in img_tag.attrs:
                        src_url = img_tag['src']
                        # Verificar se o URL é relativo e adicionar o domínio se necessário
                        if src_url.startswith('/'):
                            full_url = f"https://www.lotterycorner.com{src_url}"
                        else:
                            full_url = src_url
                            
                        # Baixar a imagem e obter o caminho local
                        local_image_path = cls._download_image(full_url, state_code, game_slug)
                        
                        # Usar o caminho local como logo_url se o download foi bem-sucedido
                        if local_image_path:
                            logo_url = local_image_path
                        else:
                            # Fallback para a URL original se o download falhar
                            logo_url = full_url
                            print(f"Usando URL original como fallback: {logo_url}")
                    else:
                        print(f"Nenhum logo encontrado para {game_name}")
                    
                    # Create game
                    game = Game(name=game_name, slug=game_slug, logo_url=logo_url)
                    
                    # Extract results
                    result_data = cls._extract_game_results(section, game.id, state.id)
                    if result_data:
                        games_collected += 1
                        
                        # Add to games data
                        games_data.append({
                            "game": game.to_dict(),
                            "result": result_data
                        })
            
            # Prepare result
            result = {
                "success": True,
                "state": state.to_dict(),
                "games_collected": games_collected,
                "games": games_data
            }
            
            # Update log
            if log_id and save_to_db:
                GameResultRepository.update_collection_log(
                    log_id, "success", games_collected, None
                )
            
            return result
            
        except requests.exceptions.RequestException as e:
            error_message = f"Error making request to state page: {e}"
            print(error_message)
            
            if log_id and save_to_db:
                GameResultRepository.update_collection_log(log_id, "failed", 0, error_message)
                
            return {
                "success": False,
                "message": error_message,
                "games_collected": 0
            }
        except Exception as e:
            error_message = f"Error processing state page: {e}"
            print(error_message)
            
            if log_id and save_to_db:
                GameResultRepository.update_collection_log(log_id, "failed", 0, error_message)
                
            return {
                "success": False,
                "message": error_message,
                "games_collected": 0
            }
    
    @classmethod
    def collect_games_by_date(cls, state_code, year, month, day, save_to_db=True):
        """
        Collect games and their results for a specific state and date
        
        Args:
            state_code (str): State code to collect games for
            year (int): Year
            month (int): Month
            day (int): Day
            save_to_db (bool): Whether to save results to database
            
        Returns:
            dict: Result of the operation
        """
        # Get shared database connection
        connection = cls._get_shared_connection()
        
        # Get state from database
        state = StateRepository.find_by_code(state_code)
        logger.info(f"Retrieving state with code: {state_code}, found: {state is not None}")
        
        if not state:
            logger.error(f"State with code '{state_code}' not found in database")
            return {
                "success": False,
                "message": f"State with code '{state_code}' not found in database"
            }
        
        # Verify that state is properly loaded with id and other attributes
        if not hasattr(state, 'id') or not state.id:
            logger.error(f"State object invalid for code '{state_code}': {state}")
            return {
                "success": False,
                "message": f"Invalid state data for code '{state_code}'"
            }
        
        logger.info(f"Successfully retrieved state: {state.code} (ID: {state.id}) - {state.name}")
        
        # Format date for URL
        date_str = f"{year}/{month}/{day}"
        
        # Log collection attempt
        log_id = None
        if save_to_db:
            state_url = f"{cls.BASE_URL}/{state_code.lower()}/{date_str}"
            log_id = GameResultRepository.log_collection_attempt(
                state_code, state_url, "pending"
            )
        
        try:
            # Making HTTP request to state's page with date
            state_url = f"{cls.BASE_URL}/{state_code.lower()}/{date_str}"
            response = requests.get(state_url)
            response.raise_for_status()
            
            # Parsing HTML
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find the lottery games
            games_collected = 0
            games_data = []
            
            # Find game sections (cards)
            game_sections = soup.find_all('div', class_='card')
            if not game_sections:
                result = {
                    "success": False,
                    "message": f"No games found for state {state_code} on {date_str}",
                    "games_collected": 0
                }
                logger.warning(f"No game sections found on page for state {state_code} on {date_str}")
                if log_id and save_to_db:
                    GameResultRepository.update_collection_log(log_id, "failed", 0, result["message"])
                return result
            
            logger.info(f"Found {len(game_sections)} potential game sections for {state_code} on {date_str}")
            
            # Get games to process
            game_sections_to_process = []
            for section in game_sections:
                # Skip ad placeholders and non-game cards
                if 'ads-placeholder' in str(section):
                    continue
                
                card_header = section.find('div', class_='card-header')
                if not card_header:
                    continue
                
                # Extract game info
                title_tag = card_header.find('h3')
                if not title_tag:
                    continue
                
                game_sections_to_process.append((section, card_header, title_tag))
            
            if not game_sections_to_process:
                logger.warning(f"Found {len(game_sections)} sections but none were valid games for {state_code} on {date_str}")
                result = {
                    "success": False,
                    "message": f"No valid games found for state {state_code} on {date_str}",
                    "games_collected": 0
                }
                if log_id and save_to_db:
                    GameResultRepository.update_collection_log(log_id, "failed", 0, result["message"])
                return result
            
            logger.info(f"Processing {len(game_sections_to_process)} valid game sections for {state_code} on {date_str}")
            
            # Save all games at once and get their IDs
            if save_to_db and game_sections_to_process:
                # Prepare all games first
                games_to_save = []
                
                for section, card_header, title_tag in game_sections_to_process:
                    game_name = title_tag.text.strip()
                    game_slug = cls._generate_slug(game_name)
                    
                    # Find logo URL and download image
                    logo_url = None
                    local_image_path = None
                    img_tag = card_header.find('img')
                    if img_tag and 'src' in img_tag.attrs:
                        src_url = img_tag['src']
                        # Verificar se o URL é relativo e adicionar o domínio se necessário
                        if src_url.startswith('/'):
                            full_url = f"https://www.lotterycorner.com{src_url}"
                        else:
                            full_url = src_url
                            
                        # Baixar a imagem e obter o caminho local
                        local_image_path = cls._download_image(full_url, state_code, game_slug)
                        
                        # Usar o caminho local como logo_url se o download foi bem-sucedido
                        if local_image_path:
                            logo_url = local_image_path
                        else:
                            # Fallback para a URL original se o download falhar
                            logo_url = full_url
                            print(f"Usando URL original como fallback: {logo_url}")
                    else:
                        print(f"Nenhum logo encontrado para {game_name}")
                    
                    # Create game
                    game = Game(name=game_name, slug=game_slug, logo_url=logo_url)
                    games_to_save.append(game)
                
                # Save all games at once and get their IDs
                saved_games = GameRepository.save_many(games_to_save, state.id)
                
                # Collect game results in one batch
                game_results_to_save = []
                
                # Process game results with the saved game IDs
                for i, (section, _, _) in enumerate(game_sections_to_process):
                    if i < len(saved_games):
                        game = saved_games[i]
                        
                        # Extract result data
                        result_data = cls._extract_game_results(section, game.id, state.id)
                        if result_data:
                            # Force date to match requested date
                            result_data["draw_date"] = datetime(year, month, day).date()
                            
                            games_collected += 1
                            
                            # Create and add to game results batch
                            game_result = GameResult(**result_data)
                            game_results_to_save.append(game_result)
                            
                            # Add to games data
                            games_data.append({
                                "game": game.to_dict(),
                                "result": result_data
                            })
                
                # Save all game results at once
                if game_results_to_save:
                    GameResultRepository.save_many(game_results_to_save)
            else:
                # Process without saving to database
                for section, card_header, title_tag in game_sections_to_process:
                    game_name = title_tag.text.strip()
                    game_slug = cls._generate_slug(game_name)
                    
                    # Find logo URL and download image
                    logo_url = None
                    local_image_path = None
                    img_tag = card_header.find('img')
                    if img_tag and 'src' in img_tag.attrs:
                        src_url = img_tag['src']
                        # Verificar se o URL é relativo e adicionar o domínio se necessário
                        if src_url.startswith('/'):
                            full_url = f"https://www.lotterycorner.com{src_url}"
                        else:
                            full_url = src_url
                            
                        # Baixar a imagem e obter o caminho local
                        local_image_path = cls._download_image(full_url, state_code, game_slug)
                        
                        # Usar o caminho local como logo_url se o download foi bem-sucedido
                        if local_image_path:
                            logo_url = local_image_path
                        else:
                            # Fallback para a URL original se o download falhar
                            logo_url = full_url
                            print(f"Usando URL original como fallback: {logo_url}")
                    else:
                        print(f"Nenhum logo encontrado para {game_name}")
                    
                    # Create game
                    game = Game(name=game_name, slug=game_slug, logo_url=logo_url)
                    
                    # Extract results
                    result_data = cls._extract_game_results(section, game.id, state.id)
                    if result_data:
                        # Force date to match requested date
                        result_data["draw_date"] = datetime(year, month, day).date()
                        
                        games_collected += 1
                        
                        # Add to games data
                        games_data.append({
                            "game": game.to_dict(),
                            "result": result_data
                        })
            
            # Prepare result
            result = {
                "success": True,
                "state": state.to_dict(),
                "date": f"{year}-{month:02d}-{day:02d}",
                "games_collected": games_collected,
                "games": games_data
            }
            
            # Update log
            if log_id and save_to_db:
                GameResultRepository.update_collection_log(
                    log_id, "success", games_collected, None
                )
            
            return result
            
        except requests.exceptions.RequestException as e:
            error_message = f"Error making request to state page with date: {e}"
            print(error_message)
            
            if log_id and save_to_db:
                GameResultRepository.update_collection_log(log_id, "failed", 0, error_message)
                
            return {
                "success": False,
                "message": error_message,
                "games_collected": 0
            }
        except Exception as e:
            error_message = f"Error processing state page with date: {e}"
            print(error_message)
            
            if log_id and save_to_db:
                GameResultRepository.update_collection_log(log_id, "failed", 0, error_message)
                
            return {
                "success": False,
                "message": error_message,
                "games_collected": 0
            }
    
    @classmethod
    def collect_games_by_date_with_state_data(cls, state_data, year, month, day, save_to_db=True):
        """
        Collect games using pre-loaded state data to avoid database lookup
        
        Args:
            state_data (dict): Pre-loaded state data with id, code, name
            year (int): Year
            month (int): Month
            day (int): Day
            save_to_db (bool): Whether to save results to database
            
        Returns:
            dict: Result of the operation
        """
        # Get shared database connection
        connection = cls._get_shared_connection()
        
        # Verify state data
        if not state_data or not isinstance(state_data, dict) or 'id' not in state_data:
            logger.error(f"Invalid state data provided: {state_data}")
            return {
                "success": False,
                "message": "Invalid state data provided"
            }
        
        state_code = state_data['code']
        state_id = state_data['id']
        state_name = state_data.get('name', '')
        
        logger.info(f"Using cached state data: {state_code} (ID: {state_id}) - {state_name}")
        
        # Format date for URL
        date_str = f"{year}/{month}/{day}"
        
        # Log collection attempt
        log_id = None
        if save_to_db:
            state_url = f"{cls.BASE_URL}/{state_code.lower()}/{date_str}"
            log_id = GameResultRepository.log_collection_attempt(
                state_code, state_url, "pending"
            )
        
        try:
            # Making HTTP request to state's page with date
            state_url = f"{cls.BASE_URL}/{state_code.lower()}/{date_str}"
            response = requests.get(state_url)
            response.raise_for_status()
            
            # Parsing HTML
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find the lottery games
            games_collected = 0
            games_data = []
            
            # Find game sections (cards)
            game_sections = soup.find_all('div', class_='card')
            if not game_sections:
                result = {
                    "success": False,
                    "message": f"No games found for state {state_code} on {date_str}",
                    "games_collected": 0
                }
                logger.warning(f"No game sections found on page for state {state_code} on {date_str}")
                if log_id and save_to_db:
                    GameResultRepository.update_collection_log(log_id, "failed", 0, result["message"])
                return result
            
            logger.info(f"Found {len(game_sections)} potential game sections for {state_code} on {date_str}")
            
            # Get games to process
            game_sections_to_process = []
            for section in game_sections:
                # Skip ad placeholders and non-game cards
                if 'ads-placeholder' in str(section):
                    continue
                
                card_header = section.find('div', class_='card-header')
                if not card_header:
                    continue
                
                # Extract game info
                title_tag = card_header.find('h3')
                if not title_tag:
                    continue
                
                game_sections_to_process.append((section, card_header, title_tag))
            
            if not game_sections_to_process:
                logger.warning(f"Found {len(game_sections)} sections but none were valid games for {state_code} on {date_str}")
                result = {
                    "success": False,
                    "message": f"No valid games found for state {state_code} on {date_str}",
                    "games_collected": 0
                }
                if log_id and save_to_db:
                    GameResultRepository.update_collection_log(log_id, "failed", 0, result["message"])
                return result
            
            logger.info(f"Processing {len(game_sections_to_process)} valid game sections for {state_code} on {date_str}")
            
            # Save all games at once and get their IDs
            if save_to_db and game_sections_to_process:
                # Prepare all games first
                games_to_save = []
                
                for section, card_header, title_tag in game_sections_to_process:
                    game_name = title_tag.text.strip()
                    game_slug = cls._generate_slug(game_name)
                    
                    # Find logo URL and download image
                    logo_url = None
                    local_image_path = None
                    img_tag = card_header.find('img')
                    if img_tag and 'src' in img_tag.attrs:
                        src_url = img_tag['src']
                        # Verificar se o URL é relativo e adicionar o domínio se necessário
                        if src_url.startswith('/'):
                            full_url = f"https://www.lotterycorner.com{src_url}"
                        else:
                            full_url = src_url
                            
                        # Baixar a imagem e obter o caminho local
                        local_image_path = cls._download_image(full_url, state_code, game_slug)
                        
                        # Usar o caminho local como logo_url se o download foi bem-sucedido
                        if local_image_path:
                            logo_url = local_image_path
                        else:
                            # Fallback para a URL original se o download falhar
                            logo_url = full_url
                            print(f"Usando URL original como fallback: {logo_url}")
                    else:
                        print(f"Nenhum logo encontrado para {game_name}")
                    
                    # Create game
                    game = Game(name=game_name, slug=game_slug, logo_url=logo_url)
                    games_to_save.append(game)
                
                # Save all games at once and get their IDs
                saved_games = GameRepository.save_many(games_to_save, state_id)
                
                # Collect game results in one batch
                game_results_to_save = []
                
                # Process game results with the saved game IDs
                for i, (section, _, _) in enumerate(game_sections_to_process):
                    if i < len(saved_games):
                        game = saved_games[i]
                        
                        # Extract result data
                        result_data = cls._extract_game_results(section, game.id, state_id)
                        if result_data:
                            # Force date to match requested date
                            result_data["draw_date"] = datetime(year, month, day).date()
                            
                            games_collected += 1
                            
                            # Create and add to game results batch
                            game_result = GameResult(**result_data)
                            game_results_to_save.append(game_result)
                            
                            # Add to games data
                            games_data.append({
                                "game": game.to_dict(),
                                "result": result_data
                            })
                
                # Save all game results at once
                if game_results_to_save:
                    GameResultRepository.save_many(game_results_to_save)
            else:
                # Process without saving to database
                for section, card_header, title_tag in game_sections_to_process:
                    game_name = title_tag.text.strip()
                    game_slug = cls._generate_slug(game_name)
                    
                    # Find logo URL and download image
                    logo_url = None
                    local_image_path = None
                    img_tag = card_header.find('img')
                    if img_tag and 'src' in img_tag.attrs:
                        src_url = img_tag['src']
                        # Verificar se o URL é relativo e adicionar o domínio se necessário
                        if src_url.startswith('/'):
                            full_url = f"https://www.lotterycorner.com{src_url}"
                        else:
                            full_url = src_url
                            
                        # Baixar a imagem e obter o caminho local
                        local_image_path = cls._download_image(full_url, state_code, game_slug)
                        
                        # Usar o caminho local como logo_url se o download foi bem-sucedido
                        if local_image_path:
                            logo_url = local_image_path
                        else:
                            # Fallback para a URL original se o download falhar
                            logo_url = full_url
                            print(f"Usando URL original como fallback: {logo_url}")
                    else:
                        print(f"Nenhum logo encontrado para {game_name}")
                    
                    # Create game
                    game = Game(name=game_name, slug=game_slug, logo_url=logo_url)
                    
                    # Extract results
                    result_data = cls._extract_game_results(section, game.id, state_id)
                    if result_data:
                        # Force date to match requested date
                        result_data["draw_date"] = datetime(year, month, day).date()
                        
                        games_collected += 1
                        
                        # Add to games data
                        games_data.append({
                            "game": game.to_dict(),
                            "result": result_data
                        })
            
            # Create a basic state object for the result
            state_obj = {
                "id": state_id,
                "code": state_code,
                "name": state_name
            }
            
            # Prepare result
            result = {
                "success": True,
                "state": state_obj,
                "date": f"{year}-{month:02d}-{day:02d}",
                "games_collected": games_collected,
                "games": games_data
            }
            
            # Update log
            if log_id and save_to_db:
                GameResultRepository.update_collection_log(
                    log_id, "success", games_collected, None
                )
            
            return result
            
        except requests.exceptions.RequestException as e:
            error_message = f"Error making request to state page with date: {e}"
            logger.error(error_message)
            
            if log_id and save_to_db:
                GameResultRepository.update_collection_log(log_id, "failed", 0, error_message)
                
            return {
                "success": False,
                "message": error_message,
                "games_collected": 0
            }
        except Exception as e:
            error_message = f"Error processing state page with date: {e}"
            logger.error(error_message)
            
            if log_id and save_to_db:
                GameResultRepository.update_collection_log(log_id, "failed", 0, error_message)
                
            return {
                "success": False,
                "message": error_message,
                "games_collected": 0
            }
    
    @staticmethod
    def _generate_slug(name):
        """
        Generate a URL-friendly slug from a game name
        
        Args:
            name (str): Game name
            
        Returns:
            str: URL-friendly slug
        """
        # Convert to lowercase and replace spaces with hyphens
        slug = name.lower().replace(' ', '-')
        
        # Remove special characters
        slug = re.sub(r'[^a-z0-9-]', '', slug)
        
        # Remove multiple hyphens
        slug = re.sub(r'-+', '-', slug)
        
        # Remove leading/trailing hyphens
        slug = slug.strip('-')
        
        return slug
    
    @classmethod
    def _check_image_exists(cls, game_slug):
        """
        Check if an image already exists for a given game slug
        
        Args:
            game_slug (str): Game slug to check
            
        Returns:
            str or None: Path to existing image or None if not found
        """
        # Check common image extensions
        for ext in ['webp', 'jpg', 'jpeg', 'png', 'gif']:
            # Usar sempre barras normais para caminhos de URL, mesmo no Windows
            path = os.path.join(cls.IMAGES_DIR, f"{game_slug}.{ext}").replace('\\', '/')
            if os.path.exists(path):
                return path
        return None
    
    @staticmethod
    def _extract_game_results(game_section, game_id, state_id):
        """
        Extract game results from a game section
        
        Args:
            game_section (BeautifulSoup): Game section HTML
            game_id (int): Game ID
            state_id (int): State ID
            
        Returns:
            dict: Game result data or None if not found
        """
        try:
            result_data = {
                "game_id": game_id,
                "state_id": state_id,
                "numbers": "",
                "special_number": None,
            }
            
            card_body = game_section.find('div', class_='card-body')
            if not card_body:
                return None
            
            # Extrair o nome do jogo primeiro, pois precisamos para inferir horários
            game_name = ""
            card_header = game_section.find_previous('div', class_='card-header')
            if card_header:
                title_tag = card_header.find('h3')
                if title_tag:
                    game_name = title_tag.text.strip()
                    print(f"Extraindo dados para o jogo: {game_name}")
            
            # Procurar pelo timer que contém o fuso horário
            timer_div = card_body.find('div', class_='timer')
            timezone_info = None
            
            if timer_div and 'data-enddate' in timer_div.attrs:
                enddate_str = timer_div['data-enddate']
                print(f"Encontrado data-enddate: {enddate_str}")
                
                # Extrair fuso horário e ajustar horário
                # Formato: "Tue, May-13-2025, 08:00 PM -0700"
                timezone_match = re.search(r'([\d:]+\s*[AP]M)\s*([-+]\d{4})', enddate_str)
                if timezone_match:
                    time_str = timezone_match.group(1)
                    timezone_str = timezone_match.group(2)
                    result_data["draw_time"] = time_str
                    # Salvar o fuso horário para referência
                    result_data["timezone"] = timezone_str
                    print(f"Extraído horário com fuso horário: {time_str} {timezone_str}")
                    
                # Também podemos extrair a data completa daqui
                date_match = re.search(r'(\w+), (\w+)-(\d+)-(\d{4})', enddate_str)
                if date_match:
                    month = date_match.group(2)
                    day = date_match.group(3)
                    year = date_match.group(4)
                    full_date = f"{month} {day}, {year}"
                    result_data["draw_date"] = full_date
                    print(f"Extraída data do timer: {full_date}")
                
            # Extract draw date from the exact div with class="amount__title" se ainda não tiver data
            if "draw_date" not in result_data:
                date_div = card_body.find('div', class_='amount__title')
                if date_div:
                    date_text = date_div.text.strip()
                    print(f"Texto da data: '{date_text}'")
                    result_data["draw_date"] = date_text
                    
                    # Try to extract time if it's included in the date text and ainda não temos
                    if "draw_time" not in result_data:
                        # Try multiple time formats
                        time_patterns = [
                            r'(\d{1,2}:\d{2}(?:\s*[AP]M)?)',  # 1:30 PM
                            r'(\d{1,2}[:.]\d{2}\s*(?:AM|PM|am|pm))',  # 1.30 PM
                            r'(\d{1,2}\s*(?:AM|PM|am|pm))',  # 1 PM
                        ]
                        
                        for pattern in time_patterns:
                            time_match = re.search(pattern, date_text)
                            if time_match:
                                result_data["draw_time"] = time_match.group(1)
                                print(f"Horário extraído do texto da data: {result_data['draw_time']}")
                                break
                else:
                    # Fallback to today
                    result_data["draw_date"] = datetime.now().date()
            
            # Inferir o horário a partir do nome do jogo, se não foi encontrado ainda
            if "draw_time" not in result_data and game_name:
                # Primeiro, verificar termos exatos no nome do jogo
                time_indicators = {
                    "Midday": "12:00 PM",
                    "Mid-day": "12:00 PM",
                    "Noon": "12:00 PM",
                    "Evening": "7:00 PM",
                    "Eve": "7:00 PM",
                    "Night": "10:00 PM",
                    "Morning": "10:00 AM",
                    "Afternoon": "4:00 PM",
                    "Day": "1:00 PM"
                }
                
                for indicator, time_value in time_indicators.items():
                    if indicator in game_name:
                        result_data["draw_time"] = time_value
                        print(f"Horário inferido do nome do jogo '{game_name}': {time_value}")
                        break
                        
                # Se ainda não encontrou o horário e o nome contém números, tente extraí-los
                if "draw_time" not in result_data and any(c.isdigit() for c in game_name):
                    time_patterns = [
                        r'(\d{1,2}:\d{2}(?:\s*[AP]M)?)',  # 1:30 PM
                        r'(\d{1,2}[:.]\d{2}\s*(?:AM|PM|am|pm))',  # 1.30 PM
                        r'(\d{1,2}\s*(?:AM|PM|am|pm))',  # 1 PM
                    ]
                    for pattern in time_patterns:
                        time_match = re.search(pattern, game_name)
                        if time_match:
                            result_data["draw_time"] = time_match.group(1)
                            print(f"Horário extraído do nome do jogo: {result_data['draw_time']}")
                            break
            
            # Para jogos específicos que sabemos o horário
            if "draw_time" not in result_data:
                # Adicionar mais mapeamentos específicos conforme necessário
                game_time_map = {
                    "Pick 3 Midday": "12:00 PM",
                    "Pick 3 Evening": "7:00 PM",
                    "Pick 4 Midday": "12:00 PM",
                    "Pick 4 Evening": "7:00 PM",
                    "Lucky Day Lotto Midday": "12:45 PM",
                    "Lucky Day Lotto Evening": "9:22 PM",
                    "Daily 3 Midday": "1:40 PM",
                    "Daily 3 Evening": "9:22 PM",
                    "Daily 4 Midday": "1:40 PM",
                    "Daily 4 Evening": "9:22 PM",
                    "Fantasy 5 Midday": "12:45 PM",
                    "Fantasy 5 Evening": "9:22 PM"
                }
                
                for known_game, known_time in game_time_map.items():
                    if known_game.lower() in game_name.lower():
                        result_data["draw_time"] = known_time
                        print(f"Horário definido para jogo conhecido '{game_name}': {known_time}")
                        break
            
            # Extract winning numbers
            numbers_div = card_body.find('div', class_='c-lottery-numbers')
            if numbers_div:
                main_numbers = []
                special_numbers = []
                special_labels = []
                
                # Get main numbers
                number_divs = numbers_div.find_all('div', class_='number')
                if number_divs:
                    for number_div in number_divs:
                        number_text = number_div.text.strip()
                        if number_text:
                            # Verificar se é um número destacado (classe contém 'highlighted')
                            if 'highlighted' in number_div.get('class', []):
                                special_numbers.append(number_text)
                            else:
                                main_numbers.append(number_text)
                
                # Look for highlighted numbers (class contains 'highlighted')
                highlighted_divs = numbers_div.find_all('div', class_=lambda x: x and 'highlighted' in x)
                if highlighted_divs:
                    for div in highlighted_divs:
                        number_text = div.text.strip()
                        if number_text and number_text not in special_numbers:
                            special_numbers.append(number_text)
                
                # Procurar por labels que identificam os números especiais
                labels_div = numbers_div.find('div', class_='labels')
                if labels_div:
                    label_divs = labels_div.find_all('div')
                    for label_div in label_divs:
                        label_text = label_div.text.strip()
                        if label_text and label_text not in ["", "."]:
                            special_labels.append(label_text)
                
                # Format numbers as a simple string
                # First add main numbers
                formatted_numbers = ", ".join(main_numbers)
                
                # Armazenar o número especial separadamente
                if special_numbers:
                    # Se temos um label e um número especial, usar ambos
                    if len(special_labels) == 1 and len(special_numbers) == 1:
                        result_data["special_number"] = special_numbers[0]
                        # Adicionar o label ao número especial
                        special_label = special_labels[0]
                        print(f"Número especial encontrado: {special_numbers[0]} ({special_label})")
                    # Se temos múltiplos números especiais, usar o primeiro
                    elif special_numbers:
                        result_data["special_number"] = special_numbers[0]
                        print(f"Número especial encontrado: {special_numbers[0]}")
                
                # Add special numbers to the formatted string as well (for backward compatibility)
                # Mas apenas se não estamos usando o campo special_number
                if special_numbers and not result_data["special_number"]:
                    formatted_numbers += " + " + ", ".join(special_numbers)
                # Se estamos usando special_number, não incluímos o número especial no campo numbers
                elif special_numbers and len(special_numbers) > 1:
                    # Se há mais de um número especial, incluímos os extras (exceto o primeiro que já está em special_number)
                    formatted_numbers += " + " + ", ".join(special_numbers[1:])
                
                result_data["numbers"] = formatted_numbers
            else:
                # Try alternative format - find numbers directly in text
                numbers_text = card_body.text
                # Extract numbers from text using regex
                if numbers_text:
                    # Find groups of digits that might be lottery numbers
                    number_matches = re.findall(r'\b\d{1,2}\b', numbers_text)
                    if number_matches:
                        result_data["numbers"] = ", ".join(number_matches)
            
            # Extract jackpot (last game jackpot)
            jackpot_span = card_body.find('span', string=lambda t: t and 'JackPot:' in t)
            if jackpot_span:
                # Navigate to the next div with class="item"
                jackpot_item = jackpot_span.find_next('div', class_='item')
                if jackpot_item:
                    # Clean up the text (remove extra whitespace)
                    jackpot_text = ' '.join(jackpot_item.text.strip().split())
                    result_data["jackpot"] = jackpot_text
            
            # Extract next draw information from the next-date-div element
            next_date_div = card_body.find('div', class_='next-date-div')
            if next_date_div:
                # Find the item div containing the next draw date/time
                next_item = next_date_div.find('div', class_='item')
                if next_item:
                    next_draw_text = next_item.text.strip()
                    # Clean up the text (remove extra whitespace)
                    next_draw_text = ' '.join(next_draw_text.split())
                    
                    # Parse the next draw text
                    # Expected format: "Tue, May-13-2025, 01:30 PM"
                    # Don't store the full text, just parse it for date and time
                    date_match = re.search(r'(\w+), (\w+)-(\d+)-(\d{4}), ([\d:]+\s*[AP]M)', next_draw_text)
                    if date_match:
                        next_date_str = f"{date_match.group(2)} {date_match.group(3)}, {date_match.group(4)}"
                        next_time_str = date_match.group(5)
                        
                        result_data["next_draw_date"] = next_date_str
                        result_data["next_draw_time"] = next_time_str
            
            # Extract next jackpot amount - use multiple approaches to find it
            # First approach: Find the span with "Next Jackpot:" text
            next_jackpot_span = card_body.find('span', string=lambda t: t and 'Next Jackpot:' in t)
            if next_jackpot_span:
                # Find the item div with the next jackpot amount
                next_jackpot_item = next_jackpot_span.find_next('div', class_='item')
                if next_jackpot_item:
                    # Clean up the text (remove extra whitespace)
                    next_jackpot_text = ' '.join(next_jackpot_item.text.strip().split())
                    result_data["next_jackpot"] = next_jackpot_text
            
            # Second approach: Try to find it through the amounts div structure
            if "next_jackpot" not in result_data:
                # Find all amounts divs
                amounts_divs = card_body.find_all('div', class_='amounts')
                for div in amounts_divs:
                    # Check if this div contains the Next Jackpot text
                    if div.find(string=lambda t: t and 'Next Jackpot:' in t):
                        # Find the item div inside
                        item_div = div.find('div', class_='item')
                        if item_div:
                            next_jackpot_text = ' '.join(item_div.text.strip().split())
                            result_data["next_jackpot"] = next_jackpot_text
                            break
            
            # Third approach: Look specifically for highlighted item
            if "next_jackpot" not in result_data:
                highlighted_items = card_body.find_all('div', class_=lambda c: c and 'item--highlighted' in c)
                for item in highlighted_items:
                    # Get the text and clean it up
                    text = ' '.join(item.text.strip().split())
                    if text and '$' in text:  # Likely a jackpot amount
                        result_data["next_jackpot"] = text
                        break
            
            # Log final result for debug
            if "draw_time" in result_data:
                timezone_info = f" ({result_data.get('timezone', 'fuso não disponível')})" if "timezone" in result_data else ""
                print(f"Jogo '{game_name}' terá horário: {result_data['draw_time']}{timezone_info}")
            else:
                print(f"Aviso: Não foi possível determinar o horário para o jogo '{game_name}'")
                
            return result_data
            
        except Exception as e:
            print(f"Error extracting game results: {e}")
            return None
    
    @classmethod
    def collect_all_states(cls, state_codes=None, save_to_db=True, batch_size=5):
        """
        Collect games for multiple states
        
        Args:
            state_codes (list): List of state codes to collect or None for all
            save_to_db (bool): Whether to save to database
            batch_size (int): Number of states to process in a batch
            
        Returns:
            dict: Result of the operation
        """
        # Marcar início da coleta em lote
        cls.start_batch_collection()
        
        try:
            # Get states to collect
            if not state_codes:
                states = StateRepository.find_all()
                state_codes = [state.code for state in states]
            
            results = {
                "success": True,
                "states_processed": 0,
                "games_collected": 0,
                "failures": [],
                "state_results": []
            }
            
            # Process states in batches to limit concurrent database connections
            if state_codes:
                total_states = len(state_codes)
                logger.info(f"Processing {total_states} states in batches of {batch_size}")
                
                for i in range(0, total_states, batch_size):
                    batch = state_codes[i:i+batch_size]
                    batch_end = min(i + batch_size, total_states)
                    logger.info(f"Processing batch of states {i+1}-{batch_end} of {total_states}")
                    
                    # Process each state in the current batch
                    for code in batch:
                        print(f"Collecting games for state: {code}")
                        state_result = cls.collect_games_by_state(code, save_to_db)
                        
                        results["states_processed"] += 1
                        
                        if state_result["success"]:
                            results["games_collected"] += state_result.get("games_collected", 0)
                            results["state_results"].append({
                                "state_code": code,
                                "success": True,
                                "games_collected": state_result.get("games_collected", 0)
                            })
                        else:
                            results["failures"].append({
                                "state_code": code,
                                "message": state_result.get("message", "Unknown error")
                            })
                            results["state_results"].append({
                                "state_code": code,
                                "success": False,
                                "message": state_result.get("message", "Unknown error")
                            })
            
            # Set overall success based on failures
            if results["failures"]:
                results["success"] = len(results["failures"]) < len(state_codes)
                
            return results
        finally:
            # Marcar o fim da coleta em lote e liberar recursos
            cls.end_batch_collection()

    @classmethod
    def _process_state_response(cls, data, state, save_to_db=True):
        """
        Process API response for a state
        
        Args:
            data (dict): API response data
            state (State or dict): State object or dictionary with state data
            save_to_db (bool): Whether to save to database
            
        Returns:
            dict: Processing result
        """
        # Get state info
        if isinstance(state, dict):
            state_id = state["id"]
            state_code = state["code"]
            state_name = state["name"]
        else:
            state_id = state.id
            state_code = state.code
            state_name = state.name
        
        # Extract games list
        games_data = data.get('games', [])
        
        if not games_data:
            return {
                "success": True,
                "games_collected": 0,
                "message": "No games found for this state"
            }
        
        # Process each game
        games = []
        game_results = []
        
        for game_data in games_data:
            # Extract game info
            game_name = game_data.get('name', '')
            game_slug = game_data.get('slug', '')
            logo_url = game_data.get('image', {}).get('url', '')
            
            # Verificar se o URL é relativo e adicionar o domínio se necessário
            if logo_url and logo_url.startswith('/'):
                logo_url = f"https://www.lotterycorner.com{logo_url}"
                print(f"API URL convertido para absoluto: {logo_url}")
                
            is_multi_state = any(multi_name in game_name for multi_name in cls.MULTI_STATE_GAMES)
            
            # Create game object
            game = Game(
                name=game_name,
                slug=game_slug,
                logo_url=logo_url,
                description=f"Lottery game from {state_name}",
                is_multi_state=is_multi_state
            )
            
            games.append(game)
            
            # Extract draw info
            draw_date_str = game_data.get('dateTime', {}).get('date')
            draw_time_str = game_data.get('dateTime', {}).get('time')
            timezone = game_data.get('dateTime', {}).get('timezone')
            
            # Convert draw date to Python date object
            draw_date = None
            if draw_date_str:
                try:
                    draw_date = datetime.strptime(draw_date_str, '%Y-%m-%d').date()
                except ValueError:
                    print(f"Invalid date format: {draw_date_str}")
            
            # Extract jackpot info
            jackpot_text = game_data.get('jackpot', {}).get('text', '')
            jackpot_value = None
            
            if jackpot_text:
                # Try to extract numeric value if available
                if jackpot_text.startswith('$'):
                    # Remove $ and convert to float, handling 'Million' and 'Billion'
                    try:
                        value_text = jackpot_text[1:].strip()
                        multiplier = 1
                        
                        if 'Million' in value_text:
                            value_text = value_text.replace('Million', '').strip()
                            multiplier = 1000000
                        elif 'Billion' in value_text:
                            value_text = value_text.replace('Billion', '').strip()
                            multiplier = 1000000000
                            
                        # Remove commas
                        value_text = value_text.replace(',', '')
                        
                        # Convert to float and apply multiplier
                        if value_text:
                            jackpot_value = float(value_text) * multiplier
                    except ValueError:
                        # If we can't parse it, just use the text as is
                        pass
            
            # Extract next draw info
            next_draw_data = game_data.get('nextDraw', {})
            next_draw_date_str = next_draw_data.get('date')
            next_draw_time_str = next_draw_data.get('time')
            
            # Convert next draw date to Python date object
            next_draw_date = None
            if next_draw_date_str:
                try:
                    next_draw_date = datetime.strptime(next_draw_date_str, '%Y-%m-%d').date()
                except ValueError:
                    print(f"Invalid next draw date format: {next_draw_date_str}")
            
            # Extract next jackpot info
            next_jackpot_text = next_draw_data.get('jackpot', {}).get('text', '')
            next_jackpot_value = None
            
            if next_jackpot_text:
                # Try to extract numeric value if available
                if next_jackpot_text.startswith('$'):
                    # Remove $ and convert to float, handling 'Million' and 'Billion'
                    try:
                        value_text = next_jackpot_text[1:].strip()
                        multiplier = 1
                        
                        if 'Million' in value_text:
                            value_text = value_text.replace('Million', '').strip()
                            multiplier = 1000000
                        elif 'Billion' in value_text:
                            value_text = value_text.replace('Billion', '').strip()
                            multiplier = 1000000000
                            
                        # Remove commas
                        value_text = value_text.replace(',', '')
                        
                        # Convert to float and apply multiplier
                        if value_text:
                            next_jackpot_value = float(value_text) * multiplier
                    except ValueError:
                        # If we can't parse it, just use the text as is
                        pass
            
            # Extract winning numbers
            numbers_data = game_data.get('results', {}).get('numbers', [])
            bonus_data = game_data.get('results', {}).get('bonus', [])
            
            # Create combined numbers array
            numbers = []
            
            for num in numbers_data:
                numbers.append({
                    'value': num.get('value', ''),
                    'type': 'regular'
                })
                
            for bonus in bonus_data:
                numbers.append({
                    'value': bonus.get('value', ''),
                    'name': bonus.get('name', ''),
                    'type': 'bonus'
                })
                
            # Skip if no draw date
            if not draw_date:
                continue
                
            # Create game result object
            game_result = GameResult(
                game_id=None,  # Will be set after saving games
                state_id=state_id,
                draw_date=draw_date,
                draw_time=draw_time_str,
                timezone=timezone,
                numbers=numbers,
                jackpot=jackpot_value,
                next_draw_date=next_draw_date,
                next_draw_time=next_draw_time_str,
                next_jackpot=next_jackpot_value
            )
            
            game_results.append((game, game_result))
        
        # Save games to database
        if save_to_db:
            try:
                saved_games = GameRepository.save_many(games, state_id)
                
                # Update game results with saved game IDs
                for i, (game, result) in enumerate(game_results):
                    # Find saved game with matching slug
                    saved_game = next((g for g in saved_games if g.slug == game.slug), None)
                    
                    if saved_game:
                        result.game_id = saved_game.id
                
                # Filter out results without game_id
                valid_results = [result for _, result in game_results if result.game_id is not None]
                
                # Save game results
                save_result = GameResultRepository.save_many(valid_results)
                
                return {
                    "success": True,
                    "games_collected": len(valid_results),
                    "save_result": save_result
                }
            except Exception as e:
                error_message = f"Error saving games for state {state_code}: {str(e)}"
                print(error_message)
                print(traceback.format_exc())
                return {"success": False, "message": error_message}
        else:
            # Modo sem salvar no banco de dados - precisamos processar os jogos primeiro
            # para poder atribuir os IDs corretos
            engine = get_engine()
            
            try:
                # 1. Verifique os IDs dos jogos
                game_slugs = [g.slug for g in games]
                
                if not game_slugs:
                    return {
                        "success": True,
                        "games_collected": 0,
                        "message": "No valid games found"
                    }
                
                # Busca os IDs dos jogos no banco
                placeholders = ','.join(['%s'] * len(game_slugs))
                placeholders = placeholders.replace('%s', ':slug_')
                game_slug_params = {f'slug_{i}': slug for i, slug in enumerate(game_slugs)}
                
                query = f"""
                    SELECT id, slug 
                    FROM games 
                    WHERE slug IN ({','.join([':slug_' + str(i) for i in range(len(game_slugs))])})
                """
                
                with engine.connect() as conn:
                    result = conn.execute(text(query), game_slug_params)
                    existing_games = {row[1]: {'id': row[0]} for row in result}
                
                # 2. Atribuir IDs aos jogos e criar uma lista de objetos de resultado
                valid_game_results = []
                
                for i, (game, result) in enumerate(game_results):
                    if game.slug in existing_games:
                        # Use o ID existente
                        game.id = existing_games[game.slug]['id']
                        result.game_id = game.id
                        valid_game_results.append(result)
                    else:
                        # Não temos o ID, mas ainda queremos retornar esses resultados
                        # No batch save, vamos incluir esses jogos
                        result.game_id = None  # Será preenchido depois
                        result.game_slug = game.slug  # Adiciona slug para processamento posterior
                        result.game_object = game  # Armazena o objeto de jogo para uso posterior
                        valid_game_results.append(result)
                
                # Retornar os resultados para processamento em lote
                return {
                    "success": True,
                    "games_collected": len(valid_game_results),
                    "results": valid_game_results,
                    "games": games
                }
                
            except Exception as e:
                error_message = f"Error processing games for state {state_code}: {str(e)}"
                print(error_message)
                print(traceback.format_exc())
                return {"success": False, "message": error_message} 