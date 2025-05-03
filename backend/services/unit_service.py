import json
import psycopg2
from typing import List
from ..database.database import get_db
       
def get_unit_main_chunks(unit_id: int) -> List[str]:
    """Get VOCABULARY and BOOKMAP chunks for a unit"""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT type, content 
                FROM unit_contents 
                WHERE unit_id = %s AND type IN ('VOCABULARY', 'BOOKMAP')
                ORDER BY "order"
            """, (unit_id,))
            results = cur.fetchall()

            vocab = None
            bookmap = None

            for row in results:
                row_type = row["type"]
                if row_type == "VOCABULARY" and vocab is None:
                    vocab = row["content"]
                elif row_type == "BOOKMAP" and bookmap is None:
                    bookmap = row["content"]
            unit_chunks = [bookmap, vocab]
            return unit_chunks, vocab
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
                
            # 3. Lấy GRAMMAR của tối đa 5 unit trước đó
            bookmap_chunks = []
            prev_unit_ids = prev_unit_ids[:5] if len(prev_unit_ids) > 5 else prev_unit_ids
            if prev_unit_ids:
                cur.execute("""
                    SELECT unit_id, content
                    FROM unit_contents
                    WHERE unit_id = ANY(%s) AND type = 'BOOKMAP'
                    ORDER BY unit_id DESC, "order"
                """, (prev_unit_ids,))
                bookmap_chunks = [
                    json.loads(row["content"]).get("Grammar", "")
                    for row in cur.fetchall()
                ]

            return vocab_chunks, text_chunks, bookmap_chunks
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