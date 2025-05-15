"""
State collector job module
"""
import argparse
import sys
import json
import logging
import os
from datetime import datetime
from app.services.state_service import StateService
from app.repositories.postgres_database import init_connection_pool

# Ensure logs directory exists
os.makedirs('logs', exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/collector.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger('collector_job')

def setup_args_parser():
    """
    Setup command line arguments parser
    
    Returns:
        ArgumentParser: Configured argument parser
    """
    parser = argparse.ArgumentParser(description='State collector job')
    
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
        '--save-to-memory', 
        dest='save_to_memory',
        action='store_true', 
        default=True,
        help='Save collected data to memory (default: True)'
    )
    
    parser.add_argument(
        '--no-save-to-memory', 
        dest='save_to_memory',
        action='store_false',
        help='Do not save collected data to memory'
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

def run_collection_job(save_to_db=True, save_to_memory=True, output_file=None, quiet=False):
    """
    Run the state collection job
    
    Args:
        save_to_db (bool): Whether to save to database
        save_to_memory (bool): Whether to save to in-memory storage
        output_file (str): Path to output JSON file (optional)
        quiet (bool): Whether to suppress console output
        
    Returns:
        dict: Collection results
    """
    # Initialize connection pool with appropriate settings
    init_connection_pool(min_connections=5, max_connections=50)
    
    start_time = datetime.now()
    
    if not quiet:
        logger.info(f"Starting state collection job at {start_time}")
        logger.info(f"Save to DB: {save_to_db}, Save to memory: {save_to_memory}")
    
    # Run collection and save
    results = StateService.collect_and_save(
        save_to_db=save_to_db,
        save_to_memory=save_to_memory
    )
    
    # Add metadata
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    results["metadata"] = {
        "job_start": start_time.isoformat(),
        "job_end": end_time.isoformat(),
        "duration_seconds": duration
    }
    
    # Log results
    if not quiet:
        logger.info(f"Collection completed in {duration:.2f} seconds")
        logger.info(f"Collected {results.get('collected_states', 0)} states")
        
        if save_to_db and 'database' in results:
            db_result = results['database']
            logger.info(f"Database: {db_result.get('inserted', 0)} inserted, "
                       f"{db_result.get('updated', 0)} updated, "
                       f"{db_result.get('failed', 0)} failed")
        
        if save_to_memory and 'memory' in results:
            mem_result = results['memory']
            logger.info(f"Memory: {mem_result.get('inserted', 0)} inserted, "
                       f"{mem_result.get('updated', 0)} updated, "
                       f"{mem_result.get('unchanged', 0)} unchanged")
    
    # Save to output file if specified
    if output_file:
        try:
            with open(output_file, 'w') as f:
                json.dump(results, f, indent=2)
            if not quiet:
                logger.info(f"Results saved to {output_file}")
        except Exception as e:
            logger.error(f"Failed to save results to file: {e}")
    
    return results

def main():
    """Main function for running as a script"""
    # Ensure logs directory exists
    import os
    os.makedirs('logs', exist_ok=True)
    
    try:
        # Parse command line arguments
        parser = setup_args_parser()
        args = parser.parse_args()
        
        # Run the job
        run_collection_job(
            save_to_db=args.save_to_db,
            save_to_memory=args.save_to_memory,
            output_file=args.output,
            quiet=args.quiet
        )
    finally:
        # Ensure connection pool is properly closed
        from app.repositories.postgres_database import shutdown_pool
        shutdown_pool()

if __name__ == "__main__":
    main() 