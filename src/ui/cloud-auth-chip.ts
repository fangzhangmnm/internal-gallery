// 云账号小芯片（WET 自 WeebPaint src/gallery/cloud-auth-ui.ts，2026-09-10 包化）：宿主传三个元素 + auth 端口，包只写内容与状态。
import { t } from "../core/text.ts";
export interface CloudAuthChipEls { iconBtn: HTMLElement; accountInfo: HTMLElement; refreshBtn: HTMLElement; }
export interface CloudAuthPort {
  isSignedIn(): boolean; isAuthConfigured(): boolean;
  activeAccount(): { username?: string; name?: string } | null;
  retrySilentSignIn(): Promise<unknown>;
}
export function renderCloudAuthChip(els: CloudAuthChipEls, auth: CloudAuthPort, icons: { out: string; in: string }, opts?: { latin?: (key: "cf.cloudOfflineTitle") => string }): void {
  const signed = auth.isSignedIn(), configured = auth.isAuthConfigured();
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  if (signed) {
    const acc = auth.activeAccount();
    els.iconBtn.innerHTML = icons.in; els.iconBtn.dataset.cloudState = "signedin";
    const who = acc?.username || acc?.name || t("cf.signedIn");
    els.iconBtn.title = offline ? t("cf.cloudAccountOfflineTitle", { who }) : t("cf.cloudAccountTitle", { who });
    els.accountInfo.textContent = offline ? t("cf.cloudAccountOfflineInfo", { who }) : t("cf.cloudAccountInfo", { who });
    els.refreshBtn.classList.toggle("hidden", offline);
  } else {
    els.iconBtn.innerHTML = icons.out; els.iconBtn.dataset.cloudState = configured ? "out" : "unconfigured";
    if (offline && configured) { els.iconBtn.title = opts?.latin?.("cf.cloudOfflineTitle") ?? t("cf.cloudOfflineTitle"); els.accountInfo.textContent = t("cf.cloudOffline"); }
    else { els.iconBtn.title = configured ? t("cf.cloudNotSignedInTitle") : t("cf.cloudNotConfigured"); els.accountInfo.textContent = configured ? t("cf.cloudNotSignedIn") : t("cf.cloudNotConfigured"); }
    els.refreshBtn.classList.add("hidden");
  }
}
export function wireCloudAuthRefresh(els: Pick<CloudAuthChipEls, "refreshBtn">, auth: CloudAuthPort, after: () => void): void {
  els.refreshBtn.addEventListener("click", async () => {
    if (!auth.isSignedIn() && (typeof navigator === "undefined" || navigator.onLine !== false)) await auth.retrySilentSignIn();
    after();
  });
}
