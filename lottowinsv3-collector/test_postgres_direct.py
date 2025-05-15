"""
Script para testar a conexão direta com PostgreSQL (sem pool)
"""
import sys
import logging
import psycopg2
import time

# Configure basic logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger('test_postgres_direct')

# Conexão direta (mesma da usada no módulo postgres_database.py)
POSTGRES_URL = "postgresql://postgres.qrkoibgclfeanzossjem:Cap0199**@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"

def test_connection():
    """Test PostgreSQL connection directly"""
    print("Iniciando teste de conexão PostgreSQL direta (sem pool)...")
    
    try:
        # Connect directly
        print("Conectando diretamente ao PostgreSQL...")
        conn = psycopg2.connect(POSTGRES_URL)
        print("Conexão direta bem-sucedida!")
        
        # Test simple query
        print("Executando consulta de teste...")
        cursor = conn.cursor()
        cursor.execute("SELECT 1 as test")
        result = cursor.fetchone()
        print(f"Resultado da consulta: {result}")
        cursor.close()
        
        # Close connection
        print("Fechando conexão...")
        conn.close()
        print("Conexão fechada com sucesso")
        
    except Exception as e:
        import traceback
        print(f"ERRO: {e}")
        print(traceback.format_exc())

if __name__ == "__main__":
    test_connection() 