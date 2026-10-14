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
  document.cookie = "rt-theme=" + theme + ";path=/;max-age=31536000;SameSite=Lax";
  var dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  var root = document.documentElement;
  root.dataset.theme = dark ? "dark" : "light";
  root.style.colorScheme = dark ? "dark" : "light";
  root.style.backgroundColor = dark ? "#000000" : "#ffffff";
} catch {}
