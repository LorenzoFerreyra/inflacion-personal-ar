import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Pagination from "@/components/Pagination";

describe("Pagination", () => {
  const defaults = {
    page: 1,
    totalPages: 5,
    totalCount: 150,
    onPageChange: vi.fn(),
  };

  it("renders nothing when totalPages <= 1", () => {
    const { container } = render(
      <Pagination {...defaults} totalPages={1} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows total count with label", () => {
    render(<Pagination {...defaults} />);
    expect(screen.getByText(/150/)).toBeInTheDocument();
    expect(screen.getByText(/productos/)).toBeInTheDocument();
  });

  it("shows custom label", () => {
    render(<Pagination {...defaults} label="categorías" />);
    expect(screen.getByText(/categorías/)).toBeInTheDocument();
  });

  it("shows current page indicator", () => {
    render(<Pagination {...defaults} page={3} />);
    expect(screen.getByText("Pág. 3 de 5")).toBeInTheDocument();
  });

  it("calls onPageChange when clicking a page button", () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaults} page={1} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByText("2"));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("calls onPageChange with previous page on back button", () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaults} page={3} onPageChange={onPageChange} />);

    const backButton = screen.getAllByRole("button")[0];
    fireEvent.click(backButton);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("calls onPageChange with next page on forward button", () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaults} page={1} onPageChange={onPageChange} />);

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[buttons.length - 1]);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("disables back button on first page", () => {
    render(<Pagination {...defaults} page={1} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toBeDisabled();
  });

  it("disables forward button on last page", () => {
    render(<Pagination {...defaults} page={5} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[buttons.length - 1]).toBeDisabled();
  });

  it("shows Primera button when not near the start", () => {
    render(<Pagination {...defaults} page={5} totalPages={10} />);
    const primeraButtons = screen.getAllByText("Primera");
    expect(primeraButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("shows Última button when not near the end", () => {
    render(<Pagination {...defaults} page={3} totalPages={10} />);
    const ultimaButtons = screen.getAllByText("Última");
    expect(ultimaButtons.length).toBeGreaterThanOrEqual(1);
  });
});
