"""AES-256-GCM encryption for secrets at rest (AK/SK, instance passwords).

The 32-byte key is derived from the ENCRYPTION_KEY environment variable
via SHA-256. Ciphertext format: base64(nonce || ciphertext || tag).
"""
import base64
import hashlib
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.config import get_settings

_NONCE_LEN = 12


def _key() -> bytes:
    return hashlib.sha256(get_settings().encryption_key.encode()).digest()


def encrypt(plaintext: str) -> str:
    if plaintext is None:
        return ""
    nonce = os.urandom(_NONCE_LEN)
    ct = AESGCM(_key()).encrypt(nonce, plaintext.encode(), None)
    return base64.b64encode(nonce + ct).decode()


def decrypt(token: str) -> str:
    if not token:
        return ""
    raw = base64.b64decode(token)
    nonce, ct = raw[:_NONCE_LEN], raw[_NONCE_LEN:]
    return AESGCM(_key()).decrypt(nonce, ct, None).decode()
