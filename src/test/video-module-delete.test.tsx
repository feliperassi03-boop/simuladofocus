import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import VideoaulasTab from "@/components/admin/VideoaulasTab";

const mocks = vi.hoisted(() => ({
  remove: vi.fn(),
  deleteRow: vi.fn(),
  toast: vi.fn(),
  removed: false,
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => ({
    select: () => {
      const result = { data: table === "video_modules" && !mocks.removed ? [{ id: "module-1", title: "Módulo temporário", sort_order: 0 }] : table === "video_lessons" && !mocks.removed ? [{ id: "lesson-1", module_id: "module-1", title: "Aula temporária", video_path: "videos/test.mp4", pdf_path: null, sort_order: 0 }] : [] };
      const query = { order: () => query, then: (resolve: (value: typeof result) => void) => Promise.resolve(result).then(resolve) };
      return query;
    },
    delete: () => ({ eq: (column: string, id: string) => ({ select: () => ({ single: () => mocks.deleteRow(table, column, id) }) }) }),
  }),
  storage: { from: () => ({ remove: mocks.remove }) },
} }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.removed = false;
  mocks.remove.mockResolvedValue({ error: null });
  mocks.deleteRow.mockImplementation(async () => { mocks.removed = true; return { data: { id: "module-1" }, error: null }; });
});
afterEach(cleanup);

async function openConfirmation() {
  render(<VideoaulasTab />);
  fireEvent.click(await screen.findByRole("button", { name: "Excluir módulo Módulo temporário" }));
}

describe("video module deletion", () => {
  it("does not delete anything when confirmation is cancelled", async () => {
    await openConfirmation();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(mocks.deleteRow).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("deletes only the selected module before removing its media", async () => {
    await openConfirmation();
    fireEvent.click(screen.getByRole("button", { name: /^Excluir$/ }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith(["videos/test.mp4"]));
    expect(mocks.deleteRow).toHaveBeenCalledWith("video_modules", "id", "module-1");
    expect(mocks.deleteRow.mock.invocationCallOrder[0]).toBeLessThan(mocks.remove.mock.invocationCallOrder[0]);
    expect(mocks.toast).toHaveBeenCalledWith({ title: "Módulo excluído!" });
  });

  it("preserves media and reports a failed database deletion", async () => {
    mocks.deleteRow.mockResolvedValue({ data: null, error: { message: "Permission denied" } });
    await openConfirmation();
    fireEvent.click(screen.getByRole("button", { name: /^Excluir$/ }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: "Permission denied", variant: "destructive" })));
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("does not remove media when no deleted row is confirmed", async () => {
    mocks.deleteRow.mockResolvedValue({ data: null, error: null });
    await openConfirmation();
    fireEvent.click(screen.getByRole("button", { name: /^Excluir$/ }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Não foi possível excluir" })));
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});