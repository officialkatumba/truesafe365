(function () {
  "use strict";

  function debounce(fn, delay) {
    var timer;
    return function () {
      var args = arguments;
      var context = this;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(context, args);
      }, delay);
    };
  }

  function serializeForm(form) {
    var data = {};
    new FormData(form).forEach(function (value, key) {
      if (data[key] === undefined) {
        data[key] = value;
      } else if (Array.isArray(data[key])) {
        data[key].push(value);
      } else {
        data[key] = [data[key], value];
      }
    });
    return data;
  }

  function restoreForm(form, data) {
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || !(el.name in data)) return;
      var value = data[el.name];

      if (el.type === "checkbox" || el.type === "radio") {
        var values = Array.isArray(value) ? value : [value];
        el.checked = values.indexOf(el.value) !== -1;
      } else if (el.tagName === "SELECT" && el.multiple) {
        var selectedValues = Array.isArray(value) ? value : [value];
        Array.prototype.forEach.call(el.options, function (opt) {
          opt.selected = selectedValues.indexOf(opt.value) !== -1;
        });
      } else if (el.type !== "file" && el.type !== "submit" && el.type !== "button") {
        el.value = value;
      }
    });
  }

  function initAutosave(form) {
    var key =
      "ts365_draft_" +
      (form.getAttribute("data-autosave") || form.id || "form") +
      "_" +
      window.location.pathname;

    var banner = document.createElement("div");
    banner.className = "alert alert-info d-flex justify-content-between align-items-center d-none";
    banner.innerHTML =
      '<span><i class="fas fa-clock-rotate-left me-2"></i>Draft restored from your last visit to this form.</span>' +
      '<button type="button" class="btn btn-sm btn-outline-secondary ms-2">Discard draft</button>';
    form.parentNode.insertBefore(banner, form);

    var saved = localStorage.getItem(key);
    if (saved) {
      try {
        restoreForm(form, JSON.parse(saved));
        banner.classList.remove("d-none");
      } catch (e) {
        localStorage.removeItem(key);
      }
    }

    banner.querySelector("button").addEventListener("click", function () {
      localStorage.removeItem(key);
      form.reset();
      banner.classList.add("d-none");
    });

    var save = debounce(function () {
      try {
        localStorage.setItem(key, JSON.stringify(serializeForm(form)));
      } catch (e) {
        // localStorage unavailable or full - autosave is best-effort only
      }
    }, 800);

    form.addEventListener("input", save);
    form.addEventListener("change", save);
    form.addEventListener("submit", function () {
      localStorage.removeItem(key);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var forms = document.querySelectorAll("form[data-autosave]");
    Array.prototype.forEach.call(forms, initAutosave);
  });
})();
