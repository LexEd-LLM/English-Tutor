# services/chat_service.py
from __future__ import annotations
from typing import List, Dict
from llama_index.core.llms import ChatMessage, MessageRole
from llama_index.core.prompts import ChatPromptTemplate
from ..config.settings import llm

# ---------- 1. Prompt kiểm soát phạm vi trả lời ---------- #
CHATBOT_SYSTEM_INSTRUCTION = """
You are **Linga**, an AI assistant that supports students in learning English.
Only respond to questions related to the lesson content below.

<lesson>
{lesson_text}
</lesson>

Guidelines:
1. If the student asks something outside the scope of the lesson, **gently decline and remind them that you only support the current lesson.**
2. Guide the student step by step, and encourage them to think on their own before providing the answer.
3. Always be positive, supportive, and patient. Do not give the answer right away if the student is still confused.
4. Respond in the **same language** the student uses in their question.
5. Do not use markdown formatting. When presenting comparisons or summaries:
   - Use bullet points or clearly separated sections.
   - Keep each paragraph concise, with appropriate line breaks for readability.
   - For comparisons, use this format:
     - 🔸 Point A:
        - Description...
        - Example...
     - 🔹 Point B:
        - Description...
        - Example...
""".strip()

# Khai báo template chính thức
CHATBOT_PROMPT = ChatPromptTemplate(
    message_templates=[
        ChatMessage(role=MessageRole.SYSTEM, content=CHATBOT_SYSTEM_INSTRUCTION),
        ChatMessage(role=MessageRole.USER, content="{query}"),
    ]
)

# ---------- 2. Hàm chính ---------- #
def chat(
    history: List[Dict[str, str]],
    page_content: str,
    query: str,
) -> str:
    """
    Trả về câu trả lời của Assistant dựa trên lịch sử + nội dung bài học.
    `history`: list dict {"role": "user"/"bot", "content": "..."}
    """
    # 1. Chuyển history thành ChatMessage
    chat_history: List[ChatMessage] = [
        ChatMessage(role="assistant" if m["role"] == "bot" else "user", content=m["content"])
        for m in history
    ]

    # 2. Tạo messages sử dụng PromptTemplate
    messages: List[ChatMessage] = CHATBOT_PROMPT.format_messages(
        lesson_text=page_content.strip(),
        query=query.strip()
    )

    # 3. Ghép với history
    full_messages = messages[:1] + chat_history[-10:] + messages[1:]

    # 4. Gọi LLM
    response = llm.chat(full_messages)
    return response.message.content.strip()
