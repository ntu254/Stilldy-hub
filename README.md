<p align="center">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.IO" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo" />
</p>

# 📚 StudyHub — Intelligent Learning Document Platform

**StudyHub** is a full-stack, AI-powered academic document management and learning platform designed for university students. It enables students to upload, organize, share, and study documents with built-in AI chatbot assistance, flashcard study tools, and a subscription-based premium tier — all within a modern, responsive interface.

> **Target Users:** University students, educators, and academic communities who need a centralized platform to manage, share, and intelligently study from their documents.

---

## ✨ Why StudyHub?

- 🤖 **AI-Powered Learning** — Ask questions about your uploaded documents and get context-aware answers powered by Gemini / OpenAI with RAG (Retrieval-Augmented Generation).
- 📂 **Smart Document Management** — Upload, version, preview, search, and share documents with DMCA-compliant privacy controls.
- 🃏 **Flashcard System** — Create, study, and track progress on flashcard collections with spaced repetition concepts.
- 💳 **Subscription & Payments** — PayOS-integrated premium plans with automatic subscription lifecycle management.
- 📱 **Cross-Platform** — Web (React), Mobile (React Native/Expo), and dockerized backend.

---

## 🏗️ Tech Stack

### Frontend — Web Client (`studyHub-client/`)
| Category | Technologies |
|---|---|
| **Framework** | React 19, Vite 8, TypeScript 6 |
| **Styling** | TailwindCSS 4, Radix UI, Headless UI |
| **State Management** | Redux Toolkit, React Context |
| **Routing** | React Router DOM v7 |
| **Animations** | Motion (Framer Motion), Canvas Confetti |
| **Document Viewers** | react-pdf, pdfjs-dist, docx-preview, pptx-preview |
| **Charts** | Recharts |
| **Real-time** | Socket.IO Client |
| **HTTP Client** | Axios |
| **Markdown** | react-markdown, remark-gfm |

### Frontend — Mobile App (`studyHub-mobile/`)
| Category | Technologies |
|---|---|
| **Framework** | React Native, Expo SDK 54 |
| **Styling** | NativeWind (TailwindCSS for RN) |
| **State Management** | Redux Toolkit |
| **Navigation** | React Navigation v7 |
| **UI Components** | GlueStack UI |

### Backend (`studyHub-server/`)
| Category | Technologies |
|---|---|
| **Framework** | NestJS 11, TypeScript |
| **Database** | MongoDB (Mongoose 9) |
| **Authentication** | JWT (`@nestjs/jwt`), Google OAuth, bcrypt |
| **File Storage** | Firebase Admin SDK (Cloud Storage) |
| **Image Hosting** | Cloudinary |
| **AI / NLP** | Gemini API (embeddings + generation), OpenAI API (fallback) |
| **Document Parsing** | pdf-parse, mammoth (DOCX), JSZip (PPTX) |
| **Token Counting** | tiktoken |
| **Payments** | PayOS (`@payos/node`) |
| **Email** | Resend |
| **Real-time** | Socket.IO (WebSocket Gateway) |
| **Validation** | Zod, class-validator, nestjs-zod |
| **API Docs** | Swagger (`@nestjs/swagger`) |
| **Logging** | Winston, nest-winston |
| **Security** | Helmet, Throttler (rate limiting) |
| **Scheduling** | `@nestjs/schedule` (cron jobs) |
| **Testing** | Jest, Supertest |

### Infrastructure
| Category | Technologies |
|---|---|
| **Containerization** | Docker, Docker Compose |
| **CI/CD** | GitHub Actions (SSH deploy to VPS) |
| **Database** | MongoDB 6.0 (Docker / Atlas) |

---

## 📁 Project Structure

```
studyHub/
├── .github/workflows/       # CI/CD pipeline (VPS deploy via SSH)
├── docker-compose.yml        # Multi-service orchestration (MongoDB + Server)
├── .prettierrc               # Shared code formatting config
│
├── studyHub-client/          # 🌐 React Web Application
│   └── src/
│       ├── App.tsx           # Root component with route definitions
│       ├── assets/           # Static assets (images, icons)
│       ├── components/       # Reusable UI components
│       │   ├── UploadModal.tsx
│       │   ├── NotificationBell.tsx
│       │   ├── AppSidebar.tsx
│       │   ├── ProtectedRoute.tsx
│       │   ├── DMCAModal.tsx
│       │   └── admin/        # Admin-specific table components
│       ├── contexts/         # React Contexts (AuthContext)
│       ├── hooks/            # Custom React hooks
│       ├── layouts/          # Layout wrappers (Auth, Dashboard, Admin)
│       ├── lib/              # Core utilities (api.ts, utils.ts)
│       ├── pages/
│       │   ├── auth/         # Login, Register, Forgot/Reset Password
│       │   ├── landing/      # Public pages (Home, Search, Featured)
│       │   ├── user/         # Dashboard, Documents, Profile, AI Chat
│       │   ├── admin/        # Admin panel (Users, Documents, Plans)
│       │   ├── documents/    # Document viewer components
│       │   ├── flashcards/   # Flashcard pages (List, Detail, Edit)
│       │   └── payment/      # Payment success/cancel pages
│       ├── redux/            # Redux store & slices
│       ├── routes/           # Route configuration
│       ├── services/         # API service modules
│       ├── types/            # TypeScript type definitions
│       └── utils/            # Utility functions
│
├── studyHub-server/          # ⚙️ NestJS Backend API
│   ├── Dockerfile            # Multi-stage production build
│   └── src/
│       ├── main.ts           # Application entry point
│       ├── init.ts           # CORS, Swagger, middlewares setup
│       ├── app.module.ts     # Root module (all feature modules)
│       ├── app/
│       │   ├── auth/         # Authentication (JWT, Google OAuth, Password Reset)
│       │   ├── users/        # User management (profile, avatar, admin CRUD)
│       │   ├── documents/    # Document CRUD, upload, versioning, Firebase storage
│       │   ├── category/     # Subject/category management
│       │   ├── chatbot/      # AI chatbot (RAG pipeline, document parsing, chunking)
│       │   ├── flashcards/   # Flashcard collections (CRUD, progress tracking)
│       │   ├── subscriptions/# Subscription plans, PayOS payments, webhooks
│       │   ├── notifications/# Real-time notifications (WebSocket gateway)
│       │   ├── learninghistory/ # Quiz/test result history tracking
│       │   ├── settings/     # System settings (admin-configurable)
│       │   └── admin/        # Admin dashboard stats, content moderation
│       ├── common/           # Shared utilities, decorators, guards, interceptors
│       ├── logger/           # Winston logger configuration
│       └── scripts/          # Database migration/utility scripts
│
└── studyHub-mobile/          # 📱 React Native / Expo Mobile App
    ├── App.tsx               # Mobile app entry point
    ├── screens/              # Screen components
    ├── components/           # Reusable mobile components
    ├── navigation/           # React Navigation config
    ├── api/                  # Mobile API service layer
    └── redux/                # Mobile Redux store
```

---

## 🚀 Features

### 🔐 Authentication & Authorization
- **Email/Password** registration and login with bcrypt hashing
- **Google OAuth 2.0** single sign-on integration
- **JWT-based** authentication with access token (6h) + refresh token (1d) rotation
- **Forgot password** flow via email (Resend) with secure reset tokens
- **Role-based access control** with three tiers: `guest`, `user`, `admin`
- **Protected routes** on both frontend and backend with guard decorators

### 📄 Document Management
- **Multi-format upload** — PDF, DOCX, PPTX, PNG, JPG, TXT, MD (max 25MB)
- **Version control** — Upload new versions of existing documents, automatic version numbering
- **Firebase Cloud Storage** — Secure file storage with streaming download/preview
- **In-browser preview** — Native viewers for PDF (react-pdf), DOCX (docx-preview), PPTX (pptx-preview), and images
- **ETag caching** — Optimized file streaming with HTTP 304 Not Modified support
- **Privacy controls** — Toggle public/private with DMCA compliance acknowledgement
- **Social interactions** — Like/Dislike toggle, Bookmark/Save, View & Download counters
- **Content reporting** — Students can flag documents for violations; admin moderation queue
- **Search & filtering** — Full-text search by title, filter by subject/tags/file type, sort by date/size
- **Soft delete** — Documents are marked as destroyed, not permanently removed

### 🤖 AI Chatbot (EduChat)
- **Retrieval-Augmented Generation (RAG)** — Answers grounded in uploaded document context
- **Hybrid Search** — Combines Vector Search (cosine similarity on embeddings) with Keyword Search (`$text`)
- **Reciprocal Rank Fusion (RRF)** — Re-ranks results from both search channels for optimal context
- **Document chunking** — Heading-aware chunking with 500-token limit and 75-token overlap
- **Embedding pipeline** — Gemini Embedding API (`gemini-embedding-001`) with batch processing
- **Chat session management** — Create, rename, pin, archive, and delete conversation threads
- **Multi-document context** — Attach multiple documents to a single chat session
- **Conversation history** — Last 10 messages included as context for continuity
- **Fallback support** — Graceful degradation to OpenAI API or mock responses

### 🃏 Flashcards & Learning
- **Flashcard collections** — Create sets with term/definition card pairs
- **Learning modes** — Mark cards as mastered, star important cards
- **Progress tracking** — Track mastered count per user with reset capability
- **Quiz history** — Record and review past test/quiz results
- **Public sharing** — Share flashcard collections publicly with the community
- **Soft delete & restore** — Recoverable deletion for flashcard collections

### 💳 Subscription & Payments
- **Tiered plans** — Admin-configurable subscription plans with storage limits
- **PayOS integration** — Vietnamese payment gateway with QR code checkout
- **Webhook processing** — Automatic payment confirmation and subscription activation
- **Subscription lifecycle** — Automatic expiration handling with grace periods via cron jobs
- **Upgrade preview** — Preview prorated costs before upgrading plans
- **Payment history** — Full transaction history for users and admin audit

### 🔔 Real-time Notifications
- **WebSocket gateway** — Socket.IO-based real-time push notifications
- **JWT authentication** — Socket connections authenticated via access token
- **User-scoped rooms** — Notifications delivered to specific user channels
- **Read status management** — Mark individual or all notifications as read
- **Paginated history** — Browse notification history with read/unread filter

### 👑 Admin Panel
- **Dashboard analytics** — Overview stats (users, documents, storage, revenue)
- **User management** — List, search, view details, and manage user accounts
- **Document moderation** — Review reported documents, approve or remove content
- **File management** — Browse and manage all uploaded files system-wide
- **Subscription plan CRUD** — Create, update, enable/disable service plans
- **Payment oversight** — Full payment transaction history with statistics
- **System settings** — Configure payment expiry, grace periods, and banned user policies

---

## ⚙️ Setup Instructions

### Prerequisites
- **Node.js** ≥ 22.x
- **npm** ≥ 10.x
- **MongoDB** 6.0+ (local or MongoDB Atlas)
- **Firebase** project with Cloud Storage enabled
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/studyHub.git
cd studyHub
```

### 2. Backend Setup
```bash
cd studyHub-server

# Install dependencies
npm install

# Create environment file
cp .env.example .env  # Then fill in the values (see Environment Variables section)

# Place your Firebase service account key
# Download from Firebase Console > Project Settings > Service Accounts
# Save as: studyHub-server/firebase-adminsdk.json

# Start development server (with hot reload)
npm run start:dev
```
The server will start at `http://localhost:8888` with Swagger docs at `http://localhost:8888/docs`.

### 3. Frontend Setup
```bash
cd studyHub-client

# Install dependencies
npm install

# Create environment file (optional, defaults to localhost:8888)
echo "VITE_API_BASE_URL=http://localhost:8888/api" > .env

# Start development server
npm run dev
```
The client will start at `http://localhost:5173`.

### 4. Mobile App Setup
```bash
cd studyHub-mobile

# Install dependencies
npm install

# Start Expo development server
npm start

# Or run on a specific platform
npm run android
npm run ios
```

---

## 🔑 Environment Variables

### Backend (`studyHub-server/.env`)

| Variable | Required | Description |
|---|:---:|---|
| `PORT` | ✅ | Server port (default: `8888`) |
| `HOST` | ✅ | Server host (default: `localhost`, use `0.0.0.0` for Docker) |
| `NODE_ENV` | ✅ | Environment: `development` or `production` |
| `APP_NAME` | ✅ | Application name (used in logs and Swagger) |
| `APP_PREFIX` | ✅ | Swagger docs URL prefix (e.g., `/docs`) |
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Secret key for JWT token signing |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth 2.0 Client ID |
| `FIREBASE_STORAGE_BUCKET` | ✅ | Firebase Storage bucket name |
| `CLOUDINARY_CLOUD_NAME` | ✅ | Cloudinary cloud name (for avatar uploads) |
| `CLOUDINARY_API_KEY` | ✅ | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | ✅ | Cloudinary API secret |
| `RESEND_API_KEY` | ✅ | Resend email API key (for password reset emails) |
| `FE_URL` | ✅ | Frontend URL (for email links, e.g., `http://localhost:5173`) |
| `GEMINI_API_KEY` | ⚡ | Google Gemini API key (for AI chatbot & embeddings) |
| `GEMINI_MODEL` | ❌ | Gemini model name (default: `gemini-2.5-flash`) |
| `OPENAI_API_KEY` | ❌ | OpenAI API key (fallback if Gemini is not configured) |
| `PAYOS_CLIENT_ID` | ⚡ | PayOS client ID (for payment processing) |
| `PAYOS_API_KEY` | ⚡ | PayOS API key |
| `PAYOS_CHECKSUM_KEY` | ⚡ | PayOS checksum key |
| `PAYMENT_RETURN_URL` | ⚡ | URL to redirect after successful payment |
| `PAYMENT_CANCEL_URL` | ⚡ | URL to redirect after cancelled payment |
| `PAYOS_ALLOWED_REDIRECT_URLS` | ❌ | Comma-separated list of allowed redirect URLs |

> ✅ = Required &nbsp; ⚡ = Required for specific features &nbsp; ❌ = Optional

### Frontend (`studyHub-client/.env`)

| Variable | Required | Description |
|---|:---:|---|
| `VITE_API_BASE_URL` | ❌ | Backend API base URL (default: `http://localhost:8888/api`) |

---

## 📡 API Documentation

The backend auto-generates interactive Swagger documentation. Once the server is running, visit:

```
http://localhost:8888/docs
```

### Key API Routes Summary

#### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/auth/sign-up` | ❌ | Register a new account |
| `POST` | `/auth/sign-in` | ❌ | Login with email/password |
| `POST` | `/auth/google` | ❌ | Login with Google ID token |
| `GET` | `/auth/refresh-token` | ❌ | Refresh access token (via cookie) |
| `GET` | `/auth/logout` | ❌ | Clear auth cookies |
| `POST` | `/auth/forgot-password` | ❌ | Send password reset email |
| `POST` | `/auth/reset-password` | ❌ | Reset password with token |
| `POST` | `/auth/change-password` | ✅ | Change password (authenticated) |

#### 📄 Documents (`/api/documents`)
| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `GET` | `/documents/public` | ❌ | List public documents (search, filter, paginate) |
| `GET` | `/documents/mine` | ✅ | List my documents |
| `GET` | `/documents/user/recent-uploaded` | ✅ | Get 4 most recent uploads |
| `GET` | `/documents/user/stats` | ✅ | Get user storage statistics |
| `GET` | `/documents/user/saved-list` | ✅ | Get bookmarked documents |
| `GET` | `/documents/:id` | 🔓 | Get document details (public or owner) |
| `GET` | `/documents/:id/file` | ❌ | Stream file content (CORS bridge) |
| `GET` | `/documents/:id/download` | ✅ | Download file (increments counter) |
| `POST` | `/documents/upload` | ✅ | Upload new document |
| `POST` | `/documents/:id/new-version` | ✅ | Upload new file version |
| `PUT` | `/documents/:id` | ✅ | Update document metadata |
| `PATCH` | `/documents/:id/privacy` | ✅ | Toggle public/private (DMCA) |
| `DELETE` | `/documents/:id` | ✅ | Soft-delete document |
| `POST` | `/documents/:id/like` | ✅ | Toggle like |
| `POST` | `/documents/:id/dislike` | ✅ | Toggle dislike |
| `POST` | `/documents/:id/save` | ✅ | Toggle bookmark |
| `POST` | `/documents/:id/report` | ✅ | Report document violation |
| `GET` | `/documents/:id/conversation` | ✅ | Get document chat history |
| `POST` | `/documents/:id/conversation` | ✅ | Send chat message about document |

#### 🤖 Chat Sessions (`/api/chat-sessions`)
| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/chat-sessions` | ✅ | Create new chat session |
| `GET` | `/chat-sessions` | ✅ | List all chat sessions |
| `GET` | `/chat-sessions/:id` | ✅ | Get session with message history |
| `POST` | `/chat-sessions/:id/messages` | ✅ | Send message (triggers RAG + AI) |
| `PATCH` | `/chat-sessions/:id/rename` | ✅ | Rename session |
| `PATCH` | `/chat-sessions/:id/pin` | ✅ | Toggle pin session |
| `PATCH` | `/chat-sessions/:id/archive` | ✅ | Toggle archive session |
| `DELETE` | `/chat-sessions/:id` | ✅ | Delete session |

#### 🃏 Flashcards (`/api/flashcards`)
| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/flashcards` | ✅ | Create flashcard collection |
| `GET` | `/flashcards/my-collections` | ✅ | List my collections |
| `GET` | `/flashcards/public` | 🔓 | List public collections |
| `GET` | `/flashcards/:id` | ✅ | Get collection with cards |
| `PUT` | `/flashcards/:id` | ✅ | Update entire collection |
| `DELETE` | `/flashcards/:id` | ✅ | Soft-delete collection |
| `PATCH` | `/flashcards/:id/restore` | ✅ | Restore deleted collection |
| `PUT` | `/flashcards/:id/reset-progress` | ✅ | Reset learning progress |
| `PATCH` | `/flashcards/:id/cards/:cardId` | ✅ | Update single card |
| `DELETE` | `/flashcards/:id/cards/:cardId` | ✅ | Remove single card |
| `PATCH` | `/flashcards/:id/cards/:cardId/mark` | ✅ | Toggle star card |
| `PATCH` | `/flashcards/:id/cards/:cardId/status` | ✅ | Toggle mastered status |

#### 💳 Subscriptions & Payments (`/api/`)
| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `GET` | `/subscription-plans` | ❌ | List active plans |
| `POST` | `/subscriptions/purchase` | ✅ | Initiate payment checkout |
| `GET` | `/subscriptions/my` | ✅ | Get my current subscription |
| `GET` | `/subscriptions/upgrade-preview` | ✅ | Preview upgrade cost |
| `POST` | `/subscriptions/webhook` | ❌ | PayOS webhook handler |
| `GET` | `/payments/history` | ✅ | My payment history |

#### 🔔 Notifications (`/api/notifications`)
| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `GET` | `/notifications` | ✅ | Get notification history (paginated) |
| `PATCH` | `/notifications/read` | ✅ | Mark notifications as read |

#### 👑 Admin (`/api/admin`)
| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `GET` | `/admin/dashboard/stats` | 🛡️ | Dashboard analytics |
| `GET` | `/admin/documents` | 🛡️ | All documents (search/filter) |
| `GET` | `/admin/documents/reported` | 🛡️ | Reported document queue |
| `POST` | `/admin/moderate-document/:id` | 🛡️ | Approve/reject report |
| `DELETE` | `/admin/documents/:id` | 🛡️ | Supreme delete (DB + Cloud) |
| `GET` | `/admin/settings` | 🛡️ | Get system settings |
| `PATCH` | `/admin/settings` | 🛡️ | Update system settings |

> ✅ = Authenticated &nbsp; ❌ = Public &nbsp; 🔓 = Optional Auth &nbsp; 🛡️ = Admin Only

---

## 🐳 Build & Deployment

### Docker Compose (Recommended for Production)

The project includes a `docker-compose.yml` that orchestrates:
- **MongoDB 6.0** — Database service
- **NestJS Server** — Backend API (port 8888)

```bash
# Build and start all services
docker compose up -d --build

# View running containers
docker compose ps

# View logs
docker compose logs -f server

# Stop all services
docker compose down
```

### Manual Production Build

#### Backend
```bash
cd studyHub-server
npm run build           # Compiles TypeScript to dist/
npm run start:prod      # Runs node dist/main.js
```

#### Frontend
```bash
cd studyHub-client
npm run build           # Generates optimized bundle in dist/
npm run preview         # Preview production build locally
```

### CI/CD — GitHub Actions

The project includes an automated deployment pipeline (`.github/workflows/deploy.yml`):
- **Trigger:** Push to `main` branch
- **Action:** SSH into VPS → `git pull` → `docker compose up -d --build`
- **Required Secrets:** `VPS_HOST`, `VPS_USERNAME`, `VPS_SSH_KEY`, `VPS_PORT`, `VPS_TARGET_DIR`

---

## 🧪 Testing

### Backend Tests
```bash
cd studyHub-server

# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:cov

# Run end-to-end tests
npm run test:e2e

# Debug tests
npm run test:debug
```

**Testing Stack:** Jest, ts-jest, Supertest, `@nestjs/testing`

Available test files:
- `chatbot.service.spec.ts` — AI chatbot service unit tests
- `document-chunker.service.spec.ts` — Document chunking algorithm tests
- `document-parser.service.spec.ts` — Document parsing tests
- `subscription-expiration.service.spec.ts` — Subscription lifecycle tests
- `subscriptions.service.spec.ts` — Payment processing tests
- `users.service.spec.ts` — User management tests
- `settings.controller.spec.ts` / `settings.service.spec.ts` — Settings tests
- `auth.controller.spec.ts` / `auth.guard.spec.ts` — Auth tests

### Frontend Tests
```bash
cd studyHub-client
npm run lint            # ESLint code quality check
```

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'feat: add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Code Style
- The project uses **Prettier** for code formatting (see `.prettierrc`)
- Run `npm run format` (backend) or `npm run lint` (frontend) before committing
- Follow NestJS conventions for backend modules

---

## 📜 License

This project is **UNLICENSED** (private/proprietary). All rights reserved.

---

## 🔮 Future Improvements

Based on analysis of the current codebase (TODO patterns and incomplete implementations):

- **`.doc` file preview** — Legacy Word binary format currently cannot be previewed in-browser; requires server-side conversion or a third-party renderer
- **PPTX/XLSX parsing for AI** — The chatbot document parser supports PDF, DOCX, TXT, MD, and PPTX but could be extended for spreadsheet intelligence
- **API versioning** — Version headers are stubbed but commented out in `init.ts`
- **Frontend Docker** — The client Docker service is scaffolded in `docker-compose.yml` but commented out
- **Rate limiting** — Throttler is installed but configuration could be fine-tuned per endpoint
- **Offline mobile support** — Expo offline mode is configured but local caching could be enhanced
- **Email verification** — `isVerified` field exists on User schema but the verification flow is not fully implemented
- **Multi-language support** — UI currently uses Vietnamese; i18n infrastructure could be added

---

<p align="center">
  Built with ❤️ by the StudyHub Team — FPT University, Semester 8 (WDP391)
</p>
