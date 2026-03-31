// doqtor — website scripts

(function () {
  "use strict";

  // --- Theme toggle ---
  var toggle = document.getElementById("theme-toggle");
  var html = document.documentElement;

  function getPreferred() {
    var stored = localStorage.getItem("doqtor-theme");
    if (stored) return stored;
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }

  function applyTheme(theme) {
    html.setAttribute("data-theme", theme);
    localStorage.setItem("doqtor-theme", theme);
  }

  applyTheme(getPreferred());

  if (toggle) {
    toggle.addEventListener("click", function () {
      var current = html.getAttribute("data-theme");
      applyTheme(current === "dark" ? "light" : "dark");
    });
  }

  // --- Mobile nav ---
  var hamburger = document.getElementById("nav-hamburger");
  var navLinks = document.getElementById("nav-links");

  if (hamburger && navLinks) {
    hamburger.addEventListener("click", function () {
      hamburger.classList.toggle("open");
      navLinks.classList.toggle("open");
    });

    navLinks.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        hamburger.classList.remove("open");
        navLinks.classList.remove("open");
      });
    });
  }

  // --- Copy buttons ---
  document.querySelectorAll(".copy-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      navigator.clipboard.writeText(text).then(function () {
        btn.classList.add("copied");
        setTimeout(function () {
          btn.classList.remove("copied");
        }, 1500);
      });
    });
  });

  // --- Nav shadow on scroll ---
  var nav = document.getElementById("nav");
  var scrolled = false;

  function onScroll() {
    var isScrolled = window.scrollY > 20;
    if (isScrolled !== scrolled) {
      scrolled = isScrolled;
      nav.style.boxShadow = scrolled
        ? "0 4px 20px rgba(0,0,0,0.15)"
        : "none";
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });

  // --- Intersection observer for fade-in (landing page) ---
  var fadeTargets = document.querySelectorAll(
    ".feature-card, .pipeline-step, .quickstart-card"
  );

  if (fadeTargets.length > 0) {
    var style = document.createElement("style");
    style.textContent =
      ".fade-target{opacity:0;transform:translateY(16px);transition:opacity .5s ease,transform .5s ease}" +
      ".fade-target.visible{opacity:1;transform:translateY(0)}" +
      ".pipeline-step.fade-target{transition-delay:calc(var(--i,0) * 80ms)}";
    document.head.appendChild(style);

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    fadeTargets.forEach(function (el) {
      el.classList.add("fade-target");
      observer.observe(el);
    });

    document.querySelectorAll(".pipeline-step").forEach(function (step, i) {
      step.style.setProperty("--i", i);
    });
  }

  // ============================================================
  // Docs page: sidebar toggle & scroll spy
  // ============================================================
  var sidebar = document.getElementById("docs-sidebar");
  var sidebarToggle = document.getElementById("sidebar-toggle");

  if (sidebar && sidebarToggle) {
    // Create backdrop overlay for mobile sidebar
    var backdrop = document.createElement("div");
    backdrop.className = "sidebar-backdrop";
    document.body.appendChild(backdrop);

    function openSidebar() {
      sidebar.classList.add("open");
      backdrop.classList.add("open");
    }

    function closeSidebar() {
      sidebar.classList.remove("open");
      backdrop.classList.remove("open");
    }

    sidebarToggle.addEventListener("click", function () {
      if (sidebar.classList.contains("open")) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });

    backdrop.addEventListener("click", closeSidebar);

    // Close sidebar on link click (mobile)
    sidebar.querySelectorAll(".sidebar-link").forEach(function (link) {
      link.addEventListener("click", function () {
        if (window.innerWidth <= 900) {
          closeSidebar();
        }
      });
    });
  }

  // Scroll spy for sidebar
  var sidebarLinks = document.querySelectorAll(".sidebar-link");
  if (sidebarLinks.length > 0) {
    var sections = [];
    var clickedLink = null;
    var clickTimer = null;

    sidebarLinks.forEach(function (link) {
      var href = link.getAttribute("href");
      if (href && href.startsWith("#")) {
        var target = document.getElementById(href.slice(1));
        if (target) {
          sections.push({ el: target, link: link });
        }
      }

      // On click, lock the active state to this link
      link.addEventListener("click", function () {
        clickedLink = link;
        sidebarLinks.forEach(function (l) { l.classList.remove("active"); });
        link.classList.add("active");

        // Release lock after scroll settles
        clearTimeout(clickTimer);
        clickTimer = setTimeout(function () {
          clickedLink = null;
        }, 800);
      });
    });

    function updateActiveLink() {
      // Skip scroll spy while a click-navigation is in progress
      if (clickedLink) return;

      var current = null;

      for (var i = 0; i < sections.length; i++) {
        var rect = sections[i].el.getBoundingClientRect();
        if (rect.top <= 130) {
          current = sections[i];
        }
      }

      if (current) {
        sidebarLinks.forEach(function (l) {
          l.classList.remove("active");
        });
        current.link.classList.add("active");
      }
    }

    window.addEventListener("scroll", updateActiveLink, { passive: true });
    updateActiveLink();
  }
})();
