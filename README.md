# WAF Visualization & AI Assistant

## 1. Project Overview
A modern, interactive tool for visualizing, debugging, and exploring AWS WAF (Web Application Firewall) and ALB (Application Load Balancer) rules. Built with React (frontend) and Express (backend), it empowers security engineers and DevOps teams to:

- Visualize rule relationships and dependencies
- Inspect and debug rules interactively
- Test rule behavior with real or sample requests
- Get AI-powered explanations and insights

**Note:** This tool does not automatically optimize or rewrite your rules. Optimization decisions are left to the user, based on the insights and visualizations provided.

## 2. Features
- Interactive WAF/ALB Rule Visualization
- Rule Inspector & Debugger
- AI Assistant (OpenAI integration)
- AWS Integration (secure, local credentials)
- JSON Upload for offline analysis
- Dark/Light Mode
- Responsive UI
- Export (PDF/Image)

## 3. Architecture
- **Frontend:** React, Material-UI, React Flow, Vite
- **Backend:** Express, AWS SDK, dotenv, cors
- **Data Flow:**
  - User interacts with frontend UI
  - Frontend fetches data from backend (live AWS or uploaded JSON)
  - Visualization and AI features run in-browser

## 4. Quick Start
```sh
git clone <your-repo-url>
cd <project-root>
npm install
npm run dev
```
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## 5. Setup & Configuration
### Prerequisites
- Node.js v18+
- npm or yarn
- AWS account (for live data)

### Environment Variables
- **Frontend:**
  - `VITE_REACT_APP_API_BASE_URL` (default: http://localhost:5000/api)
  - `VITE_REACT_APP_OPENAI_API_KEY` (optional, for AI)
- **Backend:**
  - `PORT` (default: 5000)
  - `AWS_REGION` (e.g., us-east-1)
  - AWS credentials via environment or local profile

### Example `.env` files
```
# frontend/.env
VITE_REACT_APP_API_BASE_URL=http://localhost:5000/api
VITE_REACT_APP_OPENAI_API_KEY=sk-...

# backend/.env
PORT=5000
AWS_REGION=us-east-1
```

## 6. Deployment
### Frontend
```sh
cd frontend-mui
npm run build
# Deploy ./dist to your static host (Vercel, Netlify, S3, etc.)
```
### Backend
```sh
cd backend
npm install
npm run start
# For production, use a process manager (e.g., pm2) or Docker
```
### Docker (optional)
Add Dockerfiles for both frontend and backend for containerized deployment.

## 7. Testing
- **Backend:** Add tests in `backend/` and run with `npm test` (expand as needed)
- **Frontend:** Add tests in `frontend-mui/` and run with your preferred framework (Jest, React Testing Library, etc.)

## 8. Linting & Formatting
- Run `npm run lint` in both frontend and backend to check code style.
- Use Prettier or your preferred formatter for consistent code.

## 9. CI/CD
- Recommended: GitHub Actions, GitLab CI, or similar for automated build, test, and deploy.
- Example workflow:
  - Install dependencies
  - Run lint and tests
  - Build frontend
  - Deploy artifacts

## 10. Security
- **Never commit `.env` or secrets to version control!**
- Credentials are only used locally/in-browser for AWS API calls.
- Review code for security best practices before production deployment.

## 11. Troubleshooting & FAQ
- **AWS Connection Issues:** Check credentials and permissions.
- **OpenAI/AI Issues:** Ensure API key is set and valid.
- **Port Conflicts:** Change dev server port in `vite.config.js` or backend `.env`.
- **Build Errors:** Ensure Node.js and npm versions are compatible.

## 12. Contribution Guidelines
- Fork the repo and create a feature branch
- Open a pull request with a clear description
- Follow code style and add tests where possible
- For major changes, open an issue first to discuss

## 13. License
MIT License. See [LICENSE](./LICENSE) for details.

## 14. Contact & Maintainers
- Project lead: [Your Name/Email]
- For support, open an issue or contact the maintainer

---

**This README is designed to be comprehensive and production-grade.**
Feel free to adapt sections for your team, deployment, or compliance needs.