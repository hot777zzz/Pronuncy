from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    host: str = "0.0.0.0"
    port: int = 8000
    log_level: str = "info"
    whisper_model: str = "medium.en"

    # v0.4: Database
    db_path: str = "data/pronuncy.db"

    # v0.4: Agent
    agent_provider: str = "openai"
    agent_api_key: str = ""
    agent_model: str = "gpt-4o"
    agent_base_url: str = "https://api.openai.com/v1"


settings = Settings()
