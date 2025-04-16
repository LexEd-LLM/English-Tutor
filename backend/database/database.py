import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from urllib.parse import urlparse

# Load environment variables
load_dotenv()

# Get database URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

def get_db():
    """Get database connection"""
    try:
        # Parse database URL
        url = urlparse(DATABASE_URL)
        conn = psycopg2.connect(
            host=url.hostname,
            database=url.path[1:],  # Remove leading slash
            user=url.username,
            password=url.password,
            port=url.port or 5432,
            cursor_factory=RealDictCursor,
            sslmode='require'  # Required for Neon database
        )
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        raise e 