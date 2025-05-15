from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    games_with_results, list_states, game_by_id, 
    NotificationViewSet, GamePredictionViewSet
)

# Criar o router para os viewsets
router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'predictions', GamePredictionViewSet, basename='prediction')

# Definimos apenas as rotas específicas que precisamos
urlpatterns = [
    # Rota GET para games com resultados e estados
    path('games/with-results/', games_with_results, name='games-with-results'),
    # Rota GET para listar todos os estados ordenados por nome
    path('states/', list_states, name='list-states'),
    # Rota GET para buscar um jogo pelo ID
    path('games/<int:game_id>/', game_by_id, name='game-by-id'),
    # Incluir as rotas para viewsets
    path('', include(router.urls)),
] 