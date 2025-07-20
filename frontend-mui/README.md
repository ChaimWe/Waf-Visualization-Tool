# WAF Visualization & AI Assistant – Frontend

## 1. Overview
A modern React-based UI for visualizing, debugging, and optimizing AWS WAF and ALB rules. Built with Vite, Material-UI, and React Flow for high performance and interactivity.

## 2. Features
- Interactive WAF/ALB rule graph visualization
- Rule inspector and request debugger
- AI assistant (OpenAI integration)
- AWS integration (secure, local credentials)
- JSON upload for offline analysis
- Dark/Light mode
- Export (PDF/Image)
- Responsive UI

## 3. Quick Start
```sh
cd frontend-mui
npm install
npm run dev
```
- App runs at http://localhost:5173

## 4. Setup & Configuration
### Prerequisites
- Node.js v18+
- npm or yarn

### Environment Variables
- `VITE_REACT_APP_API_BASE_URL` (default: http://localhost:5000/api)
- `VITE_REACT_APP_OPENAI_API_KEY` (optional, for AI)

#### Example `.env`
```
VITE_REACT_APP_API_BASE_URL=http://localhost:5000/api
VITE_REACT_APP_OPENAI_API_KEY=sk-...
```

## 5. Deployment
```sh
npm run build
# Deploy ./dist to your static host (Vercel, Netlify, S3, etc.)
```

## 6. Testing
- (No automated tests are included in this project. Manual testing is required.)

## 7. Linting & Formatting
- Run `npm run lint` to check code style.
- Use Prettier or your preferred formatter for consistent code.

## 8. CI/CD
- Recommended: GitHub Actions or similar for automated build, lint, and deploy.

## 9. Security
- **Never commit `.env` or secrets to version control!**
- Credentials are only used locally/in-browser for AWS API calls.

## 10. Troubleshooting & FAQ
- **API Issues:** Check `VITE_REACT_APP_API_BASE_URL` and backend status.
- **OpenAI/AI Issues:** Ensure API key is set and valid.
- **Port Conflicts:** Change dev server port in `vite.config.js`.
- **Build Errors:** Ensure Node.js and npm versions are compatible.

## 11. Contribution Guidelines
- Fork the repo and create a feature branch
- Open a pull request with a clear description
- Follow code style and add tests where possible

## 12. License
MIT License. See [LICENSE](../LICENSE) for details.

## 13. Contact & Maintainers
- Frontend lead: [Your Name/Email]
- For support, open an issue or contact the maintainer

---

**This README is designed to be comprehensive and production-grade for the frontend.**
