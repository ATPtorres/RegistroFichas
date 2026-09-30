const API = "php/api.php";

const REFERENTES = [
  "Alejandro Torres Peñaloza",
  "Pecho Vallejos Gunar",
  "Wilfredo Paredes Mollo",
  "Juan Vallejos Becerra",
  "Olarte Bascope Alex",
  "Brayan Guevara Torrico",
  "Jose Raul Chambi Ramos",
  "Alexander Jr Mejias Joel",
  "Kevin Yamil Rojas",
];

// Dominios de correo reconocidos
const DOMINIOS_EMAIL = [
  "gmail.com", "hotmail.com", "outlook.com", "live.com", "msn.com",
  "yahoo.com", "yahoo.es", "ymail.com", "icloud.com", "me.com", "mac.com",
  "aol.com", "protonmail.com", "proton.me", "zoho.com", "gmx.com", "mail.com",
  "hey.com", "yandex.com", "fastmail.com", "hushmail.com", "inbox.com",
  "hotmail.es", "outlook.es", "live.es", "edu.pe", "gmail.com.pe",
];

let registros = [];

const $ = (sel) => document.querySelector(sel);
const form = $("#formRegistro");
const tbody = $("#tbodyRegistros");
const listaTarjetas = $("#listaTarjetas");
const msgForm = $("#msgForm");

// ============ Utilidades ============
function toast(texto, esError = false) {
  const t = $("#toast");
  t.textContent = texto;
  t.classList.toggle("error", esError);
  t.hidden = false;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => (t.hidden = true), 3800);
}

function mostrarMensaje(texto, ok) {
  msgForm.textContent = texto;
  msgForm.className = "msg " + (ok ? "ok" : "err");
  msgForm.hidden = false;
}

function limpiarErrores() {
  document.querySelectorAll(".error").forEach((e) => (e.textContent = ""));
  document.querySelectorAll(".campo input, .campo select").forEach((i) => i.classList.remove("invalido"));
}

function pintarErrores(errors) {
  Object.entries(errors).forEach(([campo, texto]) => {
    const span = document.querySelector(`[data-error-for="${campo}"]`);
    if (span) span.textContent = texto;
    const input = document.getElementById(campo);
    if (input) input.classList.add("invalido");
  });
}

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s ?? "";
  return d.innerHTML;
}

function fechaCorta(fecha) {
  if (!fecha) return "-";
  const f = new Date(fecha.replace(" ", "T"));
  return isNaN(f) ? fecha : f.toLocaleDateString("es-ES");
}

// ============ Cargar registros ============
async function cargarRegistros() {
  try {
    const res = await fetch(API + "?action=list");
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    registros = json.data;
    renderTabla(registros);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7" class="vacio">Error al cargar: ${esc(e.message)}</td></tr>`;
    listaTarjetas.innerHTML = `<div class="vacio">Error al cargar: ${esc(e.message)}</div>`;
    toast("No se pudieron cargar los registros", true);
  }
}

function renderTabla(lista) {
  $("#contador").textContent = registros.length;

  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="vacio">No hay registros todavía</td></tr>`;
    listaTarjetas.innerHTML = `<div class="vacio">No hay registros todavía</div>`;
    return;
  }

  tbody.innerHTML = lista
    .map(
      (r) => `
    <tr>
      <td><strong>${esc(r.ficha_nro)}</strong></td>
      <td>${esc(r.nombre)}</td>
      <td>${esc(r.celular)}</td>
      <td>${esc(r.email)}</td>
      <td>${esc(r.referente)}</td>
      <td>${fechaCorta(r.fecha_registro)}</td>
      <td class="acciones-celda">
        <button class="btn btn-borrar" data-del="${r.id}">Eliminar</button>
      </td>
    </tr>`
    )
    .join("");

  listaTarjetas.innerHTML = lista
    .map(
      (r) => `
    <article class="tarjeta-registro">
      <div class="tarjeta-top">
        <span class="tarjeta-ficha">Ficha ${esc(r.ficha_nro)}</span>
        <span class="tarjeta-fecha">${fechaCorta(r.fecha_registro)}</span>
      </div>
      <div class="tarjeta-nombre">${esc(r.nombre)}</div>
      <div class="tarjeta-datos">
        <span><strong>Celular:</strong> ${esc(r.celular)}</span>
        <span><strong>Email:</strong> ${esc(r.email)}</span>
        <span><strong>Referente:</strong> ${esc(r.referente)}</span>
      </div>
      <div class="tarjeta-acciones">
        <button class="btn btn-borrar" data-del="${r.id}">Eliminar</button>
      </div>
    </article>`
    )
    .join("");
}

// ============ Formulario ============
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  limpiarErrores();
  msgForm.hidden = true;

  const datos = {
    nombre: form.nombre.value.trim(),
    celular: form.celular.value.trim(),
    email: form.email.value.trim(),
    referente: form.referente.value.trim(),
  };

  let validacion = {};
  if (!datos.nombre) validacion.nombre = "Nombre es obligatorio";
  else if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' ]{2,120}$/.test(datos.nombre))
    validacion.nombre = "Solo letras y espacios (mín. 2)";

  if (!datos.celular) validacion.celular = "Celular es obligatorio";
  else if (!/^[0-9+\s-]{7,25}$/.test(datos.celular) || /[A-Za-z]/.test(datos.celular))
    validacion.celular = "Solo números (ej: 987654321)";

  if (!datos.email) validacion.email = "Email es obligatorio";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email))
    validacion.email = "Email no válido";
  else {
    const dominio = datos.email.split("@")[1].toLowerCase();
    if (!DOMINIOS_EMAIL.includes(dominio))
      validacion.email = "Usa un correo válido (Gmail, Hotmail, Outlook, Yahoo, etc.)";
  }

  if (!datos.referente) validacion.referente = "Selecciona un referente";
  else if (!REFERENTES.includes(datos.referente)) validacion.referente = "Referente no válido";

  if (Object.keys(validacion).length) {
    pintarErrores(validacion);
    return;
  }

  const btn = $("#btnGuardar");
  btn.disabled = true;
  btn.textContent = "Guardando...";

  try {
    const res = await fetch(API + "?action=create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
    const json = await res.json();

    if (json.success) {
      mostrarMensaje(json.message || "Registro guardado correctamente.", true);
      toast(json.message || "Registro guardado correctamente");
      form.reset();
      await cargarRegistros();
    } else {
      if (json.errors) pintarErrores(json.errors);
      mostrarMensaje(json.message || "Revisa los campos marcados.", false);
    }
  } catch (e) {
    mostrarMensaje("Error de conexión con el servidor.", false);
  } finally {
    btn.disabled = false;
    btn.textContent = "Guardar registro";
  }
});

$("#btnLimpiar").addEventListener("click", () => {
  setTimeout(() => {
    limpiarErrores();
    msgForm.hidden = true;
  }, 0);
});

// ============ Acciones (tabla + tarjetas) ============
async function eliminarRegistro(id) {
  if (!confirm("¿Eliminar este registro?")) return;
  try {
    const res = await fetch(API + "?action=delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: Number(id) }),
    });
    const json = await res.json();
    if (json.success) {
      toast("Registro eliminado");
      await cargarRegistros();
    } else {
      toast(json.message || "No se pudo eliminar", true);
    }
  } catch {
    toast("Error de conexión", true);
  }
}

tbody.addEventListener("click", (e) => {
  const delId = e.target.dataset.del;
  if (delId) eliminarRegistro(delId);
});

listaTarjetas.addEventListener("click", (e) => {
  const delId = e.target.dataset.del;
  if (delId) eliminarRegistro(delId);
});

// ============ Búsqueda ============
$("#buscar").addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase().trim();
  const filtrados = !q
    ? registros
    : registros.filter((r) =>
        [r.ficha_nro, r.nombre, r.celular, r.email, r.referente]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
  renderTabla(filtrados);
  $("#contador").textContent = filtrados.length;
});

// ============ Exportar Excel ============
$("#btnExcel").addEventListener("click", () => {
  if (!registros.length) return toast("No hay registros para exportar", true);

  const filas = registros.map((r) => ({
    "Ficha N°": r.ficha_nro,
    Nombre: r.nombre,
    Celular: r.celular,
    Email: r.email,
    Referente: r.referente,
    Fecha: fechaCorta(r.fecha_registro),
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(filas);
  ws["!cols"] = [
    { wch: 12 }, { wch: 30 }, { wch: 15 },
    { wch: 30 }, { wch: 25 }, { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Registros");
  XLSX.writeFile(wb, `registros_feria_${new Date().toISOString().slice(0, 10)}.xlsx`);
  toast("Archivo Excel descargado");
});

// ============ Exportar PDF ============
$("#btnPdf").addEventListener("click", () => {
  if (!registros.length) return toast("No hay registros para exportar", true);

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFillColor(25, 60, 120);
  doc.rect(0, 0, 297, 24, "F");
  doc.setFillColor(245, 190, 40);
  doc.rect(0, 24, 297, 2, "F");
  doc.setTextColor(255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("FERIA UNIVERSITARIA - Registros de participantes", 148.5, 11, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Exportado: ${new Date().toLocaleString("es-ES")} | Total: ${registros.length} registros`, 148.5, 19, {
    align: "center",
  });

  doc.autoTable({
    startY: 32,
    head: [["Ficha N°", "Nombre", "Celular", "Email", "Referente", "Fecha"]],
    body: registros.map((r) => [
      r.ficha_nro,
      r.nombre,
      r.celular,
      r.email,
      r.referente,
      fechaCorta(r.fecha_registro),
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [25, 60, 120], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [244, 246, 250] },
    margin: { left: 10, right: 10 },
  });

  doc.save(`registros_feria_${new Date().toISOString().slice(0, 10)}.pdf`);
  toast("Archivo PDF descargado");
});

$("#btnRecargar").addEventListener("click", () => {
  $("#buscar").value = "";
  cargarRegistros();
  toast("Datos actualizados");
});

// ============ Inicio ============
$("#anio").textContent = new Date().getFullYear();
cargarRegistros();
