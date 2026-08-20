from fastapi import APIRouter, Depends
from deps import require_auth
from services.supabase_client import get_supabase

router = APIRouter(tags=["activity"])


@router.post("/activity-log")
def log_activity(data: dict, user=Depends(require_auth)):
    result = get_supabase().table("activity_logs").insert(data).execute()
    return result.data


@router.get("/activity-log/{quiz_id}")
def get_activity_logs(quiz_id: str, user=Depends(require_auth)):
    result = get_supabase().table("activity_logs") \
        .select("*, profiles(full_name)") \
        .eq("quiz_id", quiz_id) \
        .order("created_at", desc=True) \
        .execute()
    return result.data
