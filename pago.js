// Página de pago: formularios de Stripe dentro de celebraparties.com y nuestro botón «Pagar» fijo abajo.
(async function () {
  var API = window.CELEBRA_API;
  var error = document.getElementById("pagoerror"), boton = document.getElementById("pagobtn"), totalEl = document.getElementById("pagototal");
  var mostrarError = function (t) { error.hidden = !t; error.textContent = t || ""; };
  var sinPago = function () {
    document.getElementById("pagocarga").hidden = true;
    document.getElementById("pagoform").hidden = true;
    document.getElementById("pagobarra").hidden = true;
    document.getElementById("pagovolver").hidden = false;
  };
  var lineas = window.CelebraCesta.leer();
  if (!lineas.length) { location.replace("cesta.html"); return; }
  var hayFisico = lineas.some(function (l) { var p = window.CESTA_DATOS[l.slug]; return p && !p.digital; });
  var aceptaPdf = false;
  try { aceptaPdf = sessionStorage.getItem("celebra_acepta_pdf") === "si"; } catch (e) {}

  var datos;
  try {
    var r = await fetch(API + "/api/crear-pago", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineas: lineas, acepta_pdf: aceptaPdf }),
    });
    datos = await r.json();
    if (!r.ok) throw new Error(datos.error || "");
  } catch (e) {
    sinPago();
    mostrarError((e && e.message && !/fetch|JSON/i.test(e.message) ? e.message : "No hemos podido preparar el pago.") + " No se ha cobrado nada.");
    return;
  }

  var stripe = window.Stripe(datos.clave_publicable);
  var checkout = stripe.initCheckoutElementsSdk({
    clientSecret: datos.client_secret,
    elementsOptions: {
      appearance: { theme: "stripe", variables: { colorPrimary: "#c8102e", borderRadius: "10px", fontFamily: "system-ui, sans-serif" } },
    },
  });
  var carga = await checkout.loadActions();
  document.getElementById("pagocarga").hidden = true;
  if (carga.type !== "success") {
    sinPago();
    mostrarError("No hemos podido preparar el pago. No se ha cobrado nada.");
    return;
  }
  var acciones = carga.actions;
  checkout.createContactDetailsElement().mount("#pagocontacto");
  if (hayFisico) {
    document.getElementById("pagoenvio").hidden = false;
    checkout.createShippingAddressElement().mount("#pagodireccion");
  }
  checkout.createPaymentElement().mount("#pagotarjeta");

  var telefono = document.getElementById("pagotelefono");
  var pintar = function (s) {
    totalEl.textContent = s.total.total.amount;
    var t = !hayFisico || /^[+0-9 ]{9,}$/.test(telefono.value.trim());
    boton.disabled = !(s.canConfirm && t);
  };
  checkout.on("change", pintar);
  pintar(acciones.getSession());
  telefono.addEventListener("input", function () { pintar(acciones.getSession()); });

  var cajaCodigo = document.getElementById("pagocodigo");
  cajaCodigo.querySelector("button").addEventListener("click", async function () {
    var c = cajaCodigo.querySelector("input").value.trim(), m = document.getElementById("pagocodigomsg");
    if (!c) return;
    var res = await acciones.applyPromotionCode(c);
    m.hidden = false;
    if (res.type === "error") { m.className = "cestaaviso mal"; m.textContent = "Ese código no vale para este pedido."; }
    else { m.className = "cestaaviso bien"; m.textContent = "Código aplicado."; }
  });

  boton.addEventListener("click", async function () {
    mostrarError("");
    boton.disabled = true;
    boton.textContent = "Procesando…";
    var op = {};
    if (hayFisico) op.phoneNumber = telefono.value.trim();
    var res = await acciones.confirm(op);
    // Si todo va bien, Stripe lleva a pedido.html y no se llega aquí
    boton.textContent = "Pagar";
    if (res.type === "error") {
      mostrarError(res.error.message + " No se ha cobrado este intento.");
      pintar(acciones.getSession());
    }
  });
})();
