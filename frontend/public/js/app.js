(function () {
  "use strict";

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/service-worker.js").catch(function () {
        // Offline support is best-effort - failing to register should not break the page
      });
    });
  }

  function showConnectivityBanner(message, isOffline) {
    var existing = document.getElementById("connectivityBanner");
    if (existing) existing.remove();

    var banner = document.createElement("div");
    banner.id = "connectivityBanner";
    banner.textContent = message;
    banner.style.cssText =
      "position:fixed;bottom:0;left:0;right:0;z-index:2000;text-align:center;" +
      "padding:0.6rem;font-weight:600;color:#fff;" +
      "background:" + (isOffline ? "#dc2626" : "#0f766e") + ";";
    document.body.appendChild(banner);

    if (!isOffline) {
      setTimeout(function () {
        banner.remove();
      }, 4000);
    }
  }

  window.addEventListener("offline", function () {
    showConnectivityBanner(
      "You are offline. Drafts you're filling in are saved on this device and won't be lost - submit them once you're back online.",
      true,
    );
  });

  window.addEventListener("online", function () {
    showConnectivityBanner("Back online. You can now submit any saved drafts.", false);
  });

  var originalFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    init = init || {};
    var url = typeof input === "string" ? input : input.url;
    var target = new URL(url, window.location.origin);

    if (target.origin === window.location.origin) {
      init.headers = new Headers(init.headers || {});
      init.headers.set("x-csrf-token", window.allSafeCsrfToken);
    }

    return originalFetch(input, init);
  };

  document.addEventListener("DOMContentLoaded", function () {
    var backToTopButton = document.getElementById("backToTopButton");
    var submitOverlay = document.getElementById("submitLockOverlay");
    var submitMessage = document.getElementById("submitLockMessage");
    var submitLocked = false;

    document.querySelectorAll('input[type="password"]').forEach(function (input) {
      if (input.dataset.passwordToggleReady === "true") return;

      var wrapper = document.createElement("div");
      wrapper.className = "password-toggle-wrap";
      input.parentNode.insertBefore(wrapper, input);
      wrapper.appendChild(input);

      var button = document.createElement("button");
      button.type = "button";
      button.className = "password-toggle-btn";
      button.setAttribute("aria-label", "Show password");
      button.innerHTML = '<i class="fa-solid fa-eye" aria-hidden="true"></i>';
      wrapper.appendChild(button);

      input.dataset.passwordToggleReady = "true";

      button.addEventListener("click", function () {
        var isHidden = input.type === "password";
        input.type = isHidden ? "text" : "password";
        input.dataset.passwordVisible = isHidden ? "true" : "false";
        button.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
        button.innerHTML = isHidden
          ? '<i class="fa-solid fa-eye-slash" aria-hidden="true"></i>'
          : '<i class="fa-solid fa-eye" aria-hidden="true"></i>';
      });
    });

    if (backToTopButton) {
      var toggleBackToTop = function () {
        backToTopButton.classList.toggle("is-visible", window.scrollY > 320);
      };

      window.addEventListener("scroll", toggleBackToTop, { passive: true });
      toggleBackToTop();

      backToTopButton.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    var submitMessages = [
      { match: "incidents", text: "We are submitting your incident report. Please wait..." },
      { match: "safety-talks", text: "We are working on your safety talk draft. Please wait..." },
      { match: "safety-insights", text: "We are generating your safety insight. Please wait..." },
      { match: "environmental-assessments", text: "We are preparing your environmental screening. Please wait..." },
      { match: "risk-assessments", text: "We are preparing your risk assessment. Please wait..." },
      { match: "safety-audits", text: "We are preparing your safety audit. Please wait..." },
      { match: "ohs-compliance-audits", text: "We are preparing your OHS compliance audit. Please wait..." },
      { match: "jsa", text: "We are preparing your job safety analysis. Please wait..." },
      { match: "ppe", text: "We are preparing your PPE checklist. Please wait..." },
      { match: "permits", text: "We are processing your work permit. Please wait..." },
      { match: "training", text: "We are preparing your training requirement. Please wait..." },
      { match: "emergency-protocols", text: "We are preparing your emergency protocol. Please wait..." },
      { match: "safety-observations", text: "We are submitting your safety observation. Please wait..." },
      { match: "work-areas", text: "We are saving your work area. Please wait..." },
      { match: "alerts", text: "We are updating the alert status. Please wait..." },
      { match: "login", text: "We are signing you in. Please wait..." },
      { match: "register", text: "We are submitting your registration. Please wait..." },
      { match: "password", text: "We are updating your password request. Please wait..." },
    ];

    var getSubmitMessage = function (form) {
      var action = (form.getAttribute("action") || window.location.pathname || "").toLowerCase();
      var source = action + " " + window.location.pathname.toLowerCase();
      var found = submitMessages.find(function (item) {
        return source.indexOf(item.match) !== -1;
      });

      return form.dataset.submitMessage || (found ? found.text : "Submitting your request. Please wait...");
    };

    document.addEventListener("submit", function (event) {
      var form = event.target;
      if (!form || form.tagName !== "FORM" || form.dataset.swalConfirm !== "true") return;
      if (form.dataset.swalConfirmed === "true") {
        delete form.dataset.swalConfirmed;
        return;
      }

      event.preventDefault();
      var submitter = event.submitter;

      Swal.fire({
        icon: "warning",
        title: form.dataset.swalTitle || "Are you sure?",
        text: form.dataset.swalText || "Please confirm that you want to continue.",
        showCancelButton: true,
        confirmButtonColor: "#e11d48",
        cancelButtonColor: "#6c757d",
        confirmButtonText: form.dataset.swalConfirmButton || "Confirm",
        cancelButtonText: "Cancel",
        customClass: {
          popup: "all-safe-medical-alert",
          confirmButton: "all-safe-medical-confirm",
          cancelButton: "all-safe-medical-cancel",
        },
      }).then(function (result) {
        if (!result.isConfirmed) return;

        form.dataset.swalConfirmed = "true";
        if (typeof form.requestSubmit === "function") {
          form.requestSubmit(submitter || undefined);
        } else {
          form.submit();
        }
      });
    });

    document.addEventListener("submit", function (event) {
      var form = event.target;
      if (!form || form.tagName !== "FORM" || event.defaultPrevented) return;
      if (!form.querySelector('input[name="_csrf"]')) {
        var csrfInput = document.createElement("input");
        csrfInput.type = "hidden";
        csrfInput.name = "_csrf";
        csrfInput.value = window.allSafeCsrfToken;
        form.appendChild(csrfInput);
      }
      if (form.dataset.submitLock === "false") return;
      if ((form.getAttribute("target") || "").toLowerCase() === "_blank") return;

      var method = (form.getAttribute("method") || "GET").toUpperCase();
      if (method === "GET") return;

      if (submitLocked || form.dataset.submitting === "true") {
        event.preventDefault();
        return;
      }

      submitLocked = true;
      form.dataset.submitting = "true";

      var submitter = event.submitter || form.querySelector('button[type="submit"], input[type="submit"]');
      form.querySelectorAll('button[type="submit"], input[type="submit"]').forEach(function (button) {
        button.disabled = true;
      });

      if (submitter) {
        submitter.dataset.originalHtml = submitter.innerHTML || submitter.value || "";
        if (submitter.tagName === "BUTTON") {
          submitter.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Please wait...';
        } else {
          submitter.value = "Please wait...";
        }
      }

      if (submitOverlay && submitMessage) {
        submitMessage.textContent = getSubmitMessage(form);
        submitOverlay.hidden = false;
      }
    });
  });
})();
