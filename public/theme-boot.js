try {
  var p = localStorage.getItem("sql-studio-v1");
  var theme = "system";
  if (p) {
    var j = JSON.parse(p);
    theme =
      (j && j.state && j.state.preferences && j.state.preferences.theme) ||
      (j && j.preferences && j.preferences.theme) ||
      "system";
  }
  document.documentElement.dataset.theme =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
      ? "dark"
      : "light";
} catch {}
