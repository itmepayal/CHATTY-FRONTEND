import { forwardRef, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import Input from "./Input";

export const PasswordInput = forwardRef(function PasswordInput(
  {
    icon = Lock,
    showCapsLockWarning = true,
    className = "",
    ...props
  },
  ref,
) {
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const handleKeyDown = (e) => {
    if (typeof e.getModifierState === "function") {
      setCapsLock(e.getModifierState("CapsLock"));
    }
  };

  const handleKeyUp = (e) => {
    if (typeof e.getModifierState === "function") {
      setCapsLock(e.getModifierState("CapsLock"));
    }
  };

  return (
    <div className="relative w-full">
      <Input
        ref={ref}
        type={showPassword ? "text" : "password"}
        icon={icon}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        rightElement={
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
            className="btn btn-ghost btn-circle btn-sm text-base-content/50 hover:text-base-content min-h-[36px] min-w-[36px]"
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        }
        className={className}
        {...props}
      />
      {showCapsLockWarning && capsLock && (
        <span className="text-[11px] text-warning font-medium mt-1 inline-block animate-fadeIn">
          Caps Lock is on
        </span>
      )}
    </div>
  );
});

export default PasswordInput;
