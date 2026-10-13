/**
 * @vitest-environment jsdom
 */
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it } from "vitest";
import SettingsPage from "@/app/settings/page";
import { useLearning } from "@/lib/learning-state";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;

function snapshot() {
  const state = useLearning.getState();
  return {
    drafts: state.drafts,
    projects: state.projects,
    stats: state.stats,
    theme: state.preferences.theme,
    collapsed: state.preferences.collapsed,
  };
}

function button(name: string) {
  const found = [...document.querySelectorAll("button")].find(
    (item) => item.textContent?.replace(/\s+/g, " ").trim() === name,
  );
  if (!found) {
    throw new Error(`No button named ${name}`);
  }
  return found as HTMLButtonElement;
}

beforeEach(async () => {
  useLearning.getState().resetProgress();
  useLearning.getState().setTheme("dark");
  useLearning.getState().setDraft("sql-lesson-1-0", "SELECT name FROM products");
  useLearning.getState().setMilestoneNotes(0, 45, "Daily active users rose on weekdays.");
  useLearning.getState().recordCheck({
    lessonId: 1,
    variant: 0,
    project: null,
    ok: true,
    guided: false,
    query: "SELECT name, price * 2 AS double_price FROM products",
  });
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(createElement(SettingsPage));
  });
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

it("cancel on either step leaves lessons, drafts, and project notes untouched", async () => {
  const before = snapshot();

  await act(async () => {
    button("Delete saved progress").click();
  });
  expect(document.body.textContent).toContain("SQL drafts");
  expect(document.body.textContent).toContain("Project notes and checked results");
  expect(button("Cancel")).toBe(document.activeElement);
  expect([...document.querySelectorAll("button")].some((item) => item.textContent?.includes("Yes, delete"))).toBe(false);

  await act(async () => {
    button("Cancel").click();
  });
  expect(document.querySelector("[role=dialog]")).toBeNull();
  expect(snapshot()).toEqual(before);

  await act(async () => {
    button("Delete saved progress").click();
  });
  await act(async () => {
    button("Continue").click();
  });
  expect(document.body.textContent).toContain("Delete everything saved in this browser?");
  expect(button("Cancel")).toBe(document.activeElement);

  await act(async () => {
    button("Cancel").click();
  });
  expect(snapshot()).toEqual(before);

  await act(async () => {
    button("Delete saved progress").click();
  });
  await act(async () => {
    document.querySelector<HTMLElement>(".delete-progress-backdrop")?.click();
  });
  expect(snapshot()).toEqual(before);

  await act(async () => {
    button("Delete saved progress").click();
  });
  await act(async () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  });
  expect(snapshot()).toEqual(before);
  expect(useLearning.getState().stats[1]?.attempts).toBe(1);
  expect(useLearning.getState().drafts["sql-lesson-1-0"]).toContain("products");
  expect(useLearning.getState().projects[0]?.milestones[45]?.notes).toContain("weekdays");
});

it("deletes saved work only after the second confirmation", async () => {
  await act(async () => {
    useLearning.getState().setCollapsed(true);
  });
  await act(async () => {
    button("Delete saved progress").click();
  });
  await act(async () => {
    button("Continue").click();
  });
  await act(async () => {
    button("Yes, delete saved progress").click();
  });
  const state = useLearning.getState();
  expect(state.drafts).toEqual({});
  expect(state.projects).toEqual({});
  expect(state.stats).toEqual({});
  expect(state.preferences.theme).toBe("dark");
  expect(state.preferences.collapsed).toBe(true);
  expect(document.body.textContent).toContain("deleted from this browser");
});
