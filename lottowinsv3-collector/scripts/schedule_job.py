"""
Script for scheduling the collector job
"""
import os
import time
import schedule
import datetime
import logging
import sys

# Add project root to path to allow imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from jobs.collector_job import run_collection_job

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/scheduler.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger('scheduler')

# Make sure directories exist
os.makedirs('logs', exist_ok=True)
os.makedirs('results', exist_ok=True)

def run_job():
    """Run the collection job and save results with timestamp"""
    timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = f'results/collection_{timestamp}.json'
    
    logger.info(f"Starting scheduled job at {timestamp}")
    
    try:
        results = run_collection_job(
            save_to_db=True,
            save_to_memory=True,
            output_file=output_file,
            quiet=False
        )
        
        logger.info(f"Job completed. Collected {results.get('collected_states', 0)} states.")
        return True
    except Exception as e:
        logger.error(f"Job failed with error: {e}")
        return False

if __name__ == "__main__":
    # Schedule job to run daily at 6:00 AM
    schedule.every().day.at("06:00").do(run_job)
    
    # Also run immediately when starting the script
    logger.info("Initial job execution...")
    run_job()
    
    logger.info("Scheduler started. Job will run daily at 6:00 AM")
    logger.info("Press Ctrl+C to exit")
    
    # Keep the script running
    try:
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check for pending scheduled tasks every minute
    except KeyboardInterrupt:
        logger.info("Scheduler stopped by user")
    except Exception as e:
        logger.error(f"Scheduler failed with error: {e}") 