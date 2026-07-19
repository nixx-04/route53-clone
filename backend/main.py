import os
import time
import json
import random
import hashlib
import jwt
from fastapi import FastAPI, Request, Response, HTTPException, Depends, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any

app = FastAPI(title="Route53 Mock Server", version="1.0.0")

# Enable CORS (not strictly necessary since Next.js proxies, but good to have)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

JWT_SECRET = "route53_secure_mock_jwt_secret_token_12345"
DB_PATH = os.path.join(os.getcwd(), "route53_db.json")

def load_db() -> Dict[str, Any]:
    if os.path.exists(DB_PATH):
        with open(DB_PATH, "r", encoding="utf-8") as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                pass
    
    # Default fallback
    db_data = {
        "users": [],
        "hosted_zones": [],
        "dns_records": [],
        "nextUserId": 1,
        "nextZoneId": 1,
        "nextRecordId": 1
    }
    save_db(db_data)
    return db_data

def save_db(db_data: Dict[str, Any]):
    with open(DB_PATH, "w", encoding="utf-8") as f:
        json.dump(db_data, f, indent=2, ensure_ascii=False)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def sign_token(payload: dict) -> str:
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def verify_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"], options={"verify_exp": False})
        # Manual expiration check in milliseconds
        if "exp" in payload and (time.time() * 1000) > payload["exp"]:
            return None
        return payload
    except Exception:
        return None

def get_auth_user(request: Request) -> Optional[dict]:
    # Try cookies first
    token = request.cookies.get("auth_token")
    
    # Try Authorization header
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]
            
    if not token:
        return None
        
    return verify_token(token)

async def authenticate(request: Request) -> dict:
    user = get_auth_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized. Please login.")
    return user


# --- Request Models ---
class LoginRequest(BaseModel):
    email: str
    password: str

class HostedZoneCreate(BaseModel):
    name: str
    comment: Optional[str] = ""
    type: Optional[str] = "Public"

class HostedZoneUpdate(BaseModel):
    comment: str

class RecordCreateUpdate(BaseModel):
    name: str
    type: str
    ttl: int
    value: str
    priority: Optional[int] = None
    weight: Optional[int] = None
    port: Optional[int] = None
    flags: Optional[int] = None
    tag: Optional[str] = None


# --- Auth Endpoints ---

@app.post("/api/login")
async def login(req: LoginRequest, response: Response):
    db_data = load_db()
    email = req.email.strip()
    password = req.password
    
    user = None
    for u in db_data.get("users", []):
        if u["email"].lower() == email.lower():
            user = u
            break
            
    if not user or user["password"] != hash_password(password):
        raise HTTPException(status_code=400, detail="Invalid email or password")
        
    token_payload = {
        "id": user["id"],
        "email": user["email"],
        "exp": int(time.time() * 1000) + 86400000 # 24 hours
    }
    token = sign_token(token_payload)
    
    # Set HttpOnly cookie
    response.set_cookie(
        key="auth_token",
        value=token,
        httponly=True,
        path="/",
        samesite="strict",
        max_age=86400
    )
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "created_at": user.get("created_at")
        }
    }

@app.post("/api/logout")
async def logout(response: Response):
    response.delete_cookie(key="auth_token", path="/", samesite="strict")
    return {"success": True}

@app.get("/api/me")
async def me(user: dict = Depends(authenticate)):
    return {
        "id": user["id"],
        "email": user["email"]
    }


# --- Hosted Zones CRUD ---

@app.get("/api/hosted-zones")
async def list_hosted_zones(
    page: int = 1,
    limit: int = 20,
    search: str = "",
    sortBy: str = "name",
    sortOrder: str = "ASC",
    user: dict = Depends(authenticate)
):
    db_data = load_db()
    zones = db_data.get("hosted_zones", [])
    records = db_data.get("dns_records", [])
    
    # Attach record_count
    zones_with_count = []
    for z in zones:
        cnt = sum(1 for r in records if r["hosted_zone_id"] == z["id"])
        zones_with_count.append({**z, "record_count": cnt})
        
    # Search filter
    search_query = search.strip().lower()
    if search_query:
        zones_with_count = [
            z for z in zones_with_count 
            if search_query in z["name"].lower() or search_query in z["comment"].lower()
        ]
        
    # Sorting
    reverse = sortOrder.upper() == "DESC"
    if sortBy in ["name", "type", "created_at", "record_count"]:
        zones_with_count.sort(key=lambda x: (x.get(sortBy) or "").lower() if isinstance(x.get(sortBy), str) else (x.get(sortBy) or 0), reverse=reverse)
    else:
        zones_with_count.sort(key=lambda x: x["name"].lower(), reverse=reverse)
        
    # Pagination
    total = len(zones_with_count)
    offset = (page - 1) * limit
    paginated_zones = zones_with_count[offset : offset + limit]
    
    return {
        "data": paginated_zones,
        "pagination": {
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": (total + limit - 1) // limit if total > 0 else 0
        }
    }

@app.get("/api/hosted-zones/{id}")
async def get_hosted_zone(id: int, user: dict = Depends(authenticate)):
    db_data = load_db()
    zone = next((z for z in db_data.get("hosted_zones", []) if z["id"] == id), None)
    if not zone:
        raise HTTPException(status_code=404, detail="Hosted Zone not found")
        
    cnt = sum(1 for r in db_data.get("dns_records", []) if r["hosted_zone_id"] == id)
    return {**zone, "record_count": cnt}

@app.post("/api/hosted-zones", status_code=210) # 201 Created is matched by standard React
async def create_hosted_zone(req: HostedZoneCreate, response: Response, user: dict = Depends(authenticate)):
    if not req.name:
        raise HTTPException(status_code=400, detail="Domain name is required")
        
    db_data = load_db()
    normalized_name = req.name.strip().lower()
    
    # Generate new ID
    new_id = db_data.get("nextZoneId", 1)
    db_data["nextZoneId"] = new_id + 1
    
    created_at_str = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
    
    new_zone = {
        "id": new_id,
        "name": normalized_name,
        "comment": req.comment or "",
        "type": "Private" if req.type == "Private" else "Public",
        "created_at": created_at_str,
        "updated_at": created_at_str
    }
    
    db_data["hosted_zones"].append(new_zone)
    
    # AWS Route53 auto-creates NS and SOA records
    ns_servers = [
        f"ns-100.awsdns-{random.randint(10, 99)}.co.uk.",
        f"ns-200.awsdns-{random.randint(10, 99)}.net.",
        f"ns-300.awsdns-{random.randint(10, 99)}.org.",
        f"ns-400.awsdns-{random.randint(10, 99)}.com."
    ]
    ns_value = "\n".join(ns_servers)
    
    # Create NS record
    ns_rec_id = db_data.get("nextRecordId", 1)
    db_data["nextRecordId"] = ns_rec_id + 1
    db_data["dns_records"].append({
        "id": ns_rec_id,
        "hosted_zone_id": new_id,
        "name": normalized_name,
        "type": "NS",
        "ttl": 172800,
        "value": ns_value,
        "priority": None, "weight": None, "port": None, "flags": None, "tag": None,
        "created_at": created_at_str,
        "updated_at": created_at_str
    })
    
    # Create SOA record
    soa_rec_id = db_data.get("nextRecordId", 1)
    db_data["nextRecordId"] = soa_rec_id + 1
    soa_value = f"{ns_servers[0]} awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400"
    db_data["dns_records"].append({
        "id": soa_rec_id,
        "hosted_zone_id": new_id,
        "name": normalized_name,
        "type": "SOA",
        "ttl": 900,
        "value": soa_value,
        "priority": None, "weight": None, "port": None, "flags": None, "tag": None,
        "created_at": created_at_str,
        "updated_at": created_at_str
    })
    
    save_db(db_data)
    response.status_code = 201
    return new_zone

@app.put("/api/hosted-zones/{id}")
async def update_hosted_zone(id: int, req: HostedZoneUpdate, user: dict = Depends(authenticate)):
    db_data = load_db()
    zone = next((z for z in db_data.get("hosted_zones", []) if z["id"] == id), None)
    if not zone:
        raise HTTPException(status_code=404, detail="Hosted zone not found")
        
    zone["comment"] = req.comment
    zone["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
    
    save_db(db_data)
    return zone

@app.delete("/api/hosted-zones/{id}")
async def delete_hosted_zone(id: int, user: dict = Depends(authenticate)):
    db_data = load_db()
    zone = next((z for z in db_data.get("hosted_zones", []) if z["id"] == id), None)
    if not zone:
        raise HTTPException(status_code=404, detail="Hosted zone not found")
        
    db_data["hosted_zones"] = [z for z in db_data["hosted_zones"] if z["id"] != id]
    db_data["dns_records"] = [r for r in db_data["dns_records"] if r["hosted_zone_id"] != id]
    
    save_db(db_data)
    return {"success": True, "message": "Hosted zone and its records deleted successfully"}


# --- DNS Records CRUD ---

@app.get("/api/hosted-zones/{id}/records")
async def list_dns_records(
    id: int,
    page: int = 1,
    limit: int = 100,
    search: str = "",
    type: str = "",
    user: dict = Depends(authenticate)
):
    db_data = load_db()
    zone = next((z for z in db_data.get("hosted_zones", []) if z["id"] == id), None)
    if not zone:
        raise HTTPException(status_code=404, detail="Hosted zone not found")
        
    records = [r for r in db_data.get("dns_records", []) if r["hosted_zone_id"] == id]
    
    # Search filter
    search_query = search.strip().lower()
    if search_query:
        records = [
            r for r in records 
            if search_query in r["name"].lower() or search_query in r["value"].lower()
        ]
        
    # Type filter
    if type:
        records = [r for r in records if r["type"] == type]
        
    # Default sorting: Type ASC, Name ASC
    records.sort(key=lambda x: (x["type"].lower(), x["name"].lower()))
    
    # Pagination
    total = len(records)
    offset = (page - 1) * limit
    paginated_records = records[offset : offset + limit]
    
    return {
        "data": paginated_records,
        "pagination": {
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": (total + limit - 1) // limit if total > 0 else 0
        }
    }

@app.post("/api/hosted-zones/{id}/records", status_code=210)
async def create_dns_record(id: int, req: RecordCreateUpdate, response: Response, user: dict = Depends(authenticate)):
    db_data = load_db()
    zone = next((z for z in db_data.get("hosted_zones", []) if z["id"] == id), None)
    if not zone:
        raise HTTPException(status_code=404, detail="Hosted zone not found")
        
    created_at_str = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
    
    new_rec_id = db_data.get("nextRecordId", 1)
    db_data["nextRecordId"] = new_rec_id + 1
    
    new_record = {
        "id": new_rec_id,
        "hosted_zone_id": id,
        "name": req.name.strip().lower(),
        "type": req.type,
        "ttl": req.ttl,
        "value": req.value.strip(),
        "priority": req.priority,
        "weight": req.weight,
        "port": req.port,
        "flags": req.flags,
        "tag": req.tag,
        "created_at": created_at_str,
        "updated_at": created_at_str
    }
    
    db_data["dns_records"].append(new_record)
    save_db(db_data)
    
    response.status_code = 201
    return new_record

@app.put("/api/records/{id}")
async def update_dns_record(id: int, req: RecordCreateUpdate, user: dict = Depends(authenticate)):
    db_data = load_db()
    record = next((r for r in db_data.get("dns_records", []) if r["id"] == id), None)
    if not record:
        raise HTTPException(status_code=404, detail="DNS Record not found")
        
    record["name"] = req.name.strip().lower()
    record["type"] = req.type
    record["ttl"] = req.ttl
    record["value"] = req.value.strip()
    record["priority"] = req.priority
    record["weight"] = req.weight
    record["port"] = req.port
    record["flags"] = req.flags
    record["tag"] = req.tag
    record["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
    
    save_db(db_data)
    return record

@app.delete("/api/records/{id}")
async def delete_dns_record(id: int, user: dict = Depends(authenticate)):
    db_data = load_db()
    record = next((r for r in db_data.get("dns_records", []) if r["id"] == id), None)
    if not record:
        raise HTTPException(status_code=404, detail="DNS Record not found")
        
    db_data["dns_records"] = [r for r in db_data["dns_records"] if r["id"] != id]
    save_db(db_data)
    return {"success": True}


# --- Global Search ---

@app.get("/api/global-search")
async def global_search(q: str = "", user: dict = Depends(authenticate)):
    query = q.strip().lower()
    if not query:
        return {"zones": [], "records": []}
        
    db_data = load_db()
    
    # Match Zones
    matched_zones = [
        z for z in db_data.get("hosted_zones", [])
        if query in z["name"].lower() or query in z["comment"].lower()
    ][:10]
    
    # Match Records
    matched_records_raw = [
        r for r in db_data.get("dns_records", [])
        if query in r["name"].lower() or query in r["value"].lower()
    ][:15]
    
    # Attach zone name to records
    matched_records = []
    for r in matched_records_raw:
        zone = next((z for z in db_data.get("hosted_zones", []) if z["id"] == r["hosted_zone_id"]), None)
        zone_name = zone["name"] if zone else "Unknown"
        matched_records.append({**r, "zone_name": zone_name})
        
    return {
        "zones": matched_zones,
        "records": matched_records
    }
