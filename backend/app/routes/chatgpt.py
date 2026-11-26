"""
ChatGPT / recipe-extraction routes.

Provides two endpoints consumed by the frontend:
  POST /chatgpt/parse      – parse raw text via OpenAI
  POST /chatgpt/parse-url  – fetch a URL, extract text, then parse via OpenAI
"""

from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.middleware.auth import CurrentUser, get_current_user
from app.services import recipe_service as svc
from app.services.entitlement_service import FREE_RECIPE_LIMIT, is_entitled
from app.services.recipe_service import (
    DEFAULT_CHAT_MODEL,
    RECIPE_RESPONSE_FORMAT,
    RECIPE_SYSTEM_PROMPT,
    call_openai_chat,
    fetch_and_extract,
    sanitize_recipe_strings,
)
from app.utils.logger import logger

router = APIRouter(prefix="/chatgpt", tags=["chatgpt"])
limiter = Limiter(key_func=get_remote_address)

RECIPE_GENERATION_SYSTEM_PROMPT = (
    "You are a helpful recipe-generation assistant. Create a complete, practical recipe "
    "from the user's request. Do not require or invent a source URL. Use clear ingredient "
    "quantities and concise preparation steps. Return only the structured recipe fields."
)


# ── request models ───────────────────────────────────────────────────


class ParseTextPayload(BaseModel):
    text: str
    system_prompt: Optional[str] = None
    model: str = DEFAULT_CHAT_MODEL
    response_format: Optional[dict[str, Any]] = None
    temperature: float = 0.2
    max_tokens: int = 4000


class ParseUrlPayload(BaseModel):
    url: str
    system_prompt: Optional[str] = None
    model: str = DEFAULT_CHAT_MODEL
    response_format: Optional[dict[str, Any]] = None
    temperature: float = 0.2
    max_tokens: int = 4000


class GenerateRecipePayload(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    model: str = DEFAULT_CHAT_MODEL
    temperature: float = Field(default=0.2, ge=0, le=2)
    max_tokens: int = Field(default=4000, ge=100, le=8000)

    @field_validator("text")
    @classmethod
    def validate_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("text must not be blank")
        return value


class ChatGPTRecipeStep(BaseModel):
    instruction: str = Field(min_length=1, max_length=4000)
    ingredients: list[str] = Field(default_factory=list, max_length=100)

    model_config = {"extra": "forbid"}


class SaveGeneratedRecipePayload(BaseModel):
    confirmed: Literal[True]
    title: str = Field(min_length=1, max_length=500)
    description: Optional[str] = Field(default=None, max_length=4000)
    sourceUrl: Optional[str] = Field(default=None, max_length=2000)
    prepTime: Optional[str] = Field(default=None, max_length=100)
    cookTime: Optional[str] = Field(default=None, max_length=100)
    coolTime: Optional[str] = Field(default=None, max_length=100)
    chillTime: Optional[str] = Field(default=None, max_length=100)
    restTime: Optional[str] = Field(default=None, max_length=100)
    marinateTime: Optional[str] = Field(default=None, max_length=100)
    soakTime: Optional[str] = Field(default=None, max_length=100)
    totalTime: Optional[str] = Field(default=None, max_length=100)
    servings: Optional[str] = Field(default=None, max_length=100)
    ingredients: list[str] = Field(default_factory=list, max_length=500)
    steps: list[ChatGPTRecipeStep] = Field(default_factory=list, max_length=500)
    notes: list[str] = Field(default_factory=list, max_length=500)

    model_config = {"extra": "forbid"}

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("title must not be blank")
        return value

    @field_validator("sourceUrl")
    @classmethod
    def validate_source_url(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip()
        if not value:
            return None
        if not (value.startswith("https://") or value.startswith("http://")):
            raise ValueError("sourceUrl must be an HTTP or HTTPS URL")
        return value


# ── POST /chatgpt/parse ─────────────────────────────────────────────


@router.post("/parse")
@limiter.limit("10/minute")
async def parse_text(payload: ParseTextPayload, request: Request):
    """Send raw text to OpenAI and return the structured result."""
    logger.info("chatgpt/parse – model=%s, text length=%d", payload.model, len(payload.text))

    result = await call_openai_chat(
        text=payload.text,
        system_prompt=payload.system_prompt or RECIPE_SYSTEM_PROMPT,
        model=payload.model,
        response_format=payload.response_format or RECIPE_RESPONSE_FORMAT,
        temperature=payload.temperature,
        max_tokens=payload.max_tokens,
    )

    return sanitize_recipe_strings(result)


# ── POST /chatgpt/parse-url ─────────────────────────────────────────


@router.post("/parse-url")
@limiter.limit("10/minute")
async def parse_url(payload: ParseUrlPayload, request: Request):
    """Fetch a URL, extract visible text, then send it to OpenAI."""
    logger.info("chatgpt/parse-url – url=%s, model=%s", payload.url, payload.model)

    fetch_result = await fetch_and_extract(payload.url)
    if not fetch_result["ok"]:
        raise HTTPException(
            status_code=fetch_result.get("status_code", 400),
            detail={
                "success": False,
                "error": fetch_result["error"],
                "status_code": fetch_result.get("status_code"),
            }
        )

    # Build the best available text for ChatGPT.
    # Structured data gives cleaner input; fall back to raw visible text.
    if fetch_result.get("structured_recipe"):
        import json
        input_text = json.dumps(fetch_result["structured_recipe"], indent=2)
        logger.info("Using structured data as ChatGPT input for %s", payload.url)
    else:
        input_text = fetch_result["text"][:12_000]

    result = await call_openai_chat(
        text=input_text[:12_000],
        system_prompt=payload.system_prompt or RECIPE_SYSTEM_PROMPT,
        model=payload.model,
        response_format=payload.response_format or RECIPE_RESPONSE_FORMAT,
        temperature=payload.temperature,
        max_tokens=payload.max_tokens,
    )

    return sanitize_recipe_strings(result)


@router.post("/generate")
@limiter.limit("10/minute")
async def generate_recipe(payload: GenerateRecipePayload, request: Request):
    """Generate a complete AI-authored recipe with no source URL required."""
    result = await call_openai_chat(
        text=payload.text,
        system_prompt=RECIPE_GENERATION_SYSTEM_PROMPT,
        model=payload.model,
        response_format=RECIPE_RESPONSE_FORMAT,
        temperature=payload.temperature,
        max_tokens=payload.max_tokens,
    )
    return sanitize_recipe_strings(result)


@router.post("/save-recipe")
async def save_generated_recipe(
    payload: SaveGeneratedRecipePayload,
    user: CurrentUser = Depends(get_current_user),
):
    """Save an AI-generated or externally sourced recipe for the authenticated user."""
    try:
        duplicate = await svc.find_saved_recipe_duplicate(
            user_id=user.id,
            title=payload.title,
            source_url=payload.sourceUrl,
        )
        if duplicate:
            return JSONResponse(
                status_code=409,
                content={
                    "error": {
                        "code": "DUPLICATE_RECIPE",
                        "message": "This recipe is already saved.",
                    },
                    "recipe": duplicate,
                },
            )

        if not await is_entitled(user.id, "pro"):
            count = await svc.count_saved_recipes(user.id)
            if count >= FREE_RECIPE_LIMIT:
                return JSONResponse(
                    status_code=403,
                    content={
                        "error": {
                            "code": "RECIPE_LIMIT_REACHED",
                            "message": (
                                f"Free accounts can save up to {FREE_RECIPE_LIMIT} recipes. "
                                "Upgrade to Pro for unlimited saves."
                            ),
                        }
                    },
                )

        row = await svc.create_saved_recipe(
            user_id=user.id,
            title=payload.title,
            description=payload.description,
            source_url=payload.sourceUrl,
            prep_time=payload.prepTime,
            cook_time=payload.cookTime,
            cool_time=payload.coolTime,
            chill_time=payload.chillTime,
            rest_time=payload.restTime,
            marinate_time=payload.marinateTime,
            soak_time=payload.soakTime,
            total_time=payload.totalTime,
            servings=payload.servings,
            ingredients=payload.ingredients,
            steps=[step.model_dump() for step in payload.steps],
            notes=payload.notes,
        )
        return {"success": True, "recipe": row}
    except Exception:
        logger.error("Failed to save ChatGPT-generated recipe", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "SAVE_FAILED",
                    "message": "Failed to save recipe",
                },
            },
        )
