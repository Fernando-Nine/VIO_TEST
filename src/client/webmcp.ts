import type { Controller } from "./room/controller";
import { z } from "zod";
export function registerRoomTools(engine: Controller) {
  const context = (
    document as Document & {
      modelContext?: {
        registerTool: (
          tool: Record<string, unknown>,
          options: { signal: AbortSignal },
        ) => unknown;
      };
    }
  ).modelContext;
  if (!context?.registerTool) return () => {};
  const lifecycle = new AbortController();
  const register = (tool: Record<string, unknown>) => {
    try {
      void Promise.resolve(
        context.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    } catch {}
  };
  register({
    name: "get_vio_room",
    title: "Ver estado da sala VIO",
    description:
      "Lê presença e transmissões da sala atual. Não expõe tokens nem credenciais.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: (input: unknown) => {
      z.object({}).strict().parse(input);
      return {
        status: engine.view.status,
        participants:
          engine.view.snapshot?.participants.map((m) => ({
            id: m.id,
            name: m.name,
            online: m.online,
            screens: m.publications
              .filter((p) => p.kind === "screen")
              .map((p) => p.id),
          })) || [],
        selected: engine.view.selected,
      };
    },
  });
  register({
    name: "select_vio_screen",
    title: "Escolher tela para assistir",
    description:
      "Troca a transmissão principal pelo ID de uma tela publicada na sala. Não inicia capturas ou permissões.",
    inputSchema: {
      type: "object",
      properties: { publicationId: { type: "string" } },
      required: ["publicationId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: (input: unknown) => {
      const { publicationId } = z
        .object({ publicationId: z.string().max(80) })
        .strict()
        .parse(input);
      if (
        !engine.view.snapshot?.participants.some((m) =>
          m.publications.some(
            (p) => p.id === publicationId && p.kind === "screen",
          ),
        )
      )
        throw new Error("Tela indisponível.");
      engine.select(publicationId);
      return {
        selected: engine.view.selected,
        status: "assinatura solicitada",
      };
    },
  });
  return () => lifecycle.abort();
}
