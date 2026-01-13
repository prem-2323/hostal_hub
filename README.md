# Hostel Hub - Smart Hostel Management System

Hostel Hub is a comprehensive mobile and web application designed to streamline hostel management operations. It provides role-based access for Administrators and Students, facilitating efficient management of attendance, complaints, food polls, room changes, and more.

## Features

### 🌟 For Students
- **Daily Attendance**: Mark attendance with geofencing validation to ensure presence within hostel premises.
- **Mess Management**:
  - View daily menu.
  - Vote on food preferences via polls.
  - Submit food suggestions.
- **Complaints & Issues**: Report maintenance issues (electrical, plumbing, etc.) with image uploads.
- **Room Management**: Request room changes and view room details.
- **Announcements**: View important updates from the administration.
- **Profile**: Manage personal details and view stay history.

### 🛡️ For Administrators
- **Dashboard**: Overview of total students, complaints, and daily stats.
- **Attendance Monitoring**: View live attendance stats, export reports to Excel.
- **Complaint Management**: Track and resolve student complaints.
- **Mess Administration**:
  - Create food polls.
  - Manage menu suggestions.
- **Room Allocation**: Approve/Reject room change requests.
- **User Management**: Manage student records and approvals.

## Tech Stack

- **Frontend**: React Native (Expo)
- **Backend**: Node.js, Express
- **Database**: MongoDB (via Mongoose), PostgreSQL (via Drizzle ORM - *Configured but primarily using Mongo for this version*)
- **Authentication**: JWT & Face API (for biometric verification features)
- **Styling**: Custom Theme System (Light/Dark mode support)

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo Go app (for running on mobile)

## Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/prem-2323/hostal_hub.git
    cd hostal_hub
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    - Create a `.env` file in the root directory (or use existing).
    - Ensure you have the necessary API keys and database connection strings configured.

## Running the Application

To run the full stack application (Client + Server), use the following command:

```bash
npm run all:dev
```

This will concurrently start:
- **Backend Server**: Running on `http://localhost:5000` (or configured port).
- **Expo Dev Server**: For the React Native client.

### Running Individually

- **Backend Only**:
  ```bash
  npm run server:dev
  ```

- **Frontend Only**:
  ```bash
  npm run dev
  ```
  *Scan the QR code with the Expo Go app on your phone to run the mobile app.*

## Project Structure

- `/client`: React Native Expo application code.
  - `/screens`: UI screens separated by features.
  - `/components`: Reusable UI components.
  - `/constants`: Theme and configuration files.
- `/server`: Node.js Express backend.
  - `/routes`: API endpoints.
  - `/models`: Database schemas.
  - `/services`: Business logic.

## Key Features Implementation

- **Geofencing**: Uses `expo-location` to verify student location against predefined hostel coordinates.
- **Food Polls**: Interactive UI for students to vote on meal options.
- **Real-time Updates**: React Query for efficient data fetching and state management.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.