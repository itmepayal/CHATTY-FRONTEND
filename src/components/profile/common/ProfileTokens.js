/**
 * Centralized Design Tokens & Constants for Profile Module
 * Fully aligned with Settings Module design system & tokens.
 */
import { User, AtSign, Mail, Phone, Users, Calendar, MapPin, Globe } from "lucide-react";

export const PROFILE_SPRING = {
  type: "spring",
  stiffness: 420,
  damping: 32,
};

export const PROFILE_SOFT = {
  type: "spring",
  stiffness: 280,
  damping: 26,
};

export const PROFILE_VARIANTS = {
  list: {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.02 },
    },
  },
  item: {
    hidden: { opacity: 0, y: 8 },
    show: {
      opacity: 1,
      y: 0,
      transition: PROFILE_SOFT,
    },
  },
  fade: {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
  },
};

export const FIELDS = [
  {
    name: "fullName",
    label: "Full name",
    icon: User,
    type: "text",
    placeholder: "Your full name",
    required: true,
    autoComplete: "name",
  },
  {
    name: "username",
    label: "Username",
    icon: AtSign,
    type: "text",
    placeholder: "username",
    autoComplete: "username",
    copyable: true,
  },
  {
    name: "email",
    label: "Email",
    icon: Mail,
    type: "email",
    readOnly: true,
    copyable: true,
  },
  {
    name: "phone",
    label: "Phone",
    icon: Phone,
    type: "tel",
    placeholder: "+91 98765 43210",
    autoComplete: "tel",
  },
  {
    name: "gender",
    label: "Gender",
    icon: Users,
    type: "select",
    options: ["Female", "Male", "Other", "Prefer not to say"],
  },
  { name: "dob", label: "Date of birth", icon: Calendar, type: "date" },
  {
    name: "location",
    label: "Location",
    icon: MapPin,
    type: "text",
    placeholder: "City, Country",
  },
  {
    name: "website",
    label: "Website / Portfolio",
    icon: Globe,
    type: "url",
    placeholder: "https://yoursite.com",
    autoComplete: "url",
  },
];

export const FIELD_MAP = Object.fromEntries(FIELDS.map((f) => [f.name, f]));
export const READ_ONLY_FIELDS = FIELDS.filter((f) => f.readOnly).map((f) => f.name);

export const GROUPS = [
  {
    title: "Basic details",
    hint: "How your identity appears across conversations and groups.",
    icon: User,
    fields: ["fullName", "username", "gender", "dob"],
  },
  {
    title: "Contact information",
    hint: "Your email is account-verified and protected from unauthorized changes.",
    icon: Mail,
    fields: ["email", "phone"],
  },
  {
    title: "Find me online",
    hint: "Public location and personal or professional website links.",
    icon: Globe,
    fields: ["location", "website"],
  },
];

export const BIO_MAX = 160;
export const PW_MIN = 8;
export const PW_MAX = 15;
export const AVATAR_MAX_MB = 2;
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const PASSWORD_RULES = [
  {
    id: "len",
    label: `${PW_MIN} to ${PW_MAX} characters`,
    test: (v) => v.length >= PW_MIN && v.length <= PW_MAX,
  },
  {
    id: "case",
    label: "Upper & lower case letters",
    test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v),
  },
  { id: "num", label: "At least one number", test: (v) => /\d/.test(v) },
  {
    id: "sym",
    label: "A symbol (e.g. ! @ # $ %)",
    test: (v) => /[^A-Za-z0-9]/.test(v),
  },
];

export const STRENGTH_LABELS = ["Too weak", "Weak", "Fair", "Good", "Strong"];
export const STRENGTH_BAR = [
  "bg-error",
  "bg-error",
  "bg-warning",
  "bg-info",
  "bg-success",
];
export const STRENGTH_TEXT = [
  "text-error",
  "text-error",
  "text-warning",
  "text-info",
  "text-success",
];
