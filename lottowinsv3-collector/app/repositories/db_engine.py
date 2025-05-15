"""
Database connection management using SQLAlchemy
"""
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.pool import QueuePool
from contextlib import contextmanager

logger = logging.getLogger('db_engine')

# URL de conexão PostgreSQL
POSTGRES_URL = "postgresql://postgres.qrkoibgclfeanzossjem:Cap0199**@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"

# Configurações do pool de conexões
pool_config = {
    'pool_size': 5,              # Número inicial de conexões no pool
    'max_overflow': 15,          # Máximo de conexões extras permitidas além do pool_size
    'pool_timeout': 30,          # Tempo máximo de espera por uma conexão (segundos)
    'pool_recycle': 1800,        # Recicla conexões após 30 minutos (evita conexões obsoletas)
    'pool_pre_ping': True,       # Verifica se conexão está ativa antes de usar
    'echo': False                # Não mostra SQL no log (mudar para True para debug)
}

# Cria o engine SQLAlchemy
try:
    engine = create_engine(
        POSTGRES_URL,
        poolclass=QueuePool,
        **pool_config
    )
    logger.info("SQLAlchemy engine inicializado com sucesso")
except Exception as e:
    logger.error(f"Erro ao criar SQLAlchemy engine: {e}")
    engine = None

# Cria factory de sessões
SessionFactory = sessionmaker(bind=engine)
ScopedSession = scoped_session(SessionFactory)

def get_engine():
    """
    Retorna o engine SQLAlchemy utilizado para conexões com o banco
    
    Returns:
        Engine: SQLAlchemy engine global
    """
    return engine

@contextmanager
def get_db_session():
    """
    Gerenciador de contexto para obter uma sessão de banco de dados
    e garantir que ela será fechada apropriadamente
    """
    session = ScopedSession()
    try:
        # Verifica conexão com ping
        session.execute(text("SELECT 1"))
        yield session
        session.commit()
    except Exception as e:
        logger.error(f"Erro na sessão de banco de dados: {e}")
        session.rollback()
        raise
    finally:
        session.close()
        ScopedSession.remove()

def get_raw_connection():
    """
    Obter uma conexão direta com o banco
    Útil para operações que precisam de cursor nativo do psycopg2
    """
    if not engine:
        logger.error("Engine não inicializado")
        return None
    
    try:
        connection = engine.raw_connection()
        return connection
    except Exception as e:
        logger.error(f"Erro ao obter conexão raw: {e}")
        return None

def dispose_engine():
    """
    Libera todas as conexões do pool
    Útil para encerrar a aplicação ou reiniciar o pool
    """
    if engine:
        try:
            engine.dispose()
            logger.info("Engine e pool de conexões liberados")
            return True
        except Exception as e:
            logger.error(f"Erro ao liberar engine: {e}")
            return False
    return True 