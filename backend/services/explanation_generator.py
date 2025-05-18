import asyncio
from asyncio import to_thread
from typing import List
from llama_index.core.prompts import PromptTemplate
from ..config.settings import llm
from googletrans import Translator

async def generate_explanation_mcq(question: str, correct_answer: str, user_answer: str, options: List[dict]) -> str:
    """Generate explanation for a question."""
    option_text = "\n".join(
        [f"{chr(65+i)}. {opt['text']}{' (Đáp án đúng)' if opt['correct'] else ''}" for i, opt in enumerate(options)]
    )
    
    template = PromptTemplate(
        template=(
        "Bạn là một giáo viên tận tâm, hướng dẫn học sinh lớp 12 ôn tập môn tiếng Anh. "
        "Hãy giải thích ngắn gọn, đi thẳng vào nội dung chính để giúp học sinh hiểu rõ kiến thức.\n\n"
        "- Luôn giải thích vì sao đáp án đúng là {correct_answer}.\n"
        "- Nếu đáp án của học sinh ({user_answer}) khác đáp án đúng, hãy phân tích lý do sai và đưa ví dụ minh họa.\n"
        "- Nếu học sinh đã chọn đúng, hãy củng cố bằng cách giải thích rõ vì sao đó là lựa chọn tốt nhất và đưa ví dụ tương tự để học sinh ghi nhớ.\n\n"
        "Câu hỏi: {question}\n"
        "Các lựa chọn:\n{option_text}\n\n"
        "Đáp án của học sinh: {user_answer}\n\n"
        "Giải thích:"
        )
    )

    prompt = template.format(
        question=question,
        correct_answer=correct_answer,
        user_answer=user_answer,
        option_text=option_text
    )
    response = await to_thread(llm.complete, prompt)
    return "\n".join(response.text.splitlines()[1:])

async def generate_explanation_pronunciation(question: str, correct_answer: str, user_answer: str) -> str:
    """Generate explanation for a question."""
    template = PromptTemplate(
        template=(
            "Bạn là một giáo viên tiếng Anh (xưng hô là cô) giỏi về phát âm, đang giúp học sinh người Việt luyện phát âm tiếng Anh.\n\n"
            "Dưới đây là phiên âm chuẩn (IPA) và phiên âm do AI nhận diện từ giọng nói của học sinh.\n"
            "Hãy đưa ra nhận xét và hướng dẫn một cách tự nhiên (không thêm mô tả hành động hoặc cảm xúc), rõ ràng, bằng tiếng Việt.\n\n"
            "- Nếu học sinh phát âm đúng, chỉ cần công nhận và khuyến khích.\n"
            "- Nếu có lỗi rõ ràng, hãy chỉ ra và hướng dẫn cách khắc phục một cách tự nhiên, không ép buộc góp ý nếu không cần thiết.\n"
            "- Có thể tham khảo các gợi ý sau để phản hồi:\n"
            "  + Gợi ý lựa chọn phiên âm chuẩn (Anh-Anh hoặc Anh-Mỹ) gần nhất với phát âm của học sinh.\n"
            "  + Nhận xét điểm đúng và chưa đúng (nếu có).\n"
            "  + Nhắc rằng có thể có sự chênh lệch nhỏ do mô hình nhận diện âm thanh:\n"
            "      * \"ih\" <-> \"ah\", \"ih\" <-> \"eh\", \"ih\" <-> \"iy\"\n"
            "      * \"aa\" thay vì \"ah\", \"ae\" thay vì \"eh\", \"er\" thay vì \"ah\", \"r\" thay vì \"er\"\n"
            "    => Không đổ lỗi sai cho học sinh nếu sai khác nhỏ có thể do mô hình.\n"
            "  + Hướng dẫn cách phát âm (khẩu hình, vị trí lưỡi, hơi thở) nếu cần.\n"
            "  + Nhắc đến trọng âm của từ một cách tự nhiên, lưu ý rằng trọng âm có thể thay đổi tùy thuộc vào từ loại. Dựa vào phát âm của học sinh để suy luận ngữ cảnh từ loại tương ứng (nếu có).\n"
            "  + Không liệt kê đánh số, hãy trình bày như đang trò chuyện.\n\n"
            "Thông tin:\n\n"
            "Câu hỏi: {question}\n"
            "Phiên âm chuẩn (IPA): {correct_answer}\n"
            "Phiên âm do hệ thống ghi nhận từ phát âm của học sinh: {user_answer}\n"
            "Không đề cập đến hệ thống hoặc AI trong phản hồi. Hãy phản hồi như một giáo viên vừa nghe học sinh phát âm.\n"
            "Nhận xét và hướng dẫn (bằng tiếng Việt):"
        )
    )
    prompt = template.format(
        question=question,
        correct_answer=correct_answer,
        user_answer=user_answer
    )
    response = await to_thread(llm.complete, prompt)
    return "\n".join(response.text.splitlines())

async def generate_explanation_image(options: List[dict]) -> str:
    """Translate 4 answers and return Markdown table."""
    translator = Translator()
    
    translated_table = [
        "Dưới đây là phần dịch nghĩa các từ.",
        "| English  | Vietnamese     |",
        "|----------|----------------|"
    ]
    for option in options:
        translated = await translator.translate(option['text'], src='en', dest='vi')
        translated_table.append(f"| {option['text']} | {translated.text} |")

    return "\n".join(translated_table)