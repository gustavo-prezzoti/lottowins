"""
State model definition
"""

class State:
    """
    State model representing a US state
    """
    
    def __init__(self, code, name, id=None, created_at=None):
        """
        Initialize a new State instance
        
        Args:
            code (str): State code/abbreviation
            name (str): State name
            id (int, optional): Database ID
            created_at (datetime, optional): Creation timestamp
        """
        self.id = id
        self.code = code
        self.name = name
        self.created_at = created_at
    
    def to_dict(self):
        """
        Convert State object to dictionary
        
        Returns:
            dict: Dictionary representation of state
        """
        return {
            'id': self.id,
            'code': self.code,
            'name': self.name,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    @classmethod
    def from_dict(cls, data):
        """
        Create State object from dictionary
        
        Args:
            data (dict): Dictionary with state data
            
        Returns:
            State: New State instance
        """
        return cls(
            code=data.get('code'),
            name=data.get('name'),
            id=data.get('id'),
            created_at=data.get('created_at')
        ) 