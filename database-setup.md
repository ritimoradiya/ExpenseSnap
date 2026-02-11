# Database Setup

## PostgreSQL Database: expensesnap

### Tables Created (8 total):
1. **users** - User accounts and authentication
2. **categories** - Expense categories (Food, Transport, etc.)
3. **transactions** - All expense records
4. **budgets** - Monthly budget limits per category
5. **receipts** - Receipt images and OCR data
6. **shared_accounts** - For roommate expense splitting (future)
7. **account_members** - Members of shared accounts
8. **chatbot_queries** - Natural language query history

### Connection Details:
- Database: expensesnap
- User: postgres
- Host: localhost
- Port: 5432 (default)
