import psycopg2
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
    """Get VOCABULARY from 20 previous units and TEXT_CONTENT from the current unit."""
    conn = get_db()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            # 1. Lấy TEXT_CONTENT của unit hiện tại
            cur.execute("""
                SELECT content 
                FROM unit_contents 
                WHERE unit_id = %s AND type = 'TEXT_CONTENT'
                ORDER BY "order"
            """, (unit_id,))
            text_chunks = [row["content"] for row in cur.fetchall()]
            
            # 2. Lấy VOCAB của tối đa 20 unit trước đó
            cur.execute("""
                SELECT id FROM units
                WHERE id < %s
                ORDER BY id DESC
                LIMIT 20
            """, (unit_id,))
            prev_unit_ids = [row["id"] for row in cur.fetchall()]

            vocab_chunks = []
            if prev_unit_ids:
                cur.execute("""
                    SELECT content 
                    FROM unit_contents
                    WHERE unit_id = ANY(%s) AND type = 'VOCABULARY'
                    ORDER BY unit_id ASC, "order"
                """, (prev_unit_ids,))
                vocab_chunks = [row["content"] for row in cur.fetchall()]

            return vocab_chunks, text_chunks
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