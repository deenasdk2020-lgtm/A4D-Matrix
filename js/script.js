(() => {
  const body = document.body;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;

  const updateNavbarState = () => {
    const navbar = document.getElementById("navbar");
    if (!navbar) return;
    navbar.classList.toggle("scrolled", window.scrollY > 18);
  };

  const setupSmoothScroll = () => {
    const anchors = document.querySelectorAll('a[href^="#"]');

    anchors.forEach((anchor) => {
      anchor.addEventListener("click", (event) => {
        const targetId = anchor.getAttribute("href");
        if (!targetId || targetId === "#") return;

        const target = document.querySelector(targetId);
        if (!target) return;

        event.preventDefault();

        const offset = 96;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;

        window.scrollTo({
          top,
          behavior: prefersReducedMotion ? "auto" : "smooth"
        });
      });
    });
  };

  const setupMobileMenu = () => {
    const menuButton = document.getElementById("menuButton");
    const navLinks = document.getElementById("navLinks");

    if (!menuButton || !navLinks) return;

    const closeMenu = () => {
      navLinks.classList.remove("open");
      menuButton.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
      body.classList.remove("menu-open");
    };

    menuButton.addEventListener("click", () => {
      const isOpen = navLinks.classList.toggle("open");
      menuButton.classList.toggle("open", isOpen);
      menuButton.setAttribute("aria-expanded", String(isOpen));
      body.classList.toggle("menu-open", isOpen);
    });

    navLinks.querySelectorAll("a").forEach((link, index) => {
      link.style.transitionDelay = `${index * 50}ms`;
      link.addEventListener("click", closeMenu);
    });
  };

  const setupRevealObserver = () => {
    const revealItems = document.querySelectorAll(".reveal-on-scroll, main section[id]");

    if (!revealItems.length) return;

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });

      revealItems.forEach((item, index) => {
        item.style.transitionDelay = `${Math.min(index * 45, 280)}ms`;
        if (!item.classList.contains("reveal-on-scroll")) {
          item.classList.add("reveal-on-scroll");
        }
        observer.observe(item);
      });
    } else {
      revealItems.forEach((item) => item.classList.add("visible"));
    }
  };

  const setupNavHighlight = () => {
    const sections = document.querySelectorAll("main section[id]");
    const navItems = document.querySelectorAll('.nav-links a[href^="#"]');

    if (!sections.length || !navItems.length) return;

    const updateActiveLink = () => {
      const viewportCenter = window.innerHeight * 0.35;
      let activeId = "home";

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= viewportCenter && rect.bottom >= viewportCenter) {
          activeId = section.id;
        }
      });

      navItems.forEach((link) => {
        const isActive = link.getAttribute("href") === `#${activeId}`;
        link.classList.toggle("active", isActive);
      });
    };

    updateActiveLink();
    window.addEventListener("scroll", updateActiveLink, { passive: true });
    window.addEventListener("resize", updateActiveLink);
  };

  const setupCardGlow = () => {
    document.querySelectorAll(".project-card, .team-card").forEach((card) => {
      const setCardGlow = (event) => {
        const rect = card.getBoundingClientRect();
        const offsetX = event.clientX - rect.left;
        const offsetY = event.clientY - rect.top;
        card.style.setProperty("--mx", `${offsetX}px`);
        card.style.setProperty("--my", `${offsetY}px`);
      };

      card.addEventListener("pointermove", setCardGlow);
      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--mx", "50%");
        card.style.setProperty("--my", "50%");
      });
    });
  };

  const setupMemberHotspots = () => {
    const photoPlaceholder = document.querySelector(".about-photo-placeholder");
    const hotspots = photoPlaceholder ? Array.from(photoPlaceholder.querySelectorAll(".member-hotspot")) : [];

    if (!photoPlaceholder || !hotspots.length) return;

    const activateMember = (hotspot) => {
      hotspots.forEach((item) => item.classList.toggle("active", item === hotspot));
      photoPlaceholder.classList.add("has-active");
    };

    hotspots.forEach((hotspot) => {
      hotspot.addEventListener("pointerenter", () => activateMember(hotspot));
      hotspot.addEventListener("focus", () => activateMember(hotspot));
      hotspot.addEventListener("click", () => activateMember(hotspot));
    });

    activateMember(hotspots.find((hotspot) => hotspot.classList.contains("active")) || hotspots[0]);
  };

  const setupWorkScroll = () => {
    const stage = document.querySelector(".work-grid");
    const originalCards = stage ? Array.from(stage.querySelectorAll(".project-card")) : [];

    if (!stage || !originalCards.length) return;

    const prependCards = originalCards.map((card) => card.cloneNode(true));
    const appendCards = originalCards.map((card) => card.cloneNode(true));
    prependCards.reverse().forEach((card) => stage.prepend(card));
    appendCards.forEach((card) => stage.append(card));

    const cards = Array.from(stage.querySelectorAll(".project-card"));
    const trackStart = cards[originalCards.length].offsetLeft - cards[0].offsetLeft;

    const autoSpeed = 0.032;
    const mobileAutoSpeed = 0.018;
    const mobileQuery = window.matchMedia("(max-width: 768px)");
    let lastTime = performance.now();
    let isDragging = false;
    let dragIntent = null;
    let pointerStartX = 0;
    let pointerStartY = 0;
    let dragStartScroll = 0;

    const normalizeScroll = () => {
      while (stage.scrollLeft >= trackStart * 2) stage.scrollLeft -= trackStart;
      while (stage.scrollLeft < trackStart) stage.scrollLeft += trackStart;
    };

    const updateCards = () => {
      const stageCenter = stage.scrollLeft + stage.clientWidth / 2;
      const curve = parseFloat(getComputedStyle(stage).getPropertyValue("--arc-curve")) || 0;
      const isMobile = mobileQuery.matches;
      const focusRange = stage.clientWidth * (isMobile ? 0.66 : 0.56);
      const maxScale = isMobile ? 0.045 : 0.08;
      const minOpacity = isMobile ? 0.78 : 0.72;

      cards.forEach((card) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const distance = Math.min(Math.abs(cardCenter - stageCenter) / focusRange, 1);
        const emphasis = 1 - distance;

        card.style.setProperty("--arc-y", `${curve * distance * distance}px`);
        card.style.setProperty("--arc-scale", (1 + emphasis * maxScale).toFixed(3));
        card.style.setProperty("--arc-opacity", (minOpacity + emphasis * (1 - minOpacity)).toFixed(3));
      });
    };

    const animate = (time) => {
      const elapsed = Math.min(time - lastTime, 50);
      lastTime = time;

      if (!prefersReducedMotion && !isDragging) {
        stage.scrollLeft += (mobileQuery.matches ? mobileAutoSpeed : autoSpeed) * elapsed;
      }

      normalizeScroll();

      updateCards();
      window.requestAnimationFrame(animate);
    };

    stage.addEventListener("scroll", () => {
      normalizeScroll();
      updateCards();
    }, { passive: true });
    stage.addEventListener("wheel", (event) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      if (!event.deltaX) return;

      event.preventDefault();
      stage.scrollLeft += event.deltaX;
      normalizeScroll();
      updateCards();
    }, { passive: false });

    stage.addEventListener("pointerdown", (event) => {
      if (!mobileQuery.matches || !isTouchDevice || event.pointerType === "mouse") return;
      isDragging = true;
      dragIntent = null;
      pointerStartX = event.clientX;
      pointerStartY = event.clientY;
      dragStartScroll = stage.scrollLeft;
      lastTime = performance.now();
    }, { passive: true });

    stage.addEventListener("pointermove", (event) => {
      if (!isDragging) return;

      const deltaX = event.clientX - pointerStartX;
      const deltaY = event.clientY - pointerStartY;

      if (!dragIntent && (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6)) {
        dragIntent = Math.abs(deltaX) > Math.abs(deltaY) * 1.15 ? "horizontal" : "vertical";
        if (dragIntent === "horizontal" && stage.setPointerCapture) {
          stage.setPointerCapture(event.pointerId);
        }
      }

      if (dragIntent !== "horizontal") return;

      event.preventDefault();
      stage.scrollLeft = dragStartScroll - deltaX;
      normalizeScroll();
      updateCards();
    }, { passive: false });

    const stopDrag = (event) => {
      if (!isDragging) return;
      if (dragIntent === "horizontal" && stage.releasePointerCapture) {
        try {
          stage.releasePointerCapture(event.pointerId);
        } catch (error) {
          /* Pointer capture may already be released by the browser. */
        }
      }
      isDragging = false;
      dragIntent = null;
      lastTime = performance.now();
      normalizeScroll();
      updateCards();
    };

    stage.addEventListener("pointerup", stopDrag, { passive: true });
    stage.addEventListener("pointercancel", stopDrag, { passive: true });
    stage.addEventListener("lostpointercapture", stopDrag, { passive: true });

    stage.scrollLeft = trackStart;
    updateCards();
    window.requestAnimationFrame(animate);
  };

  const setupServicesScroll = () => {
    const section = document.querySelector(".services-section");
    const stage = section ? section.querySelector(".services-grid") : null;
    const cards = stage ? Array.from(stage.querySelectorAll(".service-card")) : [];

    if (!section || !stage || !cards.length) return;

    let sectionHeight = 0;
    let viewportHeight = window.innerHeight;
    let radiusY = 0;
    let radiusX = 0;
    let arcAngle = 0;

    const refreshMeasurements = () => {
      sectionHeight = section.offsetHeight;
      viewportHeight = window.innerHeight;
      const computedStage = getComputedStyle(stage);
      radiusY = parseFloat(computedStage.getPropertyValue("--service-radius-y")) || 258;
      radiusX = (parseFloat(computedStage.getPropertyValue("--service-radius-x")) || 24) / 100;
      arcAngle = (parseFloat(computedStage.getPropertyValue("--service-angle")) || 55) * Math.PI / 180;
    };

    const render = () => {
      const scrollDistance = Math.max(sectionHeight - viewportHeight, 1);
      const progress = Math.max(0, Math.min(1, -section.getBoundingClientRect().top / scrollDistance));
      const holdPortion = window.innerWidth <= 720 ? 0.25 : window.innerWidth <= 950 ? 0.29 : 0.34;
      const timelineLength = cards.length - 1 + holdPortion;
      const timelinePosition = progress * timelineLength;
      const sceneIndex = Math.min(Math.floor(timelinePosition), cards.length - 1);
      const sceneProgress = timelinePosition - sceneIndex;
      const activePosition = sceneProgress <= holdPortion
        ? sceneIndex
        : sceneIndex + Math.min((sceneProgress - holdPortion) / (1 - holdPortion), 1);

      cards.forEach((card, index) => {
        const distance = index - activePosition;
        const absoluteDistance = Math.min(Math.abs(distance), 1.8);
        const angle = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, distance * arcAngle));
        const scale = Math.max(0.86, 1 - absoluteDistance * 0.07);
        const opacity = Math.max(0.25, 1 - absoluteDistance * 0.39);
        const blur = Math.max(0, (absoluteDistance - 0.08) * 1.25);
        const x = (1 - Math.cos(angle)) * stage.clientWidth * radiusX;
        const outerOffset = Math.max(0, Math.abs(distance) - 1) * 120 * Math.sign(distance);
        const y = Math.sin(angle) * radiusY + outerOffset;
        const z = -((1 - Math.cos(angle)) * 100);
        const rotate = angle * 180 / Math.PI * 0.18;

        card.style.setProperty("--service-x", `${x.toFixed(2)}px`);
        card.style.setProperty("--service-y", `${y.toFixed(2)}px`);
        card.style.setProperty("--service-z", `${z.toFixed(2)}px`);
        card.style.setProperty("--service-scale", scale.toFixed(3));
        card.style.setProperty("--service-opacity", opacity.toFixed(3));
        card.style.setProperty("--service-blur", `${blur.toFixed(2)}px`);
        card.style.setProperty("--service-rotate", `${rotate.toFixed(2)}deg`);
        card.style.zIndex = String(100 - Math.round(absoluteDistance * 10));
        card.classList.toggle("service-active", Math.abs(distance) < 0.5);
      });
    };

    window.addEventListener("scroll", render, { passive: true });
    window.addEventListener("resize", () => {
      refreshMeasurements();
      render();
    });
    refreshMeasurements();
    render();
  };

  const validateField = (field) => {
    const value = field.value.trim();
    let message = "";

    if (field.required && !value) {
      message = field.name === "message"
        ? "Project description is required."
        : field.name === "name"
          ? "Name is required."
          : field.name === "email"
            ? "Email is required."
            : "This field is required.";
    } else if (field.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      message = "Please enter a valid email address.";
    } else if (field.name === "message" && value.length < 20) {
      message = "Please share a little more detail so we can understand your project.";
    }

    field.setCustomValidity(message);
    field.style.borderColor = message ? "rgba(255, 118, 118, 0.7)" : "";
    field.setAttribute("aria-invalid", String(Boolean(message)));

    return !message;
  };

  const setupProjectForm = () => {
    const form = document.getElementById("projectForm");
    const formNote = document.getElementById("formNote");

    if (!form || !formNote) return;

    const fields = Array.from(form.querySelectorAll("input, select, textarea"));

    fields.forEach((field) => {
      field.addEventListener("blur", () => validateField(field));
      field.addEventListener("input", () => validateField(field));
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      let valid = true;
      fields.forEach((field) => {
        if (!validateField(field)) valid = false;
      });

      if (!valid) {
        formNote.textContent = "Please fix the highlighted fields and try again.";
        formNote.style.color = "rgba(255, 146, 146, 0.9)";
        return;
      }

      formNote.textContent = "Thanks — your project brief has been captured. We’ll review it and get back to you soon.";
      formNote.style.color = "rgba(164, 233, 194, 0.9)";
      form.reset();
    });
  };

  updateNavbarState();
  window.addEventListener("scroll", updateNavbarState, { passive: true });

  setupSmoothScroll();
  setupMobileMenu();
  setupRevealObserver();
  setupNavHighlight();
  setupCardGlow();
  setupMemberHotspots();
  setupWorkScroll();
  setupServicesScroll();
  setupProjectForm();
})();
