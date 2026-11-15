import React from "react";

export type ToastType = "success" | "error" | "info" | "warning" | "loading";

export interface ToastActionItem {
  label: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  primary?: boolean;
  autoDismiss?: boolean;
  key?: string | number;
}

export type ToastAction =
  | ToastActionItem
  | ToastActionItem[]
  | ((helpers: { dismiss?: () => void }) => React.ReactNode);

export interface ToastOptions {
  id?: string;
  type?: ToastType;
  title?: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
  action?: ToastAction;
  render?: (toast: ToastItem) => React.ReactNode;
  [key: string]: any;
}

export interface ToastItem extends ToastOptions {
  id: string;
  type: ToastType;
  title?: string;
  message?: string;
  duration: number;
  createdAt: number;
  pausedAt?: number | null;
  resumedAt?: number | null;
  remainingTime?: number;
}

export interface PromiseMessages<T = any> {
  loading?: string;
  success?: string | ((data: T) => string);
  error?: string | ((err: any) => string);
}

export interface CustomToastService {
  toasts: ToastItem[];
  subscribe: (listener: (toasts: ToastItem[]) => void) => () => void;
  getToasts: () => ToastItem[];
  notify: (content: React.ReactNode | string, options?: ToastOptions) => string;
  success: (content: React.ReactNode | string, options?: ToastOptions) => string;
  error: (content: React.ReactNode | string, options?: ToastOptions) => string;
  info: (content: React.ReactNode | string, options?: ToastOptions) => string;
  warning: (content: React.ReactNode | string, options?: ToastOptions) => string;
  loading: (content: React.ReactNode | string, options?: ToastOptions) => string;
  dismiss: (id?: string) => void;
  dismissAll: () => void;
  update: (id: string, options?: ToastOptions) => string | undefined;
  promise: <T = any>(
    promise: Promise<T>,
    msgs?: PromiseMessages<T>,
    options?: ToastOptions
  ) => Promise<T>;
  pause: (id: string) => void;
  resume: (id: string) => void;
}

export interface CustomToastCallable {
  (content: React.ReactNode | string, options?: ToastOptions): string;
  success: (content: React.ReactNode | string, options?: ToastOptions) => string;
  error: (content: React.ReactNode | string, options?: ToastOptions) => string;
  info: (content: React.ReactNode | string, options?: ToastOptions) => string;
  warning: (content: React.ReactNode | string, options?: ToastOptions) => string;
  loading: (content: React.ReactNode | string, options?: ToastOptions) => string;
  dismiss: (id?: string) => void;
  dismissAll: () => void;
  update: (id: string, options?: ToastOptions) => string | undefined;
  promise: <T = any>(
    promise: Promise<T>,
    msgs?: PromiseMessages<T>,
    options?: ToastOptions
  ) => Promise<T>;
  subscribe: (listener: (toasts: ToastItem[]) => void) => () => void;
  getToasts: () => ToastItem[];
}

export const customToastService: CustomToastService;
export const customToast: CustomToastCallable;
export const toast: CustomToastCallable;

export interface CustomToastProviderProps {
  children?: React.ReactNode;
  position?: "top-right" | "top-center";
  mountContainer?: boolean;
}

export const CustomToastProvider: React.FC<CustomToastProviderProps>;

export interface CustomToastContainerProps {
  position?: "top-right" | "top-center";
  className?: string;
}

export const CustomToastContainer: React.FC<CustomToastContainerProps>;
export const Toaster: React.FC<CustomToastContainerProps>;

export const useCustomToast: () => {
  toasts: ToastItem[];
  customToast: CustomToastCallable;
  toast: CustomToastCallable;
  dismiss: (id?: string) => void;
  dismissAll: () => void;
};

export const CustomToastContext: React.Context<{
  toasts: ToastItem[];
  customToast: CustomToastCallable;
  toast: CustomToastCallable;
  dismiss: (id?: string) => void;
  dismissAll: () => void;
}>;

export default customToast;
