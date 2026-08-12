# Smart Attendance System

> **Status: 🚧 Under Active Development**

A modern smart attendance management system that combines **Face Recognition, NFC, attendance tracking, behavioral analytics, and role-based management** into a unified web application.

The system is being developed as an MCA major project with a focus on building a reliable, scalable, and intelligent attendance platform.

---

## 🚧 Development Status

This project is **currently under development**.

Several core modules are already implemented, while other features are being actively developed and improved.

### Current Progress

* ✅ React + TypeScript frontend
* ✅ FastAPI backend
* ✅ PostgreSQL database
* ✅ SQLAlchemy ORM
* ✅ Alembic database migrations
* ✅ Student management
* ✅ Faculty management
* ✅ Admin management
* ✅ User authentication and role-based access
* ✅ Face recognition
* ✅ Face embedding storage with pgvector
* ✅ NFC attendance support
* ✅ Attendance recording
* ✅ Attendance history
* ✅ Attendance reports
* ✅ Calendar
* ✅ Notices
* ✅ Student dashboard
* ✅ Faculty dashboard
* ✅ Admin dashboard
* 🚧 Behavioral analytics
* 🚧 Behavioral risk analysis
* 🚧 Machine learning model
* 🚧 Advanced behavioral prediction
* 🚧 Production deployment

---

# Features

## 👨‍💼 Admin Management

Administrators can manage the complete attendance system through a dedicated dashboard.

Current functionality includes:

* Student registration
* Faculty registration
* Student management
* Faculty management
* Attendance monitoring
* Attendance history
* Reports
* Face data management
* NFC management
* Notices
* Calendar
* System dashboard

---

## 👨‍🎓 Student Management

The system maintains student-specific information including:

* Student ID
* Full name
* Phone
* Date of birth
* Gender
* Profile photo
* Department
* Course
* Year
* Semester
* Section
* Account status

Students can also have:

* Face embeddings
* NFC cards
* Attendance records
* Behavioral profiles

---

## 👨‍🏫 Faculty Management

Faculty profiles include:

* Faculty ID
* Full name
* Phone
* Profile photo
* Department
* Designation
* Account status

Faculty members can also have:

* Face embeddings
* Attendance records
* Behavioral profiles

---

# Face Recognition

The system supports attendance verification through face recognition.

The current implementation uses:

* Face detection
* Face embedding generation
* Vector storage
* Face comparison
* Similarity/distance threshold
* Identity verification

Face embeddings are stored using **PostgreSQL + pgvector**.

The current face recognition workflow is:

```text
Camera
   ↓
Face Detection
   ↓
Face Embedding
   ↓
Vector Comparison
   ↓
Identity Verification
   ↓
Attendance Recording
```

---

# NFC Attendance

NFC is supported as another attendance verification method.

```text
NFC Card
   ↓
Card Identification
   ↓
Student / Faculty Lookup
   ↓
Attendance Validation
   ↓
Attendance Log
```

The system is designed to support multiple attendance methods:

* Face Recognition
* NFC
* Manual Attendance

---

# Attendance System

Attendance records are maintained for both students and faculty.

Each attendance record can contain:

* Attendance date
* Check-in time
* Check-out time
* Attendance status
* Attendance method
* Face recognition confidence
* Device information

### Attendance Status

```text
PRESENT
LATE
ABSENT
```

### Attendance Methods

```text
FACE
NFC
MANUAL
```

---

# Behavioral Analytics

Behavioral analytics is currently under development.

The system uses attendance history to derive behavioral metrics for **both students and faculty**.

The current behavioral profile includes:

```text
Total Present
Total Absent
Total Late

Attendance Rate
Punctuality Score
Consistency Score
Risk Score
```

The analytics pipeline is:

```text
Attendance Logs
      ↓
Feature Extraction
      ↓
Behavior Analytics
      ↓
Behavioral Profile
      ↓
Risk Analysis
```

### Current Behavioral Metrics

#### Attendance Rate

Measures the percentage of attendance records where the person was present or late.

#### Punctuality Score

Measures how consistently the person arrives on time.

#### Consistency Score

Analyzes how stable attendance behavior is over time.

#### Risk Score

Combines attendance, punctuality, and consistency metrics into an attendance-related risk score.

---

# Machine Learning

The machine learning component is **not yet finalized**.

The planned architecture is:

```text
Historical Attendance
        ↓
Feature Engineering
        ↓
Behavioral Dataset
        ↓
Machine Learning Model
        ↓
Risk Prediction
        ↓
Behavior Classification
```

Potential future predictions include:

* Low-risk behavior
* Medium-risk behavior
* High-risk behavior
* Attendance decline
* Frequent lateness
* Irregular attendance

The ML model will be developed after sufficient historical attendance data is available.

---

# System Architecture

```text
                    Smart Attendance System
                              │
             ┌────────────────┴────────────────┐
             │                                 │
         Frontend                           Backend
             │                                 │
      React + TypeScript                    FastAPI
             │                                 │
             │                         ┌───────┴────────┐
             │                         │                │
             │                    SQLAlchemy        Services
             │                         │                │
             │                         ▼                ▼
             │                    PostgreSQL       Analytics
             │                         │
             │                         │
             │                    pgvector
             │                         │
             └────────────── API ──────┘
```

---

# Project Structure

```text
smart-attendance-system/
│
├── client/
│   ├── public/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── context/
│       ├── layouts/
│       └── pages/
│
├── server/
│   ├── alembic/
│   │   └── versions/
│   │
│   ├── app/
│   │   ├── database/
│   │   │   ├── models/
│   │   │   └── seed/
│   │   │
│   │   ├── dependencies/
│   │   │
│   │   ├── routes/
│   │   │
│   │   ├── schemas/
│   │   │
│   │   └── services/
│   │
│   ├── main.py
│   ├── pyproject.toml
│   └── alembic.ini
│
├── .gitignore
└── README.md
```

---

# Backend

The backend is built with:

| Technology   | Purpose                |
| ------------ | ---------------------- |
| FastAPI      | REST API               |
| Python       | Backend language       |
| SQLAlchemy   | ORM                    |
| PostgreSQL   | Database               |
| pgvector     | Face embedding storage |
| Alembic      | Database migrations    |
| Pydantic     | Data validation        |
| OpenCV       | Computer vision        |
| DeepFace     | Face recognition       |
| NumPy        | Numerical processing   |
| Pandas       | Data analysis          |
| Scikit-learn | Machine learning       |

---

# Frontend

The frontend is built using:

| Technology   | Purpose                   |
| ------------ | ------------------------- |
| React        | UI framework              |
| TypeScript   | Type-safe development     |
| Vite         | Development/build tooling |
| Tailwind CSS | UI styling                |
| Fetch API    | Backend communication     |

The frontend contains separate interfaces for:

* Public users
* Students
* Faculty
* Administrators

---

# Database

The project uses **PostgreSQL**.

Core entities include:

```text
Users
   │
   ├── Admin
   ├── Student
   └── Faculty

Student ─────── AttendanceLog
Faculty ─────── AttendanceLog

Student ─────── BehavioralProfile
Faculty ─────── BehavioralProfile

User ────────── FaceEmbedding

Student ─────── NFCCard
```

### Main Tables

```text
users
students
faculty
admins
attendance_logs
face_embeddings
nfc_cards
behavioral_profiles
notices
```

Database changes are managed using **Alembic migrations**.

---

# API

The backend currently provides APIs for areas such as:

```text
Authentication
Students
Faculty
Attendance
Face Recognition
Face Data
NFC
Admin
Reports
Calendar
Notices
Dashboards
Behavior Analytics
```

Behavioral analytics endpoints currently include:

```text
GET  /behavior/students/{student_id}

POST /behavior/students/{student_id}/calculate

GET  /behavior/faculty/{faculty_id}

POST /behavior/faculty/{faculty_id}/calculate
```

---

# Installation

## Prerequisites

Make sure you have:

* Python 3.12+
* Node.js
* npm
* PostgreSQL
* Git

---

## Clone the Repository

```bash
git clone https://github.com/mopidevi-jagadeeswar/smart-attendance-system.git

cd smart-attendance-system
```

---

# Backend Setup

Move into the server directory:

```bash
cd server
```

Create and activate a virtual environment or use the project's preferred Python environment manager.

Install dependencies:

```bash
uv sync
```

Create your environment configuration:

```bash
cp .env.example .env
```

> `.env.example` will be added as the project configuration is finalized.

Configure your PostgreSQL database and other required environment variables.

Run migrations:

```bash
alembic upgrade head
```

Start the development server:

```bash
uv run fastapi dev main.py
```

Backend:

```text
http://127.0.0.1:8000
```

Swagger documentation:

```text
http://127.0.0.1:8000/docs
```

---

# Frontend Setup

Open another terminal:

```bash
cd client
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

# Environment Variables

Sensitive configuration should **never be committed to GitHub**.

Example configuration will include values such as:

```text
DATABASE_URL=
SECRET_KEY=
JWT_SECRET=
```

Create a local `.env` file for development.

The `.gitignore` file prevents `.env` and uploaded files from being committed.

---

# Development Roadmap

## Phase 1 — Core System

* [x] Project architecture
* [x] PostgreSQL database
* [x] Authentication
* [x] Student management
* [x] Faculty management
* [x] Admin management
* [x] Attendance system

## Phase 2 — Smart Attendance

* [x] Face recognition
* [x] Face embeddings
* [x] NFC attendance
* [x] Attendance verification
* [x] Attendance history
* [x] Reports

## Phase 3 — Behavioral Analytics

* [x] Behavioral profile database model
* [x] Student behavioral profile
* [x] Faculty behavioral profile
* [x] Attendance rate calculation
* [x] Punctuality calculation
* [x] Consistency calculation
* [x] Risk score calculation
* [x] Behavioral analytics API

## Phase 4 — Machine Learning

* [ ] Historical dataset generation
* [ ] Feature engineering
* [ ] Exploratory data analysis
* [ ] Model selection
* [ ] Model training
* [ ] Model evaluation
* [ ] Risk prediction
* [ ] Behavioral classification

## Phase 5 — Production

* [ ] Automated testing
* [ ] Security hardening
* [ ] Docker deployment
* [ ] Production database
* [ ] CI/CD
* [ ] Cloud deployment
* [ ] Monitoring
* [ ] Performance optimization

---

# Security

Security is an ongoing part of development.

Current design includes:

* Password hashing
* JWT-based authentication
* Role-based access
* Protected API routes
* Database constraints
* Environment-based configuration
* Git-ignored secrets
* Git-ignored uploaded images

Additional production security improvements will be implemented before deployment.

---

# Project Goals

The long-term goal is to develop an intelligent attendance platform capable of:

1. Automatically identifying students and faculty.
2. Recording attendance through multiple verification methods.
3. Maintaining detailed attendance history.
4. Detecting attendance and punctuality patterns.
5. Identifying people at risk of poor attendance.
6. Providing meaningful analytics to administrators.
7. Using machine learning for future behavioral prediction.
8. Providing dashboards for administrators, faculty, and students.

---

# Current Status

> 🚧 **This project is actively under development.**

The core attendance infrastructure is functional, while behavioral analytics, machine learning, testing, and production deployment are still being developed.

Features, APIs, database structures, and UI components may change as development continues.

---

# Author

**Mopidevi Jagadeeswar**

MCA — 2024–2026

---

# License

This project is currently under development and is primarily intended for academic and educational purposes.

A formal open-source license will be added when the project reaches a stable release.
