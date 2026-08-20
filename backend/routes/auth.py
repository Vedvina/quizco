from fastapi import APIRouter, Depends
from services.supabase_client import get_supabase
from deps import require_auth
from fastapi.security import HTTPAuthorizationCredentials

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/profile")
def create_or_get_profile(user=Depends(require_auth)):
    user_id = user.id
    result = get_supabase().table("profiles").select("*").eq("id", user_id).execute()

    if result.data:
        return result.data[0]

    return {"error": "Profile not found"}
