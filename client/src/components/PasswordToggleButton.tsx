import React from "react";
import { EyeIcon, EyeOffIcon } from "./icons/index.js";

export interface PasswordToggleButtonProps {
  isVisible: boolean;
  onToggle: () => void;
  height?: string | number;
  borderColor?: string;
  testId?: string;
  ariaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const PasswordToggleButton: React.FC<PasswordToggleButtonProps> = ({
  isVisible,
  onToggle,
  height = "46px",
  borderColor = "#D0D5DD",
  testId = "toggle-password-visibility",
  ariaLabel,
  className = "",
  style,
}) => {
  return (
    <button
      type="button"
      className={`btn btn-outline-secondary zg-password-toggle-btn d-flex align-items-center justify-content-center px-3 ${className}`}
      style={{
        height,
        borderTopRightRadius: "8px",
        borderBottomRightRadius: "8px",
        ...(borderColor ? { borderColor } : {}),
        ...style,
      }}
      onClick={onToggle}
      tabIndex={-1}
      aria-label={ariaLabel || (isVisible ? "Hide password" : "Show password")}
      data-testid={testId}
    >
      {isVisible ? <EyeIcon size={16} /> : <EyeOffIcon size={16} />}
    </button>
  );
};

export default PasswordToggleButton;
