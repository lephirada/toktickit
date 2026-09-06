import React from "react";

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const UserGearIcon: React.FC<IconProps> = ({
  size = 38,
  color = "#006B3C",
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
    {/* Head */}
    <circle cx="10" cy="7" r="4" />

    {/* Body / Left Shoulder */}
    <path d="M3.5 20a7 7 0 0 1 10.5-5.5" />

    {/* 8-Tooth Cogwheel at bottom-right shoulder */}
    <g transform="translate(17, 16.5) scale(0.52) translate(-8.6, -11)" strokeWidth="3.8">
      <path strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37c1 .608 2.296.07 2.572-1.065z" />
      <circle cx="12" cy="12" r="3" />
    </g>
  </svg>
);
