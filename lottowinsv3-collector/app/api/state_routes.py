"""
API routes for state data
"""
from flask import Blueprint, jsonify, request
from app.services.state_service import StateService

# Create blueprint
state_bp = Blueprint('states', __name__, url_prefix='/api/states')

@state_bp.route('/collect', methods=['POST'])
def collect_states():
    """
    Endpoint to collect states from website
    
    Query parameters:
        save_to_db: '1'/'0' to enable/disable DB storage
        save_to_memory: '1'/'0' to enable/disable memory storage
    """
    # Parse query parameters with defaults
    save_to_db = request.args.get('save_to_db', '1') == '1'
    save_to_memory = request.args.get('save_to_memory', '1') == '1'
    
    # Collect and save data
    result = StateService.collect_and_save(
        save_to_db=save_to_db,
        save_to_memory=save_to_memory
    )
    
    return jsonify(result)

@state_bp.route('/', methods=['GET'])
def get_states():
    """
    Endpoint to get all states
    
    Query parameters:
        source: 'db', 'memory', or 'both'
    """
    source = request.args.get('source', 'both')
    
    states = []
    if source in ['db', 'both']:
        db_states = StateService.get_states_from_database()
        states.extend([s.to_dict() for s in db_states])
    
    if source == 'memory':
        # If only memory source, directly get memory states
        memory_states = StateService.get_states_from_memory()
        states = [s.to_dict() for s in memory_states]
    elif source == 'both':
        # If both sources, add memory states not already in result
        memory_states = StateService.get_states_from_memory()
        existing_codes = {s['code'] for s in states}
        states.extend([s.to_dict() for s in memory_states if s.code not in existing_codes])
    
    return jsonify({
        'success': True,
        'source': source,
        'count': len(states),
        'states': states
    })

@state_bp.route('/<code>', methods=['GET'])
def get_state_by_code(code):
    """
    Endpoint to get a state by its code
    
    Query parameters:
        source: 'db', 'memory', or 'both'
    """
    source = request.args.get('source', 'both')
    result = StateService.find_state_by_code(code, source)
    
    return jsonify(result) 