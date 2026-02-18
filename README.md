# ExpenseSnap 💰

A full-stack mobile expense tracking application built with React Native and Node.js. ExpenseSnap helps users track expenses, manage budgets, and gain insights into their spending habits.

---

## 📱 Features

- **Authentication** — Secure JWT-based login and registration
- **Expense Tracking** — Add, edit, and delete transactions with categories
- **Receipt Scanning** — OCR-powered receipt scanning using Tesseract.js
- **Budget Periods** — Create custom date-range budgets and track spending
- **Analytics Dashboard** — Visual spending breakdowns with category insights
- **AI Chatbot** — Natural language queries for spending data (9 query patterns)
- **Real-time Alerts** — WebSocket-powered budget threshold notifications
- **Profile Management** — Edit profile, change password, share app

---

## 🛠 Tech Stack

### Mobile (Frontend)
| Technology | Usage |
|---|---|
| React Native + Expo | Mobile app framework |
| Expo Router | File-based navigation |
| Axios | API communication |
| Socket.io Client | Real-time WebSocket |
| AsyncStorage | Local data persistence |
| Expo Image Picker | Profile photo selection |
| React Native Reanimated | Animations |
| Expo Linear Gradient | UI gradients |

### Backend
| Technology | Usage |
|---|---|
| Node.js + Express | REST API server |
| PostgreSQL | Relational database |
| JWT | Authentication |
| Tesseract.js | OCR receipt processing |
| Sharp | Image preprocessing |
| Socket.io | WebSocket server |
| dotenv | Environment config |

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- PostgreSQL
- Expo Go app (iOS/Android)

### 1. Clone the repository
```bash
git clone https://github.com/ritimoradiya/ExpenseSnap.git
cd ExpenseSnap
```

### 2. Setup Backend
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:
```env
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/expensesnap
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
```

Start the backend server:
```bash
node server.js
```

### 3. Setup Mobile
```bash
cd mobile
npm install
```

Update the API URL in `src/services/api.js`:
```javascript
const API_URL = 'http://YOUR_IP_ADDRESS:5000/api';
```

Start the mobile app:
```bash
npx expo start
```

Scan the QR code with Expo Go on your phone.

---

## 📁 Project Structure

```
ExpenseSnap/
├── README.md
├── database-setup.md           # Database setup reference
├── backend/
│   ├── controllers/            # Route handlers
│   ├── middleware/             # Auth middleware
│   ├── migrations/             # Database migrations
│   ├── routes/                 # API routes
│   ├── config/                 # Database config
│   ├── utils/                  # Helper functions
│   └── server.js               # Entry point
│
└── mobile/
    ├── app/
    │   ├── (auth)/             # Login & Register screens
    │   ├── (tabs)/             # Main app tabs
    │   └── _layout.tsx         # Root layout
    ├── src/
    │   ├── contexts/           # Auth context
    │   ├── services/           # API service
    │   └── utils/              # Helper functions
    ├── components/             # Reusable components
    └── services/               # Socket service
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/transactions` | Get all transactions |
| POST | `/api/transactions` | Create transaction |
| PUT | `/api/transactions/:id` | Update transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |
| GET | `/api/categories` | Get all categories |
| POST | `/api/budget-periods` | Create budget period |
| PUT | `/api/budget-periods/:id/activate` | Set active budget period |
| DELETE | `/api/budget-periods/:id` | Delete budget period |
| GET | `/api/budget-periods/active` | Get active budget |
| POST | `/api/receipts/process` | Process receipt OCR |
| GET | `/api/analytics/spending-by-category` | Category analytics |
| GET | `/api/analytics/spending-over-time` | Spending over time |
| GET | `/api/analytics/monthly-comparison` | Monthly comparison |
| POST | `/api/chatbot/query` | AI chatbot query |
| GET | `/api/chatbot/history` | Chatbot query history |

---

## 🗄 Database Schema

PostgreSQL database with 8 tables:

| Table | Description |
|---|---|
| `users` | User accounts and authentication |
| `categories` | Expense categories (Food, Transport, etc.) |
| `transactions` | All expense records |
| `budgets` | Monthly budget limits per category |
| `receipts` | Receipt images and OCR data |
| `budget_periods` | Custom date-range budget periods |
| `chatbot_queries` | Natural language query history |
| `shared_accounts` | Roommate expense splitting (future) |

> See `database-setup.md` for full database setup instructions.

---

## 👤 Developer

**Riti Moradiya**
- GitHub: [@ritimoradiya](https://github.com/ritimoradiya)

---

## 📄 License

This project is for educational and portfolio purposes.
