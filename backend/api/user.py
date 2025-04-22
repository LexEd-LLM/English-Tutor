from fastapi import APIRouter, HTTPException
from backend.schemas.user import UserProfile, Role
from backend.database import get_db

router = APIRouter(prefix="/api", tags=["user"])

@router.get("/user-progress/{user_id}")
async def get_user_progress(user_id: str):
    """Get user progress including hearts"""
    try:
        conn = get_db()
        try:
            with conn.cursor() as cur:
                # Check if user exists first
                cur.execute("""
                    SELECT id, hearts
                    FROM users
                    WHERE id = %s
                """, (user_id,))
                result = cur.fetchone()
                
                if not result:
                    print(f"User {user_id} not found")
                    return {"hearts": 5}  # Default hearts if user not found
                
                # Handle null hearts value
                hearts = result['hearts'] if result['hearts'] is not None else 5
                print(f"Found user {user_id} with {hearts} hearts")
                return {"hearts": hearts}
        finally:
            conn.close()
    except Exception as e:
        print(f"Error getting user progress: {str(e)}")
        # Return default hearts instead of error
        return {"hearts": 5}

@router.get("/user/{user_id}", response_model=UserProfile)
async def get_user_profile(user_id: str):
    """
    Get detailed user profile information
    """
    try:
        conn = get_db()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, name, image_src, role, hearts, 
                           subscription_status, subscription_start_date, subscription_end_date
                    FROM users
                    WHERE id = %s
                """, (user_id,))
                result = cur.fetchone()
                
                if not result:
                    raise HTTPException(status_code=404, detail="User not found")
                
                # Map database fields to UserProfile model
                user_profile = UserProfile(
                    id=result['id'],
                    name=result['name'],
                    imageSrc=result['image_src'],
                    role=result['role'],
                    hearts=result['hearts'] if result['hearts'] is not None else 5,
                    subscriptionStatus=result['subscription_status'],
                    subscriptionStartDate=result['subscription_start_date'],
                    subscriptionEndDate=result['subscription_end_date']
                )
                
                return user_profile
        finally:
            conn.close()
    except Exception as e:
        print(f"Error getting user profile: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 