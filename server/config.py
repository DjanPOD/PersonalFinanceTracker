import os


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "development-only-secret-key")

    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "sqlite:///personal_finance_tracker.db",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_ALGORITHM = "HS256"
    JWT_EXPIRATION_MINUTES = 60