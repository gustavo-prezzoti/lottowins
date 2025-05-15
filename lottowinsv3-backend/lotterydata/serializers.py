from rest_framework import serializers
from .models import State, Game, StateGame, GameResult, CollectionLog, Notification, GamePrediction

class StateSerializer(serializers.ModelSerializer):
    class Meta:
        model = State
        fields = ['id', 'code', 'name', 'created_at']

class GameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Game
        fields = ['id', 'name', 'slug', 'logo_url', 'created_at', 'updated_at']

class StateGameSerializer(serializers.ModelSerializer):
    state_details = StateSerializer(source='state', read_only=True)
    game_details = GameSerializer(source='game', read_only=True)
    
    class Meta:
        model = StateGame
        fields = ['id', 'state', 'game', 'state_details', 'game_details', 'created_at']

class GameResultSerializer(serializers.ModelSerializer):
    state_details = StateSerializer(source='state', read_only=True)
    game_details = GameSerializer(source='game', read_only=True)
    
    class Meta:
        model = GameResult
        fields = ['id', 'game', 'state', 'draw_date', 'draw_time', 'numbers', 'special_number', 'jackpot', 
                 'next_draw_date', 'next_draw_time', 'next_jackpot', 'collected_at',
                 'state_details', 'game_details']

class CollectionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = CollectionLog
        fields = ['id', 'state_code', 'url', 'status', 'start_time', 'end_time', 
                 'games_collected', 'error_message', 'created_at']

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'user', 'title', 'subtitle', 'description', 'is_read', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

class GamePredictionSerializer(serializers.ModelSerializer):
    state_details = StateSerializer(source='state', read_only=True)
    game_details = GameSerializer(source='game', read_only=True)
    
    class Meta:
        model = GamePrediction
        fields = ['id', 'game', 'state', 'user', 'predicted_numbers', 'predicted_special_number', 
                 'confidence_score', 'analysis_summary', 'hot_numbers', 'cold_numbers', 'overdue_numbers',
                 'created_at', 'updated_at', 'state_details', 'game_details']
        read_only_fields = ['created_at', 'updated_at']

class SimplifiedGamePredictionSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    game_id = serializers.IntegerField()
    state_id = serializers.IntegerField()
    game_name = serializers.CharField()
    state_code = serializers.CharField()
    predicted_numbers = serializers.CharField()
    predicted_special_number = serializers.CharField(allow_null=True)
    confidence_score = serializers.DecimalField(max_digits=5, decimal_places=2)
    hot_numbers = serializers.CharField(allow_null=True, required=False)
    cold_numbers = serializers.CharField(allow_null=True, required=False)
    overdue_numbers = serializers.CharField(allow_null=True, required=False)
    created_at = serializers.CharField() 