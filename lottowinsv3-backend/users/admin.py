from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import Role

User = get_user_model()

# Personalizar título e cabeçalho do Admin
admin.site.site_header = "Painel Administrativo - Lotto Wins"
admin.site.site_title = "Lotto Wins Admin"
admin.site.index_title = "Gerenciamento de Usuários"

class RoleAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name',)
    list_display_links = ('name',)

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
            'fields': ('username', 'email', 'name', 'password1', 'password2', 'role'),
        }),
    )
    list_display = ('email', 'name', 'role', 'is_staff', 'is_active')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'role')
    search_fields = ('email', 'name', 'username')
    ordering = ('email',)
    list_display_links = ('email', 'name')
    list_per_page = 20
    save_on_top = True

admin.site.register(User, CustomUserAdmin)
admin.site.register(Role, RoleAdmin)

# Removendo apenas o modelo Group do admin
from django.contrib.auth.models import Group
admin.site.unregister(Group)
