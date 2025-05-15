from django.shortcuts import render
from rest_framework import viewsets, generics, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.contrib.auth import get_user_model
from .serializers import UserSerializer, UserCreateSerializer, ChangePasswordSerializer, RoleSerializer, Base64ImageField
from .models import Role
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

User = get_user_model()

class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permissão personalizada que permite que administradores acessem qualquer usuário,
    mas usuários comuns só podem acessar a si mesmos.
    """
    def has_object_permission(self, request, view, obj):
        return obj == request.user or request.user.is_staff

class RoleViewSet(viewsets.ModelViewSet):
    """
    API endpoint para gerenciar perfis de usuário.
    """
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAdminUser]
    
    @swagger_auto_schema(
        operation_description="Lista todos os perfis",
        responses={200: RoleSerializer(many=True)}
    )
    def list(self, *args, **kwargs):
        return super().list(*args, **kwargs)
    
    @swagger_auto_schema(
        operation_description="Cria um novo perfil",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['name'],
            properties={
                'name': openapi.Schema(type=openapi.TYPE_STRING),
                'description': openapi.Schema(type=openapi.TYPE_STRING),
            }
        ),
        responses={201: RoleSerializer()}
    )
    def create(self, *args, **kwargs):
        return super().create(*args, **kwargs)
    
    @swagger_auto_schema(
        operation_description="Retorna os detalhes de um perfil",
        responses={200: RoleSerializer()}
    )
    def retrieve(self, *args, **kwargs):
        return super().retrieve(*args, **kwargs)
    
    @swagger_auto_schema(
        operation_description="Atualiza parcialmente um perfil",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'name': openapi.Schema(type=openapi.TYPE_STRING),
                'description': openapi.Schema(type=openapi.TYPE_STRING),
            }
        ),
        responses={200: RoleSerializer()}
    )
    def partial_update(self, *args, **kwargs):
        return super().partial_update(*args, **kwargs)
    
    @swagger_auto_schema(
        operation_description="Atualiza completamente um perfil",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['name'],
            properties={
                'name': openapi.Schema(type=openapi.TYPE_STRING),
                'description': openapi.Schema(type=openapi.TYPE_STRING),
            }
        ),
        responses={200: RoleSerializer()}
    )
    def update(self, *args, **kwargs):
        return super().update(*args, **kwargs)
    
    @swagger_auto_schema(
        operation_description="Remove um perfil",
        responses={204: "Sem conteúdo"}
    )
    def destroy(self, *args, **kwargs):
        return super().destroy(*args, **kwargs)

class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint para gerenciar usuários.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer
    
    def get_permissions(self):
        if self.action == 'create':
            # Qualquer pessoa pode se registrar
            return [permissions.AllowAny()]
        elif self.action in ['retrieve', 'update', 'partial_update', 'update_profile_photo']:
            # Administradores podem acessar qualquer usuário, usuários comuns apenas a si mesmos
            return [IsOwnerOrAdmin()]
        elif self.action in ['me', 'update_profile_photo_me', 'change_password_me']:
            # Qualquer usuário autenticado pode acessar seus próprios dados
            return [permissions.IsAuthenticated()]
        # Para list e destroy, apenas administradores
        return [permissions.IsAdminUser()]
    
    @swagger_auto_schema(
        operation_description="Lista todos os usuários",
        responses={200: UserSerializer(many=True)}
    )
    def list(self, *args, **kwargs):
        return super().list(*args, **kwargs)
    
    @swagger_auto_schema(
        operation_description="Retorna os detalhes de um usuário",
        responses={200: UserSerializer()}
    )
    def retrieve(self, *args, **kwargs):
        return super().retrieve(*args, **kwargs)
    
    @swagger_auto_schema(
        operation_description="Remove um usuário",
        responses={204: "Sem conteúdo"}
    )
    def destroy(self, *args, **kwargs):
        return super().destroy(*args, **kwargs)
    
    @swagger_auto_schema(
        method='get',
        operation_description="Retorna os dados do usuário logado",
        responses={200: UserSerializer()}
    )
    @swagger_auto_schema(
        method='put',
        operation_description="Atualiza todos os dados do usuário logado",
        request_body=UserSerializer,
        responses={200: UserSerializer()}
    )
    @swagger_auto_schema(
        method='patch',
        operation_description="Atualiza parcialmente os dados do usuário logado",
        request_body=UserSerializer,
        responses={200: UserSerializer()}
    )
    @swagger_auto_schema(
        method='delete',
        operation_description="Remove o usuário logado",
        responses={204: 'No Content'}
    )
    @action(detail=False, methods=['get', 'put', 'patch', 'delete'])
    def me(self, request):
        user = request.user

        if request.method == 'GET':
            serializer = self.get_serializer(user)
            return Response(serializer.data)

        elif request.method in ['PUT', 'PATCH']:
            partial = request.method == 'PATCH'
            serializer = self.get_serializer(user, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

        elif request.method == 'DELETE':
            user.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
    
    @swagger_auto_schema(
        operation_description="Altera a senha do usuário",
        request_body=ChangePasswordSerializer,
        responses={
            200: openapi.Response(description="Senha alterada com sucesso", 
                                  schema=openapi.Schema(type=openapi.TYPE_OBJECT, 
                                  properties={'detail': openapi.Schema(type=openapi.TYPE_STRING)})),
            400: "Dados inválidos",
            403: "Não autorizado"
        }
    )
    @action(detail=True, methods=['post'])
    def change_password(self, request, pk=None):
        """
        Permite que um usuário altere sua senha.
        """
        user = self.get_object()
        if user != request.user and not request.user.is_staff:
            return Response({"detail": "Não autorizado."}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            # Verifica se a senha antiga está correta
            if not user.check_password(serializer.validated_data['old_password']):
                return Response({"old_password": ["Senha incorreta."]}, status=status.HTTP_400_BAD_REQUEST)
            
            # Define a nova senha
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({"detail": "Senha alterada com sucesso."})
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @swagger_auto_schema(
        method='post',
        operation_description="Atualiza a foto de perfil do usuário",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['profile_photo'],
            properties={
                'profile_photo': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    description="Imagem em formato base64 (data:image/jpeg;base64,...)"
                )
            }
        ),
        responses={
            200: UserSerializer(),
            400: "Dados inválidos",
            403: "Não autorizado"
        }
    )
    @action(detail=True, methods=['post'])
    def update_profile_photo(self, request, pk=None):
        """
        Endpoint específico para atualizar a foto de perfil do usuário.
        Aceita uma imagem em formato base64.
        """
        user = self.get_object()
        
        # Verificar permissão
        if user != request.user and not request.user.is_staff:
            return Response({"detail": "Não autorizado."}, status=status.HTTP_403_FORBIDDEN)
        
        # Validar e processar a imagem
        image_field = Base64ImageField()
        
        try:
            # Verificar se a imagem foi enviada
            if 'profile_photo' not in request.data:
                return Response({"profile_photo": ["Este campo é obrigatório."]}, status=status.HTTP_400_BAD_REQUEST)
            
            # Processar a imagem
            image = image_field.to_internal_value(request.data['profile_photo'])
            
            # Remover foto antiga se existir
            if user.profile_photo:
                user.profile_photo.delete(save=False)
                
            # Salvar nova foto
            user.profile_photo = image
            user.save()
            
            # Retornar dados atualizados
            serializer = self.get_serializer(user)
            return Response(serializer.data)
            
        except Exception as e:
            return Response({"profile_photo": [str(e)]}, status=status.HTTP_400_BAD_REQUEST)
    
    @swagger_auto_schema(
        operation_description="Cria um novo usuário",
        request_body=UserCreateSerializer,
        responses={201: UserSerializer()}
    )
    def create(self, *args, **kwargs):
        return super().create(*args, **kwargs)
    
    @swagger_auto_schema(
        operation_description="Atualiza parcialmente um usuário",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'name': openapi.Schema(type=openapi.TYPE_STRING),
                'email': openapi.Schema(type=openapi.TYPE_STRING),
                'role': openapi.Schema(type=openapi.TYPE_INTEGER),
                'profile_photo': openapi.Schema(type=openapi.TYPE_STRING),
                'is_active': openapi.Schema(type=openapi.TYPE_BOOLEAN),
            }
        ),
        responses={200: UserSerializer()}
    )
    def partial_update(self, *args, **kwargs):
        return super().partial_update(*args, **kwargs)
    
    @swagger_auto_schema(
        operation_description="Atualiza completamente um usuário",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['name', 'email'],
            properties={
                'name': openapi.Schema(type=openapi.TYPE_STRING),
                'email': openapi.Schema(type=openapi.TYPE_STRING),
                'role': openapi.Schema(type=openapi.TYPE_INTEGER),
                'profile_photo': openapi.Schema(type=openapi.TYPE_STRING),
                'is_active': openapi.Schema(type=openapi.TYPE_BOOLEAN),
            }
        ),
        responses={200: UserSerializer()}
    )
    def update(self, *args, **kwargs):
        return super().update(*args, **kwargs)

    @swagger_auto_schema(
        method='post',
        operation_description="Atualiza a foto de perfil do usuário logado",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['profile_photo'],
            properties={
                'profile_photo': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    description="Imagem em formato base64 (data:image/jpeg;base64,...)"
                )
            }
        ),
        responses={
            200: UserSerializer(),
            400: "Dados inválidos",
            403: "Não autorizado"
        }
    )
    @action(detail=False, methods=['post'], url_path='me/update_profile_photo')
    def update_profile_photo_me(self, request):
        """
        Endpoint para o usuário autenticado atualizar sua própria foto de perfil.
        """
        user = request.user
        image_field = Base64ImageField()
        try:
            if 'profile_photo' not in request.data:
                return Response({"profile_photo": ["Este campo é obrigatório."]}, status=status.HTTP_400_BAD_REQUEST)
            image = image_field.to_internal_value(request.data['profile_photo'])
            if user.profile_photo:
                user.profile_photo.delete(save=False)
            user.profile_photo = image
            user.save()
            serializer = self.get_serializer(user)
            return Response(serializer.data)
        except Exception as e:
            return Response({"profile_photo": [str(e)]}, status=status.HTTP_400_BAD_REQUEST)

    @swagger_auto_schema(
        method='post',
        operation_description="Altera a senha do usuário logado",
        request_body=ChangePasswordSerializer,
        responses={
            200: openapi.Response(description="Senha alterada com sucesso", schema=openapi.Schema(type=openapi.TYPE_OBJECT, properties={'detail': openapi.Schema(type=openapi.TYPE_STRING)})),
            400: "Dados inválidos",
            403: "Não autorizado"
        }
    )
    @action(detail=False, methods=['post'], url_path='me/change_password')
    def change_password_me(self, request):
        """
        Permite que o usuário autenticado altere sua própria senha.
        """
        user = request.user
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            # Verifica se a senha antiga está correta
            if not user.check_password(serializer.validated_data['old_password']):
                return Response({"old_password": ["Senha incorreta."]}, status=status.HTTP_400_BAD_REQUEST)
            # Define a nova senha
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({"detail": "Senha alterada com sucesso."})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @swagger_auto_schema(
        operation_description="Generate sample SQL insert statements for database tables",
        responses={
            200: openapi.Response(description="SQL statements", 
                                  schema=openapi.Schema(type=openapi.TYPE_OBJECT, 
                                  properties={'sql': openapi.Schema(type=openapi.TYPE_STRING)})),
        }
    )
    @action(detail=False, methods=['get'], url_path='generate-sql')
    def generate_sql(self, request):
        """
        Generate sample SQL insert statements that match the Django models.
        """
        # Generate SQL statements that match the model structure
        sql_statements = [
            # States table
            """INSERT INTO public.states
            (id, code, name, created_at)
            VALUES(nextval('states_id_seq'::regclass), 'XX', 'Sample State', CURRENT_TIMESTAMP);""",
            
            # Games table
            """INSERT INTO public.games
            (id, name, slug, logo_url, description, is_multi_state, created_at, updated_at)
            VALUES(nextval('games_id_seq'::regclass), 'Sample Game', 'sample-game', 
            'https://example.com/logo.png', 'Sample game description', false, 
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);""",
            
            # State_games table
            """INSERT INTO public.state_games
            (id, state_id, game_id, created_at)
            VALUES(nextval('state_games_id_seq'::regclass), 1, 1, CURRENT_TIMESTAMP);""",
            
            # Game_results table
            """INSERT INTO public.game_results
            (id, game_id, state_id, draw_date, draw_time, numbers, jackpot, 
            next_draw_date, next_draw_time, next_jackpot, collected_at)
            VALUES(nextval('game_results_id_seq'::regclass), 1, 1, '2023-06-01', '20:00:00', 
            '1,2,3,4,5,6', 1000000.00, '2023-06-08', '20:00:00', 1500000.00, CURRENT_TIMESTAMP);"""
        ]
        
        return Response({"sql": "\n\n".join(sql_statements)})

    @swagger_auto_schema(
        operation_description="Get games with optional state filter",
        manual_parameters=[
            openapi.Parameter(
                'state_code', 
                openapi.IN_QUERY, 
                description="Optional state code to filter games", 
                type=openapi.TYPE_STRING,
                required=False
            )
        ],
        responses={
            200: openapi.Response(
                description="List of games",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'games': openapi.Schema(
                            type=openapi.TYPE_ARRAY,
                            items=openapi.Schema(
                                type=openapi.TYPE_OBJECT,
                                properties={
                                    'id': openapi.Schema(type=openapi.TYPE_INTEGER),
                                    'name': openapi.Schema(type=openapi.TYPE_STRING),
                                    'slug': openapi.Schema(type=openapi.TYPE_STRING),
                                    'logo_url': openapi.Schema(type=openapi.TYPE_STRING),
                                }
                            )
                        )
                    }
                )
            )
        }
    )
    @action(detail=False, methods=['get'], url_path='get-games')
    def get_games(self, request):
        """
        Get games with optional state filter.
        """
        from lotterydata.models import Game, State
        from lotterydata.serializers import GameSerializer
        
        state_code = request.query_params.get('state_code', None)
        
        if state_code:
            try:
                state = State.objects.get(code=state_code)
                games = Game.objects.filter(states=state)
            except State.DoesNotExist:
                return Response(
                    {"error": f"State with code '{state_code}' not found."},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            games = Game.objects.all()
            
        serializer = GameSerializer(games, many=True)
        return Response({"games": serializer.data})
