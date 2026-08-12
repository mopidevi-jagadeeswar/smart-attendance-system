from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BehavioralProfileResponse(BaseModel):
    """
    Complete behavioral analytics response for a student or faculty member.
    """

    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID

    student_id: UUID | None = None
    faculty_id: UUID | None = None

    # Attendance statistics
    total_present: int = Field(
        ge=0,
    )

    total_absent: int = Field(
        ge=0,
    )

    total_late: int = Field(
        ge=0,
    )

    # Behavioral scores
    attendance_rate: float = Field(
        ge=0.0,
        le=100.0,
    )

    punctuality_score: float = Field(
        ge=0.0,
        le=100.0,
    )

    consistency_score: float = Field(
        ge=0.0,
        le=100.0,
    )

    risk_score: float = Field(
        ge=0.0,
        le=100.0,
    )

    # Analytics information
    last_calculated_at: datetime | None = None

    # Audit information
    created_at: datetime
    updated_at: datetime


class BehavioralProfileSummary(BaseModel):
    """
    Lightweight behavioral analytics response for dashboards.
    """

    model_config = ConfigDict(
        from_attributes=True,
    )

    student_id: UUID | None = None
    faculty_id: UUID | None = None

    total_present: int
    total_absent: int
    total_late: int

    attendance_rate: float
    punctuality_score: float
    consistency_score: float
    risk_score: float

    last_calculated_at: datetime | None = None
