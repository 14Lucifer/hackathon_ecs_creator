from pydantic import BaseModel


class LoginRequest(BaseModel):
    # Plain string: the seeded admin uses the reserved domain admin@system.local,
    # which strict EmailStr validation would reject.
    email: str
    password: str


class SessionUser(BaseModel):
    id: int
    email: str
    name: str
    role: str

    class Config:
        from_attributes = True
