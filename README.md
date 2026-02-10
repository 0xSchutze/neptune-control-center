<div align="center">

<img src="docs/assets/logo.png" alt="Neptune Control Center Logo" width="120" />

# Neptune Control Center

**A personal development tracker for Web3 security researchers, developers, and blockchain enthusiasts — whether you're just starting out or tracking your growth as a seasoned pro**

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-39-47848F?logo=electron)](https://electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://typescriptlang.org/)

[Features](#features) • [Preview](#preview) • [Download](#download) • [Tech Stack](#tech-stack) • [License](#license)

</div>

---

## Story

I started this project when I decided to enter the Web3 security field. I needed an application to track my daily work, monitor my strengths and weaknesses, and keep my goals and important notes organized.

As the project evolved, I realized it could help others in the Web3 space—whether they're just starting their journey or are seasoned professionals looking to track their growth. So I decided to enhance both the visual design and functionality, and open-source it for the community.

This project was built with the assistance of AI tools to help accelerate development.

---

## Features

| Feature | Description |
|---------|-------------|
| **Daily Logs** | Track daily work, learnings, mood, and study hours |
| **Goal Management** | Set short and long-term goals with progress tracking |
| **Bug Bounty Tracker** | Monitor bounty programs, findings, and earnings |
| **Smart Notes** | Markdown-supported notes with categories |
| **Code Snippets** | Save and organize frequently used code |
| **Wallet & Finance** | Track earnings, expenses, and financial goals |
| **AI Analysis** | Analyze daily logs with AI to discover strengths/weaknesses |
| **AI Reviews** | Daily, weekly, monthly, and yearly AI-powered progress reports |
| **Tweet Generator** | Auto-generate tweets from your work logs |
| **AI Chat** | Integrated AI assistant for questions |
| **Dashboard** | View all statistics in one place |
| **3D Neptune Theme** | Stunning Three.js animated background |
| **Data Backup** | Export/import all data as ZIP |
| **Learning Roadmap** | Create your own roadmaps, let AI generate them, or customize AI suggestions |
| **Local Storage** | All data stays on your computer, not in the cloud |

---

## Preview

### Intro
![Intro](docs/assets/intro.gif)

### Dashboard
![Dashboard](docs/assets/dashboard.gif)

---

## Download

Download the latest version for Windows, Linux, or macOS from [Releases](https://github.com/0xSchutze/neptune-control-center/releases).

### Linux Installation Notes

- **Recommended:** `.deb` for Debian/Ubuntu-based distributions
- **Others:** Use `.AppImage` for non-Debian distributions
- **AppImage users:** Your data is stored in `Neptune Control Center_data/` folder next to the AppImage. If you move the AppImage, move this folder with it.

### Windows Installation Note

On first run, you may see an "Unknown Publisher" warning. Click "More info" → "Run anyway" to proceed.

---

## Development

Want to contribute or run from source?

```bash
# Clone the repository
git clone https://github.com/0xSchutze/neptune-control-center.git

# Navigate to project directory
cd neptune-control-center

# Install dependencies
npm install

# Run in development mode
npm run dev

# Run with Electron
npm run electron
```

### Linux Development Note
If you encounter sandbox errors during development:
```bash
sudo chown root:root node_modules/electron/dist/chrome-sandbox
sudo chmod 4755 node_modules/electron/dist/chrome-sandbox
```

---

## Tech Stack

- **Frontend:** React 18 + TypeScript
- **Desktop:** Electron
- **3D Graphics:** Three.js / React Three Fiber
- **Styling:** Tailwind CSS + Shadcn/UI
- **State:** Zustand
- **AI:** Groq API (Llama, GPT-OSS models)

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made with 💙 by [0xSchutze](https://github.com/0xSchutze)**

</div>
