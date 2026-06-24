import { Stepper } from 'inflacion-personal-ar';

const STEPS = ['Seleccioná', 'Configurá', 'Exportá'];

export function Step1() {
  return (
    <div className="bg-zinc-950 p-8 w-full max-w-lg">
      <Stepper currentStep={1} steps={STEPS} />
    </div>
  );
}

export function Step2() {
  return (
    <div className="bg-zinc-950 p-8 w-full max-w-lg">
      <Stepper currentStep={2} steps={STEPS} />
    </div>
  );
}

export function Completed() {
  return (
    <div className="bg-zinc-950 p-8 w-full max-w-lg">
      <Stepper currentStep={4} steps={STEPS} />
    </div>
  );
}
