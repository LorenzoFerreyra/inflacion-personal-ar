import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import KpiCard from "@/components/KpiCard";

describe("KpiCard", () => {
  it("renders label and value", () => {
    render(<KpiCard label="Mensual" value="+5.2%" />);
    expect(screen.getByText("Mensual")).toBeInTheDocument();
    expect(screen.getByText("+5.2%")).toBeInTheDocument();
  });

  it("renders subtitle when provided", () => {
    render(<KpiCard label="IPC" value="3.1%" subtitle="últimos 30 días" />);
    expect(screen.getByText("últimos 30 días")).toBeInTheDocument();
  });

  it("does not render subtitle when omitted", () => {
    const { container } = render(<KpiCard label="IPC" value="3.1%" />);
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(2);
  });

  it("applies red color styles", () => {
    const { container } = render(<KpiCard label="Suba" value="+10%" color="red" />);
    const wrapper = container.firstElementChild!;
    expect(wrapper.className).toContain("red");
  });

  it("applies green color styles", () => {
    const { container } = render(<KpiCard label="Baja" value="-2%" color="green" />);
    const wrapper = container.firstElementChild!;
    expect(wrapper.className).toContain("green");
  });

  it("defaults to neutral color", () => {
    const { container } = render(<KpiCard label="Neutro" value="0%" />);
    const wrapper = container.firstElementChild!;
    expect(wrapper.className).toContain("zinc");
  });
});
