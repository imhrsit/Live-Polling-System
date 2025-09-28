# Live Polling System

A real-time polling application where teachers can create polls and students can answer them, with live result updates for both parties.

## 📋 Project Overview

This is a full-stack polling application built with React (frontend) and Express.js (backend), featuring real-time communication through Socket.io and MongoDB Atlas for data persistence.

## 🚀 Features

### Teacher Features
- Create polls with multiple choice questions
- Set custom time limits (default 60 seconds)
- Monitor live responses in real-time
- View detailed results and statistics
- Control poll flow (start/stop)

### Student Features
- Join polls with a simple name entry
- Submit answers within the time limit
- View live results after submission
- Real-time updates throughout the polling process

## 🛠️ Technology Stack

### Frontend
- **React** - UI framework
- **Redux Toolkit** - State management
- **React Router DOM** - Navigation
- **Socket.io Client** - Real-time communication
- **Axios** - HTTP requests
- **Tailwind CSS** - Styling

### Backend
- **Express.js** - Web framework
- **Socket.io** - Real-time WebSocket communication
- **MongoDB Atlas** - Cloud database
- **Mongoose** - MongoDB object modeling
- **CORS** - Cross-origin resource sharing

## 📁 Project Structure

```
polling-system/
├── client/                 # React frontend
│   ├── public/            # Static files
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── Teacher/   # Teacher-specific components
│   │   │   ├── Student/   # Student-specific components
│   │   │   └── Common/    # Shared components
│   │   ├── redux/         # Redux store and slices
│   │   ├── services/      # API and Socket.io services
│   │   └── ...
│   ├── package.json
│   └── .env
├── server/                # Express backend
│   ├── models/           # MongoDB schemas
│   ├── routes/           # API routes
│   ├── socket/           # Socket.io event handlers
│   ├── server.js         # Main server file
│   ├── package.json
│   └── .env
├── package.json          # Root package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- MongoDB Atlas account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd polling-system
   ```

2. **Install dependencies for both client and server**
   ```bash
   npm run install-all
   ```
   Or manually:
   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

3. **Set up environment variables**
   
   **Server (.env in /server folder):**
   ```env
   PORT=5003
   MONGODB_URI=your_mongodb_atlas_connection_string
   SESSION_SECRET=your-secret-key
   NODE_ENV=development
   CLIENT_URL=http://localhost:3000
   ```

   **Client (.env in /client folder):**
   ```env
   REACT_APP_SERVER_URL=http://localhost:5003
   REACT_APP_SOCKET_URL=http://localhost:5003
   REACT_APP_POLL_TIMEOUT=60
   REACT_APP_MAX_OPTIONS=6
   ```

4. **Start the development servers**
   ```bash
   # From root directory - starts both client and server
   npm run dev
   ```

   Or start separately:
   ```bash
   # Server (from root)
   npm run server

   # Client (from root) 
   npm run client
   ```

### URLs
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5003

## 🔄 Real-time Events

The application uses Socket.io for real-time communication:

- `teacher-create-poll` - Teacher creates a new poll
- `student-join` - Student joins a poll room
- `poll-started` - Poll becomes active
- `submit-answer` - Student submits an answer
- `results-update` - Live results broadcast
- `poll-ended` - Poll timeout/completion

## 📊 Database Schema

### Poll Schema
```javascript
{
  _id: ObjectId,
  question: String,
  options: [String],
  createdBy: String,
  timeLimit: Number (default: 60),
  isActive: Boolean,
  createdAt: Date
}
```

### Response Schema
```javascript
{
  pollId: ObjectId,
  studentId: String,
  studentName: String,
  answer: String,
  answeredAt: Date
}
```

## 🚀 Deployment

### Vercel Deployment (Frontend)
1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Backend Deployment
- Deploy server to Railway, Heroku, or similar platform
- Update client environment variables with production server URL

## 📝 Development Guidelines

1. **Code Structure:** Follow the established folder structure
2. **Naming Conventions:** Use camelCase for variables, PascalCase for components
3. **State Management:** Use Redux Toolkit for global state
4. **Styling:** Use Tailwind CSS classes for consistent styling
5. **Real-time:** Implement Socket.io events for live functionality

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 👨‍💻 Author

**Harsh Tiwari**

---