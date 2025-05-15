from django.shortcuts import render
from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view
from .models import State, Game, StateGame, GameResult, CollectionLog, Notification, GamePrediction
from .serializers import (
    StateSerializer, GameSerializer, StateGameSerializer, 
    GameResultSerializer, CollectionLogSerializer, NotificationSerializer,
    GamePredictionSerializer, SimplifiedGamePredictionSerializer
)
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from django.db import connection
from django.http import JsonResponse
from rest_framework import permissions
import logging
import random
from datetime import datetime
from collections import Counter

logger = logging.getLogger(__name__)

class StateViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing states.
    """
    queryset = State.objects.all()
    serializer_class = StateSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['code', 'name']

class GameViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing games.
    """
    queryset = Game.objects.all()
    serializer_class = GameSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'slug']

class StateGameViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing state-game relationships.
    """
    queryset = StateGame.objects.all()
    serializer_class = StateGameSerializer

class GameResultViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing game results.
    """
    queryset = GameResult.objects.all().order_by('-collected_at')
    serializer_class = GameResultSerializer
    
    @swagger_auto_schema(
        method='get',
        operation_description="Get game results by state code",
        manual_parameters=[
            openapi.Parameter(
                'state_code', 
                openapi.IN_PATH, 
                description="State code", 
                type=openapi.TYPE_STRING,
                required=True
            )
        ],
        responses={200: GameResultSerializer(many=True)}
    )
    @action(detail=False, methods=['get'], url_path='by-state/(?P<state_code>[^/.]+)')
    def by_state(self, request, state_code=None):
        """
        Get game results for a specific state.
        """
        try:
            state = State.objects.get(code=state_code)
            results = GameResult.objects.filter(state=state).order_by('-collected_at')
            serializer = self.get_serializer(results, many=True)
            return Response(serializer.data)
        except State.DoesNotExist:
            return Response(
                {"error": f"State with code '{state_code}' not found."},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @swagger_auto_schema(
        method='get',
        operation_description="Get game results by game ID",
        manual_parameters=[
            openapi.Parameter(
                'game_id', 
                openapi.IN_PATH, 
                description="Game ID", 
                type=openapi.TYPE_INTEGER,
                required=True
            )
        ],
        responses={200: GameResultSerializer(many=True)}
    )
    @action(detail=False, methods=['get'], url_path='by-game/(?P<game_id>[^/.]+)')
    def by_game(self, request, game_id=None):
        """
        Get results for a specific game.
        """
        try:
            game = Game.objects.get(pk=game_id)
            results = GameResult.objects.filter(game=game).order_by('-collected_at')
            serializer = self.get_serializer(results, many=True)
            return Response(serializer.data)
        except Game.DoesNotExist:
            return Response(
                {"error": f"Game with ID '{game_id}' not found."},
                status=status.HTTP_404_NOT_FOUND
            )

class CollectionLogViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing collection logs.
    """
    queryset = CollectionLog.objects.all().order_by('-created_at')
    serializer_class = CollectionLogSerializer

class NotificationViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing user notifications.
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Return notifications for the authenticated user only
        """
        return Notification.objects.filter(user=self.request.user)
    
    @swagger_auto_schema(
        operation_description="Get all notifications for the authenticated user",
        responses={200: NotificationSerializer(many=True)}
    )
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        
        # Estrutura padronizada para resposta
        response_data = {
            "count": len(serializer.data),
            "results": serializer.data,
            "has_notifications": len(serializer.data) > 0,
            "unread_count": queryset.filter(is_read=False).count()
        }
        
        return Response(response_data)
    
    @swagger_auto_schema(
        operation_description="Create a new notification",
        responses={201: NotificationSerializer()}
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        
        response_data = {
            "message": "Notification created successfully",
            "notification": serializer.data,
            "success": True
        }
        
        return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)
    
    @swagger_auto_schema(
        operation_description="Get notification details",
        responses={200: NotificationSerializer(), 404: "Notification not found"}
    )
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        
        response_data = {
            "notification": serializer.data
        }
        
        return Response(response_data)
    
    @swagger_auto_schema(
        operation_description="Mark notification as read",
        responses={200: NotificationSerializer(), 404: "Notification not found"}
    )
    @action(detail=True, methods=['patch'])
    def mark_as_read(self, request, pk=None):
        """
        Mark a notification as read
        """
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        serializer = self.get_serializer(notification)
        
        response_data = {
            "message": "Notification marked as read",
            "notification": serializer.data,
            "success": True
        }
        
        return Response(response_data)
    
    @swagger_auto_schema(
        operation_description="Mark all notifications as read",
        responses={200: "All notifications marked as read"}
    )
    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        """
        Mark all notifications as read for the authenticated user
        """
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        
        response_data = {
            "message": "All notifications marked as read",
            "count": count,
            "success": True
        }
        
        return Response(response_data)
    
    @swagger_auto_schema(
        operation_description="Get unread notification count",
        responses={200: "Count of unread notifications"}
    )
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """
        Get the count of unread notifications for the authenticated user
        """
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        total = Notification.objects.filter(user=request.user).count()
        
        response_data = {
            "unread_count": count,
            "total_count": total,
            "has_unread": count > 0
        }
        
        return Response(response_data)

class GamePredictionViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing game predictions.
    """
    serializer_class = SimplifiedGamePredictionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Return predictions for the authenticated user only, filtered by query parameters
        """
        # Direct SQL query to get user's predictions
        query = '''
            SELECT 
                gp.id,
                gp.game_id,
                gp.state_id,
                gp.predicted_numbers,
                gp.predicted_special_number,
                gp.confidence_score,
                gp.hot_numbers,
                gp.cold_numbers,
                gp.overdue_numbers,
                TO_CHAR(gp.created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
                g.name as game_name,
                s.code as state_code
            FROM game_predictions gp
            INNER JOIN games g ON gp.game_id = g.id
            INNER JOIN states s ON gp.state_id = s.id
            WHERE gp.user_id = %s
        '''
        
        params = [self.request.user.id]
        
        # Add game and state filters if provided
        game_id = self.request.query_params.get('game_id')
        state_id = self.request.query_params.get('state_id')
        
        if game_id:
            query += ' AND gp.game_id = %s'
            params.append(game_id)
        if state_id:
            query += ' AND gp.state_id = %s'
            params.append(state_id)
        
        # Add order by
        query += ' ORDER BY gp.created_at DESC'
        
        # Execute query
        predictions = []
        with connection.cursor() as cursor:
            cursor.execute(query, params)
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()
            
            for row in rows:
                prediction_dict = dict(zip(columns, row))
                # Convert to GamePrediction-like object for serializer
                prediction = type('GamePrediction', (), prediction_dict)
                predictions.append(prediction)
        
        return predictions
    
    @swagger_auto_schema(
        operation_description="Generate a prediction for a specific game and state",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'game_id': openapi.Schema(type=openapi.TYPE_INTEGER),
                'state_id': openapi.Schema(type=openapi.TYPE_INTEGER),
            },
            required=['game_id', 'state_id']
        ),
        responses={
            200: GamePredictionSerializer(),
            400: "Invalid input",
            404: "Game or state not found"
        }
    )
    @action(detail=False, methods=['post'])
    def analyze(self, request):
        """
        Generate a prediction for a specific game and state based on historical data.
        """
        game_id = request.data.get('game_id')
        state_id = request.data.get('state_id')
        
        if not game_id or not state_id:
            return Response(
                {"error": "Both game_id and state_id are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            game = Game.objects.get(pk=game_id)
            state = State.objects.get(pk=state_id)
            
            # Use a direct SQL query with proper joins instead of ORM with state_id
            query = '''
                SELECT 
                    gr.id,
                    gr.game_id,
                    gr.draw_date,
                    gr.draw_time,
                    gr.numbers,
                    gr.special_number,
                    gr.jackpot,
                    gr.next_draw_date,
                    gr.next_draw_time,
                    gr.next_jackpot,
                    gr.collected_at
                FROM game_results gr
                INNER JOIN games g ON gr.game_id = g.id
                INNER JOIN state_games sg ON g.id = sg.game_id
                INNER JOIN states s ON sg.state_id = s.id
                WHERE g.id = %s AND s.id = %s
                ORDER BY gr.collected_at DESC
            '''
            
            # Execute the SQL query
            historical_results = []
            with connection.cursor() as cursor:
                cursor.execute(query, [game_id, state_id])
                columns = [col[0] for col in cursor.description]
                rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
                
                # Convert rows to GameResult-like objects for the analyzer
                for row in rows:
                    historical_results.append(type('GameResult', (), {
                        'id': row['id'],
                        'game_id': row['game_id'],
                        'draw_date': row['draw_date'],
                        'draw_time': row['draw_time'],
                        'numbers': row['numbers'],
                        'special_number': row['special_number'],
                        'jackpot': row['jackpot'],
                        'next_draw_date': row['next_draw_date'],
                        'next_draw_time': row['next_draw_time'],
                        'next_jackpot': row['next_jackpot'],
                        'collected_at': row['collected_at']
                    }))
            
            if not historical_results:
                return Response(
                    {"error": f"No historical data found for {game.name} in {state.name}"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Perform AI analysis on historical data
            prediction = self.perform_ai_analysis(historical_results, game, state)
            
            # Use direct SQL to insert/update the prediction
            user_id = request.user.id
            predicted_numbers = prediction['predicted_numbers']
            predicted_special_number = prediction.get('predicted_special_number')
            confidence_score = prediction['confidence_score']
            analysis_summary = prediction['analysis_summary']
            
            # Check if a prediction already exists
            check_query = '''
                SELECT id, predicted_numbers, predicted_special_number, confidence_score, analysis_summary
                FROM game_predictions 
                WHERE game_id = %s AND state_id = %s AND user_id = %s
                ORDER BY created_at DESC
                LIMIT 1
            '''
            
            # Parameters for insert/update (with or without special number)
            if predicted_special_number:
                insert_query = '''
                    INSERT INTO game_predictions
                    (game_id, state_id, user_id, predicted_numbers, predicted_special_number, 
                    confidence_score, analysis_summary, hot_numbers, cold_numbers, overdue_numbers, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    RETURNING id
                '''
                insert_params = [
                    game_id, 
                    state_id, 
                    user_id, 
                    predicted_numbers, 
                    predicted_special_number, 
                    confidence_score, 
                    analysis_summary,
                    prediction.get('hot_numbers', None),
                    prediction.get('cold_numbers', None),
                    prediction.get('overdue_numbers', None)
                ]
            else:
                # No special number
                insert_query = '''
                    INSERT INTO game_predictions
                    (game_id, state_id, user_id, predicted_numbers, 
                    confidence_score, analysis_summary, hot_numbers, cold_numbers, overdue_numbers, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    RETURNING id
                '''
                insert_params = [
                    game_id, 
                    state_id, 
                    user_id, 
                    predicted_numbers, 
                    confidence_score, 
                    analysis_summary,
                    prediction.get('hot_numbers', None),
                    prediction.get('cold_numbers', None),
                    prediction.get('overdue_numbers', None)
                ]
            
            prediction_id = None
            with connection.cursor() as cursor:
                # Check if prediction exists
                cursor.execute(check_query, [game_id, state_id, user_id])
                result = cursor.fetchone()
                
                if result:
                    # Check if the new prediction is exactly the same as the last one
                    last_id, last_numbers, last_special, last_confidence, last_summary = result
                    
                    # Only update if prediction is exactly the same
                    if (last_numbers == predicted_numbers and 
                        last_special == predicted_special_number and 
                        float(last_confidence) == float(confidence_score)):
                        
                        # The prediction is exactly the same, use existing one
                        prediction_id = last_id
                        logger.info(f"Using existing prediction {prediction_id} as new prediction is identical")
                    else:
                        # Insert new prediction (always save new predictions)
                        cursor.execute(insert_query, insert_params)
                        prediction_id = cursor.fetchone()[0]
                        logger.info(f"Created new prediction {prediction_id}")
                else:
                    # Insert new prediction (first prediction for this game/state/user)
                    cursor.execute(insert_query, insert_params)
                    prediction_id = cursor.fetchone()[0]
                    logger.info(f"Created first prediction {prediction_id} for this game/state/user")
            
            # Fetch the complete prediction data for the response
            prediction_query = '''
                SELECT 
                    gp.id,
                    gp.game_id,
                    gp.state_id,
                    gp.user_id,
                    gp.predicted_numbers,
                    gp.predicted_special_number,
                    gp.confidence_score,
                    gp.analysis_summary,
                    gp.hot_numbers,
                    gp.cold_numbers,
                    gp.overdue_numbers,
                    gp.created_at,
                    gp.updated_at,
                    g.name as game_name,
                    g.slug as game_slug,
                    s.code as state_code,
                    s.name as state_name
                FROM game_predictions gp
                INNER JOIN games g ON gp.game_id = g.id
                INNER JOIN states s ON gp.state_id = s.id
                WHERE gp.id = %s
            '''
            
            prediction_data = None
            with connection.cursor() as cursor:
                cursor.execute(prediction_query, [prediction_id])
                columns = [col[0] for col in cursor.description]
                row = cursor.fetchone()
                if row:
                    prediction_data = dict(zip(columns, row))
            
            # Format response
            prediction_obj = {
                "id": prediction_data['id'],
                "game_name": prediction_data['game_name'],
                "state_code": prediction_data['state_code'], 
                "numbers": prediction_data['predicted_numbers'],
                "special_number": prediction_data['predicted_special_number'],
                "confidence": round(float(prediction_data['confidence_score']), 1),
                "summary": prediction_data['analysis_summary'].split('. ')[0] + '.' if isinstance(prediction_data['analysis_summary'], str) else prediction_data['analysis_summary']
            }
            
            # Add advanced analysis data if available
            if 'hot_numbers' in prediction:
                prediction_obj["analysis_data"] = {
                    "hot_numbers": prediction['hot_numbers'],
                    "cold_numbers": prediction['cold_numbers'],
                    "overdue_numbers": prediction['overdue_numbers']
                }
                
            response_data = {
                "message": "Prediction generated successfully",
                "prediction": prediction_obj,
                "success": True
            }
            
            return Response(response_data)
            
        except Game.DoesNotExist:
            return Response(
                {"error": f"Game with ID {game_id} not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except State.DoesNotExist:
            return Response(
                {"error": f"State with ID {state_id} not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": f"Error generating prediction: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @swagger_auto_schema(
        operation_description="Get predictions for the authenticated user with filtering options",
        manual_parameters=[
            openapi.Parameter(
                'game_id', 
                openapi.IN_QUERY, 
                description="Game ID to filter predictions", 
                type=openapi.TYPE_INTEGER,
                required=False
            ),
            openapi.Parameter(
                'state_id', 
                openapi.IN_QUERY, 
                description="State ID to filter predictions", 
                type=openapi.TYPE_INTEGER,
                required=False
            )
        ],
        responses={
            200: SimplifiedGamePredictionSerializer(many=True),
            401: "Not authenticated"
        }
    )
    @action(detail=False, methods=['get'], url_path='by-user')
    def by_user(self, request):
        """
        Get predictions for the authenticated user with filtering options
        """
        # Get user ID from authenticated user
        user_id = request.user.id
            
        # Build query
        query = '''
            SELECT 
                gp.id,
                gp.game_id,
                gp.state_id,
                gp.predicted_numbers,
                gp.predicted_special_number,
                gp.confidence_score,
                gp.hot_numbers,
                gp.cold_numbers,
                gp.overdue_numbers,
                TO_CHAR(gp.created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
                g.name as game_name,
                s.code as state_code
            FROM game_predictions gp
            INNER JOIN games g ON gp.game_id = g.id
            INNER JOIN states s ON gp.state_id = s.id
            WHERE gp.user_id = %s
        '''
        
        params = [user_id]
        
        # Add game and state filters if provided
        game_id = request.query_params.get('game_id')
        state_id = request.query_params.get('state_id')
        
        if game_id:
            query += ' AND gp.game_id = %s'
            params.append(game_id)
        if state_id:
            query += ' AND gp.state_id = %s'
            params.append(state_id)
        
        # Add order by
        query += ' ORDER BY gp.created_at DESC'
        
        # Execute query
        predictions = []
        with connection.cursor() as cursor:
            cursor.execute(query, params)
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()
            
            for row in rows:
                prediction_dict = dict(zip(columns, row))
                # Convert to GamePrediction-like object for serializer
                prediction = type('GamePrediction', (), prediction_dict)
                predictions.append(prediction)
        
        # Use serializer
        serializer = self.get_serializer(predictions, many=True)
        
        return Response({
            "count": len(serializer.data),
            "results": serializer.data,
        })
    
    @swagger_auto_schema(
        operation_description="Delete a prediction",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'prediction_id': openapi.Schema(type=openapi.TYPE_INTEGER),
            },
            required=['prediction_id']
        ),
        responses={
            200: "Prediction deleted successfully",
            403: "Not authorized",
            404: "Prediction not found"
        }
    )
    @action(detail=False, methods=['delete'], url_path='delete')
    def delete_prediction(self, request):
        """
        Delete a specific prediction
        """
        prediction_id = request.data.get('prediction_id')
        if not prediction_id:
            return Response(
                {"error": "prediction_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Check if prediction exists and belongs to the user
        try:
            prediction = GamePrediction.objects.get(pk=prediction_id)
            
            # Only the owner or an admin can delete a prediction
            if prediction.user.id != request.user.id and not request.user.is_staff:
                return Response(
                    {"error": "You are not authorized to delete this prediction"},
                    status=status.HTTP_403_FORBIDDEN
                )
                
            # Delete the prediction
            prediction.delete()
            
            return Response({
                "message": "Prediction deleted successfully",
                "success": True
            })
            
        except GamePrediction.DoesNotExist:
            return Response(
                {"error": f"Prediction with ID {prediction_id} not found"},
                status=status.HTTP_404_NOT_FOUND
            )
            
    def perform_ai_analysis(self, historical_results, game, state):
        """
        Perform AI analysis on historical data to generate predictions.
        Uses advanced statistical and ML techniques.
        """
        try:
            # First try the new advanced analyzer
            from lotterydata.ai.advanced_analyzer import AdvancedLotteryAnalyzer
            
            # Initialize the analyzer with historical data
            analyzer = AdvancedLotteryAnalyzer(historical_results)
            
            # Run comprehensive analysis
            prediction = analyzer.run_analysis()
            
            # Check if this game has special numbers
            has_special_numbers = any(
                hasattr(result, 'special_number') and result.special_number 
                for result in historical_results
            )
            
            # Remove special number if the game doesn't use them
            if not has_special_numbers:
                prediction['predicted_special_number'] = None
            
            return prediction
        except Exception as e:
            # If advanced analyzer fails, fall back to the original analyzer
            logger.error(f"Advanced analyzer failed, falling back to original: {str(e)}")
            
            # Use the original analyzer as fallback
            from lotterydata.ai.analyzer import LotteryAnalyzer
            
            # Initialize the original analyzer with historical results
            analyzer = LotteryAnalyzer(historical_results)
            
            try:
                # Run analysis with original analyzer
                prediction = analyzer.analyze()
                
                # Remove special number if the game doesn't use them
                if not has_special_numbers:
                    prediction['predicted_special_number'] = None
                
                return prediction
            except Exception as fallback_error:
                # If both analyzers fail, use simple frequency analysis
                logger.error(f"Both analyzers failed, using basic analysis: {str(fallback_error)}")
                return self._perform_basic_analysis(historical_results)
    
    def _perform_basic_analysis(self, historical_results):
        """Basic frequency analysis as final fallback"""
        import random
        from datetime import datetime
        from collections import Counter
        
        # Extract numbers from historical results
        all_numbers = []
        all_special = []
        number_frequency = {}
        
        for result in historical_results:
            if hasattr(result, 'numbers') and result.numbers:
                numbers = result.numbers.replace(' ', '').split(',')
                all_numbers.extend(numbers)
                
                # Count frequency of numbers
                for num in numbers:
                    if num in number_frequency:
                        number_frequency[num] += 1
                    else:
                        number_frequency[num] = 1
            
            if hasattr(result, 'special_number') and result.special_number:
                special = result.special_number.replace(' ', '').split(',')
                all_special.extend(special)
        
        # Calculate a confidence score
        total_draws = len(historical_results)
        unique_numbers = len(set(all_numbers)) if all_numbers else 0
        
        # Base confidence starts at 50%
        base_confidence = 50.0
        
        # Add up to 20% based on number of draws
        draws_factor = min(total_draws / 10.0, 1.0) * 20.0
        
        # Add up to 15% based on number uniqueness
        uniqueness_factor = min(unique_numbers / 20.0, 1.0) * 15.0
        
        # Calculate final confidence
        confidence_score = base_confidence + draws_factor + uniqueness_factor
        confidence_score = max(40.0, min(confidence_score, 75.0))  # Keep between 40% and 75%
        
        # Select numbers based on frequency
        predicted_numbers = []
        
        if number_frequency:
            # Sort by frequency
            sorted_numbers = sorted(number_frequency.items(), key=lambda x: x[1], reverse=True)
            
            # Take top numbers plus some middle ones for variety
            num_to_select = min(max(4, total_draws // 2), 7)
            top_count = num_to_select * 2 // 3  # About 2/3 of selections from top numbers
            
            # Add top numbers
            top_picks = [num for num, _ in sorted_numbers[:top_count]]
            predicted_numbers.extend(top_picks)
            
            # Add some mid-frequency numbers
            if len(sorted_numbers) > top_count + 2:
                mid_point = len(sorted_numbers) // 2
                mid_range = sorted_numbers[mid_point-2:mid_point+2]
                mid_picks = [num for num, _ in mid_range if num not in predicted_numbers]
                predicted_numbers.extend(mid_picks[:num_to_select - len(predicted_numbers)])
            
        # If we still need more numbers, use random selection
        if len(predicted_numbers) < 5:
            unique_numbers = list(set(all_numbers)) if all_numbers else ["1", "2", "3", "4", "5"]
            remaining = [n for n in unique_numbers if n not in predicted_numbers]
            if remaining:
                needed = 5 - len(predicted_numbers)
                predicted_numbers.extend(random.sample(remaining, min(needed, len(remaining))))
        
        # Special number prediction
        predicted_special = None
        if all_special:
            special_counter = Counter(all_special)
            most_common = special_counter.most_common(1)
            if most_common:
                predicted_special = most_common[0][0]
        
        # Combine all numbers and shuffle slightly
        random.shuffle(predicted_numbers)
        
        # Get date range for summary
        try:
            dates = [getattr(r, 'draw_date', None) for r in historical_results 
                    if hasattr(r, 'draw_date')]
            oldest_date = min(dates) if dates else "unknown"
            newest_date = max(dates) if dates else "unknown"
        except:
            oldest_date = "unknown"
            newest_date = "unknown"
        
        # Create analysis summary
        timestamp = datetime.now().strftime("%H:%M:%S")
        analysis_summary = f"Basic frequency analysis based on {total_draws} draws from {oldest_date} to {newest_date}. Generated at {timestamp}."
        
        return {
            'predicted_numbers': ', '.join(predicted_numbers),
            'predicted_special_number': predicted_special,
            'confidence_score': round(confidence_score, 1),
            'analysis_summary': analysis_summary
        }

@swagger_auto_schema(
    method='get',
    operation_description="Retorna jogos com seus resultados e informações de estados associados",
    manual_parameters=[
        openapi.Parameter(
            'state_code', 
            openapi.IN_QUERY, 
            description="Código do estado para filtrar (opcional)", 
            type=openapi.TYPE_STRING,
            required=False
        )
    ],
    responses={200: "Lista de jogos com resultados e estados"}
)
@api_view(['GET'])
def games_with_results(request):
    """
    Retorna jogos com seus resultados e informações de estados associados,
    organizados em uma estrutura de objetos aninhados.
    Aceita parâmetro opcional 'state_code' para filtrar por estado.
    """
    # Obter o código do estado do parâmetro de consulta, se fornecido
    state_code = request.query_params.get('state_code', None)
    
    # Base da consulta SQL
    base_query = '''
        SELECT 
            g.id as game_id, 
            g.name as game_name, 
            g.slug as game_slug, 
            g.logo_url,
            g.created_at as game_created_at,
            g.updated_at as game_updated_at,
            gr.id as result_id,
            gr.draw_date, 
            gr.draw_time, 
            gr.numbers, 
            gr.special_number,
            gr.jackpot,
            gr.next_draw_date,
            gr.next_draw_time,
            gr.next_jackpot,
            gr.collected_at,
            s.id as state_id,
            s.code as state_code,
            s.name as state_name,
            s.created_at as state_created_at
        FROM games g 
        INNER JOIN game_results gr ON g.id = gr.game_id 
        INNER JOIN state_games sg ON g.id = sg.game_id 
        INNER JOIN states s ON s.id = sg.state_id
    '''
    
    # Adicionar filtro de estado se fornecido
    params = []
    if state_code:
        base_query += " WHERE s.code LIKE %s"
        params.append(f"{state_code}%")  # Adiciona % para buscar por iniciais
    
    # Adicionar ordenação por nome do jogo
    base_query += " ORDER BY g.name"
    
    with connection.cursor() as cursor:
        cursor.execute(base_query, params)
        
        columns = [col[0] for col in cursor.description]
        rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        # Organizar dados em objetos aninhados
        organized_data = {}
        
        for row in rows:
            game_id = row['game_id']
            
            # Se este jogo ainda não está no dicionário, adicione-o
            if game_id not in organized_data:
                organized_data[game_id] = {
                    'id': game_id,
                    'name': row['game_name'],
                    'slug': row['game_slug'],
                    'logo_url': row['logo_url'],
                    'created_at': row['game_created_at'],
                    'updated_at': row['game_updated_at'],
                    'states': {},
                    'results': []
                }
            
            # Adicionar o estado se ainda não estiver no jogo
            state_id = row['state_id']
            if state_id not in organized_data[game_id]['states']:
                organized_data[game_id]['states'][state_id] = {
                    'id': state_id,
                    'code': row['state_code'],
                    'name': row['state_name'],
                    'created_at': row['state_created_at']
                }
            
            # Adicionar o resultado
            result = {
                'id': row['result_id'],
                'draw_date': row['draw_date'],
                'draw_time': row['draw_time'],
                'numbers': row['numbers'],
                'special_number': row['special_number'],
                'jackpot': row['jackpot'],
                'next_draw_date': row['next_draw_date'],
                'next_draw_time': row['next_draw_time'],
                'next_jackpot': row['next_jackpot'],
                'collected_at': row['collected_at'],
                'state_id': state_id
            }
            
            # Verificar se este resultado já existe para evitar duplicações
            if not any(r['id'] == result['id'] for r in organized_data[game_id]['results']):
                organized_data[game_id]['results'].append(result)
        
        # Converter estados de dicionário para lista
        for game_id, game in organized_data.items():
            game['states'] = list(game['states'].values())
        
        # Converter o dicionário em uma lista final
        final_data = list(organized_data.values())
        
        return JsonResponse({'games': final_data})

@swagger_auto_schema(
    method='get',
    operation_description="Lista todos os estados ordenados por nome",
    responses={200: "Lista de estados"}
)
@api_view(['GET'])
def list_states(request):
    """
    Retorna todos os estados ordenados por nome em ordem ascendente.
    """
    with connection.cursor() as cursor:
        cursor.execute('''
            SELECT 
                id,
                code,
                name,
                created_at
            FROM states
            ORDER BY name ASC
        ''')
        
        columns = [col[0] for col in cursor.description]
        states = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        return JsonResponse({'states': states})

@swagger_auto_schema(
    method='get',
    operation_description="Busca um jogo pelo ID",
    manual_parameters=[
        openapi.Parameter(
            'game_id', 
            openapi.IN_PATH, 
            description="ID do jogo", 
            type=openapi.TYPE_INTEGER,
            required=True
        )
    ],
    responses={
        200: "Detalhes do jogo",
        404: "Jogo não encontrado"
    }
)
@api_view(['GET'])
def game_by_id(request, game_id):
    """
    Retorna detalhes de um jogo específico pelo seu ID,
    incluindo estados associados e resultados recentes.
    """
    try:
        # Verificar se o jogo existe primeiro
        game_exists = Game.objects.filter(pk=game_id).exists()
        if not game_exists:
            return JsonResponse(
                {"error": f"Jogo com ID '{game_id}' não encontrado."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Consulta SQL similar à games_with_results, mas filtrada para um jogo específico
        query = '''
            SELECT 
                g.id as game_id, 
                g.name as game_name, 
                g.slug as game_slug, 
                g.logo_url,
                g.created_at as game_created_at,
                g.updated_at as game_updated_at,
                gr.id as result_id,
                gr.draw_date, 
                gr.draw_time, 
                gr.numbers, 
                gr.special_number,
                gr.jackpot,
                gr.next_draw_date,
                gr.next_draw_time,
                gr.next_jackpot,
                gr.collected_at,
                s.id as state_id,
                s.code as state_code,
                s.name as state_name,
                s.created_at as state_created_at
            FROM games g 
            INNER JOIN state_games sg ON g.id = sg.game_id 
            INNER JOIN states s ON s.id = sg.state_id
            LEFT JOIN game_results gr ON g.id = gr.game_id
            WHERE g.id = %s
            ORDER BY gr.collected_at DESC
        '''
        
        with connection.cursor() as cursor:
            cursor.execute(query, [game_id])
            
            columns = [col[0] for col in cursor.description]
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
            
            if not rows:
                # Se não houver resultados, retornar informações básicas do jogo
                game = Game.objects.get(pk=game_id)
                game_serializer = GameSerializer(game)
                states = game.states.all()
                state_serializer = StateSerializer(states, many=True)
                
                return JsonResponse({
                    **game_serializer.data,
                    'states': state_serializer.data,
                    'results': []
                })
            
            # Organizar dados
            game_data = {
                'id': rows[0]['game_id'],
                'name': rows[0]['game_name'],
                'slug': rows[0]['game_slug'],
                'logo_url': rows[0]['logo_url'],
                'created_at': rows[0]['game_created_at'],
                'updated_at': rows[0]['game_updated_at'],
                'states': {},
                'results': []
            }
            
            for row in rows:
                # Adicionar estado se ainda não estiver
                state_id = row['state_id']
                if state_id and state_id not in game_data['states']:
                    game_data['states'][state_id] = {
                        'id': state_id,
                        'code': row['state_code'],
                        'name': row['state_name'],
                        'created_at': row['state_created_at']
                    }
                
                # Adicionar resultado se existir e ainda não tiver sido adicionado
                if row['result_id']:
                    result = {
                        'id': row['result_id'],
                        'draw_date': row['draw_date'],
                        'draw_time': row['draw_time'],
                        'numbers': row['numbers'],
                        'special_number': row['special_number'],
                        'jackpot': row['jackpot'],
                        'next_draw_date': row['next_draw_date'],
                        'next_draw_time': row['next_draw_time'],
                        'next_jackpot': row['next_jackpot'],
                        'collected_at': row['collected_at'],
                        'state_id': state_id,
                        'state_code': row['state_code']
                    }
                    
                    # Evitar duplicações
                    if not any(r['id'] == result['id'] for r in game_data['results']):
                        # Limitar a 10 resultados recentes
                        if len(game_data['results']) < 10:
                            game_data['results'].append(result)
            
            # Converter estados de dicionário para lista
            game_data['states'] = list(game_data['states'].values())
            
            return JsonResponse(game_data)
            
    except Exception as e:
        return JsonResponse(
            {"error": f"Erro ao buscar jogo: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
