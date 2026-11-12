import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Lock,
  KeyRound,
  Phone,
  Video,
  Users,
  MapPin,
  CalendarClock,
  Timer,
  SmilePlus,
  Pin,
  Reply,
  Forward,
  Pencil,
  Link2,
  Mic,
  Paperclip,
  CheckCheck,
  Keyboard,
  UserCheck,
  Ban,
  Flag,
  Archive,
  Star,
  Smartphone,
  BellRing,
  Eye,
  EyeOff,
  Palette,
  Type,
  LayoutList,
  Clock,
  MonitorSmartphone,
  Check,
} from "lucide-react";
import {
  SECTION,
  GRADIENT,
  SPRING,
  EASE,
  gridContainer,
  gridItem,
} from "./landingData";
import { SectionHeading } from "./LandingPrimitives";

const HERO_FEATURES = [
  {
    icon: ShieldCheck,
    title: "End-to-end encrypted chats",
    desc: "Messages are encrypted on your device with per-user public keys and unlocked only by the person you're talking to. Group chats use versioned group keys that rotate when membership changes.",
    points: [
      "Encrypted 1:1 and group messages",
      "Automatic group key rotation",
      "Keys never leave your device unencrypted",
    ],
    span: "lg:col-span-4",
    accent: true,
    visual: "e2ee",
  },
  {
    icon: Video,
    title: "Audio & video calls",
    desc: "Call any contact one-to-one, or start a group call right from the group.",
    points: ["1:1 audio and video", "Group calls", "Full call history"],
    span: "lg:col-span-2",
  },
  {
    icon: Users,
    title: "Groups with roles",
    desc: "Owner, admins and members, with control over who is allowed to add you.",
    points: ["Admin & member roles", "Group avatars", "Archive groups"],
    span: "lg:col-span-2",
  },
  {
    icon: MapPin,
    title: "Live location sharing",
    desc: "Share where you are with a contact or a group for a limited time. Stop anytime; it expires on its own.",
    points: ["Real-time updates", "Auto-expiry", "Stop whenever you like"],
    span: "lg:col-span-2",
  },
  {
    icon: CalendarClock,
    title: "Schedule & disappear",
    desc: "Write now, send later. Or let a conversation clean itself up on a timer you choose.",
    points: ["Scheduled messages", "Timers: 24h, 7d, 90d", "Per-chat control"],
    span: "lg:col-span-2",
  },
];

const CATEGORIES = [
  {
    id: "messaging",
    label: "Messaging",
    items: [
      {
        icon: Reply,
        title: "Replies",
        desc: "Quote any message to keep context in busy chats.",
      },
      {
        icon: SmilePlus,
        title: "Reactions",
        desc: "React with emoji instead of sending another message.",
      },
      {
        icon: Pencil,
        title: "Edit messages",
        desc: "Fix a typo after sending. Edited messages are clearly marked.",
      },
      {
        icon: Forward,
        title: "Forward",
        desc: "Pass a message on to another chat in one tap.",
      },
      {
        icon: Pin,
        title: "Pinned messages",
        desc: "Keep important messages one tap away.",
      },
      {
        icon: Link2,
        title: "Link previews",
        desc: "Links expand with a title, description and image.",
      },
      {
        icon: Mic,
        title: "Voice & video notes",
        desc: "Send audio and video clips with duration shown.",
      },
      {
        icon: Paperclip,
        title: "Photos & files",
        desc: "Share images and documents with name and size details.",
      },
      {
        icon: Archive,
        title: "Archive chats",
        desc: "Tuck away conversations without deleting them.",
      },
    ],
  },
  {
    id: "privacy",
    label: "Privacy & Security",
    items: [
      {
        icon: KeyRound,
        title: "Two-factor authentication",
        desc: "Add an authenticator-app step to your sign-in.",
      },
      {
        icon: Lock,
        title: "Recovery codes",
        desc: "Backup codes so you never get locked out.",
      },
      {
        icon: BellRing,
        title: "Login alerts",
        desc: "Get notified when your account is accessed.",
      },
      {
        icon: MonitorSmartphone,
        title: "Device sessions",
        desc: "See every signed-in device with browser, OS and location, and revoke any of them.",
      },
      {
        icon: Eye,
        title: "Last seen & online",
        desc: "Choose who can see when you were last active or online.",
      },
      {
        icon: UserCheck,
        title: "Profile visibility",
        desc: "Control who sees your photo and About: everyone, contacts or no one.",
      },
      {
        icon: CheckCheck,
        title: "Read receipts",
        desc: "Sent, delivered and seen. Turn it off if you prefer.",
      },
      {
        icon: Ban,
        title: "Block users",
        desc: "Stop unwanted contact instantly.",
      },
      {
        icon: Flag,
        title: "Report abuse",
        desc: "Report spam, harassment or impersonation with details.",
      },
    ],
  },
  {
    id: "personal",
    label: "Personalization",
    items: [
      {
        icon: Palette,
        title: "Themes",
        desc: "Pick the look that suits you, light or dark.",
      },
      {
        icon: Type,
        title: "Font size",
        desc: "Small, medium or large text for comfortable reading.",
      },
      {
        icon: LayoutList,
        title: "Bubble style",
        desc: "Rounded, soft or sharp message bubbles.",
      },
      {
        icon: LayoutList,
        title: "Density",
        desc: "Comfortable or compact spacing between messages.",
      },
      {
        icon: Clock,
        title: "Timestamps",
        desc: "Show or hide times, in 12-hour or 24-hour format.",
      },
      {
        icon: Keyboard,
        title: "Enter to send",
        desc: "Send with Enter, or use it for a new line.",
      },
      {
        icon: SmilePlus,
        title: "Large emoji",
        desc: "Emoji-only messages show bigger.",
      },
      {
        icon: Star,
        title: "Favorites & nicknames",
        desc: "Star your people and give contacts your own nicknames.",
      },
      {
        icon: EyeOff,
        title: "Typing indicator",
        desc: "Show or hide when you're typing.",
      },
    ],
  },
];

const E2EEVisual = () => (
  <div
    aria-hidden="true"
    className="relative hidden w-full max-w-xs flex-col gap-3 self-center md:flex"
  >
    <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md border border-primary/20 bg-base-100/80 px-4 py-3 shadow-sm backdrop-blur">
      <p className="text-sm">Reached the station</p>
      <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-base-content/50">
        <Lock className="size-3" /> Encrypted
      </p>
    </div>
    <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-base-300 bg-base-100/80 px-4 py-3 shadow-sm backdrop-blur">
      <p className="font-mono text-xs tracking-widest text-base-content/40">
        •••• •••• ••••
      </p>
      <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-primary">
        <ShieldCheck className="size-3" /> Only you two can read this
      </p>
    </div>
    <div className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
      <CheckCheck className="size-3.5" /> Seen
    </div>
  </div>
);

const HeroCard = ({
  icon: Icon,
  title,
  desc,
  points,
  span = "",
  accent = false,
  visual,
}) => (
  <motion.article
    variants={gridItem}
    whileHover={{ y: -6 }}
    transition={SPRING}
    className={`group relative flex overflow-hidden rounded-3xl border p-6 transition-colors duration-300 sm:p-7 ${span} ${
      accent
        ? "border-primary/40 bg-gradient-to-br from-primary/15 via-secondary/10 to-transparent hover:border-primary/60"
        : "border-base-300 bg-base-200/50 hover:border-primary/40 hover:bg-base-200"
    }`}
  >
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-primary/0 blur-3xl transition-colors duration-500 group-hover:bg-primary/25"
    />

    <div className="relative flex w-full flex-col gap-6 md:flex-row md:items-center md:justify-between">
      <div className="flex-1">
        <div
          className={`mb-5 inline-flex size-12 items-center justify-center rounded-2xl ${
            accent
              ? `${GRADIENT} shadow-lg shadow-primary/30`
              : "border border-primary/20 bg-primary/10"
          }`}
        >
          <Icon className={`size-5 ${accent ? "" : "text-primary"}`} />
        </div>

        <h3 className="mb-2 text-lg font-semibold tracking-tight">{title}</h3>
        <p className="mb-5 text-sm leading-relaxed text-base-content/65">
          {desc}
        </p>

        <ul className="space-y-2">
          {points.map((p) => (
            <li
              key={p}
              className="flex items-center gap-2 text-sm text-base-content/80"
            >
              <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Check className="size-3" strokeWidth={3} />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>

      {visual === "e2ee" && <E2EEVisual />}
    </div>
  </motion.article>
);

const MiniCard = ({ icon: Icon, title, desc }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.3, ease: EASE }}
    whileHover={{ y: -3 }}
    className="group flex items-start gap-4 rounded-2xl border border-base-300 bg-base-100 p-4 transition-colors hover:border-primary/40 hover:bg-base-200/60 sm:p-5"
  >
    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
      <Icon className="size-[18px]" />
    </span>
    <div className="min-w-0">
      <h4 className="text-sm font-semibold">{title}</h4>
      <p className="mt-1 text-[13px] leading-relaxed text-base-content/60">
        {desc}
      </p>
    </div>
  </motion.div>
);

const CategoryExplorer = () => {
  const [active, setActive] = useState(CATEGORIES[0].id);
  const current = CATEGORIES.find((c) => c.id === active);

  return (
    <div className="mt-16 sm:mt-20">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <h3 className="text-xl font-bold tracking-tight sm:text-2xl">
          And a whole lot more, built in
        </h3>
        <p className="max-w-xl text-sm text-base-content/60">
          The details that make everyday conversations smoother, safer and more
          personal.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Feature categories"
        className="mx-auto mb-8 flex w-full max-w-md items-center gap-1 rounded-full border border-base-300 bg-base-200/60 p-1"
      >
        {CATEGORIES.map(({ id, label }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`panel-${id}`}
              onClick={() => setActive(id)}
              className={`relative flex-1 rounded-full px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:text-sm ${
                isActive
                  ? "text-primary-content"
                  : "text-base-content/70 hover:text-base-content"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="feature-tab"
                  transition={SPRING}
                  className="absolute inset-0 -z-10 rounded-full bg-primary shadow-md shadow-primary/30"
                />
              )}
              {label}
            </button>
          );
        })}
      </div>

      <div id={`panel-${active}`} role="tabpanel">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3"
          >
            {current.items.map((item) => (
              <MiniCard key={item.title} {...item} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

const TrustStrip = () => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, ease: EASE }}
    className="mt-14 flex flex-col items-center justify-between gap-5 rounded-3xl border border-base-300 bg-base-200/50 px-6 py-6 sm:mt-16 md:flex-row md:px-8"
  >
    <div className="flex items-center gap-4 text-center md:text-left">
      <span
        className={`hidden size-11 shrink-0 items-center justify-center rounded-2xl sm:inline-flex ${GRADIENT} shadow-lg shadow-primary/25`}
      >
        <Smartphone className="size-5" />
      </span>
      <div>
        <p className="font-semibold">Your account, always in your control</p>
        <p className="text-sm text-base-content/60">
          Review devices, revoke sessions and manage privacy from one place.
        </p>
      </div>
    </div>

    <ul className="flex flex-wrap items-center justify-center gap-2">
      {[
        "Two-factor auth",
        "Login alerts",
        "Session control",
        "Block & report",
      ].map((t) => (
        <li
          key={t}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
        >
          <Check className="size-3" strokeWidth={3} />
          {t}
        </li>
      ))}
    </ul>
  </motion.div>
);

export const FeaturesSection = () => (
  <section id="features" className={SECTION}>
    <div className="mx-auto max-w-7xl">
      <SectionHeading
        eyebrow="Features"
        title="Everything you need to stay connected"
        sub="Private conversations, powerful groups, crystal-clear calls and the controls to make it all yours."
      />

      <motion.div
        variants={gridContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        className="grid gap-4 sm:gap-5 lg:grid-cols-6"
      >
        {HERO_FEATURES.map((f) => (
          <HeroCard key={f.title} {...f} />
        ))}
      </motion.div>

      <CategoryExplorer />
      <TrustStrip />
    </div>
  </section>
);
