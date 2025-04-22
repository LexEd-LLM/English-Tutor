from pathlib import Path
import uuid
import os
from pydub import AudioSegment
from fastapi import APIRouter
from fastapi import File, UploadFile
from fastapi.responses import JSONResponse

router = APIRouter(tags=["pronunciation"])

FRONTEND_PUBLIC_DIR = Path("../frontend/public").resolve()
UPLOAD_DIR = FRONTEND_PUBLIC_DIR / "users"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/upload-audio")
async def upload_audio(file: UploadFile = File(...)):
    try:
        file_extension = Path(file.filename).suffix

        # Tạo tên file ngẫu nhiên
        filename = f"{uuid.uuid4().hex}.wav"
        temp_path = UPLOAD_DIR / f"temp{file_extension}"
        output_path = UPLOAD_DIR / filename

        # Ghi tạm file upload để chuyển định dạng
        with open(temp_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # Chuyển đổi sang .wav nếu không phải wav
        if file_extension != ".wav":
            audio = AudioSegment.from_file(temp_path)
            audio.export(output_path, format="wav")
            os.remove(temp_path)
        else:
            os.rename(temp_path, output_path)

        # Trả lại URL mà frontend có thể truy cập được (ví dụ: /users/abc.wav)
        return JSONResponse(content={"url": f"/users/{filename}"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
