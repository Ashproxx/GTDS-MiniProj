"""Local persistence: one JSON result per run, without duplicate state tables."""
import os
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import JSON, DateTime, Integer, String, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

default_path = Path(__file__).resolve().parents[1] / "simulations.db"
engine = create_engine(os.getenv("DATABASE_URL", f"sqlite:///{default_path.as_posix()}"))
Session = sessionmaker(engine)


class Base(DeclarativeBase):
    pass


class Simulation(Base):
    __tablename__ = "simulations"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    result: Mapped[dict] = mapped_column(JSON)
