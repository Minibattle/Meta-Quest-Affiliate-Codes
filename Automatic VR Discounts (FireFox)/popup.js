const ext = globalThis.browser ?? globalThis.chrome;

const toggle = document.getElementById("enabled");
const label = document.getElementById("label");
const render = () => (label.textContent = toggle.checked ? "Enabled" : "Disabled");

ext.storage.sync.get({ enabled: true }).then((s) => {
  toggle.checked = s.enabled;
  render();
});

toggle.addEventListener("change", () => {
  ext.storage.sync.set({ enabled: toggle.checked });
  render();
});
