"""
Script para testar a conexão com PostgreSQL
"""
import sys
import logging
import time
from app.repositories.postgres_database import init_connection_pool, get_pg_connection, release_connection, shutdown_pool

# Configure basic logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger('test_postgres')

def test_connection():
    """Test PostgreSQL connection"""
    print("Iniciando teste de conexão PostgreSQL...")
    
    try:
        # Initialize pool
        print("Inicializando pool de conexão...")
        init_connection_pool(min_connections=2, max_connections=5)
        print("Pool inicializado com sucesso")
        
        # Get connection
        print("Obtendo conexão...")
        conn = get_pg_connection()
        if conn:
            print("Conexão obtida com sucesso!")
            
            # Test query
            print("Executando consulta de teste...")
            cursor = conn.cursor()
            cursor.execute("SELECT 1 as test")
            result = cursor.fetchone()
            print(f"Resultado da consulta: {result}")
            cursor.close()
            
            # Return connection to pool
            print("Devolvendo conexão ao pool...")
            release_connection(conn)
            print("Conexão devolvida com sucesso")
        else:
            print("Falha ao obter conexão!")
            
        # Shutdown pool
        print("Fechando pool de conexões...")
        shutdown_pool()
        print("Pool fechado com sucesso")
        
    except Exception as e:
        import traceback
        print(f"ERRO: {e}")
        print(traceback.format_exc())

if __name__ == "__main__":
    test_connection() 