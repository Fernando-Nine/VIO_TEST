import { useState, type ReactNode } from "react";
import {
  Crown,
  Eye,
  KeyRound,
  Mic,
  MicOff,
  Palette,
  RotateCcw,
  ShieldCheck,
  ShieldOff,
  Video,
  Volume2,
  VolumeX,
  Music,
} from "lucide-react";
import { canManageRoom } from "../../shared/permissions";
import type { Participant } from "../../shared/protocol";
import { soundName } from "./SoundSources";
import type { Controller } from "../room/controller";
import { ContextMenu, type MenuItem } from "./ContextMenu";
import { Dialog } from "./Dialog";
import { VolumeNumber, VolumeSlider } from "./VolumeSlider";

type At = { x: number; y: number };

/** Where a right click (or the ContextMenu key, which has no point) opens it. */
export function menuPoint(event: React.MouseEvent): At {
  const box = event.currentTarget.getBoundingClientRect();
  return event.clientX || event.clientY
    ? { x: event.clientX, y: event.clientY }
    : { x: box.left + 12, y: box.bottom };
}

/**
 * The person menu shared by the People panel and the People widget: voice
 * (personal), then room roles (only for who may; the server checks again).
 * `volume` puts the 0–200% slider on top, for places that do not show it.
 */
export function usePersonMenu(
  engine: Controller,
  editColor: () => void,
  { volume = false }: { volume?: boolean } = {},
) {
  const members = engine.view.snapshot?.participants || [];
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<{
    id: string;
    at: At;
    origin: Element;
  } | null>(null);
  const [permissionsOf, setPermissionsOf] = useState<string | null>(null);
  const [transferTo, setTransferTo] = useState<Participant | null>(null);
  const snapshot = engine.view.snapshot;
  const manages = canManageRoom(snapshot, engine.view.id);
  const creator = snapshot?.creatorId === engine.view.id;
  const widgets = snapshot?.widgets || [];
  async function run(
    action: Parameters<Controller["request"]>[0],
    data: unknown,
  ) {
    setBusy(true);
    setError("");
    try {
      await engine.request(action, data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível concluir.");
    } finally {
      setBusy(false);
    }
  }
  function actions(person: Participant): MenuItem[] {
    if (person.id === engine.view.id)
      return [{ label: "Minha cor", icon: Palette, run: editColor }];
    // Groups in a fixed order (watch, voice, room roles); each non-empty
    // group after the first opens with a separator.
    const watch: MenuItem[] = [];
    const voice: MenuItem[] = [];
    const room: MenuItem[] = [];
    for (const share of person.publications) {
      if (share.kind !== "screen" || engine.view.watching.includes(share.id))
        continue;
      // One "Assistir" for the screens; each sound (#236) is listened to apart.
      if (share.audioOnly)
        watch.push({
          label: `Ouvir ${soundName(share.label)}`,
          icon: Music,
          run: () => engine.watch(share.id, true, true),
        });
      else if (!watch.some((item) => item.icon === Eye))
        watch.push({
          label: "Assistir a tela",
          icon: Eye,
          run: () => engine.watch(share.id, true),
        });
    }
    if (
      engine.cameraRequest &&
      person.publications.some((p) => p.kind === "camera")
    )
      watch.push({
        label: "Abrir câmera",
        icon: Video,
        run: () => engine.cameraRequest?.(person.id),
      });
    const level = engine.volumes.get(person.id) ?? 1;
    if (level !== 1 && level !== 0)
      voice.push({
        label: "Voltar o volume a 100%",
        icon: RotateCcw,
        run: () => engine.setPersonVolume(person.id, 1),
      });
    voice.push(
      level === 0
        ? {
            label: "Ativar para mim",
            icon: Volume2,
            run: () =>
              engine.setPersonVolume(
                person.id,
                engine.silencedVolumes.get(person.id) || 1,
              ),
          }
        : {
            label: "Silenciar para mim",
            icon: VolumeX,
            run: () => {
              engine.silencedVolumes.set(person.id, level);
              engine.setPersonVolume(person.id, 0);
            },
          },
    );
    if (creator)
      voice.push(
        person.voiceBlocked
          ? {
              label: "Liberar voz",
              icon: Mic,
              run: () =>
                void run("moderate", {
                  participantId: person.id,
                  voiceBlocked: false,
                }),
            }
          : {
              label: "Silenciar para todos",
              icon: MicOff,
              danger: true,
              run: () =>
                void run("moderate", {
                  participantId: person.id,
                  voiceBlocked: true,
                }),
            },
      );
    if (creator)
      room.push(
        person.role === "admin"
          ? {
              label: "Revogar administrador",
              icon: ShieldOff,
              run: () =>
                void run("role", {
                  participantId: person.id,
                  action: "revoke",
                }),
            }
          : {
              label: "Tornar administrador",
              icon: ShieldCheck,
              run: () =>
                void run("role", {
                  participantId: person.id,
                  action: "promote",
                }),
            },
      );
    if (manages && person.role === "guest" && widgets.length)
      room.push({
        label: "Permissões de edição",
        icon: KeyRound,
        run: () => setPermissionsOf(person.id),
      });
    if (creator)
      room.push({
        label: "Transferir posse da sala",
        icon: Crown,
        danger: true,
        run: () => setTransferTo(person),
      });
    return [watch, voice, room]
      .filter((group) => group.length)
      .flatMap((group, i) =>
        group.map((item, j) => (i && !j ? { ...item, separated: true } : item)),
      );
  }
  const menuPerson = members.find((p) => p.id === menu?.id);
  const permissionsPerson = members.find((p) => p.id === permissionsOf);
  const level = menuPerson && engine.volumes.get(menuPerson.id);
  const node: ReactNode = (
    <>
      {error && <p role="alert">{error}</p>}
      {menu && menuPerson && (
        <ContextMenu
          at={menu.at}
          origin={menu.origin}
          className="person-menu"
          items={actions(menuPerson)}
          label={`Ações de ${menuPerson.name}`}
          close={() => setMenu(null)}
          header={
            volume &&
            menuPerson.id !== engine.view.id && (
              <label className="person-menu-volume">
                <span>
                  Volume
                  <VolumeNumber
                    value={level ?? 1}
                    reset={() => engine.setPersonVolume(menuPerson.id, 1)}
                  />
                </span>
                <VolumeSlider
                  max={2}
                  label={`Volume de ${menuPerson.name} para você`}
                  value={level ?? 1}
                  onChange={(value) =>
                    engine.setPersonVolume(menuPerson.id, value)
                  }
                />
              </label>
            )
          }
        />
      )}
      {permissionsPerson && (
        <Dialog
          title={`Edição por ${permissionsPerson.name}`}
          centered
          close={() => setPermissionsOf(null)}
        >
          {widgets.map((w) => (
            <label className="widget-permission" key={w.id}>
              <input
                type="checkbox"
                disabled={busy || w.allGuestsEdit}
                checked={
                  !!w.allGuestsEdit ||
                  !!w.guestEditors?.includes(permissionsPerson.id)
                }
                onChange={(e) =>
                  void run("widget-permission", {
                    id: w.id,
                    participantId: permissionsPerson.id,
                    allowed: e.target.checked,
                  })
                }
              />
              {w.title}
            </label>
          ))}
        </Dialog>
      )}
      {transferTo && (
        <Dialog
          title={`Transferir a sala para ${transferTo.name}?`}
          centered
          close={() => setTransferTo(null)}
        >
          <p>Você deixa de ser o criador e passa a ser administrador.</p>
          <div className="notification-actions">
            <button
              className="primary"
              disabled={busy}
              onClick={() => {
                const id = transferTo.id;
                setTransferTo(null);
                void run("role", { participantId: id, action: "transfer" });
              }}
            >
              Transferir
            </button>
            <button className="secondary" onClick={() => setTransferTo(null)}>
              Cancelar
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
  return {
    open: (id: string, at: At, origin: Element) => setMenu({ id, at, origin }),
    node,
    run,
    busy,
  };
}
