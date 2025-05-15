"""
Entry point for running the application
"""
from app.api.app import create_app

if __name__ == "__main__":
    
    # Create and run app
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000) 