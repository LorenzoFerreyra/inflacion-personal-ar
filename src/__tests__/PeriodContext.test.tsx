import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { PeriodProvider, usePeriod } from "@/lib/PeriodContext";

describe("PeriodContext", () => {
  describe("usePeriod", () => {
    it("throws when used outside PeriodProvider", () => {
      // Suppress console.error from React for this expected error
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => usePeriod());
      }).toThrow("usePeriod must be inside PeriodProvider");

      spy.mockRestore();
    });

    it("returns default period 'mensual'", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PeriodProvider>{children}</PeriodProvider>
      );

      const { result } = renderHook(() => usePeriod(), { wrapper });
      expect(result.current.period).toBe("mensual");
    });

    it("defaults IPC to zeros before fetch completes", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PeriodProvider>{children}</PeriodProvider>
      );

      const { result } = renderHook(() => usePeriod(), { wrapper });
      expect(result.current.ipc).toEqual({
        mensual: 0,
        trimestral: 0,
        interanual: 0,
      });
    });

    it("allows changing the period", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PeriodProvider>{children}</PeriodProvider>
      );

      const { result } = renderHook(() => usePeriod(), { wrapper });

      act(() => {
        result.current.setPeriod("trimestral");
      });

      expect(result.current.period).toBe("trimestral");
    });

    it("allows changing to all valid period keys", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PeriodProvider>{children}</PeriodProvider>
      );

      const { result } = renderHook(() => usePeriod(), { wrapper });

      act(() => {
        result.current.setPeriod("interanual");
      });
      expect(result.current.period).toBe("interanual");

      act(() => {
        result.current.setPeriod("trimestral");
      });
      expect(result.current.period).toBe("trimestral");

      act(() => {
        result.current.setPeriod("mensual");
      });
      expect(result.current.period).toBe("mensual");
    });

    it("starts with ipcError as false", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PeriodProvider>{children}</PeriodProvider>
      );

      const { result } = renderHook(() => usePeriod(), { wrapper });
      expect(result.current.ipcError).toBe(false);
    });
  });
});
