from django.db import models

# Create your models here.

class State(models.Model):
    code = models.CharField(max_length=10)
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
    
    class Meta:
        db_table = 'states'

class Game(models.Model):
    name = models.CharField(max_length=100)
    slug = models.CharField(max_length=100)
    logo_url = models.URLField(null=True, blank=True)
    states = models.ManyToManyField(State, through='StateGame')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
    
    class Meta:
        db_table = 'games'

class StateGame(models.Model):
    state = models.ForeignKey(State, on_delete=models.CASCADE)
    game = models.ForeignKey(Game, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'state_games'

class GameResult(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='results')
    state = models.ForeignKey(State, on_delete=models.CASCADE)
    draw_date = models.CharField(max_length=20)
    draw_time = models.TimeField(null=True, blank=True)
    numbers = models.CharField(max_length=255)
    special_number = models.CharField(max_length=100, null=True, blank=True)
    jackpot = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    next_draw_date = models.CharField(max_length=20, null=True, blank=True)
    next_draw_time = models.TimeField(null=True, blank=True)
    next_jackpot = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    collected_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'game_results'

class CollectionLog(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    )
    state_code = models.CharField(max_length=10)
    url = models.URLField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    games_collected = models.IntegerField(default=0)
    error_message = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'collection_log'

class Notification(models.Model):
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    subtitle = models.CharField(max_length=255, blank=True, null=True)
    description = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.title} - {self.user.email}"
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']

class GamePrediction(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='predictions')
    state = models.ForeignKey(State, on_delete=models.CASCADE)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='game_predictions')
    predicted_numbers = models.CharField(max_length=255)
    predicted_special_number = models.CharField(max_length=100, null=True, blank=True)
    confidence_score = models.DecimalField(max_digits=5, decimal_places=2, help_text="Confidence score as percentage (0-100)")
    analysis_summary = models.TextField(help_text="Brief summary of the analysis performed")
    hot_numbers = models.CharField(max_length=255, null=True, blank=True, help_text="Numbers with high frequency in recent draws")
    cold_numbers = models.CharField(max_length=255, null=True, blank=True, help_text="Numbers with low overall frequency")
    overdue_numbers = models.CharField(max_length=255, null=True, blank=True, help_text="Numbers that haven't appeared in a while")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Prediction for {self.game.name} ({self.state.code}) - {self.created_at.strftime('%Y-%m-%d')}"
    
    class Meta:
        db_table = 'game_predictions'
        ordering = ['-created_at']
        verbose_name = "Game Prediction"
        verbose_name_plural = "Game Predictions"
