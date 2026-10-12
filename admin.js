 "use strict";

/* ==================================================
   CONFIGURACIÓN SUPABASE
   Conserva la clave publishable del proyecto.
================================================== */
const SUPABASE_URL = "https://yljxozttfnvyjrwrvcab.supabase.co";
const SUPABASE_KEY = "sb_publishable_V73MAvXSKRKH6cZh_AfDxQ__0rXOxKE";
const BUCKET_ORIGINALES = "banderas-fotos";
const ESTADOS_PENDIENTES = ["oculta", "revision"];

if (!window.supabase) {
    throw new Error("No se ha cargado la librería de Supabase.");
}

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);

/* ==================================================
   ELEMENTOS HTML
================================================== */
const loginSection = document.getElementById("loginSection");
const adminPanel = document.getElementById("adminPanel");
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginMessage = document.getElementById("loginMessage");
const logoutButton = document.getElementById("logoutButton");
const pendingList = document.getElementById("pendingList");
const pendingCount = document.getElementById("pendingCount");

function comprobarElementosHTML() {
    const faltan = [];
    if (!loginSection) faltan.push("loginSection");
    if (!adminPanel) faltan.push("adminPanel");
    if (!loginForm) faltan.push("loginForm");
    if (!emailInput) faltan.push("email");
    if (!passwordInput) faltan.push("password");
    if (!loginMessage) faltan.push("loginMessage");
    if (!pendingList) faltan.push("pendingList");
    if (!pendingCount) faltan.push("pendingCount");
    if (faltan.length) {
        console.error("Faltan elementos en admin.html:", faltan.join(", "));
        return false;
    }
    return true;
}

function mostrarLogin() {
    if (loginSection) loginSection.style.display = "block";
    if (adminPanel) adminPanel.style.display = "none";
}

function mostrarPanel() {
    if (loginSection) loginSection.style.display = "none";
    if (adminPanel) adminPanel.style.display = "block";
}

function mostrarMensaje(texto, esError = false) {
    if (!loginMessage) return;
    loginMessage.textContent = texto;
    loginMessage.classList.toggle("admin-error", esError);
}

function escaparHTML(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatearFecha(fecha) {
    if (!fecha) return "Sin fecha";
    const partes = String(fecha).split("-");
    return partes.length === 3
        ? `${partes[2]}/${partes[1]}/${partes[0]}`
        : escaparHTML(fecha);
}

function errorAmigable(error) {
    return error?.message || error?.error_description || "Error desconocido.";
}

/* ==================================================
   INICIO Y AUTENTICACIÓN
================================================== */
document.addEventListener("DOMContentLoaded", iniciarAdmin);

async function iniciarAdmin() {
    if (!comprobarElementosHTML()) {
        mostrarMensaje("❌ El HTML del panel no contiene todos los elementos necesarios.", true);
        return;
    }

    mostrarLogin();

    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
        console.error("Error recuperando la sesión:", error);
        mostrarMensaje("❌ No se pudo recuperar la sesión: " + errorAmigable(error), true);
        return;
    }

    if (data.session) {
        await comprobarAdministrador();
    } else {
        mostrarLogin();
    }
}

if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            mostrarMensaje("Escribe tu correo y contraseña.", true);
            return;
        }

        const boton = loginForm.querySelector('button[type="submit"]');
        if (boton) boton.disabled = true;
        mostrarMensaje("⏳ Iniciando sesión…");

        try {
            const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            mostrarMensaje("⏳ Comprobando permisos de administrador…");
            await comprobarAdministrador();
        } catch (error) {
            console.error("Error de inicio de sesión:", error);
            mostrarMensaje("❌ No se pudo iniciar sesión: " + errorAmigable(error), true);
        } finally {
            if (boton) boton.disabled = false;
        }
    });
}

async function comprobarAdministrador() {
    try {
        const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
        if (sessionError) throw sessionError;

        if (!sessionData.session) {
            mostrarLogin();
            mostrarMensaje("Inicia sesión para continuar.");
            return;
        }

        mostrarMensaje("⏳ Comprobando permisos…");

        const { data: esAdmin, error: adminError } = await supabaseClient.rpc("es_admin");
        if (adminError) throw adminError;

        if (esAdmin !== true) {
            await supabaseClient.auth.signOut();
            mostrarLogin();
            mostrarMensaje("❌ Esta cuenta no tiene permisos de administrador.", true);
            return;
        }

        mostrarPanel();
        mostrarMensaje("");
        await cargarPendientes();
    } catch (error) {
        console.error("Error comprobando administrador:", error);
        mostrarLogin();
        mostrarMensaje("❌ No se pudieron comprobar los permisos: " + errorAmigable(error), true);
    }
}

supabaseClient.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
        mostrarLogin();
        if (pendingList) pendingList.innerHTML = "";
        if (pendingCount) pendingCount.textContent = "0";
    }
});

if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
            console.error("Error cerrando sesión:", error);
            alert("No se pudo cerrar sesión: " + errorAmigable(error));
            return;
        }
        if (emailInput) emailInput.value = "";
        if (passwordInput) passwordInput.value = "";
        mostrarMensaje("");
        mostrarLogin();
    });
}

/* ==================================================
   CARGAR AVISOS PENDIENTES
================================================== */
async function cargarPendientes() {
    if (!pendingList || !pendingCount) return;

    pendingList.innerHTML = `
        <div class="admin-empty">
            <div class="icon">⏳</div>
            <h2>Cargando avisos…</h2>
            <p>Consultando la tabla banderas de Supabase.</p>
        </div>`;

    try {
        // RPC protegida: incluye coordenadas exactas solo tras validar es_admin().
        const { data, error } = await supabaseClient.rpc("admin_listar_banderas_pendientes");

        if (error) throw error;

        const banderas = data || [];
        console.log("Avisos pendientes recibidos:", banderas.length, banderas);

        pendingCount.textContent = String(banderas.length);

        if (!banderas.length) {
            pendingList.innerHTML = `
                <div class="admin-empty">
                    <div class="icon">🎉</div>
                    <h2>No hay avisos pendientes</h2>
                    <p>La consulta ha terminado correctamente y no ha encontrado registros en estado oculta o revision.</p>
                    <button type="button" class="admin-button secondary" id="recargarPendientes">🔄 Volver a consultar</button>
                </div>`;
            document.getElementById("recargarPendientes")?.addEventListener("click", cargarPendientes);
            return;
        }

        pendingList.innerHTML = "";
        const ocultas = banderas.filter(b => b.estado === "oculta");
        const revision = banderas.filter(b => b.estado === "revision");

        if (ocultas.length) {
            pendingList.appendChild(crearTituloSeccion("🔴", "Banderas nuevas", "Todavía no han sido revisadas.", ocultas.length));
            for (const bandera of ocultas) {
                pendingList.appendChild(await crearTarjeta(bandera));
            }
        }

        if (revision.length) {
            pendingList.appendChild(crearTituloSeccion("🟡", "En revisión", "Visibles en el mapa, pendientes de confirmación definitiva.", revision.length));
            for (const bandera of revision) {
                pendingList.appendChild(await crearTarjeta(bandera));
            }
        }
    } catch (error) {
        console.error("Error consultando banderas:", error);
        pendingCount.textContent = "—";
        pendingList.innerHTML = `
            <div class="admin-empty admin-error">
                <div class="icon">❌</div>
                <h2>Error cargando los avisos</h2>
                <p>${escaparHTML(errorAmigable(error))}</p>
                <p>Comprueba que la sesión siga activa y que la política RLS de administradores permita SELECT en public.banderas.</p>
                <button type="button" class="admin-button secondary" id="reintentarPendientes">🔄 Reintentar</button>
            </div>`;
        document.getElementById("reintentarPendientes")?.addEventListener("click", cargarPendientes);
    }
}

function crearTituloSeccion(icono, titulo, descripcion, cantidad) {
    const elemento = document.createElement("div");
    elemento.className = "admin-section-title";
    elemento.innerHTML = `
        <div>
            <span class="admin-section-icon">${icono}</span>
            <div>
                <h2>${escaparHTML(titulo)}</h2>
                <p>${escaparHTML(descripcion)}</p>
            </div>
        </div>
        <strong>${Number(cantidad)}</strong>`;
    return elemento;
}

/* ==================================================
   TARJETA Y VISTA PREVIA PRIVADA
================================================== */
async function crearTarjeta(bandera) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "admin-card";

    const esOculta = bandera.estado === "oculta";
    let fotoHTML = `<div class="admin-photo-placeholder">📷 No hay una ruta de foto original guardada en este aviso.</div>`;

    // foto_url contiene la ruta del objeto en el bucket privado banderas-fotos.
    // Se genera una URL firmada temporal; no se convierte la foto en pública.
    const rutaFoto = typeof bandera.foto_url === "string" ? bandera.foto_url : "";
    if (rutaFoto) {
        const { data: signedData, error: signedError } = await supabaseClient
            .storage
            .from(BUCKET_ORIGINALES)
            .createSignedUrl(rutaFoto, 600);

        if (signedError) {
            console.warn("No se pudo generar la vista previa de la foto de la bandera #" + bandera.id, signedError);
            fotoHTML = `<div class="admin-photo-placeholder">⚠️ No se pudo cargar la foto original: ${escaparHTML(signedError.message)}</div>`;
        } else if (signedData?.signedUrl) {
            fotoHTML = `
                <div class="admin-photo-wrap">
                    <a href="${escaparHTML(signedData.signedUrl)}" target="_blank" rel="noopener noreferrer">
                        <img class="admin-photo" src="${escaparHTML(signedData.signedUrl)}" alt="Foto original privada del aviso ${Number(bandera.id)}" loading="lazy">
                    </a>
                    <p class="admin-photo-note">Foto original privada · enlace temporal</p>
                </div>`;
        }
    }

    const estadoHTML = esOculta
        ? `<span class="admin-status hidden">🔴 OCULTA</span>`
        : `<span class="admin-status review">🟡 EN REVISIÓN</span>`;

    const botones = esOculta
        ? `
            <button type="button" class="admin-button secondary" data-action="revision">🟡 Pasar a revisión</button>
            <button type="button" class="admin-button success" data-action="verificar">🟢 Verificar</button>
            <button type="button" class="admin-button danger" data-action="rechazar">❌ Rechazar</button>`
        : `
            <button type="button" class="admin-button success" data-action="verificar">🟢 Verificar</button>
            <button type="button" class="admin-button danger" data-action="rechazar">❌ Rechazar</button>`;

    tarjeta.innerHTML = `
        ${fotoHTML}
        <div class="admin-info">
            <div class="admin-card-header">
                <h3>🇪🇸 Aviso #${Number(bandera.id)}</h3>
                ${estadoHTML}
            </div>
            <p>📍 <strong>Municipio:</strong> ${escaparHTML(bandera.municipio)}</p>
            <p>🗺️ <strong>Provincia:</strong> ${escaparHTML(bandera.provincia)}</p>
            <p>📅 <strong>Vista:</strong> ${formatearFecha(bandera.fecha_vista)}</p>
            <p>📝 <strong>Descripción:</strong><br>${escaparHTML(bandera.descripcion || "Sin descripción.")}</p>
            <p>📌 <strong>Coordenadas:</strong> ${escaparHTML(bandera.latitud)}, ${escaparHTML(bandera.longitud)}</p>
            <div class="admin-location-buttons">
                <a class="admin-location-link" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(bandera.latitud + "," + bandera.longitud)}" target="_blank" rel="noopener noreferrer">📍 Ver en Google Maps</a>
                <a class="admin-location-link" href="https://www.openstreetmap.org/?mlat=${encodeURIComponent(bandera.latitud)}&mlon=${encodeURIComponent(bandera.longitud)}#map=18/${encodeURIComponent(bandera.latitud)}/${encodeURIComponent(bandera.longitud)}" target="_blank" rel="noopener noreferrer">🗺️ Ver en OpenStreetMap</a>
            </div>
            <p class="admin-created-at">Enviado: ${escaparHTML(bandera.creado_en || "Fecha desconocida")}</p>
        </div>
        <div class="admin-actions">${botones}</div>`;

    tarjeta.querySelector('[data-action="revision"]')?.addEventListener("click", () => cambiarEstado(bandera.id, "revision"));
    tarjeta.querySelector('[data-action="verificar"]')?.addEventListener("click", () => cambiarEstado(bandera.id, "verificada"));
    tarjeta.querySelector('[data-action="rechazar"]')?.addEventListener("click", () => cambiarEstado(bandera.id, "rechazada"));

    return tarjeta;
}

/* ==================================================
   CAMBIOS DE ESTADO NO DESTRUCTIVOS
================================================== */
async function cambiarEstado(id, nuevoEstado) {
    const mensajes = {
        revision: {
            pregunta: "¿Pasar este aviso a revisión? Aparecerá en el mapa público como no confirmado.",
            exito: "El aviso ha pasado a revisión."
        },
        verificada: {
            pregunta: "¿Confirmar que esta bandera es legítima? El aviso aparecerá como verificado.",
            exito: "La bandera se ha marcado como verificada."
        },
        rechazada: {
            pregunta: "¿Rechazar este aviso? No aparecerá en el mapa público, pero el registro y su historial se conservarán.",
            exito: "Aviso rechazado. El registro se ha conservado."
        }
    };

    const texto = mensajes[nuevoEstado];
    if (!texto || !confirm(texto.pregunta)) return;

    try {
        const { data, error } = await supabaseClient
            .from("banderas")
            .update({ estado: nuevoEstado })
            .eq("id", id)
            .select("id, estado")
            .maybeSingle();

        if (error) throw error;
        if (!data) {
            throw new Error("Supabase no actualizó ningún registro. Comprueba la sesión y la política UPDATE de administradores.");
        }

        alert("✅ " + texto.exito);
        await cargarPendientes();
    } catch (error) {
        console.error("Error cambiando estado del aviso #" + id + ":", error);
        alert("❌ No se pudo actualizar el aviso.\n\n" + errorAmigable(error));
    }
}
