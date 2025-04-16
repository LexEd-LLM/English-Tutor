from typing import List
from ..database.database import get_db

def get_unit_chunks(unit_id: int) -> List[str]:
    """Get text chunks from a specific unit"""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            # Get unit contents from database
            cur.execute("""
                SELECT content 
                FROM unit_contents 
                WHERE unit_id = %s 
                ORDER BY "order"
            """, (unit_id,))
            
            results = cur.fetchall()
            if not results:
                return []
                
            # Extract content from each unit content
            chunks = [row["content"] for row in results]
            return chunks
    finally:
        conn.close()

def get_units_by_ids(unit_ids: List[int]) -> List[dict]:
    """Get multiple units by their IDs"""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            placeholders = ','.join(['%s'] * len(unit_ids))
            cur.execute(f"""
                SELECT * FROM units 
                WHERE id IN ({placeholders})
            """, tuple(unit_ids))
            return cur.fetchall()
    finally:
        conn.close() 