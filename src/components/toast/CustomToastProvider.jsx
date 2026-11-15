import { useState, useEffect, useMemo } from "react";
import { CustomToastContext } from "./CustomToastContext";
import { customToast, customToastService } from "./customToastService";
import CustomToastContainer from "./CustomToastContainer";

/**
 * CustomToastProvider
 * Root-level notification provider mounting the singleton container and distributing context.
 */
export const CustomToastProvider = ({
  children,
  position = "top-right",
  mountContainer = true,
}) => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    return customToastService.subscribe((list) => {
      setToasts(list);
    });
  }, []);

  const value = useMemo(
    () => ({
      toasts,
      customToast,
      toast: customToast,
      dismiss: (id) => customToastService.dismiss(id),
      dismissAll: () => customToastService.dismissAll(),
    }),
    [toasts]
  );

  return (
    <CustomToastContext.Provider value={value}>
      {children}
      {mountContainer && <CustomToastContainer position={position} />}
    </CustomToastContext.Provider>
  );
};

export default CustomToastProvider;
