class TabletDeviceFingerprintMiddleware:
    """
    Extracts hardware tablet serial number from X-Device-Serial header
    and attaches it to request for audit logging and station locks.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.device_serial = request.headers.get('X-Device-Serial', 'WEB-PORTAL-BROWSER')
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            request.client_ip = x_forwarded_for.split(',')[0].strip()
        else:
            request.client_ip = request.META.get('REMOTE_ADDR', '127.0.0.1')
        return self.get_response(request)