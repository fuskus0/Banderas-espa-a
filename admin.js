"use strict";

/* =========================================================
   1. CONFIGURACIÓN
========================================================= */

const SUPABASE_URL =
    "https://yljxozttfnvyjrwrvcab.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_V73MAvXSKRKH6cZh_AfDxQ__0rXOxKE";

const BUCKET_ORIGINALES = "banderas-fotos";
const BUCKET_PUBLICO = "banderas-fotos-publicas";

const ESTADOS_PENDIENTES = ["oculta", "revision"];

if (!window.supabase) {
    throw new Error(
        "No se ha cargado la librería de Supabase. Revisa admin.html."
    );
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


/* =========================================================
   2. ELEMENTOS DEL HTML
========================================================= */

const loginSection = document.getElementById("loginSection");
const adminPanel = document.getElementById("adminPanel");
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginMessage = document.getElementById("loginMessage");
const logoutButton = document.getElementById("logoutButton");
const pendingList = document.getElementById("pendingList");
const pendingCount = document.getElementById("pendingCount");


/* =========================================================
   3. UTILIDADES
========================================================= */

function escaparHTML(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function errorAmigable(error) {
    return error?.message ||
        error?.error_description ||
        "Ha ocurrido un error desconocido.";
}

function mostrarMensaje(texto, esError = false) {
    if (!loginMessage) return;

    loginMessage.textContent = texto;
    loginMessage.classList.toggle("admin-error", esError);
}

function mostrarLogin() {
    if (loginSection) loginSection.style.display = "block";
    if (adminPanel) adminPanel.style.display = "none";
}

function mostrarPanel() {
    if (loginSection) loginSection.style.display = "none";
    if (adminPanel) adminPanel.style.display = "block";
}

function formatearFecha(fecha) {
    if (!fecha) return "Sin fecha";

    const partes = String(fecha).split("-");

    if (partes.length !== 3) {
        return escaparHTML(fecha);
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function comprobarElementosHTML() {
    const elementos = {
        loginSection,
        adminPanel,
        loginForm,
        emailInput,
        passwordInput,
        loginMessage,
        pendingList,
        pendingCount
    };

    const faltan = Object.entries(elementos)
        .filter(([, elemento]) => !elemento)
        .map(([nombre]) => nombre);

    if (faltan.length > 0) {
        console.error(
            "Faltan elementos en admin.html:",
            faltan
        );

        return false;
    }

    return true;
}


/* =========================================================
   4. INICIO Y SESIÓN
========================================================= */

document.addEventListener("DOMContentLoaded", iniciarAdmin);

async function iniciarAdmin() {
    if (!comprobarElementosHTML()) {
        mostrarMensaje(
            "No se encuentra algún elemento necesario de admin.html.",
            true
        );
        return;
    }

    mostrarLogin();

    try {
        const { data, error } =
            await supabaseClient.auth.getSession();

        if (error) throw error;

        if (data.session) {
            await comprobarAdministrador();
        }
    } catch (error) {
        console.error("Error iniciando el panel:", error);

        mostrarMensaje(
            "No se pudo iniciar el panel: " +
            errorAmigable(error),
            true
        );
    }
}


/* =========================================================
   5. INICIAR SESIÓN
========================================================= */

if (loginForm) {
    loginForm.addEventListener("submit", async event => {
        event.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            mostrarMensaje(
                "Escribe tu correo y contraseña.",
                true
            );
            return;
        }

        const boton = loginForm.querySelector(
            'button[type="submit"]'
        );

        if (boton) boton.disabled = true;

        mostrarMensaje("Iniciando sesión…");

        try {
            const { error } =
                await supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });

            if (error) throw error;

            await comprobarAdministrador();

        } catch (error) {
            console.error("Error de inicio de sesión:", error);

            mostrarMensaje(
                "No se pudo iniciar sesión: " +
                errorAmigable(error),
                true
            );

        } finally {
            if (boton) boton.disabled = false;
        }
    });
}


/* =========================================================
   6. COMPROBAR ADMINISTRADOR
========================================================= */

async function comprobarAdministrador() {
    try {
        const { data: sesion, error: errorSesion } =
            await supabaseClient.auth.getSession();

        if (errorSesion) throw errorSesion;

        if (!sesion.session) {
            mostrarLogin();
            mostrarMensaje("Inicia sesión para continuar.");
            return;
        }

        mostrarMensaje("Comprobando permisos…");

        const { data: esAdmin, error: errorAdmin } =
            await supabaseClient.rpc("es_admin");

        if (errorAdmin) throw errorAdmin;

        if (esAdmin !== true) {
            await supabaseClient.auth.signOut();

            mostrarLogin();

            mostrarMensaje(
                "Esta cuenta no tiene permisos de administrador.",
                true
            );

            return;
        }

        mostrarPanel();
        mostrarMensaje("");

        await cargarPendientes();

    } catch (error) {
        console.error(
            "Error comprobando los permisos:",
            error
        );

        mostrarLogin();

        mostrarMensaje(
            "No se pudieron comprobar los permisos: " +
            errorAmigable(error),
            true
        );
    }
}


/* =========================================================
   7. CERRAR SESIÓN
========================================================= */

if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            alert(
                "No se pudo cerrar sesión: " +
                errorAmigable(error)
            );
            return;
        }

        if (emailInput) emailInput.value = "";
        if (passwordInput) passwordInput.value = "";

        mostrarLogin();
        mostrarMensaje("");
    });
}

supabaseClient.auth.onAuthStateChange(event => {
    if (event === "SIGNED_OUT") {
        mostrarLogin();

        if (pendingList) pendingList.innerHTML = "";
        if (pendingCount) pendingCount.textContent = "0";
    }
});


/* =========================================================
   8. CARGAR AVISOS PENDIENTES
========================================================= */

async function cargarPendientes() {
    if (!pendingList || !pendingCount) return;

    pendingList.innerHTML = `
        <div class="admin-empty">
            <div class="icon">⏳</div>
            <h2>Cargando avisos…</h2>
            <p>Consultando las banderas pendientes.</p>
        </div>
    `;

    try {
        const { data, error } = await supabaseClient
            .from("banderas")
            .select("*")
            .in("estado", ESTADOS_PENDIENTES)
            .order("creado_en", { ascending: false });

        if (error) throw error;

        const banderas = data || [];

        console.log(
            "Avisos pendientes:",
            banderas.length,
            banderas
        );

        pendingCount.textContent = String(banderas.length);
        pendingList.innerHTML = "";

        if (banderas.length === 0) {
            pendingList.innerHTML = `
                <div class="admin-empty">
                    <div class="icon">🎉</div>
                    <h2>No hay avisos pendientes</h2>
                    <p>
                        No se han encontrado registros en estado
                        oculto o en revisión.
                    </p>
                    <button
                        type="button"
                        class="admin-button secondary"
                        id="recargarPendientes"
                    >
                        🔄 Actualizar
                    </button>
                </div>
            `;

            document
                .getElementById("recargarPendientes")
                ?.addEventListener("click", cargarPendientes);

            return;
        }

        const ocultas = banderas.filter(
            bandera => bandera.estado === "oculta"
        );

        const revision = banderas.filter(
            bandera => bandera.estado === "revision"
        );

        if (ocultas.length > 0) {
            pendingList.appendChild(
                crearTituloSeccion(
                    "🔴",
                    "Banderas nuevas",
                    "Todavía no se han publicado en el mapa.",
                    ocultas.length
                )
            );

            for (const bandera of ocultas) {
                pendingList.appendChild(
                    await crearTarjeta(bandera)
                );
            }
        }

        if (revision.length > 0) {
            pendingList.appendChild(
                crearTituloSeccion(
                    "🟡",
                    "Banderas en revisión",
                    "Visibles en el mapa con la fotografía borrosa.",
                    revision.length
                )
            );

            for (const bandera of revision) {
                pendingList.appendChild(
                    await crearTarjeta(bandera)
                );
            }
        }

    } catch (error) {
        console.error(
            "Error cargando avisos:",
            error
        );

        pendingCount.textContent = "—";

        pendingList.innerHTML = `
            <div class="admin-empty admin-error">
                <div class="icon">❌</div>
                <h2>Error cargando los avisos</h2>
                <p>${escaparHTML(errorAmigable(error))}</p>
                <button
                    type="button"
                    class="admin-button secondary"
                    id="reintentarPendientes"
                >
                    🔄 Reintentar
                </button>
            </div>
        `;

        document
            .getElementById("reintentarPendientes")
            ?.addEventListener("click", cargarPendientes);
    }
}

function crearTituloSeccion(
    icono,
    titulo,
    descripcion,
    cantidad
) {
    const elemento = document.createElement("div");

    elemento.className = "admin-section-title";

    elemento.innerHTML = `
        <div>
            <span class="admin-section-icon">
                ${icono}
            </span>
            <div>
                <h2>${escaparHTML(titulo)}</h2>
                <p>${escaparHTML(descripcion)}</p>
            </div>
        </div>
        <strong>${Number(cantidad)}</strong>
    `;

    return elemento;
}


/* =========================================================
   9. FOTO ORIGINAL PRIVADA EN EL PANEL
========================================================= */

async function obtenerFotoOriginal(ruta) {
    if (!ruta) {
        return {
            url: null,
            error: null
        };
    }

    const { data, error } = await supabaseClient.storage
        .from(BUCKET_ORIGINALES)
        .createSignedUrl(ruta, 600);

    if (error) {
        return {
            url: null,
            error: error.message
        };
    }

    return {
        url: data?.signedUrl || null,
        error: null
    };
}


/* =========================================================
   10. TARJETA DE CADA AVISO
========================================================= */

async function crearTarjeta(bandera) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "admin-card";

    const esOculta = bandera.estado === "oculta";

    const foto = await obtenerFotoOriginal(
        bandera.foto_url
    );

    let fotoHTML = `
        <div class="admin-photo-placeholder">
            📷 Este aviso no tiene fotografía original.
        </div>
    `;

    if (foto.url) {
        fotoHTML = `
            <div class="admin-photo-wrap">
                <a
                    href="${escaparHTML(foto.url)}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <img
                        class="admin-photo"
                        src="${escaparHTML(foto.url)}"
                        alt="Fotografía original privada"
                        loading="lazy"
                        style="
                            display:block;
                            width:100%;
                            max-width:100%;
                            max-height:320px;
                            object-fit:contain;
                        "
                    >
                </a>
                <p class="admin-photo-note">
                    Fotografía original privada.
                </p>
            </div>
        `;
    } else if (foto.error) {
        fotoHTML = `
            <div class="admin-photo-placeholder">
                ⚠️ No se pudo cargar la foto:
                ${escaparHTML(foto.error)}
            </div>
        `;
    }

    const estadoHTML = esOculta
        ? `<span class="admin-status hidden">🔴 OCULTA</span>`
        : `<span class="admin-status review">🟡 EN REVISIÓN</span>`;

    const botones = esOculta
        ? `
            <button
                type="button"
                class="admin-button secondary"
                data-action="revision"
            >
                🟡 Publicar en revisión
            </button>

            <button
                type="button"
                class="admin-button success"
                data-action="verificar"
            >
                🟢 Verificar directamente
            </button>

            <button
                type="button"
                class="admin-button danger"
                data-action="rechazar"
            >
                ❌ Rechazar
            </button>
        `
        : `
            <button
                type="button"
                class="admin-button success"
                data-action="verificar"
            >
                🟢 Verificar
            </button>

            <button
                type="button"
                class="admin-button danger"
                data-action="rechazar"
            >
                ❌ Rechazar
            </button>
        `;

    tarjeta.innerHTML = `
        ${fotoHTML}

        <div class="admin-info">
            <div class="admin-card-header">
                <h3>🇪🇸 Aviso #${Number(bandera.id)}</h3>
                ${estadoHTML}
            </div>

            <p>
                📍 <strong>Municipio:</strong>
                ${escaparHTML(bandera.municipio)}
            </p>

            <p>
                🗺️ <strong>Provincia:</strong>
                ${escaparHTML(bandera.provincia)}
            </p>

            <p>
                📅 <strong>Fecha de observación:</strong>
                ${formatearFecha(bandera.fecha_vista)}
            </p>

            <p>
                📝 <strong>Descripción:</strong><br>
                ${escaparHTML(
                    bandera.descripcion || "Sin descripción."
                )}
            </p>

            <p>
                📌 <strong>Coordenadas:</strong>
                ${escaparHTML(bandera.latitud)},
                ${escaparHTML(bandera.longitud)}
            </p>

            <div class="admin-location-buttons">
                <a
                    class="admin-location-link"
                    href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        bandera.latitud + "," + bandera.longitud
                    )}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    📍 Google Maps
                </a>

                <a
                    class="admin-location-link"
                    href="https://www.openstreetmap.org/?mlat=${encodeURIComponent(
                        bandera.latitud
                    )}&mlon=${encodeURIComponent(
                        bandera.longitud
                    )}#map=18/${encodeURIComponent(
                        bandera.latitud
                    )}/${encodeURIComponent(
                        bandera.longitud
                    )}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    🗺️ OpenStreetMap
                </a>
            </div>

            <p class="admin-created-at">
                Enviado:
                ${escaparHTML(
                    bandera.creado_en || "Fecha desconocida"
                )}
            </p>
        </div>

        <div class="admin-actions">
            ${botones}
        </div>
    `;

    tarjeta
        .querySelector('[data-action="revision"]')
        ?.addEventListener("click", () => {
            cambiarEstado(bandera.id, "revision");
        });

    tarjeta
        .querySelector('[data-action="verificar"]')
        ?.addEventListener("click", () => {
            cambiarEstado(bandera.id, "verificada");
        });

    tarjeta
        .querySelector('[data-action="rechazar"]')
        ?.addEventListener("click", () => {
            cambiarEstado(bandera.id, "rechazada");
        });

    return tarjeta;
}


/* =========================================================
   11. CREAR IMAGEN BORROSA O NÍTIDA
========================================================= */

async function pixelarImagen(blob, pixelSize = 10) {
  const imagen = await createImageBitmap(blob);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const ancho = imagen.width;
  const alto = imagen.height;

  canvas.width = ancho;
  canvas.height = alto;

  const pequeno = document.createElement("canvas");
  const ctxPequeno = pequeno.getContext("2d");

  pequeno.width = Math.max(1, Math.ceil(ancho / pixelSize));
  pequeno.height = Math.max(1, Math.ceil(alto / pixelSize));

  ctxPequeno.drawImage(imagen, 0, 0, pequeno.width, pequeno.height);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    pequeno,
    0, 0, pequeno.width, pequeno.height,
    0, 0, ancho, alto
  );

  imagen.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error("No se pudo pixelar la imagen")),
      "image/jpeg",
      0.9
    );
  });
}


/* =========================================================
   12. PUBLICAR LA VERSIÓN CORRECTA DE LA FOTO
========================================================= */

async function prepararFotoPublica(bandera, nuevoEstado) {
    if (!bandera.foto_url) {
        return null;
    }

    // Descargar siempre el original privado.
    const { data: original, error: descargaError } =
        await supabaseClient.storage
            .from(BUCKET_ORIGINALES)
            .download(bandera.foto_url);

    if (descargaError) {
        throw new Error(
            "No se pudo descargar la fotografía original: " +
            descargaError.message
        );
    }

    // Solo revisión usa la versión borrosa.
    const debeDifuminarse = nuevoEstado === "revision";

    const blobPublico = await procesarFotografia(
        original,
        debeDifuminarse
    );

    /*
     * Cada versión tiene una ruta diferente.
     * Así evitamos que el navegador muestre una foto antigua
     * debido a la caché cuando pasa de borrosa a nítida.
     */
    const identificador = crypto.randomUUID();

    const rutaPublica =
        `banderas/${bandera.id}-${identificador}.jpg`;

    const { error: subidaError } = await supabaseClient.storage
        .from(BUCKET_PUBLICO)
        .upload(rutaPublica, blobPublico, {
            contentType: "image/jpeg",
            cacheControl: "0",
            upsert: false
        });

    if (subidaError) {
        throw new Error(
            "No se pudo guardar la versión pública de la foto: " +
            subidaError.message
        );
    }

    return rutaPublica;
}


/* =========================================================
   13. CAMBIAR ESTADO SIN BORRAR EL REGISTRO
========================================================= */

async function cambiarEstado(id, nuevoEstado) {
    const mensajes = {
        revision: {
            pregunta:
                "¿Pasar este aviso a revisión? Aparecerá en el mapa con la foto borrosa.",
            exito:
                "Aviso publicado en revisión con la foto borrosa."
        },

        verificada: {
            pregunta:
                "¿Confirmar esta bandera? Se publicará su foto nítida.",
            exito:
                "Bandera verificada y fotografía nítida publicada."
        },

        rechazada: {
            pregunta:
                "¿Rechazar este aviso? Desaparecerá del mapa público, pero el registro se conservará.",
            exito:
                "Aviso rechazado. El registro se conserva."
        }
    };

    const mensaje = mensajes[nuevoEstado];

    if (!mensaje) return;

    if (!confirm(mensaje.pregunta)) return;

    let nuevaRutaPublica = null;
    let fotoNuevaSubida = false;

    try {
        /*
         * Leer el registro actual.
         */
        const { data: bandera, error: lecturaError } =
            await supabaseClient
                .from("banderas")
                .select(
                    "id, estado, foto_url, foto_publica_path"
                )
                .eq("id", id)
                .single();

        if (lecturaError) throw lecturaError;

        const rutaAnterior = bandera.foto_publica_path || null;

        /*
         * Crear primero una nueva imagen pública.
         * Si algo falla, el estado anterior se mantiene.
         */
        if (
            nuevoEstado === "revision" ||
            nuevoEstado === "verificada"
        ) {
            nuevaRutaPublica = await prepararFotoPublica(
                bandera,
                nuevoEstado
            );

            fotoNuevaSubida = Boolean(nuevaRutaPublica);
        }

        /*
         * Actualizar el registro.
         * En rechazo, el campo de la foto pública queda vacío.
         */
        const { data, error: actualizacionError } =
            await supabaseClient
                .from("banderas")
                .update({
                    estado: nuevoEstado,
                    foto_publica_path:
                        nuevoEstado === "rechazada"
                            ? null
                            : nuevaRutaPublica
                })
                .eq("id", id)
                .select("id, estado, foto_publica_path")
                .maybeSingle();

        if (actualizacionError) {
            throw actualizacionError;
        }

        if (!data) {
            throw new Error(
                "No se actualizó el registro. Comprueba las políticas RLS."
            );
        }

        /*
         * Una vez actualizado el registro, eliminar la versión
         * pública anterior si la ruta ha cambiado.
         */
        if (
            rutaAnterior &&
            rutaAnterior !== nuevaRutaPublica
        ) {
            const { error: eliminarAnteriorError } =
                await supabaseClient.storage
                    .from(BUCKET_PUBLICO)
                    .remove([rutaAnterior]);

            if (eliminarAnteriorError) {
                // El estado ya se actualizó. No fingimos que falló.
                console.warn(
                    "El estado cambió, pero no se pudo eliminar la foto pública anterior:",
                    eliminarAnteriorError
                );
            }
        }

        alert("✅ " + mensaje.exito);

        await cargarPendientes();

    } catch (error) {
        console.error(
            "Error cambiando el estado de la bandera #" + id,
            error
        );

        /*
         * Si se subió una imagen nueva pero no se pudo completar
         * el cambio, intentamos borrar ese archivo huérfano.
         */
        if (fotoNuevaSubida && nuevaRutaPublica) {
            const { error: limpiezaError } =
                await supabaseClient.storage
                    .from(BUCKET_PUBLICO)
                    .remove([nuevaRutaPublica]);

            if (limpiezaError) {
                console.warn(
                    "No se pudo limpiar la nueva imagen:",
                    limpiezaError
                );
            }
        }

        alert(
            "❌ No se pudo completar la operación.\n\n" +
            errorAmigable(error)
        );
    }
}
