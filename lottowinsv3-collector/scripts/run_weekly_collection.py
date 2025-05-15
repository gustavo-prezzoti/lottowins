"""
Run weekly collection for all states
"""
import sys
import os
import argparse
from datetime import datetime

# Add parent directory to path so we can import the jobs package
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(parent_dir)

from jobs.game_collector_job import run_collection_job
from jobs.collector_job import run_collection_job as run_state_collection_job
from app.repositories.state_repository import StateRepository

def main():
    """Run weekly collection for all states"""
    parser = argparse.ArgumentParser(description='Run weekly collection for all states')
    
    parser.add_argument(
        '--days-back',
        type=int,
        default=7,
        help='Number of days to go back (default: 7)'
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
        '--skip-states',
        action='store_true',
        help='Skip state collection step (use only if states were previously collected)'
    )
    
    args = parser.parse_args()
    
    print(f"Starting weekly collection for all states ({args.days_back} days back)")
    
    # Verificar se existem estados no banco de dados
    states = StateRepository.find_all()
    
    # Se não existirem estados e o usuário não pediu para pular esta etapa, coletá-los primeiro
    if not states and not args.skip_states:
        print("Nenhum estado encontrado no banco de dados. Coletando estados primeiro...")
        state_result = run_state_collection_job(
            save_to_db=args.save_to_db,
            save_to_memory=True,
            quiet=False
        )
        print(f"Coleta de estados concluída: {state_result.get('collected_states', 0)} estados coletados")
        
        # Verificar novamente se existem estados
        states = StateRepository.find_all()
        if not states:
            print("ERRO: Não foi possível coletar estados. Verifique a conexão com o site.")
            return {"success": False, "message": "Não foi possível coletar estados"}
    
    # Agora que temos estados, executar a coleta semanal de jogos
    result = run_collection_job(
        state=None,
        states=None,
        save_to_db=args.save_to_db,
        output_file=args.output,
        collect_week=True,
        days_back=args.days_back
    )
    
    # Print summary
    print(f"\nCollection completed:")
    print(f"States processed: {result.get('states_processed', 0)}")
    print(f"Games collected: {result.get('games_collected', 0)}")
    
    return result

if __name__ == "__main__":
    main() 