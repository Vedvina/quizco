from fastapi import APIRouter, Header
from typing import Optional
from services.supabase_client import get_supabase

router = APIRouter(prefix="/auth", tags=["auth"])


def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        return None
    token = authorization.replace("Bearer ", "")
    try:
        user = get_supabase().auth.get_user(token)
        return user
    except Exception:
        return None


@router.post("/profile")
def create_or_get_profile(authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    if not user:
        return {"error": "Unauthorized"}

    user_id = user.user.id
    result = get_supabase().table("profiles").select("*").eq("id", user_id).execute()

    if result.data:
        return result.data[0]

    return {"error": "Profile not found"}
