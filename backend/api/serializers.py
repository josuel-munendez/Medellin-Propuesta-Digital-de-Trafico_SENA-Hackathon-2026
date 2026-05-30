from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Accident, Zone


class AccidentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Accident
        fields = ['id', 'lat', 'lng', 'intensity', 'hour', 'date']


class ZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Zone
        fields = ['id', 'name', 'risk_level', 'geometry']


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    is_admin = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'role', 'is_admin']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_role(self, obj):
        return 'admin' if obj.is_staff or obj.is_superuser else 'user'

    def get_is_admin(self, obj):
        return bool(obj.is_staff or obj.is_superuser)


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class DashboardSerializer(serializers.Serializer):
    role = serializers.CharField()
    greeting = serializers.CharField()
    summary = serializers.DictField()
    highlights = serializers.ListField(child=serializers.CharField())


class AdminAccidentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Accident
        fields = ['id', 'lat', 'lng', 'intensity', 'hour', 'date']


class AdminZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Zone
        fields = ['id', 'name', 'risk_level', 'geometry']


class AdminUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=False)
    role = serializers.ChoiceField(choices=['user', 'admin'], default='user')
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'password',
            'role',
            'full_name',
            'is_active',
            'date_joined',
        ]
        read_only_fields = ['id', 'full_name', 'date_joined']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def _apply_role(self, user, role):
        is_admin = role == 'admin'
        user.is_staff = is_admin
        user.is_superuser = is_admin

    def create(self, validated_data):
        role = validated_data.pop('role', 'user')
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        self._apply_role(user, role)

        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()

        user.save()
        return user

    def update(self, instance, validated_data):
        role = validated_data.pop('role', None)
        password = validated_data.pop('password', None)

        for field, value in validated_data.items():
            setattr(instance, field, value)

        if role is not None:
            self._apply_role(instance, role)

        if password:
            instance.set_password(password)

        instance.save()
        return instance
