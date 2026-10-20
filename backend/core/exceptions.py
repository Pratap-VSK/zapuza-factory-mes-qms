from rest_framework.views import exception_handler
from rest_framework.exceptions import APIException
from rest_framework import status


class ShopfloorInterlockException(APIException):
    status_code = status.HTTP_423_LOCKED
    default_detail = "Shopfloor safety or quality interlock is active."
    default_code = "SHOPFLOOR_INTERLOCK_LOCKED"

    def __init__(self, detail=None, interlock_type="GENERAL_LOCK", extra_data=None):
        self.interlock_type = interlock_type
        self.extra_data = extra_data or {}
        super().__init__(detail=detail or self.default_detail)


def custom_interlock_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None and isinstance(exc, ShopfloorInterlockException):
        response.data = {
            "interlocked": True,
            "interlock_type": exc.interlock_type,
            "message": exc.detail,
            "details": exc.extra_data,
        }
    return response