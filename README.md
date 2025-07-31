# WAF Visualization & AI Assistant

> **Modern, interactive tool for visualizing, debugging, and optimizing AWS WAF (Web Application Firewall) and ALB (Application Load Balancer) rules.**

---

## 🚀 Overview
A powerful tool for security engineers and DevOps teams to:
- Visualize complex WAF/ALB rule relationships as interactive graphs
- Debug and test rules against real requests
- Gain AI-powered insights and recommendations
- Connect to AWS for live data or upload JSON exports

---

## 🖼️ Product Screenshots
<!--
Insert screenshots below. Recommended:
- Main Dashboard / Home
- Interactive Rule Graph
- Rule Inspector & Debugger
- AI Assistant Chat
- Dark/Light Mode
-->

| Home / Dashboard | Rule Graph Visualization |
|------------------|------------------------|
| ![Home Screenshot](screenshots/home.png) | ![Graph Screenshot](screenshots/graph.png) |

| Rule Inspector | AI Assistant Chat |
|----------------|------------------|
| ![Inspector Screenshot](screenshots/inspector.png) | ![AI Chat Screenshot](screenshots/ai_chat.png) |

---

## ✨ Features
- **Interactive WAF/ALB Rule Visualization**: Dynamic, graph-based interface
- **Rule Inspector & Debugger**: Test rules against real requests
- **AI Assistant**: OpenAI-powered insights and recommendations
- **Secure AWS Integration**: User credential system with session management
- **JSON Upload**: Offline analysis with file upload
- **Dark/Light Mode**: Responsive, modern UI
- **Export**: PDF/Image export capabilities
- **Request Testing**: Advanced debugger with attack payload libraries

---

## 🏗️ Architecture
- **Frontend**: React 19, Material-UI v7, React Flow, Vite
- **Backend**: Express.js, AWS SDK v3, express-session, CORS
- **Authentication**: Session-based user credential system
- **Data Flow**:
  - User authenticates with AWS credentials (stored securely in session)
  - Frontend fetches data from backend (live AWS or uploaded JSON)
  - Visualization and AI features run in-browser

---

## ⚡ Quick Start
```sh
git clone https://github.com/ChaimWe/waf-visualization-tool.git
cd waf-visualization-tool
npm install
npm run dev
```
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

---

## 📝 Usage

### **Getting Started**
1. **Start the App:**
   - Run both frontend and backend (`npm run dev`)
   - Open [http://localhost:5173](http://localhost:5173) in your browser

2. **Choose Your Mode:**
   - **Online Mode**: Connect to AWS for live data
   - **Offline Mode**: Upload JSON files for analysis

### **AWS Live Mode**
1. **Connect to AWS:**
   - Click the profile avatar (top-right corner)
   - Enter your AWS Access Key, Secret Key, and Region
   - Credentials are validated and stored securely in session

2. **Explore Your Data:**
   - Navigate to the Explorer page
   - Select your region and WAF/ALB resources
   - Visualize rules and relationships

### **JSON Upload Mode**
1. **Upload Files:**
   - Click "Upload Files" in the topbar
   - Select your exported AWS WAF/ALB JSON files
   - Visualize rules and relationships instantly

2. **Sample Data:**
   - Use the "Load Sample Data" button for testing
   - Explore the tool with example configurations

### **Advanced Features**
- **Rule Inspector**: Click nodes to inspect rules, dependencies, and warnings
- **AI Assistant**: Get insights and recommendations about your rules
- **Request Debugger**: Test HTTP requests against your WAF rules
- **Export**: Save visualizations as PDF or images
- **Dark/Light Mode**: Toggle themes for your preference

---

## ⚙️ Setup & Configuration

### Prerequisites
- Node.js v18+
- npm or yarn
- AWS account (for live data, optional)

### Environment Variables

#### **Frontend** (`.env` in frontend-mui/)
```ini
VITE_REACT_APP_API_BASE_URL=http://localhost:5000/api
VITE_REACT_APP_OPENAI_API_KEY=sk-...  # Optional, for AI features
```

#### **Backend** (`.env` in backend/)
```ini
PORT=5000
SESSION_SECRET=your-secret-key-here
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### **Production Environment**
```ini
# Backend
PORT=5000
SESSION_SECRET=your-production-secret-key
FRONTEND_URL=https://yourdomain.com
NODE_ENV=production

# Frontend
VITE_REACT_APP_API_BASE_URL=https://yourdomain.com/api
VITE_REACT_APP_OPENAI_API_KEY=sk-...
```

---

## 🏗️ Deployment

### **Frontend Deployment**
```sh
cd frontend-mui
npm run build
# Deploy ./dist to your static host (Vercel, Netlify, S3, etc.)
```

### **Backend Deployment**
```sh
cd backend
npm install
npm run start
# For production, use a process manager (e.g., pm2) or Docker
```

### **Docker Deployment** (Optional)
```dockerfile
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

---

## 🔒 Security Features

### **User Authentication**
- **Session-based credentials**: AWS credentials stored securely in server session
- **No frontend exposure**: Credentials never exposed to browser
- **Automatic validation**: Credentials tested on login
- **Secure logout**: Proper session destruction

### **Production Security**
- **HTTPS enforcement**: Secure cookies in production
- **CORS protection**: Restricted to frontend domain
- **Input validation**: All user inputs sanitized
- **Error handling**: No sensitive information in error messages

---

## 🧪 Testing

### **Manual Testing**
- **AWS Integration**: Test with real AWS credentials
- **JSON Upload**: Test with sample WAF/ALB configurations
- **AI Features**: Test with OpenAI API key
- **Export Features**: Test PDF/image export

### **Automated Testing** (Future)
- Unit tests for critical components
- Integration tests for AWS API calls
- End-to-end testing for user workflows

---

## 🧹 Code Quality

### **Linting**
```sh
# Frontend
cd frontend-mui
npm run lint

# Backend
cd backend
npm run lint  # Add ESLint configuration
```

### **Formatting**
- Use Prettier for consistent code formatting
- Configure your editor for automatic formatting

---

## 🔄 CI/CD

### **GitHub Actions Example**
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - run: npm run test
      # Add deployment steps
```

---

## ❓ Troubleshooting & FAQ

### **Common Issues**

**AWS Connection Problems:**
- Verify your AWS credentials are correct
- Ensure your AWS user has WAF/ALB read permissions
- Check that your region is supported

**Upload Issues:**
- Ensure JSON files are valid AWS WAF/ALB exports
- Check file size limits (10MB max)
- Verify JSON structure matches AWS format

**AI Assistant Not Working:**
- Verify OpenAI API key is set correctly
- Check API key has sufficient credits
- Ensure network connectivity to OpenAI

**Port Conflicts:**
- Change frontend port in `vite.config.js`
- Change backend port in `.env` file
- Update `VITE_REACT_APP_API_BASE_URL` accordingly

---

## 🤝 Contribution Guidelines

### **Development Setup**
1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### **Code Standards**
- Follow existing code style
- Add comments for complex logic
- Update documentation for new features
- Test your changes before submitting

---

## 📄 License
MIT License. See [LICENSE](./LICENSE) for details.

---

## 👥 Team & Contributors

### **Development Team**
- **Shalom Komer**: UI Components (Topbar, Sidebar, InspectorView)
- **Ariel Fadida**: AI Features (AIPage, AIChatPanel)
- **Yair Abraham Baruch**: Core Pages (ExplorerPage, AboutPage, HomePage)
- **Chaim Weisz**: Visualization Engine (tree/, WAFView/, RequestDebugger)

### **Contact**
- **Repository**: https://github.com/ChaimWe/waf-visualization-tool
- **Issues**: https://github.com/ChaimWe/waf-visualization-tool/issues

---

**This tool is production-ready and actively maintained.**