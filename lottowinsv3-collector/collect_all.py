#!/usr/bin/env python
"""
Script principal para iniciar a coleta automática de todos os dados históricos
"""
import os
import sys
import time
import argparse
from datetime import datetime

def main():
    # Define opções de linha de comando
    parser = argparse.ArgumentParser(description='Sistema de coleta automática de dados de loteria')
    parser.add_argument('--test', action='store_true', help='Executa em modo de teste com poucos estados')
    parser.add_argument('--states', type=str, help='Lista de estados específicos para coletar (ex: NY,CA,TX)')
    parser.add_argument('--days', type=int, default=None, help='Limita o número de dias para coletar (padrão: sem limite)')
    parser.add_argument('--yes', '-y', action='store_true', help='Modo não-interativo (responde sim para todas as confirmações)')
    
    args = parser.parse_args()
    
    print("=" * 70)
    print("SISTEMA DE COLETA AUTOMÁTICA DE DADOS DE LOTERIA".center(70))
    print("=" * 70)
    
    if args.test:
        print("\nMODO DE TESTE ATIVADO".center(70))
        print("\nSerão coletados dados apenas para alguns estados principais (NY, CA, TX).")
        if args.days:
            print(f"Limitado a {args.days} dias para cada estado.")
        else:
            print("Limitado a 30 dias para cada estado.")
    elif args.states:
        state_list = args.states.upper().split(',')
        print(f"\nColeta será realizada APENAS para os estados: {', '.join(state_list)}")
        if args.days:
            print(f"Limitado a {args.days} dias para cada estado.")
    else:
        print("\nEste script irá iniciar a coleta automática de TODOS os dados históricos")
        print("de jogos de loteria para TODOS os estados, indo para trás até 1,5 anos.")
        if args.days:
            print(f"\nDias limitados a: {args.days}")
        
    print("\nO processo pode levar HORAS ou DIAS para completar, dependendo da quantidade")
    print("de dados e da velocidade da sua conexão.")
    print("\nDurante a execução, você pode verificar o progresso consultando os logs em:")
    print("  - logs/historical_collector.log")
    
    # Confirma se o usuário deseja continuar
    if not args.yes:  # Pula confirmação se --yes estiver presente
        print("\n" + "!" * 70)
        print("ATENÇÃO: Este processo pode consumir muitos recursos e gerar tráfego!".center(70))
        print("!" * 70)
        
        choice = input("\nDeseja iniciar a coleta? (s/n): ")
        if choice.lower() != 's':
            print("\nOperação cancelada pelo usuário.")
            return
    
    # Cria diretório de logs se não existir
    os.makedirs('logs', exist_ok=True)
    
    # Inicia a coleta
    print("\nIniciando coleta de dados...")
    print(f"Hora de início: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # Importa o módulo e modifica as configurações conforme os argumentos
        from jobs.historical_collector import collect_historical_data
        import jobs.historical_collector as collector
        
        # Configura baseado nos argumentos
        if args.test:
            # Define estados de teste e limita dias
            collector.MAX_DAYS_BACK = args.days or 30
        elif args.states:
            # Define estados específicos
            state_list = args.states.upper().split(',')
        
        if args.days:
            # Define limite de dias
            collector.MAX_DAYS_BACK = args.days
        
        # Inicia a coleta e cronometra o tempo
        start_time = time.time()
        result = collect_historical_data()
        end_time = time.time()
        
        # Calcula a duração
        duration = end_time - start_time
        hours = int(duration // 3600)
        minutes = int((duration % 3600) // 60)
        seconds = int(duration % 60)
        
        # Exibe o resultado
        print("\n" + "=" * 70)
        if result["success"]:
            print("COLETA FINALIZADA COM SUCESSO!".center(70))
            print("=" * 70)
            print(f"\nEstados processados: {result['states_processed']}")
            print(f"Jogos coletados: {result['total_games_collected']}")
            print(f"Duração total: {hours}h {minutes}m {seconds}s")
        else:
            print("COLETA FINALIZADA COM ERROS!".center(70))
            print("=" * 70)
            print(f"\nErro: {result.get('message', 'Erro desconhecido')}")
            print("\nVerifique os logs para mais detalhes.")
        
        print("\nOs resultados completos estão disponíveis nos logs:")
        print("  - logs/historical_collector.log")
        
    except Exception as e:
        print("\nERRO CRÍTICO durante a execução!")
        print(f"Detalhes: {e}")
        print("\nVerifique os logs para mais informações.")
        import traceback
        traceback.print_exc()
        
    print("\nOperação finalizada.")

if __name__ == "__main__":
    main() 