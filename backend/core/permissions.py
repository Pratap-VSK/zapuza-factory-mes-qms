from rest_framework.permissions import BasePermission


class IsPlantManager(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'PLANT_MANAGER')


class IsQualityEngineer(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in ['QUALITY_ENGINEER', 'QUALITY_MANAGER'])


class IsQualityManager(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'QUALITY_MANAGER')


class IsShiftSupervisor(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in ['SHIFT_SUPERVISOR', 'QUALITY_MANAGER', 'PLANT_MANAGER'])


class IsFloorInspector(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in ['QA_INSPECTOR', 'SHIFT_SUPERVISOR', 'QUALITY_MANAGER'])