#!/usr/bin/env python3
"""
Script para executar migrações SQL no banco de dados
"""
import os
import sys
from app.repositories.postgres_database import get_pg_connection, release_connection

def run_migration(sql_file):
    """
    Executa um arquivo SQL de migração
    
    Args:
        sql_file (str): Caminho para o arquivo SQL
    
    Returns:
        bool: True se a migração foi bem-sucedida, False caso contrário
    """
    print(f"Executando migração: {sql_file}")
    
    # Verificar se o arquivo existe
    if not os.path.exists(sql_file):
        print(f"Erro: Arquivo {sql_file} não encontrado")
        return False
    
    # Ler o conteúdo do arquivo SQL
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql = f.read()
    
    # Obter conexão com o banco de dados
    conn = get_pg_connection()
    if not conn:
        print("Erro: Falha ao conectar ao banco de dados")
        return False
    
    try:
        # Criar cursor e executar o SQL
        cursor = conn.cursor()
        cursor.execute(sql)
        conn.commit()
        print(f"Migração {sql_file} executada com sucesso!")
        return True
    except Exception as e:
        print(f"Erro ao executar migração: {e}")
        conn.rollback()
        return False
    finally:
        cursor.close()
        release_connection(conn)

def main():
    """
    Função principal
    """
    # Verificar se foi fornecido um arquivo SQL
    if len(sys.argv) < 2:
        print("Uso: python run_migration.py <arquivo_sql>")
        return
    
    # Executar a migração
    sql_file = sys.argv[1]
    success = run_migration(sql_file)
    
    # Sair com código apropriado
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main() 