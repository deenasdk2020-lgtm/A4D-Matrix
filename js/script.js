(() => {
  const body = document.body;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
  let resetWorkDemoTransition = () => {};

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
      const isAtPageBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1;
      if (isAtPageBottom) {
        navItems.forEach((link) => {
          link.classList.toggle("active", link.getAttribute("href") === "#contact");
        });
        return;
      }

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

  const setupProjectThreeDemo = () => {
    const modal = document.getElementById("projectThreeDemo");
    const video = document.getElementById("projectThreeDemoVideo");
    if (!modal || !video) return () => {};

    let isOpen = false;
    let returnScrollPosition = 0;

    const hideDemo = () => {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      video.pause();
      video.currentTime = 0;
      document.body.classList.remove("project-demo-open");
      isOpen = false;
    };

    const closeDemo = () => {
      if (!isOpen) return;
      if (window.history.state?.projectThreeDemo) {
        window.history.back();
        return;
      }
      hideDemo();
    };

    modal.querySelectorAll("[data-demo-close]").forEach((control) => {
      control.addEventListener("click", closeDemo);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && modal.classList.contains("is-open")) closeDemo();
    });

    window.addEventListener("popstate", () => {
      if (!isOpen) return;
      hideDemo();
      resetWorkDemoTransition();
      window.scrollTo({ top: returnScrollPosition, behavior: "auto" });
    });

    return () => {
      if (isOpen) return;
      returnScrollPosition = window.scrollY;
      window.history.pushState({ ...(window.history.state || {}), projectThreeDemo: true }, "", window.location.href);
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("project-demo-open");
      video.muted = true;
      video.currentTime = 0;
      video.load();
      const startVideo = () => {
        video.play().catch((error) => {
          console.warn("Project 3 demo could not autoplay:", error);
        });
      };
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        startVideo();
      } else {
        video.addEventListener("loadeddata", startVideo, { once: true });
      }
      isOpen = true;
    };
  };

  const openProjectThreeDemo = setupProjectThreeDemo();

  const setupWorkScroll = () => {
    const stage = document.querySelector(".work-grid");
    const originalCards = stage ? Array.from(stage.querySelectorAll(".project-card")) : [];

    if (!stage || !originalCards.length) return;

    let activeTransitionImage = null;
    let transitionTimeout = null;
    const clearTransition = () => {
      if (transitionTimeout !== null) {
        window.clearTimeout(transitionTimeout);
        transitionTimeout = null;
      }
      if (activeTransitionImage) {
        activeTransitionImage.remove();
        activeTransitionImage = null;
      }
      document.body.classList.remove("project-transition-active");
    };

    resetWorkDemoTransition = clearTransition;
    window.addEventListener("pageshow", clearTransition);

    const restoreKey = "a4dm-return-to-work";
    const restoreWorkPosition = () => {
      const savedPosition = sessionStorage.getItem(restoreKey);
      if (!savedPosition) return;

      sessionStorage.removeItem(restoreKey);
      const scrollPosition = Number(savedPosition);
      if (!Number.isFinite(scrollPosition)) return;

      window.requestAnimationFrame(() => {
        window.scrollTo({ top: scrollPosition, behavior: "auto" });
      });
    };

    stage.addEventListener("click", (event) => {
      const imageLink = event.target.closest(".project-image");
      if (!imageLink || !stage.contains(imageLink)) return;

      const destination = imageLink.getAttribute("href");
      if (!destination || destination === "#") return;
      const isProjectThree = imageLink.classList.contains("image-three");

      event.preventDefault();
      clearTransition();
      sessionStorage.setItem(restoreKey, String(window.scrollY));

      if (prefersReducedMotion) {
        if (isProjectThree) {
          openProjectThreeDemo();
          return;
        }
        window.location.assign(destination);
        return;
      }

      const imageBounds = imageLink.getBoundingClientRect();
      const transitionImage = document.createElement("div");
      activeTransitionImage = transitionImage;
      const imageClone = imageLink.querySelector("img")?.cloneNode(true);
      const transitionPhoneWidth = Math.min(window.innerWidth * 0.64, 260);
      const transitionPhoneHeight = transitionPhoneWidth * 19.5 / 9;

      transitionImage.className = `project-image-transition${isProjectThree ? " project-three-transition" : ""}`;
      transitionImage.style.setProperty("--transition-top", `${imageBounds.top}px`);
      transitionImage.style.setProperty("--transition-left", `${imageBounds.left}px`);
      transitionImage.style.setProperty("--transition-width", `${imageBounds.width}px`);
      transitionImage.style.setProperty("--transition-height", `${imageBounds.height}px`);
      if (isProjectThree) {
        transitionImage.style.setProperty("--transition-target-top", `${(window.innerHeight - transitionPhoneHeight) / 2}px`);
        transitionImage.style.setProperty("--transition-target-left", `${(window.innerWidth - transitionPhoneWidth) / 2}px`);
        transitionImage.style.setProperty("--transition-target-width", `${transitionPhoneWidth}px`);
        transitionImage.style.setProperty("--transition-target-height", `${transitionPhoneHeight}px`);
      }
      transitionImage.style.background = getComputedStyle(imageLink).background;
      if (imageClone) transitionImage.appendChild(imageClone);

      let hasStartedLoading = false;
      transitionImage.addEventListener("transitionend", (event) => {
        if (event.target !== transitionImage || (!isProjectThree && event.propertyName !== "transform") || hasStartedLoading) return;
        hasStartedLoading = true;

        const loadingIndicator = document.createElement("span");
        loadingIndicator.className = "project-loading-indicator";
        loadingIndicator.textContent = "Loading project...";
        transitionImage.appendChild(loadingIndicator);
        transitionImage.classList.add("is-loading");

        if (isProjectThree) {
          transitionTimeout = window.setTimeout(() => {
            transitionTimeout = null;
            openProjectThreeDemo();
            clearTransition();
          }, 100);
          return;
        }

        window.location.assign(destination);
      });

      document.body.appendChild(transitionImage);
      document.body.classList.add("project-transition-active");
      window.requestAnimationFrame(() => {
        transitionImage.classList.add("is-expanding");
      });
    });

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
    let holdUntil = 0;
    let heldCard = null;

    const normalizeScroll = () => {
      while (stage.scrollLeft >= trackStart * 2) stage.scrollLeft -= trackStart;
      while (stage.scrollLeft < trackStart) stage.scrollLeft += trackStart;
    };

    const updateCards = () => {
      const stageCenter = stage.scrollLeft + stage.clientWidth / 2;
      const isMobile = mobileQuery.matches;
      const focusRange = stage.clientWidth * (isMobile ? 0.66 : 0.56);
      const minOpacity = isMobile ? 0.78 : 0.72;

      cards.forEach((card) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const signedDistance = Math.max(-1, Math.min(1, (cardCenter - stageCenter) / focusRange));
        const distance = Math.abs(signedDistance);
        const surfaceDepth = Math.sqrt(Math.max(0, 1 - signedDistance * signedDistance));
        const translateZ = surfaceDepth * 44;

        card.style.setProperty("--arc-x", `${(signedDistance * 12).toFixed(2)}px`);
        card.style.setProperty("--arc-y", "0px");
        card.style.setProperty("--arc-z", `${translateZ.toFixed(2)}px`);
        card.style.setProperty("--arc-rotate", `${(signedDistance * -10).toFixed(2)}deg`);
        const scale = 1 - 0.28 * Math.pow(distance, 1.35);

        card.style.setProperty("--arc-scale", scale.toFixed(3));
        card.style.setProperty("--arc-opacity", (minOpacity + surfaceDepth * (1 - minOpacity)).toFixed(3));
      });
    };

    const animate = (time) => {
      const elapsed = Math.min(time - lastTime, 50);
      lastTime = time;

      if (!prefersReducedMotion && !isDragging) {
        const stageCenter = stage.scrollLeft + stage.clientWidth / 2;
        let centeredCard = null;
        let centeredDistance = Infinity;

        cards.forEach((card) => {
          const distance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - stageCenter);
          if (distance < centeredDistance) {
            centeredCard = card;
            centeredDistance = distance;
          }
        });

        if (time >= holdUntil && centeredDistance <= 0.75 && centeredCard !== heldCard) {
          heldCard = centeredCard;
          holdUntil = time + 700;
        } else if (time >= holdUntil) {
          stage.scrollLeft += (mobileQuery.matches ? mobileAutoSpeed : autoSpeed) * elapsed;
          if (centeredDistance > 2) heldCard = null;
        }
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
      holdUntil = 0;
      heldCard = null;
      stage.scrollLeft += event.deltaX;
      normalizeScroll();
      updateCards();
    }, { passive: false });

    stage.addEventListener("pointerdown", (event) => {
      if (!mobileQuery.matches || !isTouchDevice || event.pointerType === "mouse") return;
      isDragging = true;
      holdUntil = 0;
      heldCard = null;
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
    restoreWorkPosition();
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
        const scale = Math.max(0.86, 1 - absoluteDistance * 0.07);
        const opacity = Math.max(0.04, 1 - absoluteDistance * 0.78);
        const blur = Math.max(0, (absoluteDistance - 0.08) * 1.25);
        const angle = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, distance * arcAngle));
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

  form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formNote.classList.remove("is-fading");

  let valid = true;

  fields.forEach((field) => {
    if (!validateField(field)) {
      valid = false;
    }
  });

  if (!valid) {
    formNote.textContent = "Please fix the highlighted fields and try again.";
    formNote.style.color = "rgba(255, 146, 146, 0.9)";
    return;
  }

  const submitButton = form.querySelector(".submit-button");

  // Show sending state
  submitButton.disabled = true;
  submitButton.innerHTML = 'Sending... <span>↗</span>';

  formNote.textContent = "";

  try {
    await emailjs.sendForm(
      "service_dp3mhh7",
      "template_lvsl8pn",
      form
    );

    // Success
    formNote.textContent =
      "Thank you. Your enquiry has been sent successfully. We will get back to you shortly.";

    formNote.style.color = "rgba(164, 233, 194, 0.9)";

    window.setTimeout(() => {
      formNote.classList.add("is-fading");
      window.setTimeout(() => {
        formNote.textContent = "";
        formNote.classList.remove("is-fading");
      }, 350);
    }, 2500);

    form.reset();

  } catch (error) {

    console.error("EmailJS Error:", error);

    formNote.textContent =
      "Sorry, we couldn't send your enquiry. Please try again.";

    formNote.style.color = "rgba(255, 146, 146, 0.9)";

  } finally {

    submitButton.disabled = false;
    submitButton.innerHTML = 'Send enquiry <span>↗</span>';

  }
});
};

  updateNavbarState();
  window.addEventListener("scroll", updateNavbarState, { passive: true });

  setupSmoothScroll();
  setupMobileMenu();
  setupRevealObserver();
  setupNavHighlight();
  setupCardGlow();
  setupWorkScroll();
  setupServicesScroll();
  setupProjectForm();
})();
