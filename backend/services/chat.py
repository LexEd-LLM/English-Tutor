# services/chat_service.py
import asyncio
from asyncio import to_thread
from typing import List, Dict
from llama_index.core.llms import ChatMessage, MessageRole
from llama_index.core.prompts import ChatPromptTemplate
from ..config.settings import llm

# ---------- 1. Prompt kiểm soát phạm vi trả lời ---------- #
CHATBOT_SYSTEM_INSTRUCTION = """
Bạn là **Linga**, một trợ lý AI hỗ trợ học tiếng Anh cho học sinh. 
Chỉ trả lời các câu hỏi liên quan đến nội dung bài học bên dưới.

<lesson>
{lesson_text}
</lesson>

Quy tắc:
1. Nếu học sinh hỏi ngoài phạm vi bài học, **từ chối nhẹ nhàng và nhắc lại rằng bạn chỉ hỗ trợ trong phạm vi bài học hiện tại.**
2. Hướng dẫn học sinh từng bước, khuyến khích tự suy nghĩ trước khi đưa ra đáp án.
3. Luôn tích cực, hỗ trợ và kiên nhẫn. Không đưa đáp án ngay nếu học sinh còn bối rối.
4. Trả lời bằng **cùng ngôn ngữ** với câu hỏi của học sinh.
5. Không dùng bảng markdown. Khi cần trình bày so sánh hoặc tổng hợp:
   - Dùng danh sách gạch đầu dòng hoặc chia mục rõ ràng.
   - Mỗi đoạn ngắn gọn, cách dòng hợp lý để dễ đọc.
   - Với nội dung so sánh, dùng định dạng:
     - Điểm A:
        - Mô tả…
        - Ví dụ…
     - Điểm B:
        - Mô tả…
        - Ví dụ…
""".strip()

# Khai báo template chính thức
CHATBOT_PROMPT = ChatPromptTemplate(
    message_templates=[
        ChatMessage(role=MessageRole.SYSTEM, content=CHATBOT_SYSTEM_INSTRUCTION),
        ChatMessage(role=MessageRole.USER, content="{query}"),
    ]
)

# ---------- 2. Hàm chính ---------- #
async def chat(
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
    response = await to_thread(llm.chat, full_messages)
    return response.message.content.strip()
