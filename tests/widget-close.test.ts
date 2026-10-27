import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { io, type Socket } from "socket.io-client";
import { createApp } from "../src/server/app";
import { readConfig } from "../src/server/config";
import { RoomWidgets } from "../src/server/widgets";
import type { Reply } from "../src/shared/protocol";
import type { WidgetUpdatedEvent } from "../src/shared/widgets";

const origin = "http://localhost:3000";
function request<T = unknown>(
  socket: Socket,
  action: string,
  data: unknown = {},
): Promise<Reply<T>> {
  return new Promise((resolve, reject) =>
    socket
      .timeout(3000)
      .emit("command", { action, data }, (e: Error | null, r: Reply<T>) =>
        e ? reject(e) : resolve(r),
      ),
  );
}
function data<T>(r: Reply<T>): T {
  if (!r.ok) assert.fail(r.message);
  return r.data;
}
const code = (r: Reply<unknown>) => (r.ok ? "OK" : r.code);
const next = (socket: Socket) =>
  new Promise<WidgetUpdatedEvent>((resolve) =>
    socket.once("widget-updated", resolve),
  );

test("fechar para todos guarda o widget para Desfazer só de quem pode", async () => {
  const app = await createApp(
    readConfig({
      PORT: "0",
      SESSION_SECRET: "test-only-widget-close-secret-value",
      ALLOWED_ORIGINS: origin,
      STUN_URLS: "",
    }),
  );
  app.http.listen(0, "127.0.0.1");
  await once(app.http, "listening");
  const url = `http://127.0.0.1:${(app.http.address() as { port: number }).port}`;
  const sockets: Socket[] = [];
  try {
    const ids: string[] = [];
    for (const name of ["Dono", "Admin", "Lia", "Rui"]) {
      const { token } = await fetch(url + "/api/session", {
        method: "POST",
        headers: { Origin: origin },
      }).then((r) => r.json());
      const socket = io(url, {
        transports: ["websocket"],
        auth: { token },
        extraHeaders: { Origin: origin },
        reconnection: false,
      });
      await new Promise((resolve) =>
        socket.once("connect", () => resolve(null)),
      );
      sockets.push(socket);
      ids.push(
        data(
          await request<{ id: string }>(socket, "join", {
            name,
            code: "QACLOSE",
          }),
        ).id,
      );
    }
    const [owner, admin, lia, rui] = sockets;
    const room = app.rooms.rooms.get("QACLOSE")!;
    data(
      await request(owner, "role", {
        participantId: ids[1],
        action: "promote",
      }),
    );
    data(
      await request(owner, "room-permissions", {
        permissions: { guestCreate: true },
      }),
    );
    const id = crypto.randomUUID();
    const content = {
      title: "Placar",
      blocks: [
        { id: crypto.randomUUID(), kind: "score", label: "Pontos", value: 3 },
      ],
    };
    data(await request(lia, "widget-create", { id, content }));
    const created = room.widgets.entries.get(id)!;

    // A guest who did not create it cannot close it for everyone.
    assert.equal(
      code(await request(rui, "widget-delete", { id })),
      "FORBIDDEN",
    );

    // The widget's creator closes it; everyone learns who and until when.
    let event = next(rui);
    data(await request(lia, "widget-delete", { id }));
    const closed = await event;
    assert.equal(closed.widget, null);
    assert.equal(closed.closed?.by, ids[2]);
    assert.equal(closed.closed?.byName, "Lia");
    assert.ok(closed.closed!.until > Date.now());
    assert.ok(closed.closed!.until <= Date.now() + 8000);
    assert.equal(room.widgets.entries.has(id), false);

    // Undo: not for a bystander; extra fields rejected; the closer restores as-is.
    assert.equal(
      code(await request(rui, "widget-restore", { id })),
      "FORBIDDEN",
    );
    assert.equal(
      code(await request(lia, "widget-restore", { id, extra: 1 })),
      "INVALID_REQUEST",
    );
    event = next(rui);
    data(await request(lia, "widget-restore", { id }));
    assert.deepEqual((await event).widget, created);
    assert.deepEqual(room.widgets.entries.get(id), created);
    assert.equal(room.widgets.closed.size, 0);
    assert.equal(
      code(await request(lia, "widget-restore", { id })),
      "NOT_FOUND",
    );

    // The room owner closes; the widget's creator may still undo it.
    data(await request(owner, "widget-delete", { id }));
    assert.equal(
      code(await request(rui, "widget-restore", { id })),
      "FORBIDDEN",
    );
    data(await request(lia, "widget-restore", { id }));

    // Admins close others' widgets only while the owner allows it.
    data(
      await request(owner, "room-permissions", {
        permissions: { adminClose: false },
      }),
    );
    assert.equal(
      code(await request(admin, "widget-delete", { id })),
      "FORBIDDEN",
    );
    data(await request(owner, "widget-delete", { id }));
    assert.equal(
      code(await request(admin, "widget-restore", { id })),
      "FORBIDDEN",
    );

    // After the hold, nobody can undo it.
    room.widgets.closed.get(id)!.until = Date.now() - 1;
    assert.equal(
      code(await request(owner, "widget-restore", { id })),
      "NOT_FOUND",
    );

    // Restoring cannot exceed the creator's widget limit.
    const extra = crypto.randomUUID();
    data(await request(lia, "widget-create", { id: extra, content }));
    data(await request(lia, "widget-delete", { id: extra }));
    for (let i = 0; i < 6; i++)
      data(
        await request(lia, "widget-create", {
          id: crypto.randomUUID(),
          content,
        }),
      );
    assert.equal(
      code(await request(lia, "widget-restore", { id: extra })),
      "WIDGET_LIMIT",
    );
  } finally {
    sockets.forEach((s) => s.disconnect());
    await app.close();
  }
});

test("a cópia do widget fechado expira sozinha em 8 s", () => {
  mock.timers.enable({ apis: ["setTimeout", "Date"] });
  try {
    const widgets = new RoomWidgets();
    const id = crypto.randomUUID();
    widgets.create("a", id, { title: "Placar", blocks: [] });
    assert.equal(widgets.close(id, "a", "Lia").until, Date.now() + 8000);
    mock.timers.tick(7999);
    assert.equal(widgets.restore(id).id, id);
    widgets.close(id, "a", "Lia");
    mock.timers.tick(8000);
    assert.equal(widgets.closed.size, 0);
    assert.throws(() => widgets.restore(id), { code: "NOT_FOUND" });
  } finally {
    mock.timers.reset();
  }
});
