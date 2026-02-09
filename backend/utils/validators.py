import re


def validate_password_strength(password: str) -> str:
    if len(password) < 12:
        raise ValueError("Password must be at least 12 characters")
    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"\d", password):
        raise ValueError("Password must contain at least one digit")
    if not re.search(r"[^a-zA-Z0-9]", password):
        raise ValueError("Password must contain at least one symbol")
    return password
