import psycopg2
import psycopg2.pool
import logging
import time

logger = logging.getLogger('postgres_database')

POSTGRES_URL = "postgresql://postgres.qrkoibgclfeanzossjem:Cap0199**@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"

# Create a connection pool
pg_pool = None

def init_connection_pool(min_connections=5, max_connections=20):
    """Initialize the connection pool"""
    global pg_pool
    
    # Se já existe um pool, não crie outro
    if pg_pool is not None:
        logger.info("Pool já existe, não criando outro")
        return True
        
    try:
        # Teste direto de conexão antes de criar o pool
        logger.info("Testando conexão direta antes de criar o pool...")
        test_conn = psycopg2.connect(POSTGRES_URL)
        logger.info("Conexão de teste bem-sucedida!")
        test_conn.close()

        # Cria o pool
        logger.info(f"Criando pool com min={min_connections}, max={max_connections}")
        pg_pool = psycopg2.pool.SimpleConnectionPool(min_connections, max_connections, POSTGRES_URL)
        logger.info("PostgreSQL connection pool criado com sucesso")
        return True
    except Exception as e:
        logger.error(f"Erro ao criar pool de conexões: {e}")
        return False

def get_pg_connection(max_attempts=3):
    """Get a connection from the pool"""
    global pg_pool
    
    # Initialize pool if not already done
    if pg_pool is None:
        success = init_connection_pool()
        if not success:
            logger.error("Falha ao inicializar pool de conexões")
            return None
    
    # Tenta obter uma conexão com várias tentativas
    attempts = 0
    last_error = None
    
    while attempts < max_attempts:
        try:
            connection = pg_pool.getconn()
            if connection:
                # Testa a conexão para garantir que está funcionando
                cursor = connection.cursor()
                cursor.execute("SELECT 1")
                cursor.close()
                return connection
        except Exception as e:
            last_error = e
            logger.error(f"Tentativa {attempts+1}/{max_attempts} falhou: {e}")
            attempts += 1
            
            # Se for última tentativa, tenta reiniciar o pool
            if attempts == max_attempts - 1:
                logger.warning("Tentando reinicializar o pool de conexões...")
                try:
                    shutdown_pool()
                    time.sleep(1)
                    init_connection_pool()
                except Exception as pool_error:
                    logger.error(f"Falha ao reinicializar o pool: {pool_error}")
            
            time.sleep(1)  # Espera antes de tentar novamente
    
    logger.error(f"Erro ao obter conexão após {max_attempts} tentativas: {last_error}")
    return None

def release_connection(connection):
    """Return a connection to the pool"""
    global pg_pool
    if pg_pool is not None and connection is not None:
        try:
            pg_pool.putconn(connection)
        except Exception as e:
            logger.error(f"Erro ao retornar conexão ao pool: {e}")

def shutdown_pool():
    """Close all pool connections properly"""
    global pg_pool
    if pg_pool is not None:
        try:
            # Tenta fechar todas as conexões no pool
            connections_closed = pg_pool.closeall()
            logger.info(f"Pool de conexões fechado. Conexões fechadas: {connections_closed}")
            
            # Força liberação de memória
            del pg_pool
            pg_pool = None
            
            # Pequena pausa para garantir que tudo seja liberado
            time.sleep(0.5)
            
            return True
        except Exception as e:
            logger.error(f"Erro ao fechar pool de conexões: {e}")
            # Ainda assim, tenta garantir que o pool seja eliminado
            try:
                del pg_pool
            except:
                pass
            pg_pool = None
            return False
    return True

def run_migration(sql_path):
    conn = get_pg_connection()
    if not conn:
        print("Falha na conexão.")
        return
    try:
        with open(sql_path, 'r') as f:
            sql = f.read()
        cur = conn.cursor()
        cur.execute(sql)
        conn.commit()
        print("Migration executada com sucesso!")
    except Exception as e:
        print(f"Erro na migration: {e}")
    finally:
        cur.close()
        release_connection(conn) 