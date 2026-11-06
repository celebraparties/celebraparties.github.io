// Cesta de Celebra: se guarda en este móvil u ordenador, sin cuenta. Los precios que valen son los del servidor.
(function () {
  var CLAVE = "celebra_cesta_v1", MAX_UNIDADES = 10;
  function leer() {
    try {
      var d = JSON.parse(localStorage.getItem(CLAVE) || "[]");
      return Array.isArray(d) ? d : [];
    } catch (e) { return []; }
  }
  function guardar(l) {
    try { localStorage.setItem(CLAVE, JSON.stringify(l)); return true; } catch (e) { return false; }
  }
  function mismas(a, b) { return JSON.stringify(a || {}) === JSON.stringify(b || {}); }
  function contar() { return leer().reduce(function (s, l) { return s + l.cantidad; }, 0); }
  function pintarContador() {
    var n = contar();
    document.querySelectorAll(".cestan").forEach(function (x) { x.textContent = n ? String(n) : ""; x.hidden = !n; });
  }
  function anadir(slug, cantidad, opciones) {
    var l = leer(), hallada = l.filter(function (x) { return x.slug === slug && mismas(x.opciones, opciones); })[0];
    if (hallada) hallada.cantidad = Math.min(MAX_UNIDADES, hallada.cantidad + cantidad);
    else l.push({ slug: slug, cantidad: Math.min(MAX_UNIDADES, cantidad), opciones: opciones });
    var ok = guardar(l);
    pintarContador();
    return ok;
  }
  window.CelebraCesta = { leer: leer, guardar: guardar, anadir: anadir, pintarContador: pintarContador, MAX_UNIDADES: MAX_UNIDADES };

  // Ficha de producto
  var boton = document.getElementById("addcesta");
  if (boton) {
    boton.addEventListener("click", function () {
      var aviso = document.getElementById("cestaaviso"), opciones = {}, falta = null;
      document.querySelectorAll(".cestaop select").forEach(function (s) {
        if (s.value) opciones[s.name] = s.value;
        else if (s.required && !falta) falta = s;
      });
      aviso.hidden = false;
      if (falta) {
        aviso.className = "cestaaviso mal";
        aviso.textContent = "Elige " + falta.dataset.titulo.toLowerCase() + " antes de añadirlo.";
        falta.focus();
        return;
      }
      var q = document.getElementById("qty"), cant = Math.max(1, Math.min(MAX_UNIDADES, parseInt(q && q.value, 10) || 1));
      if (anadir(boton.dataset.slug, cant, opciones)) {
        aviso.className = "cestaaviso bien";
        aviso.innerHTML = 'Añadido. <a href="' + boton.dataset.base + 'cesta.html">Ver la cesta</a>';
      } else {
        aviso.className = "cestaaviso mal";
        aviso.textContent = "Este navegador no deja guardar la cesta. Usa «Comprar ahora».";
      }
    });
  }

  // Página de la cesta
  var caja = document.getElementById("cestalista");
  if (caja && window.CESTA_DATOS) {
    // Para la prueba sin botones: cesta.html?anadir=<producto>, solo si no tiene opciones que elegir
    var pedir = new URLSearchParams(location.search).get("anadir");
    if (pedir && Object.prototype.hasOwnProperty.call(window.CESTA_DATOS, pedir) && !window.CESTA_DATOS[pedir].opciones.length) {
      anadir(pedir, 1, {});
      history.replaceState(null, "", "cesta.html");
    }
    var euros = function (c) { return (c / 100).toFixed(2).replace(".", ",") + " €"; };
    var esc = function (t) { var d = document.createElement("div"); d.textContent = t; return d.innerHTML; };
    var pintar = function () {
      // Lo que ya no se vende se quita y se avisa
      var todo = leer(), l = todo.filter(function (x) { return window.CESTA_DATOS[x.slug]; });
      var quitados = todo.length - l.length;
      if (quitados) guardar(l);
      var pie = document.getElementById("cestapie"), vacia = document.getElementById("cestavacia");
      var avisoQuitados = document.getElementById("cestaquitados");
      avisoQuitados.hidden = !quitados;
      vacia.hidden = l.length > 0;
      pie.hidden = l.length === 0;
      var total = 0, hayPdf = false, hayFisico = false;
      caja.innerHTML = l.map(function (x, i) {
        var p = window.CESTA_DATOS[x.slug], sub = p.precio_cent * x.cantidad;
        total += sub;
        if (p.digital) hayPdf = true; else hayFisico = true;
        var ops = Object.keys(x.opciones || {}).map(function (k) { return x.opciones[k]; }).join(" · ");
        return '<div class="cestalin"><img src="' + esc(p.imagen) + '" alt=""><div class="cl"><b>' + esc(p.nombre) + "</b>" +
          (ops ? '<span class="op">' + esc(ops) + "</span>" : "") + (p.digital ? '<span class="op">PDF, por correo</span>' : "") +
          '<div class="cc"><button type="button" data-i="' + i + '" data-d="-1" aria-label="Quitar una unidad">&minus;</button><span>' + x.cantidad +
          '</span><button type="button" data-i="' + i + '" data-d="1" aria-label="Añadir una unidad">+</button><button type="button" class="qt" data-i="' + i +
          '" data-q="1">Quitar</button></div></div><b class="sub">' + euros(sub) + "</b></div>";
      }).join("");
      document.getElementById("cestatotal").textContent = euros(total);
      document.getElementById("cestapdf").hidden = !hayPdf;
      document.getElementById("cestaenvio").hidden = !hayFisico;
      pintarContador();
    };
    caja.addEventListener("click", function (ev) {
      var b = ev.target.closest("button");
      if (!b) return;
      var l = leer(), i = +b.dataset.i;
      if (!l[i]) return;
      if (b.dataset.q) l.splice(i, 1);
      else {
        l[i].cantidad += +b.dataset.d;
        if (l[i].cantidad < 1) l.splice(i, 1);
        else if (l[i].cantidad > MAX_UNIDADES) l[i].cantidad = MAX_UNIDADES;
      }
      guardar(l);
      pintar();
    });
    document.getElementById("cestapagar").addEventListener("click", function () {
      var pdf = document.getElementById("cestapdf"), acepta = document.getElementById("aceptapdf"), error = document.getElementById("cestaerror");
      if (!pdf.hidden && !acepta.checked) {
        error.hidden = false;
        error.textContent = "Para comprar un PDF, marca la casilla de entrega inmediata.";
        return;
      }
      try { sessionStorage.setItem("celebra_acepta_pdf", pdf.hidden ? "" : "si"); } catch (e) {}
      location.href = "pago.html";
    });
    pintar();
  }
  pintarContador();
})();
