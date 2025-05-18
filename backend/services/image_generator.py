import mimetypes
import uuid
from pathlib import Path
from google import genai
from google.genai import types
from ..config.settings import img_model
from ..integrators.api_key_manager import APIKeyManager

def save_binary_file(file_name: str, data: bytes) -> None:
    """Save binary data to a file"""
    with open(file_name, "wb") as f:
        f.write(data)

def generate_image(prompt: str) -> str:
    """
    Generate image using Google's Gemini model
    
    Args:
        prompt (str): Description of the image to generate
        
    Returns:
        str: Path to the generated image
    """
    try:
        # Create images directory if it doesn't exist
        img_dir = Path("media/images")
        img_dir.mkdir(parents=True, exist_ok=True)
        
        key_manager = APIKeyManager(purpose="image")
        key_iterator = key_manager.key_cycle()

        # Prepare content for generation
        contents = [
            types.Content(
                role="user",
                parts=[
                    types.Part.from_text(text=prompt),
                ],
            ),
        ]
        
        # Configure generation parameters
        generate_content_config = types.GenerateContentConfig(
            response_modalities=["image", "text"],
            response_mime_type="text/plain",
        )
        
        # Generate image
        while True:
            api_key = next(key_iterator)
            if not api_key:
                print("[Error] All API keys are on cooldown.")
                return ""

            try:
                client = genai.Client(api_key=api_key)
                for chunk in client.models.generate_content_stream(
                    model=img_model,
                    contents=contents,
                    config=generate_content_config,
                ):
                    if not chunk.candidates or not chunk.candidates[0].content or not chunk.candidates[0].content.parts:
                        continue

                    if chunk.candidates[0].content.parts[0].inline_data:
                        filename = f"{uuid.uuid4()}"
                        inline_data = chunk.candidates[0].content.parts[0].inline_data
                        file_extension = mimetypes.guess_extension(inline_data.mime_type)
                        filepath = img_dir / f"{filename}{file_extension}"
                        save_binary_file(str(filepath), inline_data.data)
                        return f"/media/images/{filename}{file_extension}"

            except Exception as e:
                if "RESOURCE_EXHAUSTED" in str(e) or "api" in str(e).lower():
                    print(f"[Quota] API key {api_key[:8]} exceeded. Trying next key...")
                    key_manager.mark_key_exhausted(api_key)
                    continue
                print(f"[Other Error] {e}")
                break

        return ""
        
    except Exception as e:
        print(f"Error generating image: {e}")
        return ""

if __name__ == "__main__":
    # Test the function
    prompt = """An illustration of a nurse, in the style of Duolingo learning illustration. 
    Flat design, bright colors, friendly and approachable."""
    image_path = generate_image(prompt)
    print(f"Generated image at: {image_path}")
