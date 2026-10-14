import os
from pathlib import Path
from dotenv import load_dotenv

# Resolve the backend directory path (where .env is located)
BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BACKEND_DIR / ".env"

# Load environment variables from .env if present
if ENV_FILE.exists():
    load_dotenv(dotenv_path=ENV_FILE)
else:
    load_dotenv()  # Fallback to current working directory lookup


class Settings:
    """Application settings loaded from environment variables."""

    def __init__(self):
        self.DATABASE_URL: str = os.getenv("DATABASE_URL", "").strip()
        if not self.DATABASE_URL:
            raise RuntimeError(
                "Missing required environment variable: 'DATABASE_URL'.\n"
                "Please make sure you have created a '.env' file in 'bloomloop/backend/' "
                "with a valid DATABASE_URL (see .env.example for guidance)."
            )

        self.CLERK_JWKS_URL: str = os.getenv("CLERK_JWKS_URL", "").strip()
        self.GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "").strip()
        self.FRONTEND_ORIGIN: str = os.getenv(
            "FRONTEND_ORIGIN", "http://localhost:5173"
        ).strip()


# Instantiate a singleton settings object
settings = Settings()
