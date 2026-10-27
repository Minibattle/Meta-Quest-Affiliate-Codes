const toggle = document.getElementById("enabled");
const label = document.getElementById("label");
const render = () => (label.textContent = toggle.checked ? "Enabled" : "Disabled");

chrome.storage.sync.get({ enabled: true }, (s) => {
  toggle.checked = s.enabled;
  render();
});

toggle.addEventListener("change", () => {
  chrome.storage.sync.set({ enabled: toggle.checked });
  render();
});
