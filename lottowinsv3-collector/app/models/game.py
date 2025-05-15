"""
Game model definition
"""
from datetime import datetime

class Game:
    """
    Game model representing a lottery game
    """
    
    def __init__(self, name, slug, logo_url=None, id=None, created_at=None, updated_at=None):
        """
        Initialize a new Game instance
        
        Args:
            name (str): Game name
            slug (str): URL-friendly identifier
            logo_url (str, optional): URL to game logo
            id (int, optional): Database ID
            created_at (datetime, optional): Creation timestamp
            updated_at (datetime, optional): Last update timestamp
        """
        self.id = id
        self.name = name
        self.slug = slug
        self.logo_url = logo_url
        self.created_at = created_at
        self.updated_at = updated_at
    
    def to_dict(self):
        """
        Convert Game object to dictionary
        
        Returns:
            dict: Dictionary representation of game
        """
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'logo_url': self.logo_url,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    @classmethod
    def from_dict(cls, data):
        """
        Create Game object from dictionary
        
        Args:
            data (dict): Dictionary with game data
            
        Returns:
            Game: New Game instance
        """
        return cls(
            name=data.get('name'),
            slug=data.get('slug'),
            logo_url=data.get('logo_url'),
            id=data.get('id'),
            created_at=data.get('created_at'),
            updated_at=data.get('updated_at')
        ) 