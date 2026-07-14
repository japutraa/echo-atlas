/**
 * Boot diagnostics and offline registration for Perang Narasi.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

(() => {
  "use strict";

  const showBootError = (message) => {
    const box = document.querySelector("#bootError");
    if (!box) return;
    box.textContent = `Game gagal dimuat: ${message} Coba muat ulang halaman atau hapus cache situs.`;
    box.classList.remove("hidden");
  };

  window.addEventListener("error", (event) => {
    showBootError(event.error?.message || event.message || "error JavaScript yang tidak dikenal.");
  });

  window.addEventListener("unhandledrejection", (event) => {
    showBootError(event.reason?.message || String(event.reason || "proses async gagal."));
  });

  window.addEventListener("DOMContentLoaded", () => {
    if (document.documentElement.dataset.gameReady !== "true") {
      showBootError("mesin permainan tidak selesai melakukan inisialisasi.");
      return;
    }

    if ("serviceWorker" in navigator && /^https?:$/.test(window.location.protocol)) {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        // Offline support is optional; gameplay remains available without it.
      });
    }
  });
})();

