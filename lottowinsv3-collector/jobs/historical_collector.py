"""
Historical Collector Job - Coleta automática de dados históricos de loteria
"""
import sys
import os
import logging
import time
import random
from datetime import datetime, timedelta
from app.services.state_service import StateService
from app.services.game_collector_service import GameCollectorService
from app.repositories.state_repository import StateRepository
from app.repositories.game_result_repository import GameResultRepository
from app.repositories.db_engine import dispose_engine

# Configuração de logging
os.makedirs('logs', exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/historical_collector.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('historical_collector')

# Configurações do coletor
MAX_DAYS_BACK = 3   # Reduzido para apenas 3 dias para testes
MAX_EMPTY_DAYS = 3   # Número máximo de dias consecutivos sem dados para considerar que acabaram os resultados
BATCH_SIZE = 10      # Número de estados processados por lote
PAUSE_BETWEEN_DAYS = 1.0  # Pausa entre dias (reduzida pois salvaremos tudo de uma vez)
PAUSE_BETWEEN_STATES = 2.0  # Pausa entre estados
MAX_RETRIES = 3      # Tentativas máximas para cada requisição
TEST_STATE = "NY"    # Estado para testes rápidos

# Erros que devem ser ignorados e pular para o próximo item
SKIP_ERROR_MESSAGES = [
    "500 Server Error",
    "Internal Server Error",
    "429 Too Many Requests",
    "503 Service Unavailable"
]

def collect_historical_data(max_days=MAX_DAYS_BACK, test_mode=False, state_code=TEST_STATE):
    """
    Função principal para coletar dados históricos
    
    Args:
        max_days (int): Número máximo de dias para coletar (para trás a partir de hoje)
        test_mode (bool): Se verdadeiro, processa apenas um estado para teste
        state_code (str): Código do estado para modo de teste
        
    Returns:
        dict: Resultados da coleta
    """
    logger.info(f"Iniciando coleta de dados históricos (modo coleção em massa) - limitado a {max_days} dias")
    if test_mode:
        logger.info(f"MODO DE TESTE - Processando apenas o estado {state_code}")
    
    try:
        # 1. Primeiro, garante que temos todos os estados no banco de dados
        logger.info("Coletando lista de estados disponíveis")
        StateService.collect_and_save(save_to_db=True, save_to_memory=False)
        
        # 2. Obtém todos os estados
        all_states = StateRepository.find_all()
        logger.info(f"Encontrados {len(all_states)} estados para processamento")
        
        # Em modo de teste, filtra apenas o estado solicitado
        if test_mode:
            original_count = len(all_states)
            all_states = [s for s in all_states if s.code.upper() == state_code.upper()]
            logger.info(f"Filtrado para apenas {len(all_states)} estado(s) dos {original_count} disponíveis")
            
            if not all_states:
                logger.error(f"Estado de teste {state_code} não encontrado!")
                return {"success": False, "message": f"Estado {state_code} não encontrado"}
        
        # Estrutura para armazenar todos os resultados coletados
        all_collected_results = []
        
        # Processa todos os estados sem priorização
        logger.info(f"Modo completo: coletando todos os estados ({len(all_states)})")
        
        # 3. Processa os estados em lotes para evitar sobrecarga de memória
        total_states = len(all_states)
        total_games_collected = 0
        
        for i in range(0, total_states, BATCH_SIZE):
            state_batch = all_states[i:i+BATCH_SIZE]
            batch_end = min(i + BATCH_SIZE, total_states)
            logger.info(f"Processando lote de estados {i+1}-{batch_end} de {total_states}")
            
            # Lista para armazenar resultados deste lote
            batch_results = []
            
            # Processa cada estado no lote atual
            for state in state_batch:
                logger.info(f"Iniciando coleta histórica para o estado: {state.code} - {state.name}")
                
                # Data inicial (hoje)
                current_date = datetime.now().date()
                days_processed = 0
                empty_days_count = 0
                state_games_collected = 0
                
                # Armazena o estado já validado para não precisar buscar novamente a cada dia
                state_cache = {
                    "id": state.id,
                    "code": state.code, 
                    "name": state.name
                }
                
                # Inicia a coleta para este estado (sem salvar no banco ainda)
                try:
                    # Itera para trás no tempo até atingir o limite ou não encontrar mais resultados
                    while days_processed < max_days and empty_days_count < MAX_EMPTY_DAYS:
                        # Adiciona um atraso aleatório para requisições parecerem mais humanas
                        pause_time = PAUSE_BETWEEN_DAYS + (random.random() * 1.0)
                        
                        retry_count = 0
                        success = False
                        
                        # Coleta dados para este estado e data
                        process_year = current_date.year
                        process_month = current_date.month
                        process_day = current_date.day
                        
                        logger.info(f"Coletando dados para {state.code} na data {current_date} (tentativa {retry_count+1})")
                        
                        try:
                            # Usa o cache de estado para evitar nova consulta ao banco
                            # IMPORTANTE: Coletamos mas NÃO salvamos no banco ainda
                            result = GameCollectorService.collect_games_by_date_with_state_data(
                                state_cache, process_year, process_month, process_day, save_to_db=False
                            )
                            
                            if result["success"]:
                                games_collected = result.get("games_collected", 0)
                                state_games_collected += games_collected
                                
                                # Se temos jogos coletados, adiciona à lista de resultados
                                if games_collected > 0:
                                    logger.info(f"Coletados {games_collected} jogos para {state.code} em {current_date}")
                                    empty_days_count = 0  # Reseta o contador de dias vazios
                                    
                                    # Adiciona os resultados à lista batch
                                    if "games" in result:
                                        # Para cada jogo coletado, criamos objetos Game para salvar
                                        from app.models.game import Game
                                        from app.repositories.game_repository import GameRepository
                                        
                                        # Cria uma lista de objetos Game para salvar
                                        games_to_save = []
                                        game_mappings = {}  # Para mapear slug -> game objeto
                                        
                                        for game_data in result["games"]:
                                            if "game" in game_data:
                                                game_info = game_data["game"]
                                                game = Game(
                                                    name=game_info["name"],
                                                    slug=game_info["slug"],
                                                    logo_url=game_info.get("logo_url")
                                                )
                                                games_to_save.append(game)
                                                game_mappings[game.slug] = game
                                                
                                        # Salva todos os jogos de uma vez e obtém seus IDs
                                        if games_to_save:
                                            saved_games = GameRepository.save_many(games_to_save, state.id)
                                            logger.info(f"Salvos {len(saved_games)} jogos para {state.code}")
                                            
                                            # Atualiza os IDs dos jogos no mapeamento
                                            for saved_game in saved_games:
                                                if saved_game.slug in game_mappings:
                                                    game_mappings[saved_game.slug] = saved_game
                                                    logger.info(f"Jogo {saved_game.slug} tem ID: {saved_game.id}")
                                        
                                        # Agora que temos os IDs dos jogos, criamos os objetos GameResult
                                        for game_data in result["games"]:
                                            if "result" in game_data and "game" in game_data:
                                                # Construir um objeto GameResult completo
                                                from app.models.game_result import GameResult
                                                
                                                # Obtém o jogo salvo pelo slug
                                                game_slug = game_data["game"]["slug"]
                                                saved_game = game_mappings.get(game_slug)
                                                
                                                logger.info(f"Processando resultado para jogo {game_slug}")
                                                
                                                if not saved_game or not saved_game.id:
                                                    logger.warning(f"Não foi possível encontrar ID para o jogo {game_slug}")
                                                    logger.warning(f"Slugs disponíveis: {list(game_mappings.keys())}")
                                                    continue
                                                
                                                # Prepara os dados do resultado
                                                result_data = game_data["result"].copy()
                                                
                                                # Garante que temos o state_id e game_id
                                                if "state_id" not in result_data:
                                                    result_data["state_id"] = state.id
                                                    
                                                # Forçar o game_id usando o ID do jogo salvo
                                                result_data["game_id"] = saved_game.id
                                                logger.info(f"Definido game_id={saved_game.id} para jogo {game_slug}")
                                                
                                                try:
                                                    # Validação explícita do game_id antes de criar o objeto
                                                    if "game_id" not in result_data or result_data["game_id"] is None:
                                                        logger.error(f"ERRO: game_id ausente ou None para {game_slug} após atribuição")
                                                    else:
                                                        logger.info(f"Criando GameResult com game_id={result_data['game_id']}")
                                                        
                                                    # Criar o objeto GameResult com o ID correto
                                                    game_result = GameResult(**result_data)
                                                    
                                                    # Verificar se o game_id foi preservado no objeto
                                                    if game_result.game_id is None:
                                                        logger.error(f"ERRO: game_id perdido após criar GameResult!")
                                                        # Atribuir o game_id diretamente ao objeto
                                                        game_result.game_id = saved_game.id
                                                        logger.info(f"Forçado game_id={saved_game.id} diretamente no objeto")
                                                    
                                                    batch_results.append(game_result)
                                                except Exception as e:
                                                    logger.error(f"Erro ao criar GameResult para {state.code}: {e}")
                                                    logger.error(f"Dados: {result_data}")
                                else:
                                    logger.info(f"Nenhum jogo encontrado para {state.code} em {current_date}")
                                    empty_days_count += 1
                                
                                success = True
                            else:
                                error_msg = result.get('message', '')
                                
                                # Verifica se devemos pular este erro (erro de servidor)
                                should_skip = any(skip_err in error_msg for skip_err in SKIP_ERROR_MESSAGES)
                                
                                if should_skip:
                                    logger.warning(f"Pulando erro de servidor para {state.code} em {current_date}: {error_msg}")
                                    # Conta como um dia vazio mas não retenta
                                    empty_days_count += 1
                                    success = True
                                # Se a mensagem indicar que não há jogos, trate como sucesso
                                elif "No games found" in error_msg:
                                    logger.warning(f"Sem jogos para {state.code} em {current_date}: {error_msg}")
                                    # Se for o primeiro dia analisado e não há jogos, pula para o próximo estado
                                    if days_processed == 0:
                                        logger.info(f"Nenhum jogo encontrado para {state.code} na primeira data. Pulando para o próximo estado.")
                                        empty_days_count = MAX_EMPTY_DAYS  # Força sair do loop
                                    else:
                                        empty_days_count += 1
                                    success = True
                                # Se o estado não for encontrado, pule
                                elif "not found in database" in error_msg:
                                    logger.warning(f"Estado {state.code} não encontrado no banco: {error_msg}")
                                    success = True
                                    empty_days_count = MAX_EMPTY_DAYS  # Força sair do loop
                                else:
                                    # Para outros erros, tenta novamente (até MAX_RETRIES)
                                    if retry_count < MAX_RETRIES - 1:
                                        logger.error(f"Erro ao coletar dados para {state.code} em {current_date}: {error_msg}")
                                        retry_count += 1
                                        time.sleep(2)  # Pausa entre tentativas
                                    else:
                                        # Se atingiu o número máximo de tentativas, pula
                                        logger.error(f"Máximo de tentativas excedido para {state.code} em {current_date}. Pulando.")
                                        empty_days_count += 1
                                        success = True
                        
                        except Exception as e:
                            # Verifica se o erro deve ser pulado
                            err_str = str(e)
                            should_skip = any(skip_err in err_str for skip_err in SKIP_ERROR_MESSAGES)
                            
                            if should_skip:
                                logger.warning(f"Pulando erro de servidor para {state.code} em {current_date}: {e}")
                                # Conta como um dia vazio mas não retenta
                                empty_days_count += 1
                                success = True
                            else:
                                logger.error(f"Exceção ao processar {state.code} em {current_date}: {e}")
                                
                                # Só tenta novamente se não atingimos o máximo de tentativas
                                if retry_count < MAX_RETRIES - 1:
                                    retry_count += 1
                                    time.sleep(3)  # Pausa maior após exceção
                                else:
                                    # Se atingiu o número máximo de tentativas, pula
                                    logger.error(f"Máximo de tentativas excedido para {state.code} em {current_date}. Pulando.")
                                    empty_days_count += 1
                                    success = True
                        
                        # Pequena pausa entre requisições
                        time.sleep(pause_time)
                        
                        # Avança para o dia anterior
                        current_date = current_date - timedelta(days=1)
                        days_processed += 1
                    
                    # Resumo da coleta para este estado
                    if state_games_collected > 0:
                        logger.info(f"Finalizada coleta para {state.code}: {state_games_collected} jogos em {days_processed} dias")
                    else:
                        logger.warning(f"Nenhum jogo encontrado para {state.code} após processar {days_processed} dias")
                    
                    total_games_collected += state_games_collected
                    
                except Exception as e:
                    logger.error(f"Erro grave processando estado {state.code}: {e}")
                    import traceback
                    logger.error(traceback.format_exc())
                
                # Pequena pausa entre estados
                time.sleep(PAUSE_BETWEEN_STATES)
            
            # Adiciona os resultados deste lote à lista principal
            all_collected_results.extend(batch_results)
            logger.info(f"Lote de estados processado, coletados {len(batch_results)} resultados neste lote")
            logger.info(f"Total acumulado: {len(all_collected_results)} resultados")
            
            # Salva lote atual no banco para liberar memória
            if batch_results:
                logger.info(f"Salvando lote de {len(batch_results)} resultados no banco de dados...")
                
                # Debug - verifica as propriedades de alguns resultados para diagnóstico
                if len(batch_results) > 0:
                    sample_size = min(3, len(batch_results))
                    logger.info(f"Amostra de resultados que serão salvos (primeiros {sample_size}):")
                    for i in range(sample_size):
                        result = batch_results[i]
                        logger.info(f"  Result {i+1}: game_id={result.game_id}, state_id={result.state_id}, " +
                                   f"draw_date={result.draw_date}, numbers={result.numbers[:30]}...")
                
                    # Validação adicional antes de salvar
                    null_ids = sum(1 for r in batch_results if r.game_id is None)
                    if null_ids > 0:
                        logger.error(f"ATENÇÃO: {null_ids} resultados com game_id=None de {len(batch_results)} total")
                        # Tenta corrigir os resultados que têm game_id nulo
                        corrected = 0
                        for result in batch_results:
                            if result.game_id is None and hasattr(result, "_game_slug") and hasattr(result, "_saved_game_id"):
                                result.game_id = result._saved_game_id
                                corrected += 1
                        if corrected > 0:
                            logger.info(f"Corrigidos {corrected} resultados usando IDs salvos")
                            
                    # Re-verificar após correções
                    null_ids = sum(1 for r in batch_results if r.game_id is None)
                    if null_ids > 0:
                        logger.error(f"ALERTA FINAL: Ainda restam {null_ids} resultados com game_id=None")
                
                try:
                    batch_results_save = GameResultRepository.save_many(batch_results)
                    
                    if batch_results_save.get("success", False):
                        logger.info(f"Lote salvo com sucesso: {batch_results_save.get('inserted', 0)} inseridos, " +
                                   f"{batch_results_save.get('updated', 0)} atualizados, " +
                                   f"{batch_results_save.get('unchanged', 0)} sem alterações")
                        
                        # Adicionar informações sobre erros de inserção, se houver
                        insert_errors = batch_results_save.get("insert_errors", 0)
                        if insert_errors > 0:
                            logger.warning(f"Houve {insert_errors} erros de inserção (provavelmente registros duplicados)")
                            logger.info(f"A coleta continuará normalmente, esses erros geralmente são esperados para jogos multi-estado")
                    else:
                        logger.error(f"Falha ao salvar lote: {batch_results_save.get('message', 'Erro desconhecido')}")
                        # Não interrompemos a execução, apenas registramos o erro
                except Exception as e:
                    logger.error(f"Exceção ao salvar lote: {e}")
                    logger.error("Continuando a execução com o próximo lote")
            
        # Resultados finais
        logger.info(f"Coleta histórica finalizada! Total de {total_games_collected} jogos coletados")
        logger.info(f"Total de {len(all_collected_results)} resultados processados")
        
        return {
            "success": True,
            "states_processed": total_states,
            "total_games_collected": total_games_collected,
            "total_results_processed": len(all_collected_results)
        }
        
    except Exception as e:
        logger.error(f"Erro na coleta histórica: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return {
            "success": False,
            "message": str(e)
        }
    finally:
        # Garante que todas as conexões sejam liberadas
        try:
            logger.info("Liberando todas as conexões...")
            # Fecha o pool global de conexões
            dispose_engine()
            logger.info("Conexões de banco de dados liberadas")
        except Exception as e:
            logger.error(f"Erro ao liberar conexões: {e}")

def main():
    """Função de entrada para execução direta"""
    print("Iniciando coleta de dados históricos...")
    try:
        # Lógica simplificada para permitir execução direta
        import sys
        # Verifica argumentos básicos para testes
        max_days = MAX_DAYS_BACK
        test_mode = False
        state_code = TEST_STATE
        
        if len(sys.argv) > 1:
            if "--days" in sys.argv:
                try:
                    idx = sys.argv.index("--days")
                    if idx + 1 < len(sys.argv):
                        max_days = int(sys.argv[idx + 1])
                        print(f"Coletando dados limitados a {max_days} dias")
                except (ValueError, IndexError):
                    pass
                    
            if "--test" in sys.argv:
                test_mode = True
                try:
                    idx = sys.argv.index("--test")
                    if idx + 1 < len(sys.argv) and not sys.argv[idx + 1].startswith("--"):
                        state_code = sys.argv[idx + 1].upper()
                except (ValueError, IndexError):
                    pass
                print(f"MODO DE TESTE ativado - coletando apenas para o estado {state_code}")
        
        result = collect_historical_data(max_days, test_mode, state_code)
        if result["success"]:
            print(f"Coleta finalizada com sucesso! Processados {result['states_processed']} estados, coletados {result['total_games_collected']} jogos")
        else:
            print(f"Coleta falhou: {result.get('message', 'Erro desconhecido')}")
    except Exception as e:
        print(f"Erro crítico: {e}")
    print("Processo finalizado.")

if __name__ == "__main__":
    main() 