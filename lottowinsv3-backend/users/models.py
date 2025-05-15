from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager, Group, Permission
import uuid
import os

def user_profile_path(instance, filename):
    # Gera um caminho para salvar a imagem de perfil
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4().hex}.{ext}"
    return os.path.join('profiles', filename)

class Role(models.Model):
    name = models.CharField(max_length=50, unique=True, verbose_name='Nome')
    description = models.TextField(blank=True, null=True, verbose_name='Descrição')
    
    class Meta:
        verbose_name = 'Perfil'
        verbose_name_plural = 'Perfis'
        db_table = 'roles'
        
    def __str__(self):
        return self.name

class UserManager(BaseUserManager):
    def create_user(self, email, name, password=None, **extra_fields):
        if not email:
            raise ValueError('O campo Email é obrigatório')
        email = self.normalize_email(email)
        
        # Gerar username automaticamente baseado no email
        username = f"user_{uuid.uuid4().hex[:8]}"
        
        user = self.model(
            email=email,
            name=name,
            username=username,
            **extra_fields
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, name, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        
        return self.create_user(email, name, password, **extra_fields)

class User(AbstractUser):
    email = models.EmailField(unique=True, verbose_name='Email')
    name = models.CharField(max_length=150, verbose_name='Nome completo')
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True, related_name='users', verbose_name='Perfil')
    profile_photo = models.ImageField(upload_to=user_profile_path, null=True, blank=True, verbose_name='Foto de perfil')
    
    # Substituir os campos ManyToManyField para personalizar os nomes das tabelas
    groups = models.ManyToManyField(
        Group,
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.',
        related_name='user_set',
        related_query_name='user',
        db_table='user_groups'
    )
    
    user_permissions = models.ManyToManyField(
        Permission,
        verbose_name='user permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        related_name='user_set',
        related_query_name='user',
        db_table='user_permissions'
    )
    
    # Campos que não serão usados mas são herdados do AbstractUser
    first_name = None
    last_name = None
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name', 'username']
    
    objects = UserManager()
    
    class Meta:
        verbose_name = 'Usuário'
        verbose_name_plural = 'Usuários'
        db_table = 'users'
        
    def __str__(self):
        return self.email
