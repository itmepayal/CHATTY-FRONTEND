import { createContext, useContext, useEffect, useState } from "react";
import { customToast, customToastService } from "./customToastService";

export const CustomToastContext = createContext({
  toasts: [],
  customToast,
  toast: customToast,
  dismiss: (id) => customToastService.dismiss(id),
  dismissAll: () => customToastService.dismissAll(),
});

/**
 * useCustomToast hook
 * Access the centralized toast manager from any functional component.
 */
export const useCustomToast = () => {
  const context = useContext(CustomToastContext);
  if (!context) {
    return {
      toasts: customToastService.getToasts(),
      customToast,
      toast: customToast,
      dismiss: (id) => customToastService.dismiss(id),
      dismissAll: () => customToastService.dismissAll(),
    };
  }
  return context;
};

export default CustomToastContext;
