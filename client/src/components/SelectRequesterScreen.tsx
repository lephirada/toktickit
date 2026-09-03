import React, { useState } from "react";
import { useRequester } from "../context/RequesterContext";
import {
  UserGearIcon,
  InfoCircleIcon,
  ShieldIcon,
  ArrowRightIcon,
  AlertTriangleIcon,
} from "./icons";

interface SelectRequesterScreenProps {
  onContinue?: () => void;
  onCancel?: () => void;
}

export const SelectRequesterScreen: React.FC<SelectRequesterScreenProps> = ({
  onContinue,
  onCancel,
}) => {
  const {
    requesters,
    currentRequester,
    switchRequester,
    isLoading,
    requesterError,
    reloadRequesters,
  } = useRequester();
  const [selectedId, setSelectedId] = useState<number>(
    currentRequester?.id || (requesters.length > 0 ? requesters[0].id : 1)
  );

  const handleContinue = async () => {
    if (selectedId) {
      await switchRequester(selectedId);
      if (onContinue) {
        onContinue();
      }
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else if (currentRequester) {
      if (onContinue) onContinue();
    }
  };

  return (
    <div
      data-testid="select-requester-screen"
      style={{
        backgroundColor: "var(--zg-bg, #F5F7F6)",
        minHeight: "calc(100vh - 70px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "2rem 1rem",
      }}
    >
      {/* Breadcrumb */}
      <div
        style={{
          width: "100%",
          maxWidth: "580px",
          marginBottom: "1.5rem",
          fontSize: "0.875rem",
          color: "var(--zg-text-muted, #5C7166)",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span>&gt;</span>
        <span style={{ color: "var(--zg-primary, #006B3C)", fontWeight: 500 }}>
          Development Requester Selection
        </span>
      </div>

      {/* Main Centered Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "580px",
          backgroundColor: "#FFFFFF",
          borderRadius: "12px",
          border: "1px solid var(--zg-border, #DDE7E1)",
          boxShadow: "0 4px 16px rgba(0, 107, 60, 0.06)",
          padding: "2.5rem 2rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {/* User + Gear Badge SVG */}
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            backgroundColor: "#EAF6EF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem auto",
          }}
        >
          <UserGearIcon color="#006B3C" size={40} />
        </div>

        {/* Headings */}
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "#1A2E26",
            margin: "0 0 0.5rem 0",
          }}
        >
          Select Development Requester
        </h2>
        <p
          style={{
            fontSize: "0.785rem",
            color: "#5C7166",
            margin: "0 0 2rem 0",
            lineHeight: 1.5,
          }}
        >
          Choose a development requester to simulate the current requester context for Lab 2.
          <br />
          This is for testing only and is not a login screen.
        </p>

        {/* Error Alert with Retry */}
        {requesterError && (
          <div
            style={{
              width: "100%",
              backgroundColor: "#FEF3F2",
              border: "1px solid #FECDCA",
              borderRadius: "6px",
              padding: "0.75rem 1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1.25rem",
              textAlign: "left",
            }}
            role="alert"
            data-testid="requesters-error-alert"
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#B42318", fontSize: "0.875rem" }}>
              <AlertTriangleIcon size={18} color="#B42318" />
              <span>Failed to load development requesters. Please try again.</span>
            </div>
            {reloadRequesters && (
              <button
                type="button"
                onClick={() => reloadRequesters()}
                data-testid="retry-requesters-btn"
                style={{
                  padding: "0.25rem 0.75rem",
                  borderRadius: "4px",
                  border: "1px solid #B42318",
                  backgroundColor: "#FFFFFF",
                  color: "#B42318",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Dropdown Container */}
        <div style={{ width: "100%", textAlign: "left", marginBottom: "1rem" }}>
          <label
            htmlFor="dev-requester-select"
            style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#1A2E26",
              marginBottom: "0.5rem",
            }}
          >
            Development Requester <span style={{ color: "#D9381E" }}>*</span>
          </label>
          <div style={{ position: "relative", width: "100%" }}>
            <select
              id="dev-requester-select"
              data-testid="requester-dropdown"
              value={selectedId}
              onChange={(e) => setSelectedId(Number(e.target.value))}
              disabled={isLoading}
              style={{
                width: "100%",
                height: "42px",
                padding: "0 2.5rem 0 0.75rem",
                borderRadius: "6px",
                border: "1px solid var(--zg-border, #DDE7E1)",
                backgroundColor: "#FFFFFF",
                fontSize: "0.875rem",
                color: "#1A2E26",
                cursor: "pointer",
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
              }}
            >
              {requesters.map((req) => (
                <option key={req.id} value={req.id}>
                  {req.fullName} ({req.department})
                </option>
              ))}
            </select>
            {/* Custom Chevron with 16px gap from right border */}
            <div
              style={{
                position: "absolute",
                right: "16px",
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                color: "#5C7166",
              }}
              aria-hidden="true"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
        </div>

        {/* Info Callout Box with Info SVG */}
        <div
          style={{
            width: "100%",
            backgroundColor: "#EAF6EF",
            border: "1px solid #C2E4D2",
            borderRadius: "6px",
            padding: "0.75rem 1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
            marginBottom: "1.25rem",
            textAlign: "left",
          }}
        >
          <InfoCircleIcon size={18} color="#006B3C" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: "0.8125rem", color: "#006B3C", fontWeight: 500 }}>
            Only active development requesters are shown.
          </span>
        </div>

        {/* Notice Card for Lab 3 with Shield SVG */}
        <div
          style={{
            width: "100%",
            backgroundColor: "#F9FAF9",
            border: "1px solid #E3ECE7",
            borderRadius: "8px",
            padding: "1rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.875rem",
            marginBottom: "2rem",
            textAlign: "left",
          }}
        >
          <ShieldIcon size={30} color="#5C7166" style={{ flexShrink: 0 }} />
          <div>
            <div
              style={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#1A2E26",
                marginBottom: "0.25rem",
              }}
            >
              Authentication coming in Lab 3
            </div>
            <div style={{ fontSize: "0.8125rem", color: "#5C7166", lineHeight: 1.4 }}>
              In Lab 3, this selection will be replaced with secure authentication so you can access
              the system with your own account.
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.75rem",
          }}
        >
          <button
            type="button"
            data-testid="cancel-requester-btn"
            onClick={handleCancel}
            style={{
              padding: "0.625rem 1.25rem",
              borderRadius: "6px",
              border: "1px solid #DDE7E1",
              backgroundColor: "#FFFFFF",
              color: "#1A2E26",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="continue-button"
            onClick={handleContinue}
            style={{
              padding: "0.625rem 1.25rem",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "var(--zg-primary, #006B3C)",
              color: "#FFFFFF",
              fontSize: "0.875rem",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer",
            }}
          >
            <ArrowRightIcon size={16} />
            <span>Continue</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectRequesterScreen;
