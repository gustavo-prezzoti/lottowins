from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import Role

User = get_user_model()

class RoleAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name',)

class CustomUserAdmin(BaseUserAdmin):
    fieldsets = (
        (None, {'fields': ('username', 'email', 'password')}),
        (_('Informações Pessoais'), {'fields': ('name', 'profile_photo')}),
        (_('Permissões'), {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'role', 'groups', 'user_permissions'),
        }),
        (_('Datas Importantes'), {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'name', 'password1', 'password2', 'role'),
        }),
    )
    list_display = ('email', 'name', 'role', 'is_staff')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'role')
    search_fields = ('email', 'name', 'username')
    ordering = ('email',)

admin.site.register(User, CustomUserAdmin)
admin.site.register(Role, RoleAdmin)
