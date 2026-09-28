import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { desktop } from "../desktop/bridge";
interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(
    () => matchMedia("(display-mode: standalone)").matches,
  );
  useEffect(() => {
    const ready = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const done = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("beforeinstallprompt", ready);
      window.removeEventListener("appinstalled", done);
    };
  }, []);
  if (installed || desktop) return null;
  return (
    <details className="install-app">
      <summary>
        <Download size={15} /> Instalar VIO
      </summary>
      <div>
        {prompt ? (
          <button
            className="secondary"
            onClick={() => {
              void prompt
                .prompt()
                .then(() => prompt.userChoice)
                .then(() => setPrompt(null))
                .catch(() => setPrompt(null));
            }}
          >
            Adicionar ao dispositivo
          </button>
        ) : (
          <p>
            No Android, use “Instalar aplicativo” no menu do navegador. No
            iPhone, abra no Safari e use Compartilhar → Adicionar à Tela de
            Início.
          </p>
        )}
        <p className="field-note">
          Abre em uma janela própria. Entrar e conversar nas salas exige
          internet.
        </p>
      </div>
    </details>
  );
}
