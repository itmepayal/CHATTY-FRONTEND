/**
 * Chatty Reusable UI Component Library
 * Unified barrel export for all design system and UI components.
 */

// Buttons
export { Button } from "./button/Button";
export { IconButton } from "./button/IconButton";
export { ButtonGroup } from "./button/ButtonGroup";

// Form Controls
export { FormField } from "./form/FormField";
export { Input } from "./form/Input";
export { PasswordInput } from "./form/PasswordInput";
export { SearchInput } from "./form/SearchInput";
export { Textarea } from "./form/Textarea";
export { Select } from "./form/Select";
export { Checkbox, Radio, Switch, FormError, FormHelperText } from "./form/Controls";

// Cards & Containers
export { Card, CardHeader, CardContent, CardFooter } from "./card/Card";
export {
  SectionCard,
  SettingsCard,
  SettingsRow,
  StatCard,
  ContentCard,
  ProfileCard,
} from "./card/Cards";

// Dialogs & Overlays
export { Modal } from "./dialog/Modal";
export {
  ConfirmDialog,
  AlertDialog,
  Drawer,
  Dropdown,
  Popover,
} from "./dialog/Dialogs";

// Feedback System (NO TOASTERS)
export {
  AlertMessage,
  ErrorMessage,
  SuccessMessage,
  InlineFeedback,
  FeedbackContainer,
} from "./feedback/Feedback";

// Loading States
export {
  LoadingSpinner,
  ButtonLoader,
  PageLoader,
  Skeleton,
  ListSkeleton,
  CardSkeleton,
} from "./loading/Loading";

// Empty & Error States
export {
  EmptyState,
  ErrorState,
  NotFoundState,
  OfflineState,
} from "./empty/EmptyStates";

// Avatar & User
export {
  Avatar,
  AvatarGroup,
  OnlineStatus,
  UserInfo,
  UserListItem,
} from "./avatar/Avatar";

// Navigation
export {
  PageHeader,
  PageContainer,
  TabNavigation,
  SegmentedControl,
  Breadcrumbs,
} from "./navigation/Navigation";

// Chat Presentation
export {
  MessageStatus,
  MessageTimestamp,
  MessageReplyQuote,
  MessageReactions,
  DateSeparator,
  MessageBubble,
  ChatListItem,
} from "./chat/ChatComponents";
