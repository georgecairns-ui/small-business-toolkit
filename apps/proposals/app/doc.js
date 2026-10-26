/*
  THE DOCUMENT: a proposal laid out like the finished thing
  ---------------------------------------------------------
  Turns one proposal into A4 pages in the business's own brand: a cover, a short opening note
  with the contents, then one page (or more) per section. The same pages print to PDF.

  The look comes from brand/brand.css (colours, fonts, the cover style) and the logo in
  settings.brand.logo. The words come from the proposal. Every price comes from the packages,
  worked out in model.js: Claude never types a number into a proposal.

  With editable on, the words can be changed in place (data-edit is the path inside the
  proposal), and the options have Recommend and a price for this proposal. Neither prints.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.PO.model, C = window.PO.c;

  let editable = false;

  // A piece of text the person can change in place
  function text(tag, path, value, cls, placeholder) {
    const attrs = editable ? ' contenteditable="plaintext-only" spellcheck="true" data-edit="' + esc(path) + '"' + (placeholder ? ' data-placeholder="' + esc(placeholder) + '"' : "") : "";
    return "<" + tag + ' class="' + (cls || "") + (editable ? " is-editable" : "") + '"' + attrs + ">" + esc(value || "") + "</" + tag + ">";
  }
  // Paragraphs: blank lines split them. Editable as one block.
  function paras(path, value, placeholder) {
    const list = String(value || "").split(/\n\s*\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (!list.length && !editable) return "";
    const inner = list.map(function (p) { return "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>"; }).join("");
    const attrs = editable ? ' contenteditable="plaintext-only" spellcheck="true" data-edit="' + esc(path) + '" data-placeholder="' + esc(placeholder || "Write something here") + '"' : "";
    return '<div class="doc-paras' + (editable ? " is-editable" : "") + '"' + attrs + ">" + inner + "</div>";
  }

  // The logo, from settings.brand (a path inside apps/). On a coloured cover, the light version if there is one.
  function logo(d, onColour) {
    const b = d.settings.brand;
    const file = onColour && b.logoOnColour ? b.logoOnColour : b.logo;
    if (file) return '<img class="doc-logo" src="../' + esc(file.replace(/^\/+/, "").replace(/^apps\//, "")) + '" alt="' + esc(d.settings.businessName) + '">';
    return '<span class="doc-wordmark">' + esc(d.settings.businessName || "Your business") + "</span>";
  }

  // ---------- The pages ----------
  function cover(d, p) {
    const f = p.cover.preparedFor, s = d.settings.signOff;
    const forLine = [f.name, f.role].filter(Boolean).join(", ");
    return '<section class="sheet sheet--cover" aria-label="Cover">' +
      '<div class="cover__top">' + logo(d, d.settings.brand.cover === "colour") + "</div>" +
      '<div class="cover__main"><span class="cover__eyebrow">Proposal</span>' +
      text("h1", "cover.title", p.cover.title || p.title, "cover__title", "The proposal's title") +
      text("p", "cover.subtitle", p.cover.subtitle, "cover__subtitle", "One line on what it's for") + "</div>" +
      '<div class="cover__meta">' +
      '<div><span class="cover__label">Prepared for</span><strong>' + esc(f.organisation || M.clientName(d, p)) + "</strong>" + (forLine ? "<span>" + esc(forLine) + "</span>" : "") + "</div>" +
      '<div><span class="cover__label">Prepared by</span><strong>' + esc(d.settings.businessName || "") + "</strong>" + (s.name ? "<span>" + esc([s.name, s.role].filter(Boolean).join(", ")) + "</span>" : "") + "</div>" +
      '<div><span class="cover__label">Date</span><strong>' + esc(C.longDate(p.sentAt || p.approvedAt || p.createdAt)) + "</strong></div>" +
      "</div></section>";
  }

  function opening(d, p, sections) {
    const f = p.cover.preparedFor, s = d.settings.signOff;
    const first = String(f.name || "").split(/\s+/)[0];
    return '<section class="sheet" aria-label="Introduction and contents">' + head(d) +
      '<div class="doc-intro">' + (first ? '<p class="doc-intro__hello">Dear ' + esc(first) + ",</p>" : "") +
      paras("intro", p.intro, "A short note to open the proposal: what you heard and what you're proposing") +
      (s.name ? '<p class="doc-intro__sign">' + esc(s.name) + (s.role ? '<span>' + esc(s.role) + ", " + esc(d.settings.businessName) + "</span>" : "") + "</p>" : "") + "</div>" +
      '<nav class="doc-contents" aria-label="Contents"><h2 class="doc-contents__title">Contents</h2><ol>' +
      sections.map(function (sec, i) { return '<li><span class="doc-contents__num">' + pad(i + 1) + '</span><span class="doc-contents__name">' + esc(sec.label) + "</span></li>"; }).join("") +
      "</ol></nav>" + foot(d, p) + "</section>";
  }

  function head(d) {
    return '<div class="sheet__head">' + logo(d) + "</div>";
  }
  function foot(d, p) {
    return '<div class="sheet__foot"><span>' + esc(d.settings.businessName || "") + "</span><span>" + esc(p.cover.title || p.title || "Proposal") + "</span></div>";
  }
  function pad(n) { return n < 10 ? "0" + n : String(n); }

  // n is the section's number in the contents; 0 means it isn't in them (empty terms while editing, which never print)
  function sectionPage(d, p, sec, n) {
    const body = SECTION[sec.key](d, p);
    return '<section class="sheet sheet--section' + (n ? "" : " no-print") + '" aria-label="' + esc(sec.label) + '">' + head(d) +
      '<header class="doc-sec__head">' + (n ? '<span class="doc-sec__num">' + pad(n) + "</span>" : "") + "<h2>" + esc(sec.label) + "</h2></header>" + body + foot(d, p) + "</section>";
  }

  const SECTION = {
    about: function (d, p) {
      const S = p.sections.about;
      return paras("sections.about.body", S.body, "Who the client is: their business, their people, where they're heading") +
        (S.points.length ? '<div class="doc-callout"><h3>What you told us</h3><ul class="doc-ticks">' + S.points.map(function (pt, i) { return "<li>" + text("span", "sections.about.points." + i, pt) + "</li>"; }).join("") + "</ul></div>" : "");
    },
    challenge: function (d, p) {
      const S = p.sections.challenge;
      return paras("sections.challenge.body", S.body, "The problem, in the client's own words, and what it's costing them") +
        (S.pains.length ? '<div class="doc-pains">' + S.pains.map(function (x, i) {
          const base = "sections.challenge.pains." + i;
          return '<div class="doc-pain">' + text("h3", base + ".title", x.title) + text("p", base + ".detail", x.detail) +
            (x.quote || editable ? text("blockquote", base + ".quote", x.quote, "doc-quote", "Something they said, word for word") : "") + "</div>";
        }).join("") + "</div>" : "");
    },
    solution: function (d, p) {
      const S = p.sections.solution;
      return paras("sections.solution.body", S.body, "How you'll solve it, tied back to each problem") +
        (S.points.length ? '<ol class="doc-steps">' + S.points.map(function (x, i) {
          const base = "sections.solution.points." + i;
          return '<li><span class="doc-steps__num">' + (i + 1) + "</span><div>" + text("h3", base + ".title", x.title) + text("p", base + ".detail", x.detail) + "</div></li>";
        }).join("") + "</ol>" : "");
    },
    delivery: function (d, p) {
      const S = p.sections.delivery;
      return paras("sections.delivery.body", S.body, "How the work runs, from yes to done") +
        (S.phases.length ? '<ol class="doc-phases">' + S.phases.map(function (x, i) {
          const base = "sections.delivery.phases." + i;
          return '<li class="doc-phase"><div class="doc-phase__when">' + text("span", base + ".when", x.when, "", "When") + "</div>" +
            '<div class="doc-phase__body">' + text("h3", base + ".name", x.name) + text("p", base + ".detail", x.detail) + "</div></li>";
        }).join("") + "</ol>" : "");
    },
    investment: function (d, p) {
      const S = p.sections.investment;
      const opts = S.options.map(function (o, i) { return option(d, p, o, i); }).filter(Boolean);
      const extras = S.extras.map(function (e) { return M.extraPrice(d, e); }).filter(Boolean);
      const until = M.validUntil(d, p);
      const notes = [];
      if (d.settings.vatRegistered) notes.push("Prices are shown before VAT, which is added at " + Number(d.settings.vatRate) + "%.");
      if (d.settings.paymentTerms) notes.push(d.settings.paymentTerms);
      if (until) notes.push("This proposal is valid until " + C.longDate(until) + ".");
      return paras("sections.investment.body", S.body, "A line on the options, and why you recommend the one you do") +
        (opts.length ? '<div class="doc-options doc-options--' + Math.min(opts.length, 3) + '">' + opts.join("") + "</div>" :
          (editable ? '<p class="doc-missing">' + icon("alert") + "No options yet. Add your packages on the Packages page, then ask Claude to add them.</p>" : "")) +
        (extras.length ? '<div class="doc-extras"><h3>Optional extras</h3><table><tbody>' + extras.map(function (x) {
          return "<tr><td>" + esc(x.extra.name) + (x.qty > 1 ? " × " + x.qty : "") + (x.extra.summary ? '<span class="doc-extras__sub">' + esc(x.extra.summary) + "</span>" : "") + '</td><td class="num">' + esc(M.money(d, x.total)) + esc(M.billingSuffix(x.extra.billing)) + "</td></tr>";
        }).join("") + "</tbody></table></div>" : "") +
        (notes.length ? '<div class="doc-money-notes">' + notes.map(function (n) { return "<p>" + esc(n) + "</p>"; }).join("") + "</div>" : "");
    },
    next: function (d, p) {
      const S = p.sections.next, s = d.settings.signOff;
      const contact = [s.email, s.phone].filter(Boolean);
      return paras("sections.next.body", S.body, "What happens when they say yes") +
        (S.steps.length ? '<ol class="doc-steps doc-steps--next">' + S.steps.map(function (x, i) {
          const base = "sections.next.steps." + i;
          return '<li><span class="doc-steps__num">' + (i + 1) + "</span><div>" + text("h3", base + ".title", x.title) + text("p", base + ".detail", x.detail) + "</div></li>";
        }).join("") + "</ol>" : "") +
        '<div class="doc-goahead"><h3>Ready to go ahead?</h3><p>Reply to say yes' + (s.name ? " or get in touch with " + esc(s.name.split(/\s+/)[0]) : "") + ", and we’ll get started.</p>" +
        (contact.length ? '<p class="doc-goahead__contact">' + contact.map(esc).join("<span>·</span>") + "</p>" : "") + "</div>";
    },
    terms: function (d, p) {
      return paras("sections.terms.body", p.sections.terms.body, "Your own standard terms, word for word. Claude never writes these");
    }
  };

  function option(d, p, o, i) {
    const pr = M.optionPrice(d, o);
    if (!pr) return "";
    const pkg = pr.pkg;
    const price = M.money(d, pr.unit) + M.billingSuffix(pr.billing);
    const lines = [];
    if (pr.months) lines.push("For " + pr.months + " months: " + M.money(d, pr.total));
    if (d.settings.vatRegistered) lines.push("With VAT: " + M.money(d, pr.gross, { pence: pr.gross % 1 !== 0 }));
    return '<article class="doc-option' + (o.recommended ? " is-recommended" : "") + '">' +
      (o.recommended ? '<span class="doc-option__badge">Recommended</span>' : "") +
      "<h3>" + esc(pkg.name) + "</h3>" + (pkg.summary ? '<p class="doc-option__summary">' + esc(pkg.summary) + "</p>" : "") +
      '<p class="doc-option__price"><span class="num">' + esc(price) + "</span>" + (d.settings.vatRegistered ? '<span class="doc-option__vat">+ VAT</span>' : "") + "</p>" +
      (lines.length ? '<p class="doc-option__lines">' + lines.map(esc).join("<br>") + "</p>" : "") +
      (pkg.timeline ? '<p class="doc-option__time">' + esc(pkg.timeline) + "</p>" : "") +
      (pkg.includes.length ? '<ul class="doc-ticks">' + pkg.includes.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "") +
      (o.why || (editable && o.recommended) ? '<div class="doc-option__why">' + text("p", "sections.investment.options." + i + ".why", o.why, "", "Why this one is right for them") + "</div>" : "") +
      (editable ? '<div class="doc-option__edit no-print">' +
        (o.recommended ? '<span class="chip chip--accent">' + icon("check") + "Recommended</span>" : '<button type="button" class="btn btn--sm" data-action="recommend" data-index="' + i + '">Recommend this</button>') +
        '<label class="doc-option__custom"><span>Price for this proposal</span><input class="input input--sm num" type="number" min="0" step="1" data-custom-price="' + i + '" value="' + esc(o.customPrice != null ? o.customPrice : "") + '" placeholder="' + esc(String(pkg.price)) + '"></label>' +
        "</div>" : "") +
      "</article>";
  }

  function render(d, p, opts) {
    editable = !!(opts && opts.editable);
    // Terms show only when there are some (their own, word for word). While editing, an empty terms page shows to fill in, but isn't printed or listed.
    const pages = M.sectionsOn(d).filter(function (s) { return s.key !== "terms" || p.sections.terms.body || editable; });
    const listed = pages.filter(function (s) { return s.key !== "terms" || p.sections.terms.body; });
    return '<div class="doc" data-cover="' + esc(d.settings.brand.cover || "colour") + '">' + cover(d, p) + opening(d, p, listed) +
      pages.map(function (sec) { return sectionPage(d, p, sec, listed.indexOf(sec) + 1); }).join("") + "</div>";
  }

  window.PO.doc = { render: render };
})();
