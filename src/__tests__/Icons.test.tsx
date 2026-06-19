import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  Search,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Package,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  ShoppingBasket,
  Download,
} from "@/components/Icons";

const ALL_ICONS = [
  { name: "Search", Component: Search },
  { name: "TrendingUp", Component: TrendingUp },
  { name: "ChevronLeft", Component: ChevronLeft },
  { name: "ChevronRight", Component: ChevronRight },
  { name: "Package", Component: Package },
  { name: "Check", Component: Check },
  { name: "X", Component: X },
  { name: "ArrowRight", Component: ArrowRight },
  { name: "ArrowLeft", Component: ArrowLeft },
  { name: "RotateCcw", Component: RotateCcw },
  { name: "ShoppingBasket", Component: ShoppingBasket },
  { name: "Download", Component: Download },
];

describe("Icons", () => {
  for (const { name, Component } of ALL_ICONS) {
    describe(name, () => {
      it("renders an SVG element", () => {
        const { container } = render(<Component />);
        const svg = container.querySelector("svg");
        expect(svg).toBeInTheDocument();
        expect(svg!.getAttribute("xmlns")).toBe("http://www.w3.org/2000/svg");
      });

      it("defaults to size 24", () => {
        const { container } = render(<Component />);
        const svg = container.querySelector("svg")!;
        expect(svg.getAttribute("width")).toBe("24");
        expect(svg.getAttribute("height")).toBe("24");
      });

      it("accepts custom size", () => {
        const { container } = render(<Component size={16} />);
        const svg = container.querySelector("svg")!;
        expect(svg.getAttribute("width")).toBe("16");
        expect(svg.getAttribute("height")).toBe("16");
      });

      it("accepts custom className", () => {
        const { container } = render(<Component className="custom-class" />);
        const svg = container.querySelector("svg")!;
        expect(svg.getAttribute("class")).toContain("custom-class");
      });

      it("has stroke set to currentColor", () => {
        const { container } = render(<Component />);
        const svg = container.querySelector("svg")!;
        expect(svg.getAttribute("stroke")).toBe("currentColor");
      });

      it("accepts custom strokeWidth", () => {
        const { container } = render(<Component strokeWidth={3} />);
        const svg = container.querySelector("svg")!;
        expect(svg.getAttribute("stroke-width")).toBe("3");
      });
    });
  }
});
