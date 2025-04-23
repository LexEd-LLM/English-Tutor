from typing import List
from ..database.database import get_db
       
def get_unit_main_chunks(unit_id: int) -> List[str]:
    """Get VOCABULARY and BOOKMAP chunks for a unit"""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT content 
                FROM unit_contents 
                WHERE unit_id = %s AND type IN ('VOCABULARY', 'BOOKMAP')
                ORDER BY "order"
            """, (unit_id,))
            results = cur.fetchall()
            return [row["content"] for row in results] if results else []
    finally:
        conn.close()


def get_unit_subordinate_chunks(unit_id: int) -> List[str]:
    """Get TEXT_CONTENT chunks for a unit"""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT content 
                FROM unit_contents 
                WHERE unit_id = %s AND type = 'TEXT_CONTENT'
                ORDER BY "order"
            """, (unit_id,))
            results = cur.fetchall()
            return [row["content"] for row in results] if results else []
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