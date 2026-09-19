import React from "react";

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const EyeOffIcon: React.FC<IconProps> = ({
  size = 16,
  color = "currentColor",
  className = "",
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    <path d="M3 8.5C6 4 18 4 21 8.5" />
    <path d="M3.5 12.5C5 17.5 19 17.5 20.5 12.5" />
    <path d="M4.5 15L2.5 17.5" />
    <path d="M7.8 16.8L6.3 20.3" />
    <path d="M12 17.5V21.5" />
    <path d="M16.2 16.8L17.7 20.3" />
    <path d="M19.5 15L21.5 17.5" />
  </svg>
);
