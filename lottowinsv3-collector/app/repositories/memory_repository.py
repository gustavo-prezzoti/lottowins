"""
Memory repository for state data
"""
from app.models.state import State

class StateMemoryRepository:
    """
    In-memory repository for state data
    """
    
    # In-memory storage
    _states = []
    
    @classmethod
    def clear(cls):
        """
        Clear the in-memory state list
        
        Returns:
            bool: Always returns True
        """
        cls._states = []
        return True
    
    @classmethod
    def save(cls, state):
        """
        Save a state to in-memory storage
        
        Args:
            state (State): State object to save
            
        Returns:
            dict: Result with operation status and action
        """
        # Check if state already exists
        existing_state = next((s for s in cls._states if s.code == state.code), None)
        
        if existing_state:
            # Update if already exists and name is different
            if existing_state.name != state.name:
                existing_state.name = state.name
                return {
                    "success": True,
                    "action": "updated",
                    "state": existing_state.to_dict()
                }
            return {
                "success": True,
                "action": "unchanged",
                "state": existing_state.to_dict()
            }
        
        # Add to list if it doesn't exist
        cls._states.append(state)
        return {
            "success": True,
            "action": "inserted",
            "state": state.to_dict()
        }
    
    @classmethod
    def save_many(cls, states):
        """
        Save multiple states to in-memory storage
        
        Args:
            states (list): List of State objects
            
        Returns:
            dict: Result with counts and status
        """
        inserted = 0
        updated = 0
        unchanged = 0
        
        for state in states:
            result = cls.save(state)
            
            if result["action"] == "inserted":
                inserted += 1
            elif result["action"] == "updated":
                updated += 1
            else:
                unchanged += 1
        
        return {
            "success": True,
            "inserted": inserted,
            "updated": updated,
            "unchanged": unchanged,
            "total": len(cls._states)
        }
    
    @classmethod
    def find_all(cls):
        """
        Get all states from in-memory storage
        
        Returns:
            list: List of State objects
        """
        return cls._states
    
    @classmethod
    def find_by_code(cls, code):
        """
        Find a state by its code
        
        Args:
            code (str): State code to search for
            
        Returns:
            State or None: Found state or None if not found
        """
        return next((s for s in cls._states if s.code == code), None) 