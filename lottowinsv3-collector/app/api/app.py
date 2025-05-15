"""
Main Flask application
"""
from flask import Flask, jsonify 

def create_app():
    """
    Create and configure the Flask application
    
    Returns:
        Flask: Configured Flask app
    """
    app = Flask(__name__)
    
    # Register blueprints
    from app.api.state_routes import state_bp
    app.register_blueprint(state_bp)
     
    # Root route
    @app.route('/')
    def home():
        return jsonify({
            "application": "Lottery States Collector API",
            "status": "running",
            "endpoints": {
                "collect_states": "/api/states/collect",
                "get_all_states": "/api/states/",
                "get_state_by_code": "/api/states/<code>"
            }
        })
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "success": False,
            "error": 404,
            "message": "Resource not found"
        }), 404
    
    @app.errorhandler(500)
    def server_error(error):
        return jsonify({
            "success": False,
            "error": 500,
            "message": "Internal server error"
        }), 500
    
    return app 