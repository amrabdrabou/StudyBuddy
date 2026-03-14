"""OAuth2 client registration for third-party authentication providers."""
from authlib.integrations.starlette_client import OAuth

from app.core.config import get_settings

settings = get_settings()

# Initialize the OAuth registry used to manage configured providers
oauth = OAuth()

# Configure the Google OAuth client for Single Sign-On (SSO) integration
oauth.register(
    name="google",
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration", # Auto-discover OAuth endpoints
    client_kwargs={
        "scope": "openid email profile", # Request identity, email, and basic profile info
    },
)