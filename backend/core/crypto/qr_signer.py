import hmac
import hashlib
import base64
import json
from django.conf import settings
from rest_framework.exceptions import ValidationError


class TamperProofQRSigner:
    """
    Section 7.1 / 13: Prevents fake label printing or breakroom scanning
    by signing Station QR codes, Traveler Barcodes, and Shipping Crate QR labels.
    """
    @staticmethod
    def generate_signed_token(entity_type: str, entity_id: str, metadata: dict = None) -> str:
        payload_dict = {
            "type": entity_type,
            "id": str(entity_id),
            "meta": metadata or {}
        }
        payload_json = json.dumps(payload_dict, separators=(',', ':'), sort_keys=True)
        payload_b64 = base64.urlsafe_b64encode(payload_json.encode('utf-8')).decode('utf-8')

        signature = hmac.new(
            settings.QR_HMAC_SECRET_KEY.encode('utf-8'),
            payload_b64.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

        return f"ZPZ.{payload_b64}.{signature}"

    @staticmethod
    def verify_signed_token(token: str, expected_type: str = None) -> dict:
        try:
            parts = token.strip().split('.')
            if len(parts) != 3 or parts[0] != 'ZPZ':
                raise ValueError("Invalid Zapuza QR prefix format.")

            _, payload_b64, provided_sig = parts
            expected_sig = hmac.new(
                settings.QR_HMAC_SECRET_KEY.encode('utf-8'),
                payload_b64.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()

            if not hmac.compare_digest(provided_sig, expected_sig):
                raise ValidationError("Tamper Alert: QR cryptographic signature mismatch!")

            payload_json = base64.urlsafe_b64decode(payload_b64.encode('utf-8')).decode('utf-8')
            data = json.loads(payload_json)

            if expected_type and data.get("type") != expected_type:
                raise ValidationError(f"Invalid QR Type: Expected {expected_type}, got {data.get('type')}.")

            return data
        except ValidationError:
            raise
        except Exception as exc:
            raise ValidationError(f"Corrupted or unauthorized QR code scanned: {str(exc)}")