import sys
import os
import secrets
import asyncio
from typing import Optional
from sqlalchemy import select
from app.database import engine, Base, AsyncSessionLocal
from app.models.admin import AdminUser
from app.models.member import Member
from app.models.consent import MarketingConsent
from app.models.loyalty import LoyaltyTransaction
from app.security.hashing import hash_password
from app.config import settings
import app.models


async def init_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def create_admin(
    username: str = "kaveri_owner",
    email: str = "owner@kaverielectronics.in",
    full_name: str = "Kaveri Electronic Store Owner",
    role: str = "owner",
    password: Optional[str] = None,
):
    await init_tables()
    
    # Generate secure 12-char alphanumeric password if not supplied
    is_generated = False
    if not password:
        password = secrets.token_urlsafe(9)
        is_generated = True

    async with AsyncSessionLocal() as db:
        stmt = select(AdminUser).where(AdminUser.username == username)
        res = await db.execute(stmt)
        existing = res.scalar_one_or_none()

        pw_hash = hash_password(password)

        if existing:
            existing.password_hash = pw_hash
            existing.must_change_password = True
            existing.is_active = True
            existing.role = role
            await db.commit()
            print(f"\n[OK] Administrator '{username}' credentials updated.")
        else:
            new_admin = AdminUser(
                username=username,
                email=email,
                full_name=full_name,
                password_hash=pw_hash,
                role=role,
                is_active=True,
                must_change_password=True,
            )
            db.add(new_admin)
            await db.commit()
            print(f"\n[OK] Administrator '{username}' created successfully.")

        if is_generated:
            print(f"Temporary Password : {password}")
            print(f"Notice: The owner MUST change this password upon first login.\n")
        else:
            print(f"Password set as provided. Must change on first login.\n")


async def seed_demo_data():
    await init_tables()
    async with AsyncSessionLocal() as db:
        # Check if members exist
        stmt = select(Member)
        res = await db.execute(stmt)
        if res.scalars().first():
            print("Demo data already seeded.")
            return

        demo_members = [
            ("Ramesh Gowda", "+919448111001", "Halaguru Main Bazaar", True, True),
            ("Suresh Kumar", "+919448111002", "Kanakapura Road", True, False),
            ("Lakshmi Devi", "+919448111003", "HMS Complex Nearby", False, True),
            ("Manjunath K", "+919448111004", "Malavalli Cross Road", False, False),
        ]

        for i, (name, phone, addr, wa, sms) in enumerate(demo_members, 1):
            m_num = f"KAV-{i:06d}"
            m = Member(
                member_number=m_num,
                full_name=name,
                primary_phone=phone,
                address=addr,
                status="active",
                loyalty_points=50,
            )
            db.add(m)
            await db.flush()

            db.add(MarketingConsent(
                member_id=m.id,
                channel="whatsapp",
                consent_state="granted" if wa else "never_given",
                source="registration_web",
            ))
            db.add(MarketingConsent(
                member_id=m.id,
                channel="sms",
                consent_state="granted" if sms else "never_given",
                source="registration_web",
            ))
            db.add(LoyaltyTransaction(
                member_id=m.id,
                points=50,
                transaction_type="signup_bonus",
                notes="Demo welcome bonus",
            ))

        await db.commit()
        print("[OK] Synthetic demo members and consent records seeded.")


def main():
    if len(sys.argv) < 2:
        print("Usage: python -m app.cli [create-admin | seed-demo]")
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "create-admin":
        uname = sys.argv[2] if len(sys.argv) > 2 else "kaveri_owner"
        pw = sys.argv[3] if len(sys.argv) > 3 else None
        asyncio.run(create_admin(username=uname, password=pw))
    elif cmd == "seed-demo":
        asyncio.run(seed_demo_data())
    else:
        print(f"Unknown command: {cmd}")


if __name__ == "__main__":
    main()
