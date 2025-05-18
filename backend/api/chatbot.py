# api/chatbot.py
from typing import List, Dict
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, field_validator

from backend.services.chat import chat as chat_service

router = APIRouter(prefix="/api", tags=["chat"])

# ---------- Pydantic schema ---------- #
class ChatRequest(BaseModel):
    history: List[Dict[str, str]]
    pageContent: str = Field(..., alias="pageContent")
    promptText: str  = Field(..., alias="promptText")

class ChatResponse(BaseModel):
    response: str

# ---------- Endpoint ---------- #
@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(body: ChatRequest):
    try:
        answer = await chat_service(
            history=body.history,
            page_content=body.pageContent,
            query=body.promptText,
        )
        return ChatResponse(response=answer)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Chat service failed")
