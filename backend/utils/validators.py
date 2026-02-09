import re


def validate_password_strength(password: str) -> str:
    if len(password) < 12:
        raise ValueError("Le mot de passe doit contenir au moins 12 caractères")
    if not re.search(r"[a-z]", password):
        raise ValueError("Le mot de passe doit contenir au moins une minuscule")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Le mot de passe doit contenir au moins une majuscule")
    if not re.search(r"\d", password):
        raise ValueError("Le mot de passe doit contenir au moins un chiffre")
    if not re.search(r"[^a-zA-Z0-9]", password):
        raise ValueError("Le mot de passe doit contenir au moins un symbole")
    return password
