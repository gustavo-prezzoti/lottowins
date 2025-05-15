"""
GameResult model definition
"""
import json
from datetime import datetime, date, time, timedelta

class GameResult:
    """
    GameResult model representing a lottery game result
    """
    
    def __init__(self, game_id, draw_date, numbers, 
                 draw_time=None, timezone=None, jackpot=None, next_draw_date=None, 
                 next_draw_time=None, next_jackpot=None, id=None, collected_at=None, state_id=None,
                 special_number=None):
        """
        Initialize a new GameResult instance
        
        Args:
            game_id (int): Associated game ID
            draw_date (date): Date of the draw
            numbers (list or dict or str): Winning numbers (string or JSON-serializable)
            draw_time (time, optional): Time of the draw
            timezone (str, optional): Timezone of the draw (e.g., '-0700')
            jackpot (str, optional): Current jackpot amount
            next_draw_date (date, optional): Date of the next draw
            next_draw_time (time, optional): Time of the next draw
            next_jackpot (str, optional): Next jackpot amount
            id (int, optional): Database ID
            collected_at (datetime, optional): When this data was collected
            state_id (int, optional): Associated state ID (maintained for backwards compatibility)
            special_number (str, optional): Special highlighted number (e.g., Mega Ball, Powerball)
        """
        self.id = id
        self.game_id = game_id
        self.state_id = state_id  # Mantido por compatibilidade com código existente
        self.draw_date = draw_date if isinstance(draw_date, date) else parse_date(draw_date)
        
        # Arredonda o horário para intervalos de 5 minutos
        parsed_time = draw_time if isinstance(draw_time, time) else parse_time(draw_time)
        self.draw_time = round_time_to_5min(parsed_time) if parsed_time else None
        
        self.timezone = timezone
        self.special_number = special_number
        
        # Handle numbers in various formats
        if isinstance(numbers, str):
            # If it's already a string, try to determine if it's JSON
            try:
                # Check if it's a JSON string
                json_data = json.loads(numbers)
                self.numbers = numbers  # Keep it as a JSON string for DB storage
            except json.JSONDecodeError:
                # It's a regular string, store as is
                self.numbers = numbers
        else:
            # If it's a list, dict or other serializable object, convert to JSON
            try:
                self.numbers = json.dumps(numbers) if numbers else ""
            except (TypeError, ValueError):
                # Fallback in case it can't be serialized
                self.numbers = str(numbers) if numbers else ""
            
        self.jackpot = jackpot
        
        self.next_draw_date = next_draw_date if isinstance(next_draw_date, date) else parse_date(next_draw_date)
        
        # Arredonda o próximo horário também
        parsed_next_time = next_draw_time if isinstance(next_draw_time, time) else parse_time(next_draw_time)
        self.next_draw_time = round_time_to_5min(parsed_next_time) if parsed_next_time else None
        
        self.next_jackpot = next_jackpot
        self.collected_at = collected_at
    
    def to_dict(self):
        """
        Convert GameResult object to dictionary
        
        Returns:
            dict: Dictionary representation of game result
        """
        return {
            'id': self.id,
            'game_id': self.game_id,
            'state_id': self.state_id,
            'draw_date': self.draw_date.isoformat() if self.draw_date else None,
            'draw_time': self.draw_time.isoformat() if self.draw_time else None,
            'timezone': self.timezone,
            'numbers': self.numbers,
            'special_number': self.special_number,
            'jackpot': self.jackpot,
            'next_draw_date': self.next_draw_date.isoformat() if self.next_draw_date else None,
            'next_draw_time': self.next_draw_time.isoformat() if self.next_draw_time else None,
            'next_jackpot': self.next_jackpot,
            'collected_at': self.collected_at.isoformat() if self.collected_at else None
        }
    
    @classmethod
    def from_dict(cls, data):
        """
        Create GameResult object from dictionary
        
        Args:
            data (dict): Dictionary with game result data
            
        Returns:
            GameResult: New GameResult instance
        """
        return cls(
            game_id=data.get('game_id'),
            draw_date=data.get('draw_date'),
            draw_time=data.get('draw_time'),
            timezone=data.get('timezone'),
            numbers=data.get('numbers'),
            jackpot=data.get('jackpot'),
            next_draw_date=data.get('next_draw_date'),
            next_draw_time=data.get('next_draw_time'),
            next_jackpot=data.get('next_jackpot'),
            id=data.get('id'),
            collected_at=data.get('collected_at'),
            state_id=data.get('state_id'),
            special_number=data.get('special_number')
        )


def round_time_to_5min(t):
    """
    Arredonda um objeto time para o intervalo de 5 minutos mais próximo
    
    Args:
        t (time): Objeto time para arredondar
        
    Returns:
        time: Objeto time arredondado ou None se t for None
    """
    if t is None:
        return None
        
    # Converter para datetime para facilitar os cálculos
    dt = datetime.combine(date.today(), t)
    
    # Calcular minutos desde a meia-noite
    minutes = dt.hour * 60 + dt.minute
    
    # Arredondar para o intervalo de 5 minutos mais próximo
    rounded_minutes = round(minutes / 5) * 5
    
    # Converter de volta para horas e minutos
    rounded_hour = rounded_minutes // 60
    rounded_minute = rounded_minutes % 60
    
    # Se arredondamos para 24:00, ajustar para 00:00
    if rounded_hour == 24:
        rounded_hour = 0
    
    # Criar um novo objeto time com os valores arredondados
    return time(hour=rounded_hour, minute=rounded_minute, second=0)


def parse_date(date_str):
    """Parse date from string in various formats"""
    if not date_str:
        return None
        
    # Try common formats
    formats = [
        '%Y-%m-%d',          # 2025-05-13
        '%m/%d/%Y',          # 05/13/2025
        '%d/%m/%Y',          # 13/05/2025
        '%a, %b-%d-%Y',      # Tue, May-13-2025
        '%a, %b %d, %Y',     # Tue, May 13, 2025
        '%B %d, %Y',         # May 13, 2025
        '%d %B %Y',          # 13 May 2025
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
            
    # If all formats fail, return None
    return None


def parse_time(time_str):
    """Parse time from string in various formats"""
    if not time_str:
        return None
        
    # Try common formats
    formats = [
        '%H:%M:%S',          # 14:30:00
        '%H:%M',             # 14:30
        '%I:%M:%S %p',       # 2:30:00 PM
        '%I:%M %p',          # 2:30 PM
        '%I.%M %p',          # 2.30 PM
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(time_str, fmt).time()
        except ValueError:
            continue
            
    # If all formats fail, return None
    return None 