from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
import base64
import uuid
import os
from django.core.files.base import ContentFile
from .models import Role

User = get_user_model()

class Base64ImageField(serializers.ImageField):
    """
    Campo personalizado para lidar com imagens em base64
    """
    def to_internal_value(self, data):
        if isinstance(data, str) and data.startswith('data:image'):
            # Formato base64
            format, imgstr = data.split(';base64,')
            ext = format.split('/')[-1]
            
            # Gera um nome de arquivo único
            filename = f"{uuid.uuid4().hex}.{ext}"
            
            # Converte base64 para arquivo
            data = ContentFile(base64.b64decode(imgstr), name=filename)
        
        return super().to_internal_value(data)

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'name', 'description']

class UserSerializer(serializers.ModelSerializer):
    profile_photo = Base64ImageField(required=False)
    role_detail = RoleSerializer(source='role', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'profile_photo', 'role', 'role_detail', 'is_active']
        read_only_fields = ['id']

class UserCreateSerializer(serializers.ModelSerializer):
    username = serializers.CharField(required=True, max_length=150)
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    profile_photo = Base64ImageField(required=False)

    class Meta:
        model = User
        fields = ['username', 'email', 'name', 'password', 'password2', 'profile_photo', 'role']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "As senhas não conferem."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = User(
            username=validated_data['username'],
            email=validated_data['email'],
            name=validated_data['name'],
            **{k: v for k, v in validated_data.items() if k not in ['username', 'email', 'name']}
        )
        user.set_password(password)
        user.save()
        return user

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password2 = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({"new_password": "As senhas não conferem."})
        return attrs 