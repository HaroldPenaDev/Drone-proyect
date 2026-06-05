import { useEffect, useRef } from "react";
import { Cpu } from "lucide-react";
import { PageHeader, Badge, Surface } from "@/components/ui";
import {
  PilotScene,
  PilotHud,
  PilotMetrics,
  PilotRecorderPanel,
  WindControl,
  WindHud,
} from "@/components/pilot";
import { PilotEngine } from "@/pilot/PilotEngine";
import { useKeyboard } from "@/pilot/useKeyboard";
import { usePilotStore } from "@/pilot/pilotStore";
import { useT } from "@/i18n";

/**
 * Módulo independiente de pilotaje en vivo: el usuario vuela el dron con el
 * teclado sobre un mapa 3D, con la física y el piloto automático corriendo en
 * el navegador a ~60 fps. Layout vertical: escena 3D alta a un lado y una
 * grilla de tarjetas + grabador al otro. No depende del backend para volar.
 */
export function LivePilotPage() {
  const t = useT();
  const engineRef = useRef<PilotEngine | null>(null);
  if (!engineRef.current) engineRef.current = new PilotEngine();
  const engine = engineRef.current;

  const inputRef = useKeyboard(() => engine.reset());

  // Al salir del módulo, limpia el estado publicado.
  useEffect(() => () => usePilotStore.getState().clear(), []);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        eyebrow={t("pilot.eyebrow")}
        title={t("pilot.title")}
        description={t("pilot.description")}
        actions={
          <>
            <Badge tone="accent" pulse>
              {t("pilot.mode.assisted")}
            </Badge>
            <Badge tone="good">60 FPS</Badge>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Escena 3D vertical */}
        <div className="xl:col-span-5 relative h-[560px] xl:h-[780px]">
          <PilotScene engine={engine} inputRef={inputRef} />
          <PilotHud onReset={() => engine.reset()} />
          <WindHud />
        </div>

        {/* Clima + grabador + grilla de tarjetas */}
        <div className="xl:col-span-7 space-y-4">
          <WindControl />
          <PilotRecorderPanel />
          <PilotMetrics />

          <Surface padded>
            <div className="flex items-center gap-2 mb-1.5">
              <Cpu size={14} className="text-accent" />
              <span className="eyebrow-accent">{t("pilot.about.title")}</span>
            </div>
            <p className="text-[12px] text-ink-500 leading-relaxed">{t("pilot.about.body")}</p>
          </Surface>
        </div>
      </div>
    </div>
  );
}
