from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class CustomerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Customer's full name")
    email: str = Field(
        ...,
        pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$",
        max_length=255,
        description="Unique customer email address",
    )
    phone: Optional[str] = Field(None, max_length=50, description="Contact phone number")
    company: Optional[str] = Field(None, max_length=255, description="Company or business name")
    city: Optional[str] = Field(None, max_length=100, description="City")
    state: Optional[str] = Field(None, max_length=100, description="State or region")
    country: Optional[str] = Field("USA", max_length=100, description="Country name")

    model_config = ConfigDict(str_strip_whitespace=True)


class CustomerCreate(CustomerBase):
    """Schema for creating a new customer."""
    pass


class CustomerUpdate(BaseModel):
    """Schema for updating an existing customer (all fields optional)."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[str] = Field(
        None,
        pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$",
        max_length=255,
    )
    phone: Optional[str] = Field(None, max_length=50)
    company: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)


class CustomerResponse(CustomerBase):
    """Schema for customer representation in API responses."""
    id: int
    total_spent: float = 0.0
    order_count: int = 0
    last_order_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CustomerListResponse(BaseModel):
    """Schema for paginated customer list response."""
    items: List[CustomerResponse]
    total: int
    page: int
    limit: int
    total_pages: int


class SegmentBase(BaseModel):
    """Base schema for customer segments."""
    name: str = Field(..., min_length=1, max_length=255, description="Segment name")
    description: Optional[str] = Field(None, max_length=1000, description="Segment description")
    filters: dict = Field(default_factory=dict, description="Filter criteria dictionary")

    model_config = ConfigDict(str_strip_whitespace=True)


class SegmentCreate(SegmentBase):
    """Schema for creating a segment."""
    pass


class SegmentUpdate(BaseModel):
    """Schema for updating a segment."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    filters: Optional[dict] = None

    model_config = ConfigDict(str_strip_whitespace=True)


class SegmentResponse(SegmentBase):
    """Schema for segment API response."""
    id: int
    customer_count: Optional[int] = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SegmentPreviewRequest(BaseModel):
    """Schema for previewing matching customer count of arbitrary filters."""
    filters: dict = Field(default_factory=dict)


class SegmentPreviewResponse(BaseModel):
    """Schema for segment preview response."""
    matching_customer_count: int
    segment_id: Optional[int] = None


class CampaignBase(BaseModel):
    """Base schema for CRM marketing campaigns."""
    name: str = Field(..., min_length=1, max_length=255, description="Campaign name")
    segment_id: Optional[int] = Field(None, description="Target segment ID (null targets all customers)")
    channel: str = Field("email", pattern=r"^(email|sms|whatsapp)$", description="Delivery channel")
    message: str = Field(..., min_length=1, max_length=5000, description="Campaign message content")

    model_config = ConfigDict(str_strip_whitespace=True)


class CampaignCreate(CampaignBase):
    """Schema for creating a new campaign."""
    pass


class CampaignResponse(CampaignBase):
    """Schema for campaign representation in responses."""
    id: int
    segment_name: Optional[str] = None
    status: str = "queued"
    total_recipients: int = 0
    delivered_count: int = 0
    failed_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CommunicationLog(BaseModel):
    """Schema for individual customer communication logs."""
    id: int
    customer_id: int
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    channel: str
    status: str
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    error_message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CampaignStatsResponse(BaseModel):
    """Schema for campaign delivery statistics and results chart."""
    campaign_id: int
    name: str
    channel: str
    status: str
    total_recipients: int
    delivered_count: int
    failed_count: int
    queued_count: int
    delivery_rate: float
    recent_logs: List[CommunicationLog] = []
