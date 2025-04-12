# Lingo Question Generation System

## Project Overview
Lingo is an AI-powered question generation system similar to Quizizz that creates questions from user prompts. The system aims to provide an intuitive interface for generating educational quizzes with various question types and difficulty levels.

## Core Features
- AI-powered question generation using LLM
- Multiple question formats support
- Difficulty level customization
- Quiz management and storage
- User feedback and quality control
- Interactive quiz interface
- User authentication and authorization
- Real-time quiz interaction

## System Architecture

### 1. Backend (FastAPI + LLM)
- Question generation pipeline using LLM
- API endpoints for quiz management
- Data validation and quality control
- Database integration
- User session management
- Authentication middleware
- Service layer architecture
- Environment configuration

### 2. Frontend (Next.js 14 + React)
- App Router architecture
- Server and Client Components
- Interactive quiz creation interface
- Quiz taking interface
- Real-time feedback system
- Responsive design
- User dashboard
- Authentication integration
- Server actions implementation
- State management with Redux
- Environment configuration

### 3. Database (PostgreSQL + Drizzle ORM)
- Quiz storage
- User data management
- Question bank
- Performance metrics
- Feedback storage
- Database migrations
- Schema management with Drizzle

## Technical Stack
- **Backend**: 
  - FastAPI (Python web framework)
  - Python 3.8+
  - LLM API integration
  - JWT authentication
  - SQLAlchemy ORM

- **Frontend**: 
  - Next.js 14
  - React 18
  - TypeScript
  - Tailwind CSS
  - Drizzle ORM
  - Redux for state management
  - Shadcn UI components

- **Database**: 
  - PostgreSQL
  - Drizzle ORM
  - Redis (for caching)

## API Structure
### Core Endpoints
```
POST /api/generate-quiz
POST /api/submit-quiz
GET /api/quizzes/{user_id}
GET /api/quiz/{quiz_id}
```

### Frontend Routes
```
GET /api/quizzes
POST /api/quizzes
GET /api/quizzes/{id}
PATCH /api/quizzes/{id}
DELETE /api/quizzes/{id}
```

## Data Flow
1. User input → Frontend
2. Frontend → Backend API
3. Backend → LLM Processing
4. LLM → Question Generation
5. Backend → Database Storage
6. Backend → Frontend Response
7. Frontend → User Display

## Development Guidelines
1. Follow RESTful API design principles
2. Implement proper error handling
3. Use TypeScript for type safety
4. Follow security best practices
5. Implement comprehensive testing
6. Use proper documentation
7. Follow clean code principles
8. Use environment variables for configuration
9. Follow Git workflow best practices

## Repository Structure
```
/
├── backend/
│   ├── main.py
│   ├── services/
│   ├── schemas/
│   ├── database/
│   ├── config/
│   └── __pycache__/
├── frontend/
    ├── app/
    ├── components/
    ├── actions/
    ├── lib/
    ├── db/
    ├── drizzle/
    ├── public/
    ├── store/
    ├── config/
    └── scripts/

```