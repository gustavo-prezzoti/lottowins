"""
State service with business logic for state data
"""
import requests
from bs4 import BeautifulSoup
from app.models.state import State
from app.repositories.state_repository import StateRepository
from app.repositories.memory_repository import StateMemoryRepository

class StateService:
    """
    Service for state data management and collection
    """
    
    @staticmethod
    def collect_states_from_website():
        """
        Collect state data from www.lotterycorner.com
        
        Returns:
            list: List of State objects or empty list on error
        """
        url = "https://www.lotterycorner.com"
        
        try:
            # Making HTTP request
            response = requests.get(url)
            response.raise_for_status()
            
            # Parsing HTML
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Finding the form and select element
            form = soup.find('form', {'name': 'menuform'})
            if not form:
                print("Form not found on the page")
                return []
            
            select = form.find('select', {'name': 'menu2'})
            if not select:
                print("Select not found in the form")
                return []
            
            # Extracting options
            states = []
            for option in select.find_all('option'):
                value = option.get('value')
                text = option.text.strip()
                
                # Ignores "Select state" option and options without value
                if value and text and value != "":
                    # Removes the / from the beginning of value to get the state code
                    state_abbr = value.replace('/', '')
                    states.append(State(code=state_abbr, name=text))
            
            print(f"Collected data from {len(states)} states")
            return states
            
        except requests.exceptions.RequestException as e:
            print(f"Error making request to the site: {e}")
            return []
        except Exception as e:
            print(f"Error processing site data: {e}")
            return []
    
    @staticmethod
    def save_to_database(states):
        """
        Save state data to the database
        
        Args:
            states (list): List of State objects
            
        Returns:
            dict: Result with operation counts and status
        """
        
        # Save states
        return StateRepository.save_many(states)
    
    @staticmethod
    def save_to_memory(states):
        """
        Save state data to in-memory storage
        
        Args:
            states (list): List of State objects
            
        Returns:
            dict: Result with operation counts and status
        """
        return StateMemoryRepository.save_many(states)
    
    @classmethod
    def collect_and_save(cls, save_to_db=True, save_to_memory=True):
        """
        Collect state data and save it according to parameters
        
        Args:
            save_to_db (bool): Whether to save to database
            save_to_memory (bool): Whether to save to in-memory storage
            
        Returns:
            dict: Results of the operation
        """
        # Collect state data
        states = cls.collect_states_from_website()
        results = {"collected_states": len(states)}
        
        if not states:
            results["success"] = False
            results["message"] = "No state data collected"
            return results
        
        # Save to database if requested
        if save_to_db:
            db_result = cls.save_to_database(states)
            results["database"] = db_result
        
        # Save to memory if requested
        if save_to_memory:
            memory_result = cls.save_to_memory(states)
            results["memory"] = memory_result
        
        results["success"] = True
        return results
    
    @staticmethod
    def get_states_from_database():
        """
        Get all states from database
        
        Returns:
            list: List of State objects
        """
        return StateRepository.find_all()
    
    @staticmethod
    def get_states_from_memory():
        """
        Get all states from in-memory storage
        
        Returns:
            list: List of State objects
        """
        return StateMemoryRepository.find_all()
    
    @staticmethod
    def find_state_by_code(code, source="both"):
        """
        Find a state by its code
        
        Args:
            code (str): State code to search for
            source (str): Where to search - "db", "memory", or "both"
            
        Returns:
            dict: Result with state data or error message
        """
        state = None
        
        if source in ["memory", "both"]:
            state = StateMemoryRepository.find_by_code(code)
        
        if not state and source in ["db", "both"]:
            state = StateRepository.find_by_code(code)
        
        if state:
            return {
                "success": True,
                "state": state.to_dict(),
                "source": source
            }
        
        return {
            "success": False,
            "message": f"State with code '{code}' not found"
        } 