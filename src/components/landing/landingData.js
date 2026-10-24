import {
  User, Users, Sparkles, Palette, ShieldCheck,
  Zap, CheckCheck, MessageSquareDot,
  UserPlus, Search, KeyRound,
} from "lucide-react";

export const SECTION =
  "scroll-mt-16 px-4 py-14 sm:px-6 sm:py-20 lg:py-24";
export const H2 =
  "text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-4xl";
export const GRADIENT =
  "bg-gradient-to-br from-primary to-secondary text-primary-content";
export const GRADIENT_TEXT =
  "bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent";

export const EASE = [0.22, 1, 0.36, 1];
export const SPRING = { type: "spring", stiffness: 380, damping: 30 };

export const heroContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};
export const heroItem = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: EASE } },
};
export const gridContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
export const gridItem = {
  hidden: { opacity: 0, y: 26, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE } },
};
export const bubbleStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.35, delayChildren: 0.3 } },
};
export const bubble = {
  hidden: { opacity: 0, y: 14, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: EASE } },
};

export const SUPPORT_EMAIL = "itme.payalyadav@gmail.com";
export const AUTHOR_URL = "https://itspayal.in";

export const NAV_LINKS = [
  { label: "Features", id: "features" },
  { label: "AI & Groups", id: "ai-groups" },
  { label: "Themes", id: "themes" },
  { label: "Security", id: "security" },
  { label: "FAQ", id: "faq" },
];

export const HIGHLIGHTS = [
  { icon: User, label: "One-to-one chats" },
  { icon: Users, label: "Group chats" },
  { icon: Sparkles, label: "Built-in AI" },
  { icon: Palette, label: "Multi-theme" },
  { icon: ShieldCheck, label: "2FA security" },
];

export const FEATURES = [
  { icon: Zap, title: "Real-time one-to-one messaging", span: "lg:col-span-2", desc: "Messages arrive the instant they're sent, powered by WebSockets. Share text, emojis and images in a smooth, lag-free conversation." },
  { icon: Sparkles, title: "Chat with AI", accent: true, desc: "Ask questions, brainstorm or get quick answers from the built-in AI, right inside Chatty." },
  { icon: Users, title: "Group chats", desc: "Create groups, add your people and keep every conversation together in one place." },
  { icon: Palette, title: "Multiple themes", span: "lg:col-span-2", desc: "Switch between beautiful themes in a tap, from light and clean to dark and dramatic." },
  { icon: ShieldCheck, title: "Two-factor authentication", desc: "Add a second step at login so only you can get into your account." },
  { icon: KeyRound, title: "Forgot & reset password", desc: "Locked out? Recover your account securely and set a new password in a few steps." },
  { icon: CheckCheck, title: "Read receipts", desc: "Clear sent, delivered and seen states, respecting each person's privacy preferences." },
  { icon: MessageSquareDot, title: "Typing indicators", desc: "See when someone is writing a reply, only when their settings allow it." },
];

export const STEPS = [
  { icon: UserPlus, title: "Create your account", desc: "Sign up in seconds, add a photo and secure it with two-factor authentication." },
  { icon: Search, title: "Find your people", desc: "Start a one-to-one chat, create a group or say hi to the AI assistant." },
  { icon: Palette, title: "Make it yours", desc: "Pick a theme, set your privacy preferences and start talking your way." },
];

export const FAQS = [
  { q: "What is Chatty?", a: "Chatty is a real-time messaging app for fast, personal and beautifully simple conversations. It supports one-to-one messages, group chats, an AI assistant, multiple themes and strong account security." },
  { q: "Does Chatty have group chats?", a: "Yes. You can create group chats, add the people you want and talk together in real time, alongside your regular one-to-one conversations." },
  { q: "Can I chat with AI?", a: "Yes. Chatty includes an AI chat so you can ask questions, get ideas or draft replies without leaving the app." },
  { q: "How do themes work?", a: "Open Settings and pick from multiple themes. The whole interface changes instantly, and your choice is remembered for next time." },
  { q: "What is two-factor authentication (2FA)?", a: "2FA adds a second verification step when you log in, on top of your password. Even if someone knows your password, they can't get into your account without the second step." },
  { q: "I forgot my password. What do I do?", a: "Click \"Forgot password\" on the login page, verify it's you, then set a new password with the reset step. You'll be back in your chats in minutes." },
  { q: "Can I control my online visibility?", a: "Absolutely. Under Settings → Privacy, toggle \"Show online status\" to decide whether other people can see when you are online. Read receipts and typing indicators have their own switches too." },
  { q: "Does Chatty work on mobile?", a: "Yes. Chatty is fully responsive and works well in desktop, tablet and mobile browsers." },
];

export const CTA_POINTS = ["Free to join", "Real-time conversations", "Secured with 2FA"];

export const CHATS = [
  { id: 1, type: "direct", initials: "PS", name: "Priya Sharma", online: true, preview: "Sounds good! See you then 🎉", time: "2m", unread: 0 },
  { id: 2, type: "group", initials: "DT", name: "Design Team", members: "Aryan, Sofia, Jordan +2", preview: "Sofia: Uploading the final mockups", time: "6m", unread: 3 },
  { id: 3, type: "ai", initials: "AI", name: "Chatty AI", online: true, preview: "Here are 3 ideas for your trip ✨", time: "now", unread: 0 },
  { id: 4, type: "direct", initials: "AM", name: "Aryan Mehta", online: false, preview: "Can you share the slides?", time: "14m", unread: 2 },
];

export const CONVOS = {
  1: [
    { me: false, text: "Hey! Are we still meeting tomorrow?", time: "10:22 AM" },
    { me: true, text: "Yes, absolutely! Looking forward to it 😊", time: "10:23 AM", status: "seen" },
    { me: false, text: "Perfect. I'll bring the project files.", time: "10:24 AM" },
    { me: true, text: "Sounds good! See you at the usual spot 📍", time: "10:25 AM", status: "delivered" },
    { me: false, text: "See you then 🎉", time: "10:26 AM" },
  ],
  2: [
    { me: false, from: "Aryan", text: "Team, standup in 5 minutes 🕘", time: "9:55 AM" },
    { me: false, from: "Jordan", text: "Joining now!", time: "9:56 AM" },
    { me: true, text: "On my way. Sharing the new theme options today 🎨", time: "9:57 AM", status: "seen" },
    { me: false, from: "Sofia", text: "Uploading the final mockups", time: "10:02 AM" },
  ],
  3: [
    { me: true, text: "Plan a 3-day trip to Goa on a budget?", time: "11:01 AM", status: "seen" },
    { me: false, ai: true, text: "Sure! Day 1: North Goa beaches and a sunset at Chapora. Day 2: Old Goa churches and local food. Day 3: South Goa chill and cafes.", time: "11:01 AM" },
    { me: true, text: "Nice. Make it shorter 🙏", time: "11:02 AM", status: "seen" },
    { me: false, ai: true, text: "North beaches → Old Goa → South Goa relax. Done ✨", time: "11:02 AM" },
  ],
  4: [
    { me: false, text: "Morning! Did the deck come together?", time: "9:40 AM" },
    { me: true, text: "Almost — just polishing the last few slides.", time: "9:42 AM", status: "seen" },
    { me: false, text: "Can you share the slides?", time: "9:58 AM" },
  ],
};

export const THEMES = [
  "light", "dark", "cupcake", "synthwave", "retro",
  "cyberpunk", "valentine", "dracula", "forest", "aqua",
];
