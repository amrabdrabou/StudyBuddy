from pydantic import BaseModel


class TokenOut(BaseModel):
    """What we send back after a successful login."""
    access_token: str
    token_type: str = "bearer"
