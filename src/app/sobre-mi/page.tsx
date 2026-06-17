import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acerca de — Observatorio de inflación",
  description: "Creador del proyecto",
};

const GithubIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

export default function SobreMiPage() {
  return (
    <div className="space-y-10 animate-fade-in">
      {/* Hero profile — centered */}
      <div className="flex flex-col items-center text-center pt-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/20 border border-amber-400/30 flex items-center justify-center mb-4">
          <span className="text-2xl font-bold text-amber-400">LM</span>
        </div>
        <h2 className="text-xl font-semibold text-zinc-100">Lorenzo Máximo</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Creador del Observatorio de inflación
        </p>
        <p className="text-sm text-zinc-400 leading-relaxed mt-4 max-w-lg">
          Proyecto personal de seguimiento de precios en supermercados
          argentinos. La herramienta nació de la necesidad de entender cómo
          impacta la inflación en el consumo cotidiano, más allá de los índices
          agregados.
        </p>
        <a
          href="https://github.com/LorenzoFerreyra/inflacion-personal-ar"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-zinc-700/50 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-300 hover:text-amber-400 hover:border-amber-400/40 transition-colors"
        >
          <GithubIcon />
          Ver repositorio
        </a>
      </div>

      {/* Divider */}
      <div className="border-t border-zinc-800/60" />

      {/* Other projects */}
      <div className="space-y-5">
        <h3 className="text-[15px] font-semibold text-zinc-200 text-center">
          Otros proyectos
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <h4 className="text-[15px] font-semibold text-zinc-200 flex items-center gap-2.5">
                <span className="w-0.5 h-4 rounded-full bg-amber-400/60 flex-shrink-0" />
                Reddit Data Extraction
              </h4>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Proyecto de investigación que analiza opiniones y preocupaciones
                de profesionales de IT y desarrolladores sobre inteligencia
                artificial generativa y LLMs, a partir de comentarios en Reddit
                (r/devsarg). Utiliza técnicas de NLP, análisis de sentimiento y
                text mining con Python y R.
              </p>
            </div>
            <a
              href="https://github.com/LorenzoFerreyra/reddit-data-extraction"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors"
            >
              <GithubIcon />
              Ver en GitHub
            </a>
          </div>

          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <h4 className="text-[15px] font-semibold text-zinc-200 flex items-center gap-2.5">
                <span className="w-0.5 h-4 rounded-full bg-amber-400/60 flex-shrink-0" />
                Sociedad de Datos — UFLO
              </h4>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Trabajo académico que analiza datos económicos de Argentina:
                costos de la canasta básica alimentaria por región y datos de
                empleo de la Encuesta Permanente de Hogares (EPH). Combina
                visualizaciones estadísticas y reportes interactivos con R,
                JavaScript y Quarto.
              </p>
            </div>
            <a
              href="https://github.com/LorenzoFerreyra/trabajo_sociedad_datos"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors"
            >
              <GithubIcon />
              Ver en GitHub
            </a>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="flex justify-center pb-4">
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 max-w-lg w-full text-center space-y-2">
          <h3 className="text-[15px] font-semibold text-zinc-200">Contacto</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Para sugerencias, reportar errores o colaborar con el proyecto,
            podés escribirme a través de GitHub o por correo electrónico.
          </p>
        </div>
      </div>
    </div>
  );
}
