# 🌊 FloHub

**FloHub** is your all-in-one, AI-powered productivity hub — built for busy humans who want more flow and less chaos. Seamlessly track tasks, manage calendars, capture ideas, and chat with your AI assistant **FloCat** — all from one sleek, responsive dashboard.

---

## 🧠 What is FloHub?

FloHub brings together your day-to-day tools into a single modular workspace:

- ✅ **Task Manager** with due dates, completion tracking, and real-time sync  
- 📅 **Calendar Integration** with Google Calendar (via OAuth)  
- 💬 **AI Assistant FloCat** powered by OpenAI for summaries, Q&A, and planning help  
- 🧱 **Customizable Widgets** for a dashboard that works your way  
- 💭 **GitHub Feedback Integration** that converts user feedback into trackable GitHub issues  
- 🔐 **Secure Auth + DB** via [Neon](https://neon.tech) and [Stack Auth](https://stackframe.dev)  
- 📱 Fully responsive: use it on desktop, tablet, or mobile  

---

## ⚙️ Tech Stack

| Layer         | Tooling                                                                 |
|---------------|------------------------------------------------------------------------|
| **Frontend**  | Next.js 14, React 19, Tailwind CSS                                      |
| **Backend**   | Neon (PostgreSQL), Firebase (legacy), Express (for service endpoints)  |
| **Auth**      | Stack Auth + Neon integration (user DB + auth in sync)                 |
| **AI**        | OpenAI GPT-4o                                                           |
| **Scheduling**| Google Calendar API via OAuth 2.0                                      |
| **Deployment**| Vercel (Frontend) + Replit (Future backend memory persistence)         |

---

## 🔐 Neon + Stack Auth Integration

FloHub uses [Neon](https://neon.tech) as the **PostgreSQL database** for all core user and widget data, including real-time sync across sessions. Authentication is handled via **Stack Auth**, with seamless linkage between Neon DB and frontend session management.

### What This Means:

- Full access control per user  
- Fast, serverless DB performance  
- Simplified role-based access and persistent memory for FloCat  

---

## 🧩 Features (Built & Upcoming)

| Feature              | Status     | Notes                                                                |
|----------------------|------------|----------------------------------------------------------------------|
| Task Management      | ✅ Done     | Create, edit, delete, mark complete. Uses Firestore + SWR           |
| Calendar Integration | ✅ Done     | View today/tomorrow/week/month events from Google Calendar          |
| FloCat Chatbot       | ✅ Done     | Personalized AI assistant with memory and greeting summaries        |
| Dashboard Layout     | 🔄 In Dev  | dnd-kit-based layout system for resizable and draggable widgets     |
| Neon Auth/DB         | ✅ Live     | Replaces Firebase for secure, scalable user data handling           |
| Persistent Memory    | 🔄 In Dev  | Assistant context via Neon + Google Sheets hybrid                   |
| Voice Interface      | 🧪 Testing  | Web speech + GPT voice pipeline under early testing                 |

---

## 📖 Additional Documentation

- **[GitHub Feedback Integration Setup](./README-GITHUB-FEEDBACK.md)** - Complete guide for setting up GitHub issue creation from user feedback
- **[Push Notifications Setup](./README-NOTIFICATIONS.md)** - Guide for setting up web push notifications

---

## 🚀 Getting Started

1. **Clone the repo**
   ```bash
   git clone https://github.com/yourusername/FloHub.git
   cd FloHub