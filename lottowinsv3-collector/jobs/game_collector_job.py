"""
Game collector job module
"""
import argparse
import sys
import json
import logging
import os
from datetime import datetime, timedelta
from app.services.game_collector_service import GameCollectorService
from app.repositories.state_repository import StateRepository
from app.repositories.postgres_database import get_pg_connection, release_connection, init_connection_pool, shutdown_pool

# Ensure logs directory exists
os.makedirs('logs', exist_ok=True)
os.makedirs('results', exist_ok=True)

# Logger setup - will be configured at runtime
logger = logging.getLogger('game_collector_job')

def setup_args_parser():
    """
    Setup command line arguments parser
    
    Returns:
        ArgumentParser: Configured argument parser
    """
    parser = argparse.ArgumentParser(description='Game collector job')
    
    parser.add_argument(
        '--state', 
        type=str,
        help='Specific state code to collect (e.g., NY, CA, CO)'
    )
    
    parser.add_argument(
        '--states', 
        type=str,
        help='Comma-separated list of state codes to collect (e.g., NY,CA,CO)'
    )
    
    parser.add_argument(
        '--date',
        type=str,
        help='Specific date to collect in YYYY-MM-DD format'
    )
    
    parser.add_argument(
        '--year',
        type=int,
        help='Year to collect (requires --month and --day)'
    )
    
    parser.add_argument(
        '--month',
        type=int,
        help='Month to collect (requires --year and --day)'
    )
    
    parser.add_argument(
        '--day',
        type=int,
        help='Day to collect (requires --year and --month)'
    )
    
    parser.add_argument(
        '--week', 
        action='store_true',
        help='Collect data for the whole week (7 days back from specified date or today)'
    )
    
    parser.add_argument(
        '--days-back',
        type=int,
        default=7,
        help='Number of days to go back when using --week option (default: 7)'
    )
    
    parser.add_argument(
        '--save-to-db', 
        dest='save_to_db',
        action='store_true', 
        default=True,
        help='Save collected data to database (default: True)'
    )
    
    parser.add_argument(
        '--no-save-to-db', 
        dest='save_to_db',
        action='store_false',
        help='Do not save collected data to database'
    )
    
    parser.add_argument(
        '--output', 
        type=str,
        help='Save results to JSON file'
    )
    
    parser.add_argument(
        '--quiet', 
        action='store_true',
        help='Suppress output (except errors)'
    )
    
    return parser

def run_collection_job(state=None, states=None, year=None, month=None, day=None, date_str=None, 
                       save_to_db=True, output_file=None, quiet=False, collect_week=False, days_back=7):
    """
    Run the game collection job
    
    Args:
        state (str): Single state code to collect
        states (str): Comma-separated list of state codes
        year (int): Year to collect
        month (int): Month to collect
        day (int): Day to collect
        date_str (str): Date string in YYYY-MM-DD format
        save_to_db (bool): Whether to save to database
        output_file (str): Path to output JSON file (optional)
        quiet (bool): Whether to suppress console output
        collect_week (bool): Whether to collect data for the whole week
        days_back (int): Number of days to go back when collecting for the week
        
    Returns:
        dict: Collection results
    """
    print("Iniciando run_collection_job...")
    
    # Initialize database connection pool
    print("Inicializando pool de conexões...")
    init_connection_pool(5, 30)
    print("Pool de conexões inicializado")
    
    try:
        print("Capturando hora de início...")
        start_time = datetime.now()
        print(f"Hora de início: {start_time}")
        
        # Get target date
        print("Processando informações de data...")
        target_date = None
        
        # Parse date string if provided
        if date_str:
            try:
                date_parts = date_str.split('-')
                if len(date_parts) == 3:
                    year = int(date_parts[0])
                    month = int(date_parts[1])
                    day = int(date_parts[2])
                    target_date = datetime(year, month, day).date()
            except ValueError as e:
                logger.error(f"Invalid date format: {e}")
                return {"success": False, "message": f"Invalid date format: {e}"}
        
        # Check if all date components are present
        if all([year, month, day]):
            target_date = datetime(year, month, day).date()
        
        # If no date specified and we're collecting for the week, use today
        if collect_week and not target_date:
            target_date = datetime.now().date()
            logger.info(f"No date specified, using today ({target_date}) as start date for week collection")
        
        # For non-week collections, check if we have date components
        has_date = target_date is not None
        
        if not quiet:
            logger.info(f"Starting game collection job at {start_time}")
            if state:
                logger.info(f"Collecting games for state: {state}")
            elif states:
                logger.info(f"Collecting games for states: {states}")
            else:
                logger.info("Collecting games for all states")
                
            if has_date:
                if collect_week:
                    logger.info(f"Collecting games for {days_back} days, starting from {target_date}")
                else:
                    logger.info(f"Collecting games for date: {target_date}")
                
            logger.info(f"Save to DB: {save_to_db}")
        
        # Determine which states to collect
        state_codes = None
        if state:
            state_codes = [state.upper()]
        elif states:
            state_codes = [s.strip().upper() for s in states.split(',')]
        
        results = {
            "success": True,
            "states_processed": 0,
            "games_collected": 0,
            "state_results": [],
            "dates_processed": []
        }
        
        # Process each state
        if state_codes:
            # If collecting for the week, generate a list of dates to process
            dates_to_process = []
            if collect_week and target_date:
                for i in range(days_back):
                    process_date = target_date - timedelta(days=i)
                    dates_to_process.append(process_date)
                logger.info(f"Will process {len(dates_to_process)} dates: {', '.join(str(d) for d in dates_to_process)}")
            elif has_date:
                dates_to_process = [target_date]
            
            # Process each state
            for code in state_codes:
                state_games_collected = 0
                state_date_results = []
                
                if has_date:
                    # Collect for specific date(s)
                    # Se estamos coletando várias datas, iniciar coleta em lote
                    if len(dates_to_process) > 1:
                        GameCollectorService.start_batch_collection()
                        logger.info("Iniciando modo de coleta em lote com conexão compartilhada")
                        
                    try:
                        for process_date in dates_to_process:
                            process_year = process_date.year
                            process_month = process_date.month
                            process_day = process_date.day
                            
                            logger.info(f"Collecting games for state {code} on date {process_date}")
                            state_result = GameCollectorService.collect_games_by_date(
                                code, process_year, process_month, process_day, save_to_db=save_to_db
                            )
                            
                            if state_result["success"]:
                                date_games_collected = state_result.get("games_collected", 0)
                                state_games_collected += date_games_collected
                                state_date_results.append({
                                    "date": str(process_date),
                                    "games_collected": date_games_collected,
                                    "success": True
                                })
                            else:
                                state_date_results.append({
                                    "date": str(process_date),
                                    "success": False,
                                    "message": state_result.get("message", "Unknown error")
                                })
                    finally:
                        # Finalizar coleta em lote se estava ativa
                        if len(dates_to_process) > 1:
                            GameCollectorService.end_batch_collection()
                            logger.info("Finalizando modo de coleta em lote")
                else:
                    # Collect latest
                    logger.info(f"Collecting latest games for state {code}")
                    state_result = GameCollectorService.collect_games_by_state(
                        code, save_to_db=save_to_db
                    )
                    
                    if state_result["success"]:
                        state_games_collected = state_result.get("games_collected", 0)
                
                results["states_processed"] += 1
                results["games_collected"] += state_games_collected
                
                if has_date:
                    results["state_results"].append({
                        "state_code": code,
                        "success": True,
                        "total_games_collected": state_games_collected,
                        "date_results": state_date_results
                    })
                else:
                    results["state_results"].append({
                        "state_code": code,
                        "success": state_result.get("success", False),
                        "games_collected": state_games_collected,
                        "message": state_result.get("message", "")
                    })
        else:
            # Collect all states
            if has_date and collect_week:
                # Processing all states for multiple dates with batch processing
                logger.info("Collecting all states for multiple dates")
                
                # Get all states
                states = StateRepository.find_all()
                state_codes = [state.code for state in states]
                
                # Generate list of dates to process
                dates_to_process = []
                for i in range(days_back):
                    process_date = target_date - timedelta(days=i)
                    dates_to_process.append(process_date)
                logger.info(f"Will process {len(dates_to_process)} dates: {', '.join(str(d) for d in dates_to_process)}")
                
                # Iniciar coleta em lote para compartilhar a mesma conexão
                GameCollectorService.start_batch_collection()
                logger.info("Iniciando modo de coleta em lote com conexão compartilhada")
                
                try:
                    # Process states in batches to avoid connection pool exhaustion
                    batch_size = 5  # Process 5 states at a time
                    total_states = len(state_codes)
                    logger.info(f"Processing {total_states} states in batches of {batch_size}")
                    
                    for i in range(0, total_states, batch_size):
                        batch = state_codes[i:i+batch_size]
                        batch_end = min(i + batch_size, total_states)
                        logger.info(f"Processing batch of states {i+1}-{batch_end} of {total_states}")
                        
                        # Process each state in batch
                        for code in batch:
                            state_games_collected = 0
                            state_date_results = []
                            
                            # Process each date for this state
                            for process_date in dates_to_process:
                                process_year = process_date.year
                                process_month = process_date.month
                                process_day = process_date.day
                                
                                logger.info(f"Collecting games for state {code} on date {process_date}")
                                state_result = GameCollectorService.collect_games_by_date(
                                    code, process_year, process_month, process_day, save_to_db=save_to_db
                                )
                                
                                if state_result["success"]:
                                    date_games_collected = state_result.get("games_collected", 0)
                                    state_games_collected += date_games_collected
                                    state_date_results.append({
                                        "date": str(process_date),
                                        "games_collected": date_games_collected,
                                        "success": True
                                    })
                                else:
                                    state_date_results.append({
                                        "date": str(process_date),
                                        "success": False,
                                        "message": state_result.get("message", "Unknown error")
                                    })
                            
                            results["states_processed"] += 1
                            results["games_collected"] += state_games_collected
                            
                            results["state_results"].append({
                                "state_code": code,
                                "success": True,
                                "total_games_collected": state_games_collected,
                                "date_results": state_date_results
                            })
                finally:
                    # Finalizar coleta em lote
                    GameCollectorService.end_batch_collection()
                    logger.info("Finalizando modo de coleta em lote")
            elif has_date:
                logger.error("Collecting all states for a specific date is not supported.")
                logger.error("Please specify state(s) when using date option.")
                return {
                    "success": False, 
                    "message": "Collecting all states for a specific date is not supported."
                }
            else:
                all_states_result = GameCollectorService.collect_all_states(save_to_db=save_to_db)
                results["states_processed"] = all_states_result.get("states_processed", 0)
                results["games_collected"] = all_states_result.get("games_collected", 0)
                results["state_results"] = all_states_result.get("state_results", [])
                
        # Add metadata
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        results["metadata"] = {
            "job_start": start_time.isoformat(),
            "job_end": end_time.isoformat(),
            "duration_seconds": duration,
            "week_collection": collect_week,
            "days_back": days_back if collect_week else None
        }
        
        # Log results
        if not quiet:
            logger.info(f"Collection completed in {duration:.2f} seconds")
            logger.info(f"Processed {results.get('states_processed', 0)} states")
            logger.info(f"Collected {results.get('games_collected', 0)} games")
            
            failed_states = [r for r in results.get("state_results", []) if not r.get("success")]
            if failed_states:
                logger.warning(f"Failed to collect data for {len(failed_states)} states")
                for failure in failed_states:
                    logger.warning(f"  {failure['state_code']}: {failure.get('message', 'Unknown error')}")
        
        # Save to output file if specified
        if output_file:
            try:
                # Create a timestamped filename if not provided
                if output_file == 'auto':
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                    state_part = state or (states.replace(',', '-') if states else 'all')
                    date_part = f"_{year}{month:02d}{day:02d}" if has_date else ""
                    week_part = "_week" if collect_week else ""
                    output_file = f"results/games_{state_part}{date_part}{week_part}_{timestamp}.json"
                
                with open(output_file, 'w') as f:
                    json.dump(results, f, indent=2)
                if not quiet:
                    logger.info(f"Results saved to {output_file}")
            except Exception as e:
                logger.error(f"Failed to save results to file: {e}")
        
        return results
    finally:
        # Make sure the shared database connection is released
        GameCollectorService._release_shared_connection()
        
def main():
    """Main function for running as a script"""
    print("Entrando na função main()...")
    try:
        # Parse command line arguments
        print("Analisando argumentos da linha de comando...")
        parser = setup_args_parser()
        args = parser.parse_args()
        print(f"Argumentos analisados: {args}")
        
        # Run the job
        print("Iniciando job de coleta...")
        run_collection_job(
            state=args.state,
            states=args.states,
            year=args.year,
            month=args.month,
            day=args.day,
            date_str=args.date,
            save_to_db=args.save_to_db,
            output_file=args.output,
            quiet=args.quiet,
            collect_week=args.week,
            days_back=args.days_back
        )
        print("Job de coleta concluído")
    finally:
        # Make sure database connections are properly closed
        print("Fechando pool de conexões...")
        shutdown_pool()
        print("Pool de conexões fechado")

if __name__ == "__main__":
    print("Iniciando job de coleta de jogos...")
    try:
        # Configure logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('logs/game_collector.log'),
                logging.StreamHandler(sys.stdout)
            ]
        )
        print("Logging configurado")
        logger.info("Job de coleta de jogos inicializando")
        
        try:
            main()
        except Exception as e:
            import traceback
            print(f"ERRO AO EXECUTAR JOB: {e}")
            print(traceback.format_exc())
            logger.error(f"Erro ao executar job: {e}")
            logger.error(traceback.format_exc())
            
        logger.info("Job de coleta de jogos finalizado")
    except Exception as e:
        print(f"ERRO CRÍTICO: {e}")
        import traceback
        print(traceback.format_exc()) 