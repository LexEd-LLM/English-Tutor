from enum import Enum
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class Role(str, Enum):
    USER = "USER"
    VIP = "VIP"
    ADMIN = "ADMIN"

class UserProfile(BaseModel):
    id: str
    name: str
    imageSrc: str
    role: Role
    hearts: int
    subscriptionStatus: Role
    subscriptionStartDate: Optional[datetime] = None
    subscriptionEndDate: Optional[datetime] = None 