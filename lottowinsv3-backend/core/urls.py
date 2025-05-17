"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.auth import views as auth_views
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect
from django.views.decorators.http import require_GET
from django.contrib.auth import logout
from django.shortcuts import redirect

# Redirecionamento da raiz para a página de perfil ou login
def root_redirect(request):
    if request.user.is_authenticated:
        return redirect('/profile/')
    else:
        return redirect('/accounts/login/')

# View personalizada para logout via GET (para Swagger e outras interfaces)
@require_GET
def logout_view(request):
    logout(request)
    next_url = request.GET.get('next', '/accounts/login/')
    return redirect(next_url)

schema_view = get_schema_view(
    openapi.Info(
        title="API de Lotto Wins",
        default_version='v1',
        description="API para autenticação, gerenciamento de usuários e dados de loteria",
        terms_of_service="https://www.google.com/policies/terms/",
    ),
    public=True,  # Voltamos para True para evitar problemas com a UI do Swagger
    permission_classes=(permissions.AllowAny,),  # Permitimos AllowAny aqui, pois vamos proteger as URLs diretamente
)

urlpatterns = [
    # Redirecionar raiz para perfil ou login
    path('', root_redirect, name='root'),
    path('admin/', admin.site.urls),
    path('api/', include('users.urls')),
    path('api/lottery/', include('lotterydata.urls')),
    # Auth
    path('accounts/login/', auth_views.LoginView.as_view(template_name='registration/login.html'), name='login'),
    # Rota adicional para logout via GET (para o Swagger e outras interfaces)
    path('accounts/logout/', logout_view, name='logout_get'),
    path('accounts/password_change/', auth_views.PasswordChangeView.as_view(template_name='registration/password_change_form.html'), name='password_change'),
    path('accounts/password_change/done/', auth_views.PasswordChangeDoneView.as_view(template_name='registration/password_change_done.html'), name='password_change_done'),
    path('profile/', include('users.urls_profile')),
    # Documentação protegida por login
    path('swagger/', login_required(schema_view.with_ui('swagger', cache_timeout=0)), name='schema-swagger-ui'),
    path('redoc/', login_required(schema_view.with_ui('redoc', cache_timeout=0)), name='schema-redoc'),
]

# Serve arquivos de mídia em desenvolvimento
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
