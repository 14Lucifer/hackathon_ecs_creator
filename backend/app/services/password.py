"""Password hashing (PBKDF2-SHA256) and random password generation."""
import hashlib
import hmac
import secrets
import string

PBKDF2_ITERATIONS = 200_000
_ALPHABET = string.ascii_lowercase + string.ascii_uppercase + string.digits


def generate_password(length: int = 16) -> str:
    """16-char random password from a-z, A-Z, 0-9 (at least one of each class)."""
    while True:
        pwd = "".join(secrets.choice(_ALPHABET) for _ in range(length))
        if (
            any(c.islower() for c in pwd)
            and any(c.isupper() for c in pwd)
            and any(c.isdigit() for c in pwd)
        ):
            return pwd


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt.encode(), PBKDF2_ITERATIONS
    ).hex()
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _algo, iterations, salt, digest = stored.split("$")
        candidate = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), salt.encode(), int(iterations)
        ).hex()
        return hmac.compare_digest(candidate, digest)
    except (ValueError, AttributeError):
        return False
