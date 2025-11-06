# 🏠 ApnaParivar - Family Tree Representation

A secure, private family tree management application where families can create and manage their digital family trees with role-based access control.

## 🏗️ Project Structure

```
ApnaParivar/
├── backend/                 # Node.js Express API
│   ├── src/
│   │   ├── models/         # MongoDB schemas
│   │   ├── routes/         # API routes
│   │   ├── controllers/    # Route handlers
│   │   ├── middleware/     # Auth & validation
│   │   └── utils/          # Helper functions
│   ├── package.json
│   └── server.js
├── frontend/               # React.js application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   ├── utils/          # Helper functions
│   │   └── styles/         # CSS files
│   ├── package.json
│   └── index.html
└── README.md
```

## 🚀 Tech Stack

- **Frontend**: React.js + Vite + Tailwind CSS
- **Backend**: Node.js + Express.js
- **Database**: MongoDB Atlas
- **Authentication**: Google OAuth
- **File Storage**: Firebase Storage
- **Payments**: Razorpay (toggleable)
- **Deployment**: Vercel (Frontend) + Render (Backend)

## 🏃‍♂️ Getting Started

### Backend Setup
```bash
cd backend
npm install
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 🔐 Features

- **Multi-Family Support**: Each family has private access
- **Role-Based Access**: Admin1, Admin2, Admin3, and Viewers
- **Google Authentication**: Secure Gmail-based login
- **Family Tree Visualization**: Interactive tree diagram
- **Photo Uploads**: Secure cloud storage
- **Payment Integration**: Annual subscription model (can be disabled)
- **Search Functionality**: Find family members quickly



Built with ❤️ for families to stay connected digitally.
