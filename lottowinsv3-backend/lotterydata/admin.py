from django.contrib import admin
from .models import State, Game, StateGame, GameResult, CollectionLog, Notification, GamePrediction

@admin.register(State)
class StateAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'created_at')
    search_fields = ('code', 'name')

@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'created_at', 'updated_at')
    search_fields = ('name', 'slug')

@admin.register(StateGame)
class StateGameAdmin(admin.ModelAdmin):
    list_display = ('state', 'game', 'created_at')
    list_filter = ('state', 'game')

@admin.register(GameResult)
class GameResultAdmin(admin.ModelAdmin):
    list_display = ('game', 'draw_date', 'numbers', 'collected_at')
    list_filter = ('game',)
    search_fields = ('draw_date', 'numbers')

@admin.register(CollectionLog)
class CollectionLogAdmin(admin.ModelAdmin):
    list_display = ('state_code', 'status', 'start_time', 'end_time', 'games_collected', 'created_at')
    list_filter = ('status', 'state_code')
    search_fields = ('state_code', 'url', 'error_message')

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'is_read', 'created_at')
    list_filter = ('is_read', 'created_at')
    search_fields = ('title', 'description', 'user__email')
    date_hierarchy = 'created_at'

@admin.register(GamePrediction)
class GamePredictionAdmin(admin.ModelAdmin):
    list_display = ('game', 'state', 'predicted_numbers', 'confidence_score', 'created_at')
    list_filter = ('game', 'state', 'created_at')
    search_fields = ('predicted_numbers', 'analysis_summary')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'created_at'
