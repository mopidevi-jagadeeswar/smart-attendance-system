from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    Base class for all SQLAlchemy database models.

    Every model in the models/ directory will inherit from this class.
    SQLAlchemy uses this base to keep track of our database table definitions.
    """
