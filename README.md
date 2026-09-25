# Ledgerly

A full-stack personal finance tracker for managing income, expenses, categories, monthly budgets, and spending insights.

Ledgerly provides a React and TypeScript frontend backed by a Flask REST API. Users can register and sign in securely, record and filter transactions, organize transactions with categories, set monthly budgets, and review dashboard summaries and spending charts.

## Features

- JWT-based user registration, login, and protected application routes
- User-specific transactions with income and expense types
- Transaction filtering by type, category, and date range
- Transaction creation, validation, and deletion with confirmation
- Income and expense category management
- Monthly budgets by expense category
- Budget utilization, remaining balance, and over-budget indicators
- Dashboard summary of income, expenses, balance, category totals, and recent transactions
- Expense-breakdown and budget-utilization charts
- Responsive application navigation for authenticated and guest users
- Dockerized local development environment
- Automated frontend and backend test execution through GitHub Actions on pushes and pull requests

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- React Router
- Recharts
- Vitest
- React Testing Library

### Backend

- Python
- Flask
- SQLAlchemy
- REST API design
- JWT authentication

### DevOps and Tooling

- Docker
- Docker Compose
- GitHub Actions CI
- Git and GitHub

## Application Areas

| Area | Capabilities |
|---|---|
| Authentication | Register, log in, restore sessions, log out, and protect authenticated routes |
| Dashboard | Monthly income, expenses, balance, recent transactions, and expense-category summaries |
| Transactions | Create, filter, review, validate, and delete income and expense transactions |
| Categories | Create and organize income and expense categories |
| Budgets | Set monthly category budgets and view spent, remaining, and utilization values |
| Charts | View expense breakdown and budget utilization visualizations |

## Project Structure

```text
personal-finance-tracker/
├── client/                         # React + TypeScript frontend
│   ├── src/
│   │   ├── api/                    # API client and request/error handling
│   │   ├── components/             # Shared UI and route-protection components
│   │   ├── context/                # Authentication state
│   │   ├── layouts/                # Shared application layout
│   │   ├── pages/                  # Dashboard, transactions, budgets, auth, and other pages
│   │   ├── types/                  # TypeScript domain types
│   │   └── utils/                  # Formatting helpers
│   └── package.json
├── server/                         # Flask backend
│   ├── app/                        # Application factory, models, routes, and services
│   ├── tests/                      # Backend tests
│   └── requirements.txt
├── docker-compose.yml
└── README.md
```

## Getting Started

### Prerequisites

Install the following tools:

- Node.js and npm
- Python 3
- Docker Desktop and Docker Compose, if using containers

### Run with Docker

From the project root:

```bash
docker compose up --build
```

Use the application URLs and environment variables configured in `docker-compose.yml`.

To stop the containers:

```bash
docker compose down
```

### Run Locally

#### Frontend

```bash
cd client
npm install
npm run dev
```

#### Frontend tests

```bash
cd client
npm run test:run
npm run test:coverage
npm run build
```

#### Backend

Create and activate a Python virtual environment, install the server dependencies, configure environment variables, apply any required database migrations, and start the Flask application according to the backend setup files in `server/`.

A typical local setup is:

```bash
cd server
python -m venv .venv
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Then install dependencies and run the server using the commands defined by the backend project configuration:

```bash
pip install -r requirements.txt
```

## Testing

The project includes automated frontend and backend tests.

### Frontend coverage

The frontend test suite covers:

- API request and error handling
- Authentication context and protected routes
- Login and registration behavior
- Dashboard loading, empty, retry, and expired-session states
- Category creation and validation errors
- Budget creation, utilization states, and empty states
- Transaction creation, filtering, validation, retry, and deletion flows
- Navigation, layout, application routing, and 404 behavior
- Chart empty states and chart color/fallback logic

Run frontend tests:

```bash
cd client
npm run test:run
```

Generate frontend coverage:

```bash
cd client
npm run test:coverage
```

Generated coverage reports are intentionally excluded from version control.

### Continuous Integration

GitHub Actions runs the frontend and backend test suites automatically for:

- Pushes to the repository
- Pull requests

This provides an automated quality gate before changes are merged.

## Security and Data Handling

- Authentication uses JWT tokens.
- Authenticated API endpoints require a valid access token.
- Protected frontend routes redirect unauthenticated users to sign in.
- Financial records are scoped to the authenticated user.
- The frontend handles expired-session responses by logging the user out.

## Future Improvements

Potential next enhancements include:

- Transaction editing
- Budget editing and deletion
- Recurring transactions
- CSV transaction import/export
- Password reset and email verification
- Deployment to a cloud hosting platform
- Backend integration-test and coverage-threshold expansion

## License

Add a license for later for preferred usage model, such as MIT.
