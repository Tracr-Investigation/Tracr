from geopy.geocoders import Nominatim


def geocode_address(address: str) -> dict | None:
    geolocator = Nominatim(user_agent="tracr-investigation/1.0")
    location = geolocator.geocode(address, exactly_one=True, timeout=10)
    if not location:
        return None
    return {
        "lat": location.latitude,
        "lng": location.longitude,
        "display_name": location.address,
    }
