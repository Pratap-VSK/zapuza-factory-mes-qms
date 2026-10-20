import json
from core.models import ImmutableAuditLog


class ImmutableAuditTrailMiddleware:
    """
    Automatically records every mutating API action (POST, PUT, PATCH, DELETE)
    into the ImmutableAuditLog table (Section 13.3).
    """
    MUTATING_METHODS = ('POST', 'PUT', 'PATCH', 'DELETE')

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_body = None
        if request.method in self.MUTATING_METHODS and request.content_type == 'application/json':
            try:
                raw_body = request.body.decode('utf-8')
                if raw_body:
                    parsed = json.loads(raw_body)
                    if isinstance(parsed, dict) and 'password' in parsed:
                        parsed = {**parsed, 'password': '***REDACTED***'}
                    request_body = parsed
            except Exception:
                request_body = None

        response = self.get_response(request)

        if request.method in self.MUTATING_METHODS and request.path.startswith('/api/'):
            try:
                user = request.user if hasattr(request, 'user') and request.user.is_authenticated else None
                ImmutableAuditLog.objects.create(
                    user=user,
                    user_role=getattr(user, 'role', 'ANONYMOUS') if user else 'ANONYMOUS',
                    ip_address=getattr(request, 'client_ip', '127.0.0.1'),
                    device_serial=getattr(request, 'device_serial', 'WEB-PORTAL'),
                    http_method=request.method,
                    endpoint=request.path[:255],
                    entity_type=request.path.strip('/').split('/')[2] if len(request.path.strip('/').split('/')) > 2 else 'API',
                    action=f"{request.method} {request.path}",
                    new_value=request_body,
                    status_code=response.status_code,
                )
            except Exception:
                pass

        return response