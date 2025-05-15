"""
State repository for database operations
"""
from datetime import datetime
from app.repositories.db_engine import get_db_session, get_raw_connection
from app.models.state import State
import psycopg2.extras
import logging
from sqlalchemy import text

logger = logging.getLogger(__name__)

class StateRepository:
    """
    Repository for state data storage and retrieval
    """
    
    @staticmethod
    def save(state):
        """
        Save a state to the database
        
        Args:
            state (State): State object to save
            
        Returns:
            dict: Result of the operation
        """
        with get_db_session() as session:
            try:
                # Usar SQL direto com SQLAlchemy para manter compatibilidade
                # Check if state already exists
                result = session.execute(
                    text("SELECT id, created_at FROM states WHERE code = :code"),
                    {"code": state.code}
                ).fetchone()
                
                if result:
                    # Update if it exists
                    state.id = result[0]
                    state.created_at = result[1]
                    
                    session.execute(
                        text("UPDATE states SET name = :name WHERE code = :code"),
                        {"name": state.name, "code": state.code}
                    )
                    
                    return {
                        "success": True, 
                        "action": "updated", 
                        "state": state.to_dict()
                    }
                else:
                    # Insert if it doesn't exist
                    result = session.execute(
                        text("INSERT INTO states (code, name) VALUES (:code, :name) RETURNING id, created_at"),
                        {"code": state.code, "name": state.name}
                    ).fetchone()
                    
                    state.id = result[0]
                    state.created_at = result[1]
                    
                    return {
                        "success": True, 
                        "action": "inserted", 
                        "state": state.to_dict()
                    }
            except Exception as e:
                error_message = f"Error saving state to database: {e}"
                logger.error(error_message)
                return {"success": False, "message": error_message}
    
    @staticmethod
    def save_many(states):
        """
        Save multiple states to the database
        
        Args:
            states (list): List of State objects
            
        Returns:
            dict: Result with counts and status
        """
        with get_db_session() as session:
            try:
                # Get all existing states in one query
                existing_codes = {
                    row[0] for row in session.execute(text("SELECT code FROM states")).fetchall()
                }
                
                # Prepare batches for insert and update
                inserts = []
                updates = []
                
                for state in states:
                    if state.code in existing_codes:
                        updates.append({"name": state.name, "code": state.code})
                    else:
                        inserts.append({"code": state.code, "name": state.name})
                
                # Execute batch operations
                inserted = 0
                updated = 0
                failed = 0
                
                # Insert batch
                if inserts:
                    try:
                        for item in inserts:
                            session.execute(
                                text("INSERT INTO states (code, name) VALUES (:code, :name)"),
                                item
                            )
                        inserted = len(inserts)
                    except Exception as e:
                        logger.error(f"Error inserting states: {e}")
                        failed = len(inserts)
                
                # Update batch
                if updates:
                    try:
                        for item in updates:
                            session.execute(
                                text("UPDATE states SET name = :name WHERE code = :code"),
                                item
                            )
                        updated = len(updates)
                    except Exception as e:
                        logger.error(f"Error updating states: {e}")
                        failed = len(updates)
                
                return {
                    "success": True,
                    "inserted": inserted,
                    "updated": updated,
                    "failed": failed,
                    "total_processed": inserted + updated + failed
                }
                    
            except Exception as e:
                error_message = f"Error saving states to database: {e}"
                logger.error(error_message)
                return {"success": False, "message": error_message}
    
    @staticmethod
    def find_all():
        """
        Retrieve all states from the database
        
        Returns:
            list: List of State objects
        """
        try:
            with get_db_session() as session:
                # Usar SQLAlchemy para buscar todos os estados
                results = session.execute(
                    text("SELECT id, code, name, created_at FROM states ORDER BY name")
                ).fetchall()
                
                states = []
                for row in results:
                    states.append(State(
                        id=row[0],
                        code=row[1],
                        name=row[2],
                        created_at=row[3]
                    ))
                    
                return states
                
        except Exception as e:
            logger.error(f"Error retrieving states from database: {e}")
            return []
    
    @staticmethod
    def find_by_code(code):
        """
        Find a state by its code
        
        Args:
            code (str): State code to search for
            
        Returns:
            State or None: Found state or None if not found
        """
        try:
            with get_db_session() as session:
                # Usar SQLAlchemy para buscar estado
                result = session.execute(
                    text("SELECT id, code, name, created_at FROM states WHERE code = :code"),
                    {"code": code}
                ).fetchone()
                
                if result:
                    return State(
                        id=result[0],
                        code=result[1],
                        name=result[2],
                        created_at=result[3]
                    )
                return None
                
        except Exception as e:
            logger.error(f"Error finding state in database: {e}")
            return None 