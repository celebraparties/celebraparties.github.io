// Vuelta del pago: solo da las gracias y vacía la cesta si Stripe confirma que está pagado.
(async function () {
  var API = window.CELEBRA_API, sesion = new URLSearchParams(location.search).get("sesion");
  var mostrar = function (id) {
    ["pedcarga", "pedbien", "pedespera", "pedmal"].forEach(function (x) { document.getElementById(x).hidden = x !== id; });
  };
  if (!sesion) { mostrar("pedmal"); return; }
  try {
    var r = await fetch(API + "/api/estado-pago?sesion=" + encodeURIComponent(sesion)), d = await r.json();
    if (!r.ok) throw new Error();
    if (d.pagado) {
      window.CelebraCesta.guardar([]);
      window.CelebraCesta.pintarContador();
      mostrar("pedbien");
    } else if (d.en_tramite) {
      mostrar("pedespera");
    } else {
      mostrar("pedmal");
    }
  } catch (e) { mostrar("pedespera"); }
})();
