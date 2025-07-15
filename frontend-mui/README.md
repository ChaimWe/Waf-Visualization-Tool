# WAF Visualization & AI Assistant (frontend-mui)

A modern, interactive web application for visualizing, debugging, and optimizing AWS WAF (Web Application Firewall) and ALB (Application Load Balancer) rules. Built with React, Material-UI (MUI), and Vite, this tool empowers security engineers and DevOps teams to:

- **Visualize** complex WAF/ALB rule relationships as interactive graphs
- **Debug** and test rules against real requests
- **Gain AI-powered insights** and recommendations
- **Connect to AWS** for live data or upload JSON exports

---

## 🚀 Features

- **Interactive WAF/ALB Rule Visualization**: Explore your rules as dynamic, dependency-aware graphs.
- **Rule Inspector & Debugger**: Drill into rule details, dependencies, and test with sample requests.
- **AI Assistant**: Chat with an AI to get explanations, optimizations, and security recommendations for your rules.
- **AWS Integration**: Securely connect with your AWS credentials to fetch live WAF/ALB data (credentials are stored locally, never sent to any server).
- **JSON Upload**: Load WAF/ALB rule sets from exported JSON files for offline analysis.
- **Dark/Light Mode**: Seamless theme switching for comfortable viewing.
- **Responsive UI**: Works great on desktops and tablets.

---

## 🖥️ Project Structure

- `src/`
  - `components/` – UI components (Sidebar, Topbar, WAFView, AIChatPanel, etc.)
  - `pages/` – Main app pages (Home, Explorer, AI, Debugger, ALB, ALB+ACL, About)
  - `context/` – React contexts for theme, AWS credentials, and data sources
  - `assets/` – Images and static assets
  - `theme.js` – Light and dark theme definitions
  - `main.jsx` – App entry point

---

## 🛠️ Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

```bash
cd frontend-mui/frontend-mui
npm install
# or
yarn install
```

### Running the App (Development)

```bash
npm run dev
# or
yarn dev
```

- The app will be available at [http://localhost:5173](http://localhost:5173) by default.

### Building for Production

```bash
npm run build
# or
yarn build
```

### Linting

```bash
npm run lint
```

---

## 🔑 AWS Integration (Optional)

- Click **Connect AWS** on the Home page or in the top bar.
- Enter your **AWS Access Key ID**, **Secret Access Key**, and select a region.
- Credentials are validated with AWS STS and stored **locally** (never sent to any server).
- Once connected, you can fetch live WAF/ALB rule data for visualization and debugging.

> **Security Note:** Credentials are only used in-browser for AWS API calls and are never transmitted to any third-party server.

---

## 📄 Uploading WAF/ALB JSON

- Use the **Upload JSON** button in the top bar or relevant pages to load exported WAF/ALB rule sets.
- Supported formats: AWS WAFv2 WebACL JSON, ALB rule JSON.
- Once loaded, rules are visualized and available for AI analysis and debugging.

---

## 🧠 AI Assistant

- Access the **AI Assistant** from the sidebar or `/ai` route.
- Ask questions about your loaded rules, request explanations, or get optimization tips.
- The AI can:
  - Summarize rule logic
  - Suggest improvements
  - Explain dependencies
  - Answer security best practices

> **Note:** Requires an OpenAI API key (set via environment variable `VITE_REACT_APP_OPENAI_API_KEY`).

---

## 🗺️ Navigation & Main Pages

- **Home**: Overview, quick start, and AWS connect.
- **WAF Tree**: Visualize WAF/ALB rules as interactive graphs.
- **WAF & ALB Visualizer**: Combined view for ALB and attached ACLs.
- **Request Debugger**: Test rules against sample requests.
- **AI Assistant**: Chat with AI about your rules.
- **About**: Project info and credits.

---

## ⚙️ Configuration

- **Vite** is used for fast development and builds. See `vite.config.js` for customization.
- **Themes**: Toggle dark/light mode from the UI (uses MUI theming).
- **Environment Variables**:
  - `VITE_REACT_APP_OPENAI_API_KEY` – Required for AI Assistant (OpenAI GPT-3.5/4 API key)

---

## 🧩 Extending & Customization

- Add new pages in `src/pages/`
- Add/modify components in `src/components/`
- Update theme in `src/theme.js`
- Integrate additional AWS services by extending context/providers

---

## 🐞 Troubleshooting

- **AWS Connection Issues**: Ensure credentials are correct and have required permissions for WAF/ALB APIs.
- **OpenAI/AI Issues**: Make sure your API key is set and has sufficient quota.
- **JSON Upload Errors**: Validate your JSON file format matches AWS export structure.
- **Port Conflicts**: Change the dev server port in `vite.config.js` if needed.

---

## 📢 Feedback & Contributions

Pull requests and issues are welcome! Please open an issue for bugs, feature requests, or questions.

---

## 📜 License

MIT License. See [LICENSE](../LICENSE) for details.
