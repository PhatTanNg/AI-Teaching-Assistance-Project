# AI Teaching Assistance Project

This repository contains both the backend API and the React frontend for the AI Teaching Assistance platform.

## Project structure

- `backend/` — Node.js + Express API providing authentication and profile endpoints.
- `frontend/` — Vite + React single-page application that consumes the backend APIs.

## Prerequisites

- Node.js 18+
- npm 9+
- A running MongoDB instance for the backend

## Backend setup

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Create a `.env` file in `backend/` with the following variables:
   ```env
   PORT=5001
   MONGODB_CONNECTIONSTRING=mongodb://localhost:27017/your-db
   ACCESS_TOKEN_SECRET=replace-with-a-strong-secret
   REFRESH_TOKEN_SECRET=replace-with-another-strong-secret
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Frontend setup

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Create a `.env` file in `frontend/` if you need to override the backend URL:
   ```env
   VITE_API_BASE_URL=http://localhost:5001
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open the app at the URL shown in the terminal (typically `http://localhost:5173`).

## Pushing to GitHub

To publish this project to the GitHub repository [`PhatTanNguyen45/testing1`](https://github.com/PhatTanNguyen45/testing1):

1. Make sure all changes are committed locally:
   ```bash
   git status
   ```
2. Add the GitHub remote (only needs to be done once):
   ```bash
   git remote add origin https://github.com/PhatTanNguyen45/testing1.git
   ```
   If a remote already exists, update it with:
   ```bash
   git remote set-url origin https://github.com/PhatTanNguyen45/testing1.git
   ```
3. Push the current branch to GitHub:
   ```bash
   git push -u origin HEAD
   ```

After pushing, you can clone the repository anywhere using:
```bash
git clone https://github.com/PhatTanNguyen45/testing1.git
```
