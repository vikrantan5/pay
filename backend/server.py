from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from pathlib import Path
import os
import logging
import uuid
import bcrypt
import jwt
import razorpay
import httpx
import json
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = os.environ['JWT_ALGORITHM']
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ['ACCESS_TOKEN_EXPIRE_MINUTES'])
REFRESH_TOKEN_EXPIRE_DAYS = int(os.environ['REFRESH_TOKEN_EXPIRE_DAYS'])

# Razorpay Client
razorpay_client = razorpay.Client(auth=(os.environ['RAZORPAY_KEY_ID'], os.environ['RAZORPAY_KEY_SECRET']))

# Supabase Config
SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_ANON_KEY']
SUPABASE_BUCKET = os.environ['SUPABASE_BUCKET_NAME']

app = FastAPI(title="CodeMart API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Models
class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    role: str = "user"
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: User

class ProductBase(BaseModel):
    title: str
    tagline: str
    description: str
    price: float
    category: str
    tags: List[str]
    tech_stack: List[str]
    demo_url: Optional[str] = None
    license_type: str
    thumbnail: Optional[str] = None
    gallery: List[str] = []
    is_published: bool = True

class Product(ProductBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    file_path: Optional[str] = None
    downloads: int = 0
    rating: float = 0.0
    reviews_count: int = 0
    created_at: datetime

class ProductCreate(ProductBase):
    pass

class OrderBase(BaseModel):
    product_id: str
    user_id: str
    amount: float
    coupon_code: Optional[str] = None

class Order(OrderBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    razorpay_order_id: str
    razorpay_payment_id: Optional[str] = None
    status: str = "pending"
    license_key: Optional[str] = None
    created_at: datetime
    paid_at: Optional[datetime] = None

class PaymentVerification(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class CouponBase(BaseModel):
    code: str
    discount_type: str  # "flat" or "percent"
    discount_value: float
    min_purchase: float = 0
    max_uses: Optional[int] = None
    expires_at: Optional[datetime] = None

class Coupon(CouponBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    uses: int = 0
    is_active: bool = True
    created_at: datetime

class ReviewBase(BaseModel):
    product_id: str
    rating: int
    comment: str

class Review(ReviewBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    user_name: str
    is_approved: bool = False
    created_at: datetime

# Auth Utilities
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(data: dict, expires_delta: timedelta) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

async def get_admin_user(user: dict = Depends(get_current_user)) -> dict:
    if user["role"] != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user

# Auth Routes
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    
    user_dict = {
        "id": str(uuid.uuid4()),
        "email": user_data.email,
        "name": user_data.name,
        "password": hash_password(user_data.password),
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_dict)
    
    access_token = create_token({"sub": user_dict["id"]}, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    refresh_token = create_token({"sub": user_dict["id"]}, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    
    user_response = User(
        id=user_dict["id"],
        email=user_dict["email"],
        name=user_dict["name"],
        role=user_dict["role"],
        created_at=datetime.fromisoformat(user_dict["created_at"])
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_response
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    access_token = create_token({"sub": user["id"]}, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    refresh_token = create_token({"sub": user["id"]}, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    
    user_response = User(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        created_at=datetime.fromisoformat(user["created_at"])
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_response
    )

@api_router.get("/auth/me", response_model=User)
async def get_me(user: dict = Depends(get_current_user)):
    return User(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        created_at=datetime.fromisoformat(user["created_at"])
    )

# Public Product Routes
@api_router.get("/products", response_model=List[Product])
async def get_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    tags: Optional[str] = None,
    sort: str = "newest"
):
    query = {"is_published": True}
    
    if category:
        query["category"] = category
    if min_price is not None:
        query["price"] = query.get("price", {})
        query["price"]["$gte"] = min_price
    if max_price is not None:
        query["price"] = query.get("price", {})
        query["price"]["$lte"] = max_price
    if tags:
        tag_list = tags.split(",")
        query["tags"] = {"$in": tag_list}
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    sort_options = {
        "newest": [("created_at", -1)],
        "price_low": [("price", 1)],
        "price_high": [("price", -1)],
        "popular": [("downloads", -1)],
        "rating": [("rating", -1)]
    }
    
    products = await db.products.find(query, {"_id": 0}).sort(sort_options.get(sort, [("created_at", -1)])).to_list(100)
    
    for product in products:
        product["created_at"] = datetime.fromisoformat(product["created_at"])
    
    return products

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id, "is_published": True}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    
    product["created_at"] = datetime.fromisoformat(product["created_at"])
    return product

# Admin Product Routes
@api_router.post("/admin/products", response_model=Product)
async def create_product(product_data: ProductCreate, admin: dict = Depends(get_admin_user)):
    product_dict = product_data.model_dump()
    product_dict.update({
        "id": str(uuid.uuid4()),
        "downloads": 0,
        "rating": 0.0,
        "reviews_count": 0,
        "file_path": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    await db.products.insert_one(product_dict)
    product_dict["created_at"] = datetime.fromisoformat(product_dict["created_at"])
    
    return Product(**product_dict)

@api_router.put("/admin/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product_data: ProductCreate, admin: dict = Depends(get_admin_user)):
    result = await db.products.update_one(
        {"id": product_id},
        {"$set": product_data.model_dump()}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    product["created_at"] = datetime.fromisoformat(product["created_at"])
    return Product(**product)

@api_router.delete("/admin/products/{product_id}")
async def delete_product(product_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return {"message": "Product deleted successfully"}

@api_router.post("/admin/products/{product_id}/upload")
async def upload_product_file(product_id: str, file: UploadFile = File(...), admin: dict = Depends(get_admin_user)):
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only ZIP files allowed")
    
    file_content = await file.read()
    file_path = f"products/{product_id}/{file.filename}"
    
    async with httpx.AsyncClient() as client:
        upload_response = await client.post(
            f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_BUCKET}/{file_path}",
            headers={
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/zip"
            },
            content=file_content,
            timeout=30.0
        )
        
        if upload_response.status_code not in [200, 201]:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="File upload failed")
    
    await db.products.update_one(
        {"id": product_id},
        {"$set": {"file_path": file_path}}
    )
    
    return {"message": "File uploaded successfully", "file_path": file_path}

# Order Routes
@api_router.post("/orders/create")
async def create_order(product_id: str, coupon_code: Optional[str] = None, user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": product_id, "is_published": True}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    
    amount = product["price"]
    
    if coupon_code:
        coupon = await db.coupons.find_one({"code": coupon_code, "is_active": True}, {"_id": 0})
        if coupon:
            if coupon.get("expires_at") and datetime.fromisoformat(coupon["expires_at"]) < datetime.now(timezone.utc):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Coupon expired")
            if amount < coupon.get("min_purchase", 0):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Minimum purchase not met")
            
            if coupon["discount_type"] == "flat":
                amount -= coupon["discount_value"]
            else:
                amount -= (amount * coupon["discount_value"] / 100)
            
            amount = max(0, amount)
    
    if amount == 0:
        order_dict = {
            "id": str(uuid.uuid4()),
            "product_id": product_id,
            "user_id": user["id"],
            "amount": 0,
            "coupon_code": coupon_code,
            "razorpay_order_id": "FREE",
            "razorpay_payment_id": "FREE",
            "status": "completed",
            "license_key": str(uuid.uuid4()),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "paid_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.orders.insert_one(order_dict)
        await db.products.update_one({"id": product_id}, {"$inc": {"downloads": 1}})
        
        return {"order_id": order_dict["id"], "is_free": True}
    
    razorpay_order = razorpay_client.order.create({
        "amount": int(amount * 100),
        "currency": "INR",
        "payment_capture": 1
    })
    
    order_dict = {
        "id": str(uuid.uuid4()),
        "product_id": product_id,
        "user_id": user["id"],
        "amount": amount,
        "coupon_code": coupon_code,
        "razorpay_order_id": razorpay_order["id"],
        "razorpay_payment_id": None,
        "status": "pending",
        "license_key": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "paid_at": None
    }
    
    await db.orders.insert_one(order_dict)
    
    return {
        "order_id": order_dict["id"],
        "razorpay_order_id": razorpay_order["id"],
        "amount": amount,
        "razorpay_key": os.environ['RAZORPAY_KEY_ID']
    }

@api_router.post("/orders/verify")
async def verify_payment(verification: PaymentVerification, user: dict = Depends(get_current_user)):
    try:
        razorpay_client.utility.verify_payment_signature(verification.model_dump())
        
        order = await db.orders.find_one({"razorpay_order_id": verification.razorpay_order_id}, {"_id": 0})
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        
        license_key = str(uuid.uuid4())
        
        await db.orders.update_one(
            {"id": order["id"]},
            {"$set": {
                "razorpay_payment_id": verification.razorpay_payment_id,
                "status": "completed",
                "license_key": license_key,
                "paid_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        await db.products.update_one({"id": order["product_id"]}, {"$inc": {"downloads": 1}})
        
        return {"message": "Payment verified", "license_key": license_key}
        
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature")

@api_router.get("/orders/my-orders", response_model=List[Order])
async def get_my_orders(user: dict = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    for order in orders:
        order["created_at"] = datetime.fromisoformat(order["created_at"])
        if order.get("paid_at"):
            order["paid_at"] = datetime.fromisoformat(order["paid_at"])
    
    return orders

@api_router.get("/orders/{order_id}/download")
async def get_download_url(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id, "user_id": user["id"], "status": "completed"}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found or not completed")
    
    product = await db.products.find_one({"id": order["product_id"]}, {"_id": 0})
    if not product or not product.get("file_path"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product file not found")
    
    async with httpx.AsyncClient() as client:
        sign_response = await client.post(
            f"{SUPABASE_URL}/storage/v1/object/sign/{SUPABASE_BUCKET}/{product['file_path']}",
            headers={"Authorization": f"Bearer {SUPABASE_KEY}"},
            json={"expiresIn": 3600},
            timeout=10.0
        )
        
        if sign_response.status_code != 200:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate download URL")
        
        signed_url = sign_response.json().get("signedURL")
    
    return {"download_url": f"{SUPABASE_URL}{signed_url}", "expires_in": 3600}

# Admin Analytics
@api_router.get("/admin/analytics")
async def get_analytics(admin: dict = Depends(get_admin_user)):
    total_orders = await db.orders.count_documents({"status": "completed"})
    
    orders = await db.orders.find({"status": "completed"}, {"_id": 0}).to_list(10000)
    total_revenue = sum(order["amount"] for order in orders)
    
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    top_products = sorted(products, key=lambda x: x.get("downloads", 0), reverse=True)[:5]
    
    return {
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "total_products": len(products),
        "top_products": top_products
    }

@api_router.get("/admin/orders", response_model=List[Order])
async def get_all_orders(admin: dict = Depends(get_admin_user)):
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for order in orders:
        order["created_at"] = datetime.fromisoformat(order["created_at"])
        if order.get("paid_at"):
            order["paid_at"] = datetime.fromisoformat(order["paid_at"])
    
    return orders

# Coupon Routes
@api_router.post("/admin/coupons", response_model=Coupon)
async def create_coupon(coupon_data: CouponBase, admin: dict = Depends(get_admin_user)):
    existing = await db.coupons.find_one({"code": coupon_data.code})
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Coupon code already exists")
    
    coupon_dict = coupon_data.model_dump()
    coupon_dict.update({
        "id": str(uuid.uuid4()),
        "uses": 0,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    if coupon_dict.get("expires_at"):
        coupon_dict["expires_at"] = coupon_dict["expires_at"].isoformat()
    
    await db.coupons.insert_one(coupon_dict)
    coupon_dict["created_at"] = datetime.fromisoformat(coupon_dict["created_at"])
    if coupon_dict.get("expires_at"):
        coupon_dict["expires_at"] = datetime.fromisoformat(coupon_dict["expires_at"])
    
    return Coupon(**coupon_dict)

@api_router.get("/admin/coupons", response_model=List[Coupon])
async def get_coupons(admin: dict = Depends(get_admin_user)):
    coupons = await db.coupons.find({}, {"_id": 0}).to_list(1000)
    
    for coupon in coupons:
        coupon["created_at"] = datetime.fromisoformat(coupon["created_at"])
        if coupon.get("expires_at"):
            coupon["expires_at"] = datetime.fromisoformat(coupon["expires_at"])
    
    return coupons

# Review Routes
@api_router.post("/reviews", response_model=Review)
async def create_review(review_data: ReviewBase, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"user_id": user["id"], "product_id": review_data.product_id, "status": "completed"})
    if not order:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You must purchase this product to review")
    
    review_dict = review_data.model_dump()
    review_dict.update({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_name": user["name"],
        "is_approved": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    await db.reviews.insert_one(review_dict)
    review_dict["created_at"] = datetime.fromisoformat(review_dict["created_at"])
    
    return Review(**review_dict)

@api_router.get("/reviews/{product_id}", response_model=List[Review])
async def get_product_reviews(product_id: str):
    reviews = await db.reviews.find({"product_id": product_id, "is_approved": True}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    for review in reviews:
        review["created_at"] = datetime.fromisoformat(review["created_at"])
    
    return reviews

@api_router.put("/admin/reviews/{review_id}/approve")
async def approve_review(review_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.reviews.update_one({"id": review_id}, {"$set": {"is_approved": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    
    review = await db.reviews.find_one({"id": review_id}, {"_id": 0})
    
    reviews = await db.reviews.find({"product_id": review["product_id"], "is_approved": True}, {"_id": 0}).to_list(1000)
    if reviews:
        avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
        await db.products.update_one(
            {"id": review["product_id"]},
            {"$set": {"rating": avg_rating, "reviews_count": len(reviews)}}
        )
    
    return {"message": "Review approved"}

@api_router.get("/admin/reviews", response_model=List[Review])
async def get_all_reviews(admin: dict = Depends(get_admin_user)):
    reviews = await db.reviews.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for review in reviews:
        review["created_at"] = datetime.fromisoformat(review["created_at"])
    
    return reviews

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_db():
    admin_exists = await db.users.find_one({"email": "admin@codemart.com"})
    if not admin_exists:
        admin_dict = {
            "id": str(uuid.uuid4()),
            "email": "admin@codemart.com",
            "name": "Admin",
            "password": hash_password("admin123"),
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_dict)
        logger.info("Default admin user created")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()