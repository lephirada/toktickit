import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { RequesterUser, TicketItem, fetchRequesters, fetchTickets } from "../api.js";

const STORAGE_KEY = "toktickit_requester_id";

export interface RequesterContextType {
  currentRequester: RequesterUser | null;
  requesters: RequesterUser[];
  isLoading: boolean;
  isFormDirty: boolean;
  setFormDirty: (dirty: boolean) => void;
  switchRequester: (id: number) => void;
  isDirtyModalOpen: boolean;
  pendingRequesterId: number | null;
  confirmDiscard: () => void;
  cancelDiscard: () => void;
  // Requester-specific tickets state
  tickets: TicketItem[];
  ticketsLoading: boolean;
  reloadTickets: () => Promise<void>;
}

const RequesterContext = createContext<RequesterContextType | undefined>(undefined);

export function RequesterProvider({ children }: { children: ReactNode }) {
  const [requesters, setRequesters] = useState<RequesterUser[]>([]);
  const [currentRequester, setCurrentRequester] = useState<RequesterUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFormDirty, setIsFormDirty] = useState<boolean>(false);
  const [isDirtyModalOpen, setIsDirtyModalOpen] = useState<boolean>(false);
  const [pendingRequesterId, setPendingRequesterId] = useState<number | null>(null);

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState<boolean>(false);

  const loadTicketsForRequester = useCallback(async (requesterId: number) => {
    // Clear previous requester tickets immediately
    setTickets([]);
    setTicketsLoading(true);
    try {
      const data = await fetchTickets(requesterId);
      setTickets(Array.isArray(data) ? data : []);
    } catch {
      setTickets([]);
    } finally {
      setTicketsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadRequesters() {
      setIsLoading(true);
      try {
        const users = await fetchRequesters();
        if (!isMounted) return;

        setRequesters(users);

        if (users.length > 0) {
          const storedIdStr = localStorage.getItem(STORAGE_KEY);
          const storedId = storedIdStr ? parseInt(storedIdStr, 10) : null;
          const found = storedId ? users.find((u) => u.id === storedId && u.isActive) : null;

          const selected = found || users[0];
          setCurrentRequester(selected);
          localStorage.setItem(STORAGE_KEY, String(selected.id));
          loadTicketsForRequester(selected.id);
        }
      } catch (err) {
        console.error("Failed to load active requesters:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadRequesters();

    return () => {
      isMounted = false;
    };
  }, [loadTicketsForRequester]);

  function switchRequester(id: number) {
    if (currentRequester && currentRequester.id === id) {
      return;
    }

    if (isFormDirty) {
      setPendingRequesterId(id);
      setIsDirtyModalOpen(true);
      return;
    }

    const target = requesters.find((u) => u.id === id);
    if (target) {
      setCurrentRequester(target);
      localStorage.setItem(STORAGE_KEY, String(target.id));
      loadTicketsForRequester(target.id);
    }
  }

  function confirmDiscard() {
    if (pendingRequesterId !== null) {
      const target = requesters.find((u) => u.id === pendingRequesterId);
      if (target) {
        setCurrentRequester(target);
        localStorage.setItem(STORAGE_KEY, String(target.id));
        loadTicketsForRequester(target.id);
      }
      setPendingRequesterId(null);
    }
    setIsFormDirty(false);
    setIsDirtyModalOpen(false);
  }

  function cancelDiscard() {
    setPendingRequesterId(null);
    setIsDirtyModalOpen(false);
  }

  const reloadTickets = useCallback(async () => {
    if (currentRequester) {
      await loadTicketsForRequester(currentRequester.id);
    }
  }, [currentRequester, loadTicketsForRequester]);

  return (
    <RequesterContext.Provider
      value={{
        currentRequester,
        requesters,
        isLoading,
        isFormDirty,
        setFormDirty: setIsFormDirty,
        switchRequester,
        isDirtyModalOpen,
        pendingRequesterId,
        confirmDiscard,
        cancelDiscard,
        tickets,
        ticketsLoading,
        reloadTickets,
      }}
    >
      {children}
    </RequesterContext.Provider>
  );
}

export function useRequester(): RequesterContextType {
  const context = useContext(RequesterContext);
  if (!context) {
    throw new Error("useRequester must be used within a RequesterProvider");
  }
  return context;
}
