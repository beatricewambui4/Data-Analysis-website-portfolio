/* =============================================================
   Beatrice Wambui | Data Analyst Portfolio
   script.js  (vanilla JavaScript, no libraries)

   Written against the supplied index.html and stylesheet.

   Contents
   01. Setup and helpers
   02. Mobile navigation (hamburger menu)
   03. Active navigation link (scroll spy)
   04. Back to top button
   05. Hero typing effect
   06. Contact form (validation and Formspree submission)
   07. Placeholder links (href="#")
   08. Start-up
   ============================================================= */

(function () {
    "use strict";

    /* =========================================================
       01. SETUP AND HELPERS
       ========================================================= */

    // Must match the "@media (max-width: 900px)" mobile menu breakpoint in the CSS.
    const DESKTOP_QUERY = "(min-width: 901px)";

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktopQuery = window.matchMedia(DESKTOP_QUERY);

    // Smooth scrolling for JavaScript-driven scrolls only. Anchor links are
    // smoothed by the CSS ("scroll-behavior: smooth"), which already switches
    // itself off for reduced-motion visitors.
    function scrollBehavior() {
        return reducedMotionQuery.matches ? "auto" : "smooth";
    }

    // Coalesce rapid events (scroll) into one run per animation frame.
    function onNextFrame(callback) {
        let waiting = false;
        return function () {
            if (waiting) return;
            waiting = true;
            window.requestAnimationFrame(function () {
                waiting = false;
                callback();
            });
        };
    }

    /* =========================================================
       02. MOBILE NAVIGATION
       HTML:  #menuToggle (button.hamburger) controls #navMobile
       CSS:   the .open class on #navMobile shows the panel;
              aria-expanded="true" animates the hamburger into an X.
       ========================================================= */

    function initMobileMenu() {
        const toggle = document.getElementById("menuToggle");
        const menu = document.getElementById("navMobile");
        if (!toggle || !menu) return;

        function isOpen() {
            return menu.classList.contains("open");
        }

        function setOpen(open) {
            menu.classList.toggle("open", open);
            toggle.setAttribute("aria-expanded", String(open));
        }

        // Open or close from the hamburger button.
        toggle.addEventListener("click", function () {
            setOpen(!isOpen());
        });

        // Close after choosing a link (the browser still scrolls to the section).
        menu.addEventListener("click", function (event) {
            if (event.target.closest("a")) setOpen(false);
        });

        // Close when clicking or tapping anywhere outside the menu and button.
        document.addEventListener("click", function (event) {
            if (!isOpen()) return;
            if (menu.contains(event.target) || toggle.contains(event.target)) return;
            setOpen(false);
        });

        // Close with Escape and give focus back to the button if it was in the menu.
        document.addEventListener("keydown", function (event) {
            if (event.key !== "Escape" || !isOpen()) return;
            const focusWasInMenu = menu.contains(document.activeElement);
            setOpen(false);
            if (focusWasInMenu) toggle.focus();
        });

        // Reset when the window grows to the desktop layout (the panel is hidden there).
        function onBreakpointChange(event) {
            if (event.matches) setOpen(false);
        }
        if (desktopQuery.addEventListener) {
            desktopQuery.addEventListener("change", onBreakpointChange);
        } else if (desktopQuery.addListener) {
            desktopQuery.addListener(onBreakpointChange); // older Safari
        }

        setOpen(false); // make sure the initial state is consistent
    }

    /* =========================================================
       03. ACTIVE NAVIGATION LINK (SCROLL SPY)
       Uses IntersectionObserver. The CSS class is "active" and is
       applied to both .nav-links a and .nav-mobile a.
       ========================================================= */

    function initActiveNav() {
        const navLinks = Array.from(
            document.querySelectorAll('.nav-links a[href^="#"], .nav-mobile a[href^="#"]')
        );
        if (!navLinks.length) return;

        // Build the section list from the links, so it always matches the HTML.
        const sections = [];
        navLinks.forEach(function (link) {
            const id = link.getAttribute("href").slice(1);
            const section = id ? document.getElementById(id) : null;
            if (section && !sections.includes(section)) sections.push(section);
        });
        if (!sections.length) return;
        sections.sort(function (a, b) {
            return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
        });

        const visibleIds = new Set();
        let currentId = null;
        let lockedUntil = 0; // briefly ignore the observer after a link click

        function setActive(id) {
            if (!id || id === currentId) return;
            currentId = id;
            navLinks.forEach(function (link) {
                const isCurrent = link.getAttribute("href") === "#" + id;
                link.classList.toggle("active", isCurrent);
                if (isCurrent) {
                    link.setAttribute("aria-current", "true");
                } else {
                    link.removeAttribute("aria-current");
                }
            });
        }

        function isAtPageBottom() {
            const doc = document.documentElement;
            return window.innerHeight + window.scrollY >= doc.scrollHeight - 2;
        }

        function refresh() {
            if (performance.now() < lockedUntil) return;
            // The last section is short, so it may never reach the detection band.
            if (isAtPageBottom()) {
                setActive(sections[sections.length - 1].id);
                return;
            }
            // Of the sections inside the band, the lowest one is the current one.
            for (let i = sections.length - 1; i >= 0; i--) {
                if (visibleIds.has(sections[i].id)) {
                    setActive(sections[i].id);
                    return;
                }
            }
        }

        // Clicking a link marks it active straight away and holds that state
        // while the smooth scroll runs, so the highlight does not flicker.
        navLinks.forEach(function (link) {
            link.addEventListener("click", function () {
                const id = link.getAttribute("href").slice(1);
                if (!document.getElementById(id)) return;
                setActive(id);
                lockedUntil = performance.now() + (reducedMotionQuery.matches ? 50 : 900);
                window.setTimeout(refresh, reducedMotionQuery.matches ? 80 : 950);
            });
        });

        // Detection band: from just under the sticky header to 45% down the screen.
        if ("IntersectionObserver" in window) {
            const header = document.querySelector(".site-header");
            const headerHeight = header ? header.offsetHeight : 64;
            const observer = new IntersectionObserver(
                function (entries) {
                    entries.forEach(function (entry) {
                        if (entry.isIntersecting) {
                            visibleIds.add(entry.target.id);
                        } else {
                            visibleIds.delete(entry.target.id);
                        }
                    });
                    refresh();
                },
                { rootMargin: "-" + headerHeight + "px 0px -55% 0px", threshold: 0 }
            );
            sections.forEach(function (section) { observer.observe(section); });
        }

        // The bottom-of-page check needs scroll events (throttled, passive).
        window.addEventListener("scroll", onNextFrame(refresh), { passive: true });
        refresh();
    }

    /* =========================================================
       04. BACK TO TOP BUTTON
       HTML:  #backToTop starts with the "hidden" attribute.
       ========================================================= */

    function initBackToTop() {
        const button = document.getElementById("backToTop");
        if (!button) return;

        const SHOW_AFTER_PX = 400;

        const update = onNextFrame(function () {
            button.hidden = window.scrollY < SHOW_AFTER_PX;
        });

        button.addEventListener("click", function () {
            window.scrollTo({ top: 0, behavior: scrollBehavior() });
            // The button hides once the page is back at the top, so move
            // keyboard focus somewhere sensible instead of losing it.
            const logo = document.querySelector(".nav-logo");
            if (logo) logo.focus({ preventScroll: true });
        });

        window.addEventListener("scroll", update, { passive: true });
        button.hidden = window.scrollY < SHOW_AFTER_PX;
    }

    /* =========================================================
       05. HERO TYPING EFFECT
       HTML:  inside .hero-statement, each line is
              <span class="typing-line"><span class="typing-text" data-text="...">
              and already holds its full text, so the page reads correctly
              without JavaScript. A single .typing-cursor follows the typing
              from the first line to the second.

       The lines type one after the other:
         - when the page opens,
         - every time the visitor hovers over the statement,
         - every time the statement scrolls back into view.
       Reduced-motion visitors just see the finished text.
       ========================================================= */

    function initTyping() {
        const area = document.querySelector(".hero-statement");
        const targets = area ? Array.from(area.querySelectorAll(".typing-text")) : [];
        if (!targets.length || reducedMotionQuery.matches) return;

        const lines = targets.map(function (element) {
            return {
                element: element,
                text: element.dataset.text || element.textContent.trim(),
                holder: element.parentElement   // the .typing-line wrapper
            };
        });
        const cursor = area.querySelector(".typing-cursor");

        const START_DELAY_MS = 300;
        const CHARACTER_DELAY_MS = 40;
        const LINE_PAUSE_MS = 250;       // short pause before the second line
        const CURSOR_LINGER_MS = 1200;   // how long the cursor stays after typing ends

        let timerId = null;
        let isTyping = false;
        let lineIndex = 0;
        let characterIndex = 0;

        // visibility (not display) keeps the cursor's space, so nothing shifts.
        function setCursorVisible(visible) {
            if (cursor) cursor.style.visibility = visible ? "visible" : "hidden";
        }

        function moveCursorTo(line) {
            if (cursor) line.holder.appendChild(cursor);
        }

        function showFullTextInstantly() {
            lines.forEach(function (line) { line.element.textContent = line.text; });
        }

        // Reserve the height of the finished text so the buttons below do not
        // jump around while the lines are still being typed.
        function reserveHeight() {
            area.style.minHeight = "";
            showFullTextInstantly();
            area.style.minHeight = area.getBoundingClientRect().height + "px";
        }

        function showFullText() {
            window.clearTimeout(timerId);
            isTyping = false;
            showFullTextInstantly();
            setCursorVisible(false);
        }

        function typeNext() {
            const line = lines[lineIndex];
            characterIndex += 1;
            line.element.textContent = line.text.slice(0, characterIndex);

            if (characterIndex < line.text.length) {
                timerId = window.setTimeout(typeNext, CHARACTER_DELAY_MS);
            } else if (lineIndex < lines.length - 1) {
                lineIndex += 1;
                characterIndex = 0;
                moveCursorTo(lines[lineIndex]);
                timerId = window.setTimeout(typeNext, LINE_PAUSE_MS);
            } else {
                isTyping = false;
                timerId = window.setTimeout(function () { setCursorVisible(false); }, CURSOR_LINGER_MS);
            }
        }

        function startTyping() {
            window.clearTimeout(timerId);
            reserveHeight();
            lines.forEach(function (line) { line.element.textContent = ""; });
            lineIndex = 0;
            characterIndex = 0;
            moveCursorTo(lines[0]);
            setCursorVisible(true);
            isTyping = true;
            timerId = window.setTimeout(typeNext, START_DELAY_MS);
        }

        // Hover: replay, unless it is already typing.
        area.addEventListener("mouseenter", function () {
            if (!isTyping) startTyping();
        });

        if ("IntersectionObserver" in window) {
            // Measure first, then blank the text so it does not flash before typing.
            reserveHeight();
            lines.forEach(function (line) { line.element.textContent = ""; });
            setCursorVisible(false);

            // Fires when the page opens and each time the statement scrolls
            // back into view. When it scrolls out, the full text is restored.
            const observer = new IntersectionObserver(
                function (entries) {
                    entries.forEach(function (entry) {
                        if (entry.isIntersecting) {
                            startTyping();
                        } else {
                            showFullText();
                        }
                    });
                },
                { threshold: 0.5 }
            );
            observer.observe(area);
        } else {
            startTyping(); // very old browsers: type once on load
        }
    }

    /* =========================================================
       06. CONTACT FORM
       HTML:  #contactForm posts to Formspree (action URL), with a
              #formStatus live region for messages.
       CSS:   .form-status.success / .form-status.error,
              and :user-invalid borders on the fields.

       JavaScript cannot send email by itself. Delivery needs the
       Formspree form ID in the form's action attribute.
       ========================================================= */

    function initContactForm() {
        const form = document.getElementById("contactForm");
        const status = document.getElementById("formStatus");
        if (!form || !status) return;

        const fields = Array.from(form.querySelectorAll("input[name], textarea[name]"));
        const submitButton = form.querySelector('button[type="submit"]');
        const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

        // Use our own messages instead of the browser's pop-up bubbles.
        form.noValidate = true;

        function fieldLabel(field) {
            const label = form.querySelector('label[for="' + field.id + '"]');
            return label ? label.textContent.trim().toLowerCase() : "this field";
        }

        // Returns an error message, or "" when the field is valid.
        function validateField(field) {
            field.setCustomValidity("");
            const value = field.value.trim();

            if (field.required && !value) {
                field.setCustomValidity("Please enter your " + fieldLabel(field) + ".");
            } else if (field.type === "email" && value && !EMAIL_PATTERN.test(value)) {
                field.setCustomValidity("Please enter a valid email address, like name@example.com.");
            }

            const message = field.validationMessage;
            if (message) {
                field.setAttribute("aria-invalid", "true");
            } else {
                field.removeAttribute("aria-invalid");
            }
            return message;
        }

        function showStatus(type, message) {
            status.classList.remove("success", "error");
            if (type) status.classList.add(type);
            status.textContent = message; // textContent only, never innerHTML
        }

        // Once a field has been flagged, re-check it as the visitor fixes it.
        fields.forEach(function (field) {
            field.addEventListener("input", function () {
                if (field.getAttribute("aria-invalid") === "true") {
                    if (!validateField(field) && fields.every(function (f) {
                        return f.getAttribute("aria-invalid") !== "true";
                    })) {
                        showStatus("", "");
                    }
                }
            });
        });

        function emailFallbackText() {
            const mailLink = document.querySelector('a[href^="mailto:"]');
            const address = mailLink ? mailLink.getAttribute("href").replace("mailto:", "") : "";
            return address ? " Please email me directly at " + address + "." : "";
        }

        async function sendMessage() {
            const action = form.getAttribute("action") || "";

            // The form still points at the Formspree placeholder.
            if (!action || action.indexOf("YOUR_FORM_ID") !== -1) {
                console.warn(
                    "Contact form: replace YOUR_FORM_ID in the form's action attribute " +
                    "with your real Formspree form ID."
                );
                showStatus("error", "Sorry, the contact form isn't working yet." + emailFallbackText());
                return;
            }

            if (submitButton) submitButton.disabled = true;
            form.setAttribute("aria-busy", "true");
            showStatus("", "Sending your message...");

            try {
                const response = await fetch(action, {
                    method: "POST",
                    body: new FormData(form),
                    headers: { Accept: "application/json" }
                });

                if (response.ok) {
                    form.reset();
                    fields.forEach(function (field) { field.removeAttribute("aria-invalid"); });
                    showStatus("success", "Thank you! Your message has been sent. I'll get back to you soon.");
                } else {
                    let detail = "";
                    try {
                        const data = await response.json();
                        if (data && Array.isArray(data.errors) && data.errors.length) {
                            detail = " " + data.errors
                                .map(function (item) { return item.message; })
                                .filter(Boolean)
                                .join(" ");
                        }
                    } catch (parseError) {
                        /* the response had no JSON body; use the generic message */
                    }
                    showStatus("error", "Sorry, your message could not be sent." + detail + emailFallbackText());
                }
            } catch (networkError) {
                showStatus("error", "Sorry, something went wrong. Check your connection and try again." + emailFallbackText());
            } finally {
                if (submitButton) submitButton.disabled = false;
                form.removeAttribute("aria-busy");
            }
        }

        form.addEventListener("submit", function (event) {
            event.preventDefault();

            const invalidFields = fields.filter(function (field) {
                return validateField(field) !== "";
            });

            if (invalidFields.length) {
                showStatus("error", invalidFields[0].validationMessage);
                invalidFields[0].focus();
                return;
            }

            sendMessage();
        });
    }

    /* =========================================================
       07. PLACEHOLDER LINKS
       The three certificate links currently use href="#" with
       target="_blank", which would open a new tab of this same page.
       Until real certificate URLs are added they do nothing. Once a
       link has a real URL this rule no longer applies to it.
       ========================================================= */

    function initPlaceholderLinks() {
        document.addEventListener("click", function (event) {
            const link = event.target.closest("a.cert-link");
            if (link && link.getAttribute("href") === "#") {
                event.preventDefault();
            }
        });
    }

    /* =========================================================
       08. START-UP
       ========================================================= */

    function init() {
        initMobileMenu();
        initActiveNav();
        initBackToTop();
        initTyping();
        initContactForm();
        initPlaceholderLinks();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();