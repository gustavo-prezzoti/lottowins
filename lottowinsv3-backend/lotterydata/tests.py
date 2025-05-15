from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from .models import State, Game, StateGame, GameResult

class LotteryDataAPITests(TestCase):
    def setUp(self):
        # Create a test client
        self.client = APIClient()
        
        # Create test data
        self.state = State.objects.create(code='NY', name='New York')
        self.game = Game.objects.create(
            name='Mega Millions',
            slug='mega-millions',
        )
        
        # Create state-game relationship
        self.state_game = StateGame.objects.create(state=self.state, game=self.game)
        
        # Create game result
        self.game_result = GameResult.objects.create(
            game=self.game,
            state=self.state,
            draw_date='2025-05-13',
            numbers='1,2,3,4,5,6',
            jackpot=10000000.00
        )
    
    def test_get_states(self):
        response = self.client.get(reverse('state-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['code'], 'NY')
    
    def test_get_games(self):
        response = self.client.get(reverse('game-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Mega Millions')
    
    def test_get_games_by_state(self):
        url = reverse('game-by-state', kwargs={'state_code': 'NY'})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Mega Millions')
    
    def test_get_game_results(self):
        response = self.client.get(reverse('gameresult-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['numbers'], '1,2,3,4,5,6')
    
    def test_get_game_results_by_state(self):
        url = reverse('gameresult-by-state', kwargs={'state_code': 'NY'})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['numbers'], '1,2,3,4,5,6')
    
    def test_get_game_results_by_game(self):
        url = reverse('gameresult-by-game', kwargs={'game_id': self.game.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['numbers'], '1,2,3,4,5,6')
