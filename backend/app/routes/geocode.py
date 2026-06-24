from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from utils.security import verify_token
from services.geocoding_service import geocode_address

router = APIRouter()


class GeocodeRequest(BaseModel):
    address: str


@router.post("/geocode")
async def geocode(body: GeocodeRequest, _: dict = Depends(verify_token)):
    """Goal: geocode a postal address into coordinates. Input: body (address), auth token. Output: geocoding result (400 if empty, 404 if not found)."""
    if not body.address.strip():
        raise HTTPException(status_code=400, detail="Address is required")
    result = geocode_address(body.address.strip())
    if not result:
        raise HTTPException(status_code=404, detail="Address not found")
    return result
