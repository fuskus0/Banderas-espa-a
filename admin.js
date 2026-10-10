"use strict";

/* ==================================================
   CONFIGURACIÓN DE SUPABASE
================================================== */

const SUPABASE_URL =
    "https://yljxozttfnvyjrwrvcab.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_V73MAvXSKRKH6cZh_AfDxQ__0rXOxKE";

const BUCKET_ORIGINAL = "banderas-fotos";
const DURACION_URL_FOTO = 600;

const supabaseClient = supabase.createClient(
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

let comprobacionEnCurso = false;


/* ==================================================
   INICIO
================================================== */

document.addEventListener("DOMContentLoaded", iniciarAdmin);

async function iniciarAdmin() {
    console.log("🇪🇸 Iniciando panel de administración");

    if (!elementosCorrectos()) {
        console.error("Faltan elementos necesarios en admin.html.");
        return;
    }

    mostrarLogin();

    try {
        const { data, error } =
            await supabaseClient.auth.getSession();

        if (error) {
            throw error;
        }

        if (data.session) {
            await comprobarAdministrador();
        }
    } catch (error) {
        console.error("Error al iniciar:", error);
        mostrarMensaje(
            "No se pudo comprobar la sesión: " + error.message,
            true
        );
    }
}

function elementosCorrectos() {
    const elementos = [
        loginSection,
        adminPanel,
        loginForm,
        emailInput,
        passwordInput,
        loginMessage,
        logoutButton,
        pendingList,
        pendingCount
    ];

    return elementos.every(Boolean);
}


/* ==================================================
   INICIO DE SESIÓN
================================================== */

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        mostrarMensaje("Escribe tu correo y contraseña.", true);
        return;
    }

    const boton = loginForm.querySelector('button[type="submit"]');

    if (boton) {
        boton.disabled = true;
    }

    mostrarMensaje("⏳ Iniciando sesión...");

    try {
        const { error } =
            await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

        if (error) {
            throw error;
        }

        mostrarMensaje("⏳ Comprobando permisos de administrador...");

        await comprobarAdministrador();
    } catch (error) {
        console.error("Error de inicio de sesión:", error);
        mostrarMensaje("❌ " + error.message, true);
    } finally {
        if (boton) {
            boton.disabled = false;
        }
    }
});


/* ==================================================
   COMPROBAR ADMINISTRADOR
================================================== */

async function comprobarAdministrador() {
    if (comprobacionEnCurso) {
        return;
    }

    comprobacionEnCurso = true;
    mostrarMensaje("⏳ Comprobando permisos...");

    try {
        const { data: sesionData, error: sesionError } =
            await supabaseClient.auth.getSession();

        if (sesionError) {
            throw sesionError;
        }

        if (!sesionData.session) {
            mostrarLogin();
            mostrarMensaje("Inicia sesión para continuar.");
            return;
        }

        const { data: esAdmin, error: adminError } =
            await supabaseClient.rpc("es_admin");

        if (adminError) {
            throw adminError;
        }

        if (esAdmin !== true) {
            await supabaseClient.auth.signOut();
            mostrarLogin();

            mostrarMensaje(
                "❌ Este usuario no tiene permisos de administrador.",
                true
            );

            return;
        }

        console.log("✅ Administrador confirmado.");

        mostrarPanel();
        await cargarPendientes();
    } catch (error) {
        console.error("Error comprobando administrador:", error);

        mostrarLogin();
        mostrarMensaje(
            "❌ No se pudieron comprobar los permisos: " +
            error.message,
            true
        );
    } finally {
        comprobacionEnCurso = false;
    }
}


/* ==================================================
   CAMBIOS DE SESIÓN
================================================== */

supabaseClient.auth.onAuthStateChange(function (event) {
    if (event === "SIGNED_OUT") {
        mostrarLogin();
        pendingList.innerHTML = "";
        pendingCount.textContent = "0";
    }
});


/* ==================================================
   MOSTRAR Y OCULTAR SECCIONES
================================================== */

function mostrarLogin() {
    loginSection.style.display = "block";
    adminPanel.style.display = "none";
}

function mostrarPanel() {
    loginSection.style.display = "none";
    adminPanel.style.display = "block";
}

function mostrarMensaje(texto, error = false) {
    loginMessage.textContent = texto;
    loginMessage.classList.toggle("admin-error", error);
}


/* ==================================================
   CARGAR BANDERAS PENDIENTES
================================================== */

async function cargarPendientes() {
    pendingList.innerHTML = `
        <div class="admin-empty">
            <div class="icon">⏳</div>
            <h2>Cargando banderas...</h2>
            <p>Consultando Supabase.</p>
        </div>
    `;

    try {
        const { data, error } = await supabaseClient
            .from("banderas")
            .select("*")
            .in("estado", ["oculta", "revision"])
            .order("creado_en", { ascending: false });

        if (error) {
            throw error;
        }

        const banderas = data || [];

        pendingCount.textContent = String(banderas.length);
        pendingList.innerHTML = "";

        if (banderas.length === 0) {
            pendingList.innerHTML = `
                <div class="admin-empty">
                    <div class="icon">🎉</div>
                    <h2>No hay banderas pendientes</h2>
                    <p>No hay banderas ocultas o en revisión.</p>
                </div>
            `;
            return;
        }

        const ocultas = banderas.filter(
            bandera => bandera.estado === "oculta"
        );

        const revision = banderas.filter(
            bandera => bandera.estado === "revision"
        );

        if (ocultas.length > 0) {
            agregarTituloSeccion(
                "🔴",
                "Banderas nuevas",
                "Todavía no han sido revisadas.",
                ocultas.length
            );

            const tarjetas = await Promise.all(
                ocultas.map(bandera => crearTarjeta(bandera))
            );

            tarjetas.forEach(tarjeta => {
                pendingList.appendChild(tarjeta);
            });
        }

        if (revision.length > 0) {
            agregarTituloSeccion(
                "🟡",
                "En revisión",
                "Pendientes de confirmación definitiva.",
                revision.length
            );

            const tarjetas = await Promise.all(
                revision.map(bandera => crearTarjeta(bandera))
            );

            tarjetas.forEach(tarjeta => {
                pendingList.appendChild(tarjeta);
            });
        }

        console.log("Banderas cargadas:", banderas.length);
    } catch (error) {
        console.error("Error cargando banderas:", error);

        pendingList.innerHTML = `
            <div class="admin-empty admin-error">
                <div class="icon">❌</div>
                <h2>Error cargando las banderas</h2>
                <p>${escaparHTML(error.message)}</p>
            </div>
        `;

        pendingCount.textContent = "0";
    }
}

function agregarTituloSeccion(icono, titulo, descripcion, cantidad) {
    const elemento = document.createElement("div");
    elemento.className = "admin-section-title";

    elemento.innerHTML = `
        <div>
            <span class="admin-section-icon">
                ${icono}
            </span>
            <div>
                <h2>${titulo}</h2>
                <p>${descripcion}</p>
            </div>
        </div>
        <strong>${cantidad}</strong>
    `;

    pendingList.appendChild(elemento);
}


/* ==================================================
   PREPARAR LA RUTA DE LA FOTO
================================================== */

/*
   Acepta una ruta como:
   banderas/abc123.jpg

   También reconoce una URL de Supabase del bucket
   privado banderas-fotos y extrae su ruta.

   No acepta URL de otros dominios o buckets.
*/

function normalizarRutaFoto(valor) {
    if (typeof valor !== "string" || !valor.trim()) {
        return null;
    }

    let ruta = valor.trim();

    if (/^https?:\/\//i.test(ruta)) {
        try {
            const url = new URL(ruta);

            if (url.origin !== SUPABASE_URL) {
                return null;
            }

            const patron =
                /\/storage\/v1\/object\/(?:public|sign|authenticated)\/banderas-fotos\/(.+)$/;

            const coincidencia = url.pathname.match(patron);

            if (!coincidencia) {
                return null;
            }

            ruta = coincidencia[1];
        } catch {
            return null;
        }
    }

    ruta = ruta.replace(/^\/+/, "");

    if (ruta.startsWith(BUCKET_ORIGINAL + "/")) {
        ruta = ruta.slice(BUCKET_ORIGINAL.length + 1);
    }

    try {
        ruta = ruta
            .split("/")
            .map(segmento => decodeURIComponent(segmento))
            .join("/");
    } catch {
        return null;
    }

    if (
        !ruta ||
        ruta.split("/").some(
            segmento =>
                !segmento ||
                segmento === "." ||
                segmento === ".."
        )
    ) {
        return null;
    }

    return ruta;
}


/* ==================================================
   GENERAR URL TEMPORAL PARA LA FOTO ORIGINAL
================================================== */

async function obtenerFotoOriginal(fotoUrl) {
    const ruta = normalizarRutaFoto(fotoUrl);

    if (!ruta) {
        return {
            url: null,
            error: fotoUrl
                ? "La ruta de la foto no es válida."
                : "Esta bandera no tiene una foto adjunta."
        };
    }

    const { data, error } = await supabaseClient
        .storage
        .from(BUCKET_ORIGINAL)
        .createSignedUrl(ruta, DURACION_URL_FOTO);

    if (error) {
        console.error("Error creando URL temporal:", error);

        return {
            url: null,
            error: error.message
        };
    }

    if (!data || !data.signedUrl) {
        return {
            url: null,
            error: "Supabase no ha devuelto una URL para la foto."
        };
    }

    return {
        url: data.signedUrl,
        error: null
    };
}


/* ==================================================
   CREAR TARJETA DE BANDERA
================================================== */

async function crearTarjeta(bandera) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "admin-card";

    const esOculta = bandera.estado === "oculta";

    const estadoHTML = esOculta
        ? `<span class="admin-status hidden">🔴 OCULTA</span>`
        : `<span class="admin-status review">🟡 EN REVISIÓN</span>`;

    let fotoHTML = `
        <div class="admin-photo-message">
            📷 Esta bandera no tiene una foto adjunta.
        </div>
    `;

    if (bandera.foto_url) {
        const resultadoFoto =
            await obtenerFotoOriginal(bandera.foto_url);

        if (resultadoFoto.url) {
            const urlEscapada = escaparHTML(resultadoFoto.url);

            fotoHTML = `
                <div class="admin-photo-container">
                    <p class="admin-photo-title">
                        📸 Foto original aportada
                    </p>

                    <a
                        class="admin-photo-link"
                        href="${urlEscapada}"
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir foto original"
                    >
                        <img
                            class="admin-flag-photo"
                            src="${urlEscapada}"
                            alt="Foto de la bandera"
                            loading="lazy"
                        >
                    </a>

                    <small>
                        Pulsa la imagen para abrirla en tamaño completo.
                    </small>
                </div>
            `;
        } else {
            fotoHTML = `
                <div class="admin-photo-message admin-error">
                    ❌ No se pudo cargar la foto.
                    <br>
                    <small>${escaparHTML(resultadoFoto.error)}</small>
                </div>
            `;
        }
    }

    const coordenadasValidas =
        bandera.latitud !== null &&
        bandera.latitud !== undefined &&
        bandera.longitud !== null &&
        bandera.longitud !== undefined;

    let botonesHTML;

    if (esOculta) {
        botonesHTML = `
            <button class="admin-button secondary" data-action="revision">
                🟡 Pasar a revisión
            </button>

            <button class="admin-button success" data-action="verificar">
                🟢 Verificar
            </button>

            <button class="admin-button danger" data-action="rechazar">
                ❌ Rechazar
            </button>
        `;
    } else {
        botonesHTML = `
            <button class="admin-button success" data-action="verificar">
                🟢 Verificar
            </button>

            <button class="admin-button danger" data-action="rechazar">
                ❌ Rechazar
            </button>
        `;
    }

    let enlacesMapa = "";

    if (coordenadasValidas) {
        const latitud = encodeURIComponent(bandera.latitud);
        const longitud = encodeURIComponent(bandera.longitud);

        enlacesMapa = `
            <div class="admin-location-buttons">
                <a
                    class="admin-location-link"
                    href="https://www.google.com/maps/search/?api=1&query=${latitud}%2C${longitud}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    📍 Ver en Google Maps
                </a>

                <a
                    class="admin-location-link"
                    href="https://www.openstreetmap.org/?mlat=${latitud}&mlon=${longitud}#map=18/${latitud}/${longitud}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    🗺️ Ver en OpenStreetMap
                </a>
            </div>
        `;
    }

    tarjeta.innerHTML = `
        <div class="admin-info">

            <div class="admin-card-header">
                <h3>🇪🇸 Bandera #${escaparHTML(bandera.id)}</h3>
                ${estadoHTML}
            </div>

            ${fotoHTML}

            <p>
                📍 <strong>Municipio:</strong>
                ${escaparHTML(bandera.municipio || "Sin municipio")}
            </p>

            <p>
                🗺️ <strong>Provincia:</strong>
                ${escaparHTML(bandera.provincia || "Sin provincia")}
            </p>

            <p>
                📅 <strong>Vista:</strong>
                ${escaparHTML(formatearFecha(bandera.fecha_vista))}
            </p>

            <p>
                📝 <strong>Descripción:</strong><br>
                ${escaparHTML(bandera.descripcion || "Sin descripción.")}
            </p>

            <p>
                📌 <strong>Coordenadas:</strong>
                ${coordenadasValidas
                    ? escaparHTML(String(bandera.latitud)) +
                      ", " +
                      escaparHTML(String(bandera.longitud))
                    : "Sin coordenadas"}
            </p>

            ${enlacesMapa}
        </div>

        <div class="admin-actions">
            ${botonesHTML}
        </div>
    `;

    const imagen = tarjeta.querySelector(".admin-flag-photo");

    if (imagen) {
        imagen.addEventListener("error", function () {
            const contenedor =
                tarjeta.querySelector(".admin-photo-container");

            if (contenedor) {
                contenedor.innerHTML = `
                    <div class="admin-photo-message admin-error">
                        ❌ La URL se generó, pero no se pudo mostrar
                        la imagen. Recarga el panel e inténtalo de nuevo.
                    </div>
                `;
            }
        });
    }

    tarjeta
        .querySelector('[data-action="revision"]')
        ?.addEventListener("click", () => pasarARevision(bandera.id));

    tarjeta
        .querySelector('[data-action="verificar"]')
        ?.addEventListener("click", () => verificarBandera(bandera.id));

    tarjeta
        .querySelector('[data-action="rechazar"]')
        ?.addEventListener("click", () => rechazarBandera(bandera.id));

    return tarjeta;
}


/* ==================================================
   PASAR A REVISIÓN
================================================== */

async function pasarARevision(id) {
    const confirmar = confirm(
        "¿Pasar esta bandera a revisión?\n\n" +
        "Seguirá oculta del mapa público."
    );

    if (!confirmar) {
        return;
    }

    const { error } = await supabaseClient
        .from("banderas")
        .update({ estado: "revision" })
        .eq("id", id);

    if (error) {
        console.error("Error pasando a revisión:", error);
        alert("❌ No se pudo cambiar el estado.\n\n" + error.message);
        return;
    }

    await cargarPendientes();
}


/* ==================================================
   VERIFICAR BANDERA
================================================== */

async function verificarBandera(id) {
    const confirmar = confirm(
        "¿Verificar esta bandera?\n\n" +
        "Será visible en el mapa público."
    );

    if (!confirmar) {
        return;
    }

    const { error } = await supabaseClient
        .from("banderas")
        .update({ estado: "verificada" })
        .eq("id", id);

    if (error) {
        console.error("Error verificando bandera:", error);
        alert("❌ No se pudo verificar.\n\n" + error.message);
        return;
    }

    await cargarPendientes();
}


/* ==================================================
   RECHAZAR BANDERA
================================================== */

async function rechazarBandera(id) {
    const confirmar = confirm(
        "¿Rechazar esta bandera?\n\n" +
        "Se eliminará del registro."
    );

    if (!confirmar) {
        return;
    }

    const { error } = await supabaseClient
        .from("banderas")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error rechazando bandera:", error);
        alert("❌ No se pudo rechazar.\n\n" + error.message);
        return;
    }

    await cargarPendientes();
}


/* ==================================================
   CERRAR SESIÓN
================================================== */

logoutButton.addEventListener("click", async function () {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error("Error cerrando sesión:", error);
        alert("No se pudo cerrar sesión: " + error.message);
        return;
    }

    emailInput.value = "";
    passwordInput.value = "";

    mostrarMensaje("");
    mostrarLogin();
});


/* ==================================================
   ESCAPAR HTML
================================================== */

function escaparHTML(texto) {
    return String(texto ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* ==================================================
   FORMATEAR FECHA
================================================== */

function formatearFecha(fecha) {
    if (!fecha) {
        return "Sin fecha";
    }

    const partes = String(fecha).split("-");

    if (partes.length !== 3) {
        return fecha;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}
```
