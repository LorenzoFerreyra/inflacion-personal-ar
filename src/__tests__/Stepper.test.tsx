import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import Stepper from "@/components/Stepper";

afterEach(cleanup);

const SAMPLE_STEPS = ["Seleccionar", "Comparar", "Confirmar"];

describe("Stepper", () => {
  it("renders all step labels", () => {
    render(<Stepper currentStep={1} steps={SAMPLE_STEPS} />);
    expect(screen.getByText("Seleccionar")).toBeInTheDocument();
    expect(screen.getByText("Comparar")).toBeInTheDocument();
    expect(screen.getByText("Confirmar")).toBeInTheDocument();
  });

  it("shows step number 2 and 3 as text when they are future", () => {
    render(<Stepper currentStep={1} steps={SAMPLE_STEPS} />);
    // Step 1 is active (shows "1"), steps 2 and 3 are future (show "2", "3")
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1);
  });

  it("shows step 2 as active number when currentStep=2", () => {
    render(<Stepper currentStep={2} steps={SAMPLE_STEPS} />);
    // Step 1 has a checkmark SVG, step 2 shows "2" as active, step 3 shows "3"
    const twos = screen.getAllByText("2");
    expect(twos.length).toBeGreaterThanOrEqual(1);
  });

  it("renders checkmark SVGs for completed steps", () => {
    const { container } = render(
      <Stepper currentStep={3} steps={SAMPLE_STEPS} />,
    );
    // Steps 1 and 2 are done → each has a Check SVG (step 3 has "3")
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(2);
  });

  it("renders connector line divs between steps", () => {
    const { container } = render(
      <Stepper currentStep={2} steps={SAMPLE_STEPS} />,
    );
    // Connectors use bg-zinc-800 or bg-gradient-to-r
    // With 3 steps there are 2 connectors
    const connectors = container.querySelectorAll(".w-24");
    expect(connectors.length).toBe(2);
  });

  it("shows no checkmark SVGs when currentStep=1", () => {
    const { container } = render(
      <Stepper currentStep={1} steps={SAMPLE_STEPS} />,
    );
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(0);
  });

  it("shows all steps with checkmarks when currentStep exceeds step count", () => {
    const { container } = render(
      <Stepper currentStep={4} steps={SAMPLE_STEPS} />,
    );
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(3);
  });
});
