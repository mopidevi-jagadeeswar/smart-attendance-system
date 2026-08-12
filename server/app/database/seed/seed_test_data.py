import asyncio
from datetime import date

from app.database.models.admin import Admin
from app.database.models.faculty import Faculty
from app.database.models.student import Student
from app.database.models.user import User, UserRole
from app.database.session import engine
from argon2 import PasswordHasher
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

password_hasher = PasswordHasher()

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def seed_test_data() -> None:
    async with SessionLocal() as session:
        # ==============================================================
        # Test Account Definitions
        # ==============================================================

        test_accounts = [
            {
                "login_id": "ADM001",
                "email": "admin@test.com",
                "password": "Admin@123",
                "role": UserRole.ADMIN,
            },
            {
                "login_id": "FAC001",
                "email": "faculty@test.com",
                "password": "Faculty@123",
                "role": UserRole.FACULTY,
            },
            {
                "login_id": "STU001",
                "email": "student@test.com",
                "password": "Student@123",
                "role": UserRole.STUDENT,
            },
        ]

        # ==============================================================
        # ADMIN
        # ==============================================================

        admin_data = test_accounts[0]

        result = await session.execute(
            select(User).where(User.email == admin_data["email"])
        )

        admin_user = result.scalar_one_or_none()

        if admin_user is None:
            admin_user = User(
                login_id=admin_data["login_id"],
                email=admin_data["email"],
                password_hash=password_hasher.hash(admin_data["password"]),
                role=admin_data["role"],
                is_active=True,
                is_verified=True,
            )

            session.add(admin_user)
            await session.flush()

            print("Created admin user: ADM001")

        else:
            admin_user.login_id = admin_data["login_id"]
            admin_user.role = admin_data["role"]
            admin_user.is_active = True
            admin_user.is_verified = True
            admin_user.password_hash = password_hasher.hash(admin_data["password"])

            print("Updated admin user: ADM001")

        # --------------------------------------------------------------
        # Admin Profile
        # --------------------------------------------------------------

        result = await session.execute(
            select(Admin).where(Admin.user_id == admin_user.id)
        )

        admin = result.scalar_one_or_none()

        if admin is None:
            admin = Admin(
                user_id=admin_user.id,
                admin_id="ADM001",
                full_name="System Administrator",
                phone="9876543210",
                designation="System Administrator",
                is_active=True,
            )

            session.add(admin)

            print("Created admin profile: ADM001")

        else:
            admin.admin_id = "ADM001"
            admin.full_name = "System Administrator"
            admin.phone = "9876543210"
            admin.designation = "System Administrator"
            admin.is_active = True

            print("Updated admin profile: ADM001")

        # ==============================================================
        # FACULTY
        # ==============================================================

        faculty_data = test_accounts[1]

        result = await session.execute(
            select(User).where(User.email == faculty_data["email"])
        )

        faculty_user = result.scalar_one_or_none()

        if faculty_user is None:
            faculty_user = User(
                login_id=faculty_data["login_id"],
                email=faculty_data["email"],
                password_hash=password_hasher.hash(faculty_data["password"]),
                role=faculty_data["role"],
                is_active=True,
                is_verified=True,
            )

            session.add(faculty_user)
            await session.flush()

            print("Created faculty user: FAC001")

        else:
            faculty_user.login_id = faculty_data["login_id"]
            faculty_user.role = faculty_data["role"]
            faculty_user.is_active = True
            faculty_user.is_verified = True
            faculty_user.password_hash = password_hasher.hash(faculty_data["password"])

            print("Updated faculty user: FAC001")

        # --------------------------------------------------------------
        # Faculty Profile
        # --------------------------------------------------------------

        result = await session.execute(
            select(Faculty).where(Faculty.user_id == faculty_user.id)
        )

        faculty = result.scalar_one_or_none()

        if faculty is None:
            faculty = Faculty(
                user_id=faculty_user.id,
                faculty_id="FAC001",
                full_name="Test Faculty",
                phone="9876543211",
                photo_url=None,
                department="Computer Science",
                designation="Assistant Professor",
                is_active=True,
            )

            session.add(faculty)

            print("Created faculty profile: FAC001")

        else:
            faculty.faculty_id = "FAC001"
            faculty.full_name = "Test Faculty"
            faculty.phone = "9876543211"
            faculty.photo_url = None
            faculty.department = "Computer Science"
            faculty.designation = "Assistant Professor"
            faculty.is_active = True

            print("Updated faculty profile: FAC001")

        # ==============================================================
        # STUDENT
        # ==============================================================

        student_data = test_accounts[2]

        result = await session.execute(
            select(User).where(User.email == student_data["email"])
        )

        student_user = result.scalar_one_or_none()

        if student_user is None:
            student_user = User(
                login_id=student_data["login_id"],
                email=student_data["email"],
                password_hash=password_hasher.hash(student_data["password"]),
                role=student_data["role"],
                is_active=True,
                is_verified=True,
            )

            session.add(student_user)
            await session.flush()

            print("Created student user: STU001")

        else:
            student_user.login_id = student_data["login_id"]
            student_user.role = student_data["role"]
            student_user.is_active = True
            student_user.is_verified = True
            student_user.password_hash = password_hasher.hash(student_data["password"])

            print("Updated student user: STU001")

        # --------------------------------------------------------------
        # Student Profile
        # --------------------------------------------------------------

        result = await session.execute(
            select(Student).where(Student.user_id == student_user.id)
        )

        student = result.scalar_one_or_none()

        if student is None:
            student = Student(
                user_id=student_user.id,
                student_id="STU001",
                full_name="Test Student",
                phone="9876543212",
                date_of_birth=date(2002, 5, 15),
                gender="Male",
                photo_url=None,
                department="Computer Science",
                course="MCA",
                year=2,
                semester=4,
                section="A",
                is_active=True,
            )

            session.add(student)

            print("Created student profile: STU001")

        else:
            student.student_id = "STU001"
            student.full_name = "Test Student"
            student.phone = "9876543212"
            student.date_of_birth = date(2002, 5, 15)
            student.gender = "Male"
            student.photo_url = None
            student.department = "Computer Science"
            student.course = "MCA"
            student.year = 2
            student.semester = 4
            student.section = "A"
            student.is_active = True

            print("Updated student profile: STU001")

        # ==============================================================
        # COMMIT
        # ==============================================================

        await session.commit()

        print()
        print("=" * 60)
        print("Test data seeded successfully.")
        print("=" * 60)
        print()
        print("Admin   → ADM001 / Admin@123")
        print("Faculty → FAC001 / Faculty@123")
        print("Student → STU001 / Student@123")
        print()


async def main() -> None:
    try:
        await seed_test_data()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
