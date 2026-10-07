from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://rfi_user:rfi_password@localhost:5432/rfi_db"
    APP_NAME: str = "RFI System"
    JWT_SECRET: str = ""
    TOKEN_HOURS: int = 168
    ADMIN_EMAIL: str = ""
    ADMIN_PASSWORD: str = ""

    model_config = {"env_file": ".env"}


settings = Settings()
