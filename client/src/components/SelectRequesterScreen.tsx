import React, { useState, useEffect } from "react";
import { useRequester } from "../context/RequesterContext";
import {
  UserGearIcon,
  InfoCircleIcon,
  ShieldIcon,
  ArrowRightIcon,
  AlertTriangleIcon,
  HomeIcon,
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

  useEffect(() => {
    if (requesters.length > 0) {
      if (!selectedId || !requesters.some((r) => r.id === selectedId)) {
        setSelectedId(currentRequester?.id || requesters[0].id);
      }
    }
  }, [requesters, currentRequester, selectedId]);

  const handleContinue = async () => {
    const idToSelect = selectedId || (requesters.length > 0 ? requesters[0].id : null);
    if (idToSelect) {
      await switchRequester(idToSelect);
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
      className="min-h-[calc(100vh-4rem)] bg-gray-50 py-8 px-4 sm:px-6 lg:px-8"
      style={{
        minHeight: "calc(100vh - 4rem)",
        backgroundColor: "var(--zg-bg, #F5F7F6)",
        padding: "2rem 1rem",
        boxSizing: "border-box",
        width: "100%",
      }}
    >
      {/* Standard Page Container (Aligns breadcrumb naturally with balanced margins) */}
      <div className="max-w-4xl mx-auto w-full" style={{ maxWidth: "56rem", margin: "0 auto", width: "100%" }}>
        
        {/* 1. Breadcrumb: Sits at the TOP-LEFT of the page content, right under the header */}
        <nav 
          aria-label="Breadcrumb" 
          className="flex items-center gap-2 text-sm mb-6"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.9375rem",
            marginBottom: "1.5rem",
            textAlign: "left"
          }}
        >
          <HomeIcon
            size={18}
            color="var(--zg-primary, #006B3C)"
            className="w-4 h-4 text-emerald-700"
            style={{ color: "var(--zg-primary, #006B3C)", flexShrink: 0 }}
          />
          <span className="text-gray-400" style={{ color: "var(--zg-text-muted, #98A2B3)", fontSize: "0.875rem", userSelect: "none" }}>&gt;</span>
          <span
            className="text-emerald-800 font-medium"
            style={{
              color: "var(--zg-primary, #006B3C)",
              fontWeight: 600,
            }}
          >
            Development Requester Selection
          </span>
        </nav>

        {/* 2. Selection Card: Centered horizontally beneath the breadcrumb */}
        <div className="flex justify-center" style={{ display: "flex", justifyContent: "center" }}>
          <div 
            className="w-full max-w-xl bg-white rounded-2xl shadow-sm border border-gray-100 p-8"
            style={{
              width: "100%",
              maxWidth: "40rem",
              backgroundColor: "#FFFFFF",
              borderRadius: "1rem",
              padding: "2rem",
              border: "1px solid #E5E7EB",
              boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)"
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
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h2
            className="text-center"
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#1A2E26",
              margin: "0 0 0.5rem 0",
              textAlign: "center",
            }}
          >
            Select Development Requester
          </h2>
          <p
            className="text-center"
            style={{
              fontSize: "0.875rem",
              color: "#5C7166",
              margin: 0,
              lineHeight: 1.5,
              textAlign: "center",
            }}
          >
            Choose a development requester to simulate the current requester context for Lab 2.
            <br />
            This is for testing only and is not a login screen.
          </p>
        </div>

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
  </div>
</div>
  );
};

export default SelectRequesterScreen;
