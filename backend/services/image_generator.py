import base64
import os
import mimetypes
import uuid
from pathlib import Path
from google import genai
from google.genai import types
from ..config.settings import img_model

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
        img_dir = Path("static/images")
        img_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize Gemini client
        client = genai.Client(
            api_key=os.environ.get("GEMINI_API_KEY"),
        )
        
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
        for chunk in client.models.generate_content_stream(
            model=img_model,
            contents=contents,
            config=generate_content_config,
        ):
            if not chunk.candidates or not chunk.candidates[0].content or not chunk.candidates[0].content.parts:
                continue
                
            if chunk.candidates[0].content.parts[0].inline_data:
                # Generate unique filename
                filename = f"{uuid.uuid4()}"
                inline_data = chunk.candidates[0].content.parts[0].inline_data
                file_extension = mimetypes.guess_extension(inline_data.mime_type)
                
                # Save file
                filepath = img_dir / f"{filename}{file_extension}"
                save_binary_file(str(filepath), inline_data.data)
                
                # Return relative path
                return f"/images/{filename}{file_extension}"
                
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
