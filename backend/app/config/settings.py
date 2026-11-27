from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Server
    port: int = 8000
    environment: str = "development"
    log_level: str = "info"
    functions_preview_mode: bool = False
    platform_managed_cors: bool = False

    # Database
    postgres_connection_string: str = "postgresql://devuser:devpassword@localhost:5432/cutthecrap_dev"
    postgres_pool_min_size: int = 2
    postgres_pool_max_size: int = 20

    # Frontend
    frontend_url: str = "http://localhost:8081"
    additional_frontend_urls: str = ""

    # WorkOS
    workos_api_key: str = ""
    workos_client_id: str = ""
    workos_redirect_uri: str = "https://cutthecrap.deploy-box.com/api/v1/auth/callback"

    # OpenAI and Deploy Box email service
    chatgpt_api_base: str = "https://deploy-box-apis-func-dev.azurewebsites.net"
    openai_api_key: str = ""
    deploy_box_client_id: str = ""
    deploy_box_client_secret: str = ""
    deploy_box_api_key: str = ""

    # Stripe billing
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_pro_monthly: str = ""
    stripe_price_pro_yearly: str = ""

    # Apple App Store billing
    apple_bundle_id: str = ""
    apple_shared_secret: str = ""
    apple_issuer_id: str = ""
    apple_key_id: str = ""
    apple_private_key: str = ""

    # Google Play billing
    google_play_package_name: str = ""
    google_service_account_json: str = ""

    # CORS
    cors_origin: str = "http://localhost:19006,http://localhost:19000,http://localhost:8081"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

    @property
    def cors_origins(self) -> list[str]:
        origins = [origin.strip() for origin in self.cors_origin.split(",")]
        if self.environment == "development" and "*" not in origins:
            # In development, allow all origins so physical devices can connect.
            # When using wildcard, credentials must be disabled — FastAPI/Starlette
            # handles this automatically by converting to a permissive origin echo.
            origins.append("*")
        return origins

    @property
    def is_dev(self) -> bool:
        return self.environment == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()
