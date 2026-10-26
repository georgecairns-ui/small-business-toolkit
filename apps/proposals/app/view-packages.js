/*
  PACKAGES AND PRICES: what the business sells, each with its own price
  ---------------------------------------------------------------------
  Every option in every proposal points at one of these packages, so the price on a proposal is
  always the price here (unless the person sets a different price on that one proposal). Claude
  fills this in during setup from their website and answers; the person changes it here.
  Also VAT, payment terms and how long a proposal is valid.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.PO.model;
  window.PO.views = window.PO.views || {};

  function billingOptions(selected) {
    return M.BILLING.map(function (b) { return '<option value="' + b.key + '"' + (b.key === selected ? " selected" : "") + ">" + esc(b.label) + "</option>"; }).join("");
  }

  function packageRow(p) {
    const x = p || { id: "", name: "", summary: "", bestFor: "", price: "", billing: "one-off", months: "", timeline: "", includes: [] };
    return '<li class="pkg" data-pkg="' + esc(x.id) + '">' +
      '<div class="pkg__row"><label class="field pkg__name"><span class="field__label">Package</span><input class="input" name="name" maxlength="80" value="' + esc(x.name) + '" placeholder="Website refresh"></label>' +
      '<label class="field pkg__price"><span class="field__label">Price</span><input class="input num" type="number" name="price" min="0" step="1" value="' + esc(x.price === "" ? "" : x.price) + '" placeholder="0"></label>' +
      '<label class="field pkg__billing"><span class="field__label">Charged</span><select class="select" name="billing">' + billingOptions(x.billing) + "</select></label>" +
      '<label class="field pkg__months"><span class="field__label">For how many months</span><input class="input num" type="number" name="months" min="0" step="1" value="' + esc(x.months || "") + '" placeholder="Ongoing"></label>' +
      '<button type="button" class="icon-btn pkg__remove" data-action="pkg-remove" aria-label="Remove this package">' + icon("trash") + "</button></div>" +
      '<label class="field"><span class="field__label">In a sentence</span><input class="input" name="summary" maxlength="200" value="' + esc(x.summary || "") + '" placeholder="A fresh 5 page site that turns visitors into enquiries"></label>' +
      '<div class="field-row"><label class="field"><span class="field__label">Best for</span><input class="input" name="bestFor" maxlength="160" value="' + esc(x.bestFor || "") + '" placeholder="Businesses with a site that’s over 3 years old"></label>' +
      '<label class="field"><span class="field__label">How long it takes</span><input class="input" name="timeline" maxlength="80" value="' + esc(x.timeline || "") + '" placeholder="4 to 6 weeks"></label></div>' +
      '<label class="field"><span class="field__label">What’s included (one per line)</span><textarea class="textarea" name="includes" rows="4" maxlength="3000" placeholder="Discovery workshop\nDesign of 5 pages">' + esc(x.includes.join("\n")) + "</textarea></label></li>";
  }
  function extraRow(x) {
    const e = x || { id: "", name: "", price: "", billing: "one-off", summary: "" };
    return '<li class="extra" data-extra="' + esc(e.id) + '">' +
      '<input class="input" name="name" maxlength="80" value="' + esc(e.name) + '" placeholder="Extra page" aria-label="Extra">' +
      '<input class="input num" type="number" name="price" min="0" step="1" value="' + esc(e.price === "" ? "" : e.price) + '" placeholder="0" aria-label="Price">' +
      '<select class="select" name="billing" aria-label="Charged">' + billingOptions(e.billing) + "</select>" +
      '<button type="button" class="icon-btn" data-action="extra-remove" aria-label="Remove this extra">' + icon("trash") + "</button></li>";
  }

  window.PO.views.packages = {
    title: function () { return "Packages and prices"; },
    sub: function (c) { return c.d.packages.length ? c.d.packages.length + (c.d.packages.length === 1 ? " package" : " packages") + ". Every proposal’s prices come from here" : "Every proposal’s prices come from here"; },
    render: function (c) {
      const d = c.d, s = d.settings;
      return '<div class="page page--narrow"><form class="prefs" data-form="packages" autocomplete="off">' +
        '<section class="panel pref"><h2 class="pref__title">Your packages</h2>' +
        '<p class="pref__intro muted">What you sell, and what each costs. Claude picks the right ones for each client and recommends one. The app works out the totals and VAT, so a proposal never has a made-up price. Anything a client asks for that isn’t here is flagged for you to price.</p>' +
        '<ol class="pkgs" id="pkgList">' + (d.packages.length ? d.packages.map(packageRow).join("") : packageRow(null)) + "</ol>" +
        '<div><button type="button" class="btn btn--sm" data-action="pkg-add">' + icon("plus") + "Add a package</button></div></section>" +

        '<section class="panel pref"><h2 class="pref__title">Optional extras</h2><p class="pref__intro muted">Add-ons a client can choose on top, such as extra pages, training or a support plan.</p>' +
        '<ul class="extras" id="extraList">' + d.extras.map(extraRow).join("") + "</ul>" +
        '<div><button type="button" class="btn btn--sm" data-action="extra-add">' + icon("plus") + "Add an extra</button></div></section>" +

        '<section class="panel pref"><h2 class="pref__title">Money</h2><div class="pref__body">' +
        '<div class="field-row"><label class="field"><span class="field__label">Currency</span><select class="select" name="currency">' +
        ["GBP", "EUR", "USD"].map(function (k) { return '<option value="' + k + '"' + (s.currency === k ? " selected" : "") + ">" + k + "</option>"; }).join("") + "</select></label>" +
        '<label class="field"><span class="field__label">A proposal is valid for (days)</span><input class="input num" type="number" name="validDays" min="0" max="365" value="' + esc(s.validDays) + '"></label></div>' +
        '<div class="pref-row"><span><strong>VAT registered</strong><span class="muted"> Adds VAT to every price at the rate below</span></span><label class="switch"><input type="checkbox" name="vatRegistered"' + (s.vatRegistered ? " checked" : "") + '><span class="switch__track"></span></label></div>' +
        '<label class="field"><span class="field__label">VAT rate (%)</span><input class="input num" type="number" name="vatRate" min="0" max="50" step="0.5" value="' + esc(s.vatRate) + '"></label>' +
        '<label class="field"><span class="field__label">Payment terms (shown under the prices)</span><input class="input" name="paymentTerms" maxlength="300" value="' + esc(s.paymentTerms) + '" placeholder="50% to start, 50% on completion. Invoices are due within 14 days."></label>' +
        "</div></section>" +
        '<div class="prefs__save"><button type="submit" class="btn btn--primary">Save packages and prices</button></div></form></div>';
    },
    addRow: function (list) { const tmp = document.createElement("ol"); tmp.innerHTML = packageRow(null); list.appendChild(tmp.firstChild); list.lastChild.querySelector("input").focus(); },
    addExtra: function (list) { const tmp = document.createElement("ul"); tmp.innerHTML = extraRow(null); list.appendChild(tmp.firstChild); list.lastChild.querySelector("input").focus(); },
    // Read the form back. Ids stay the same so proposals keep pointing at the right package.
    collect: function (form, d) {
      const packages = [], extras = [];
      let error = "";
      form.querySelectorAll(".pkg").forEach(function (li) {
        const f = function (n) { return li.querySelector('[name="' + n + '"]').value; };
        const name = f("name").trim();
        if (!name && !f("price") && !f("includes").trim()) return;
        if (!name) { error = "Give every package a name."; return; }
        const id = li.getAttribute("data-pkg") || M.slugId("pk", name, packages.concat(d.packages));
        const old = M.packageById(d, id) || {};
        packages.push(Object.assign({}, old, { id: id, name: name.slice(0, 80), summary: f("summary").trim(), bestFor: f("bestFor").trim(), price: Math.max(0, Number(f("price")) || 0),
          billing: f("billing"), months: f("billing") === "monthly" ? Math.max(0, Math.round(Number(f("months")) || 0)) : 0, timeline: f("timeline").trim(),
          includes: f("includes").split("\n").map(function (x) { return x.replace(/^[-*•]\s*/, "").trim(); }).filter(Boolean).slice(0, 20) }));
      });
      form.querySelectorAll(".extra").forEach(function (li) {
        const f = function (n) { return li.querySelector('[name="' + n + '"]').value; };
        const name = f("name").trim();
        if (!name) return;
        const id = li.getAttribute("data-extra") || M.slugId("x", name, extras.concat(d.extras));
        const old = M.extraById(d, id) || {};
        extras.push(Object.assign({}, old, { id: id, name: name.slice(0, 80), price: Math.max(0, Number(f("price")) || 0), billing: f("billing") }));
      });
      const names = packages.map(function (p) { return p.name.toLowerCase(); });
      if (!error && names.some(function (n, i) { return names.indexOf(n) !== i; })) error = "Two packages have the same name.";
      const e = form.elements;
      return { error: error, packages: packages, extras: extras, money: {
        currency: e.currency.value, validDays: Math.max(0, Math.round(Number(e.validDays.value) || 0)), vatRegistered: e.vatRegistered.checked,
        vatRate: Math.max(0, Number(e.vatRate.value) || 0), paymentTerms: e.paymentTerms.value.trim() } };
    }
  };
})();
