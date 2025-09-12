# Kerala Connect Backend API

A comprehensive Node.js + Express backend API for the Kerala Connect tourism and social media platform.

## Features

### 🔐 Authentication & Security
- JWT-based authentication
- Secure password hashing with bcrypt
- Rate limiting for API endpoints
- Input validation and sanitization
- CORS protection
- Helmet.js security headers

### 👥 User Management
- User registration and login
- Profile management
- Follow/unfollow system
- Points and rewards tracking
- User activity logging

### 📱 Social Features
- Create, read, update, delete posts
- Like/unlike posts and comments
- Commenting system with threading
- Image upload and management
- Location-based posts

### 🗺️ Places & Tourism
- Places database with detailed information
- Trending places algorithm
- Location-based search
- Category-based filtering
- Ratings and reviews system

### 🎁 Points & Rewards
- Points earning system
- Coupon management
- Redemption tracking
- Transaction history
- Leaderboards

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Helmet, CORS, bcrypt, express-rate-limit
- **File Upload**: Multer + Cloudinary
- **Validation**: express-validator
- **Logging**: Morgan
- **Environment**: dotenv

## Project Structure

```
kerala-connect-backend/
├── src/
│   ├── config/
│   │   └── database.js          # Database connection
│   ├── controllers/
│   │   └── authController.js    # Authentication logic
│   ├── middlewares/
│   │   ├── auth.js              # JWT authentication middleware
│   │   └── validation.js        # Input validation middleware
│   ├── models/
│   │   ├── User.js              # User schema
│   │   ├── Post.js              # Post schema
│   │   ├── Comment.js           # Comment schema
│   │   ├── Place.js             # Place schema
│   │   ├── Coupon.js            # Coupon schema
│   │   ├── CouponRedemption.js  # Coupon redemption schema
│   │   └── PointsTransaction.js # Points transaction schema
│   ├── routes/
│   │   └── auth.js              # Authentication routes
│   └── utils/
│       └── seedData.js          # Database seeding utility
├── uploads/                     # File upload directory
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore file
├── package.json                 # Dependencies and scripts
├── server.js                    # Main server file
└── README.md                    # This file
```

## Installation & Setup

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### 1. Clone the Repository

```bash
git clone <repository-url>
cd kerala-connect-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the environment template and configure your settings:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/kerala-connect
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:19006
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

### 4. Database Setup

Make sure MongoDB is running on your system. The application will automatically create the database and collections.

#### Install MongoDB

**Windows:**
1. Download MongoDB from the official website
2. Install and start the MongoDB service
3. Default connection: `mongodb://localhost:27017`

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb/brew/mongodb-community
```

**Linux (Ubuntu):**
```bash
sudo apt update
sudo apt install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

### 5. Start the Server

For development:
```bash
npm run dev
```

For production:
```bash
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

## API Endpoints

### Authentication

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/api/auth/signup` | Register new user | Public |
| POST | `/api/auth/login` | Login user | Public |
| POST | `/api/auth/logout` | Logout user | Private |
| GET | `/api/auth/me` | Get current user | Private |
| POST | `/api/auth/refresh-token` | Refresh JWT token | Private |

### Users (To be implemented)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/users/:id` | Get user profile | Public |
| PUT | `/api/users/me` | Update profile | Private |
| POST | `/api/users/:id/follow` | Follow user | Private |
| DELETE | `/api/users/:id/follow` | Unfollow user | Private |
| GET | `/api/users/me/points` | Get user points | Private |

### Posts (To be implemented)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/posts/feed` | Get user feed | Private |
| POST | `/api/posts` | Create post | Private |
| GET | `/api/posts/:id` | Get post by ID | Public |
| PUT | `/api/posts/:id` | Update post | Private |
| DELETE | `/api/posts/:id` | Delete post | Private |
| POST | `/api/posts/:id/like` | Like post | Private |
| DELETE | `/api/posts/:id/like` | Unlike post | Private |

### Comments (To be implemented)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/posts/:id/comments` | Get post comments | Public |
| POST | `/api/posts/:id/comments` | Add comment | Private |
| PUT | `/api/comments/:id` | Update comment | Private |
| DELETE | `/api/comments/:id` | Delete comment | Private |

### Places (To be implemented)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/places` | Get places with filters | Public |
| GET | `/api/places/trending` | Get trending places | Public |
| GET | `/api/places/:id` | Get place details | Public |
| POST | `/api/places` | Create place | Private |
| PUT | `/api/places/:id` | Update place | Private |

### Coupons (To be implemented)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/coupons` | Get available coupons | Private |
| GET | `/api/coupons/my-coupons` | Get user's coupons | Private |
| POST | `/api/coupons/:id/redeem` | Redeem coupon | Private |

### File Upload (To be implemented)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/api/upload` | Upload image | Private |

## Request/Response Format

All API responses follow this standard format:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": [
    // Additional error details (for validation errors)
  ]
}
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer your-jwt-token-here
```

## Rate Limiting

- Authentication endpoints: 5-10 requests per 15 minutes per IP
- General endpoints: 1000 requests per 15 minutes per IP

## Input Validation

All input data is validated using express-validator. Validation errors are returned with detailed error messages.

## Database Models

### User Model
- username, email, password, fullName, bio
- profilePicture, followers, following, points
- Activity tracking and account status

### Post Model
- content, images, location, tags
- likes, comments, visibility settings
- Engagement metrics and trending scores

### Place Model
- name, description, category, location
- images, ratings, reviews, features
- Trending algorithm and search capabilities

### Coupon Model
- title, description, discount details
- points cost, validity period, usage limits
- Partner information and redemption tracking

## Points System

Users earn points through various activities:
- **Welcome bonus**: 10 points
- **Daily login**: 1 point
- **Create post**: 5 points
- **Receive like**: 2 points
- **Receive comment**: 3 points

## Error Handling

The application includes comprehensive error handling:
- Mongoose validation errors
- JWT authentication errors
- Database connection errors
- Rate limiting errors
- File upload errors

## Security Features

- Password hashing with bcrypt (cost factor: 12)
- JWT token expiration
- Rate limiting on sensitive endpoints
- Input validation and sanitization
- CORS protection
- Security headers with Helmet.js

## Development

### Available Scripts

```bash
# Start development server with nodemon
npm run dev

# Start production server
npm start

# Run tests (when implemented)
npm test

# Seed database with sample data
npm run seed
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment mode | development |
| PORT | Server port | 3000 |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/kerala-connect |
| JWT_SECRET | JWT signing secret | Required |
| JWT_EXPIRES_IN | JWT expiration time | 7d |
| FRONTEND_URL | Frontend URL for CORS | http://localhost:19006 |

## Deployment

### Production Setup

1. Set environment variables for production
2. Use a process manager like PM2
3. Set up MongoDB Atlas or other cloud database
4. Configure Cloudinary for image hosting
5. Set up proper logging and monitoring

### Example PM2 Configuration

```json
{
  "name": "kerala-connect-api",
  "script": "server.js",
  "env": {
    "NODE_ENV": "production",
    "PORT": 3000
  }
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Create an issue in the repository
- Contact the development team

---

**Kerala Connect Backend** - Powering the future of Kerala tourism! 🌴