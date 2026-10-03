import React from "react";

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const EyeIcon: React.FC<IconProps> = ({
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
    {/* Almond eye contour */}
    <path d="M2 13.5C5 8.2 19 8.2 22 13.5C19 18.8 5 18.8 2 13.5Z" />

    {/* 5 Upper Eyelashes */}
    <path d="M4.5 11.2L2.5 8.5" />
    <path d="M8 9.5L6.5 5.8" />
    <path d="M12 9V4.5" />
    <path d="M16 9.5L17.5 5.8" />
    <path d="M19.5 11.2L21.5 8.5" />

    {/* Center Pupil with specular highlight cutout */}
    <path
      d="M 12 9.2 A 4.3 4.3 0 1 0 12 17.8 A 4.3 4.3 0 1 0 12 9.2 Z M 13.8 10.5 A 1.6 1.6 0 1 0 13.8 13.7 A 1.6 1.6 0 1 0 13.8 10.5 Z"
      fill={color}
      stroke="none"
      fillRule="evenodd"
    />
  </svg>
);
