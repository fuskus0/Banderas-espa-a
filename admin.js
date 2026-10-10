
const SUPABASE_URL = "https://yljxozttfnvyjrwrvcab.supabase.co";
const SUPABASE_KEY = "sb_publishable_V73MAvXSKRKH6cZh_AfDxQ__0rXOxKE";

const BUCKET_ORIGINAL = "banderas-fotos";
const DURACION_URL_FOTO = 600;

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

let comprobacionEnCurso = false;
let usuarioAdministrador = false;

const elementos = {};

document.addEventListener("DOMContentLoaded", iniciarAdmin);

function iniciarAdmin() {
    elementos.loginSection = document.getElementById("loginSection");
    elementos.adminPanel = document.getElementById("adminPanel");
    elementos.loginForm = document.getElementById("loginForm");
    elementos.email = document.getElementById("email");
    elementos.password = document.getElementById("password");
    elementos.loginMessage = document.getElementById("loginMessage");
    elementos.logoutButton = document.getElementById("logoutButton");
    elementos.pendingList = document.getElementById("pendingList");
    elementos.pendingCount = document.getElementById("pendingCount");

    if (elementos.loginForm) {
        elementos.loginForm.addEventListener("submit", iniciarSesion);
    }

    if (elementos.logoutButton) {
        elementos.logoutButton.addEventListener("click", cerrarSesion);
    }

    supabaseClient.auth.onAuthStateChange((evento, sesion) => {
        if (evento === "SIGNED_OUT") {
            usuarioAdministrador = false;
            mostrarLogin();
        }
    });

    comprobarAdministrador();
}

async function iniciarSesion(evento) {
    evento.preventDefault();

    const email = elementos.email?.value.trim();
    const password = elementos.password?.value;

    if (!email || !password) {
        mostrarMensaje("Introduce tu correo y contraseña.");
        return;
    }

    mostrarMensaje("Iniciando sesión...");

    try {
        const { error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            throw error;
        }

        const esAdministrador = await comprobarAdministrador();

        if (esAdministrador) {
            mostrarMensaje("");
        }
    } catch (error) {
        console.error("Error al iniciar sesión:", error);
        mostrarMensaje("No se ha podido iniciar sesión. Comprueba tus datos.");
    }
}

async function comprobarAdministrador() {
    if (comprobacionEnCurso) return false;

    comprobacionEnCurso = true;

    try {
        const { data: sesionData, error: sesionError } =
            await supabaseClient.auth.getSession();

        if (sesionError) throw sesionError;

        const sesion = sesionData?.session;

        if (!sesion) {
            usuarioAdministrador = false;
            mostrarLogin();
            return false;
        }

        const { data, error } = await supabaseClient.rpc("es_admin");

        if (error) {
            console.error("Error comprobando administrador:", error);
            mostrarMensaje(
                "No se ha podido comprobar el administrador. Revisa la función es_admin() y sus permisos."
            );
            mostrarLogin();
            return false;
        }

        const autorizado = data === true;

        if (!autorizado) {
            usuarioAdministrador = false;
            mostrarMensaje("Esta cuenta no tiene permisos de administrador.");
            mostrarLogin();
            await supabaseClient.auth.signOut();
            return false;
        }

        usuarioAdministrador = true;
        mostrarPanel();
        await cargarPendientes();

        return true;
    } catch (error) {
        console.error("Error comprobando la sesión:", error);
        mostrarMensaje("Ha ocurrido un error al comprobar la sesión.");
        mostrarLogin();
        return false;
    } finally {
        comprobacionEnCurso = false;
    }
}

function mostrarLogin() {
    if (elementos.loginSection) {
        elementos.loginSection.style.display = "";
    }

    if (elementos.adminPanel) {
        elementos.adminPanel.style.display = "none";
    }
}

function mostrarPanel() {
    if (elementos.loginSection) {
        elementos.loginSection.style.display = "none";
    }

    if (elementos.adminPanel) {
        elementos.adminPanel.style.display = "";
    }
}

function mostrarMensaje(mensaje) {
    if (elementos.loginMessage) {
        elementos.loginMessage.textContent = mensaje;
    }
}

async function cerrarSesion() {
    try {
        const { error } = await supabaseClient.auth.signOut();

        if (error) throw error;

        usuarioAdministrador = false;
        mostrarLogin();
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        alert("No se ha podido cerrar la sesión.");
    }
}

async function cargarPendientes() {
    if (!usuarioAdministrador || !elementos.pendingList) return;

    elementos.pendingList.innerHTML = "<p>Cargando banderas...</p>";

    try {
        const { data, error } = await supabaseClient
            .from("banderas")
            .select("*")
            .in("estado", ["oculta", "revision"])
            .order("creado_en", { ascending: false });

        if (error) throw error;

        if (elementos.pendingCount) {
            elementos.pendingCount.textContent = String(data.length);
        }

        if (!data.length) {
            elementos.pendingList.innerHTML =
                "<p>No hay banderas pendientes de revisar.</p>";
            return;
        }

        elementos.pendingList.innerHTML = "";

        for (const bandera of data) {
            const tarjeta = await crearTarjeta(bandera);
            elementos.pendingList.appendChild(tarjeta);
        }
    } catch (error) {
        console.error("Error cargando banderas:", error);

        elementos.pendingList.innerHTML =
            "<p>No se han podido cargar las banderas. Revisa los permisos RLS y la tabla banderas.</p>";
    }
}

async function crearTarjeta(bandera) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "bandera-card";

    const estado = escaparHTML(bandera.estado || "Sin estado");
    const municipio = escaparHTML(bandera.municipio || "No indicado");
    const provincia = escaparHTML(bandera.provincia || "No indicada");
    const descripcion = escaparHTML(bandera.descripcion || "Sin descripción");
    const fecha = escaparHTML(formatearFecha(bandera.creado_en));
    const fechaVista = escaparHTML(formatearFecha(bandera.fecha_vista));
    const id = escaparHTML(bandera.id);

    const latitud = Number(bandera.latitud);
    const longitud = Number(bandera.longitud);

    const coordenadasValidas =
        Number.isFinite(latitud) &&
        Number.isFinite(longitud) &&
        Math.abs(latitud) <= 90 &&
        Math.abs(longitud) <= 180;

    const mapa = coordenadasValidas
        ? `<a href="https://www.google.com/maps?q=${latitud},${longitud}"
              target="_blank" rel="noopener noreferrer">Ver ubicación en Google Maps</a>`
        : "<p>Ubicación no disponible.</p>";

    tarjeta.innerHTML = `
        <div class="bandera-card-content">
            <h3>Bandera #${id}</h3>

            <p><strong>Estado:</strong> ${estado}</p>
            <p><strong>Municipio:</strong> ${municipio}</p>
            <p><strong>Provincia:</strong> ${provincia}</p>
            <p><strong>Descripción:</strong> ${descripcion}</p>
            <p><strong>Fecha de avistamiento:</strong> ${fechaVista}</p>
            <p><strong>Enviada el:</strong> ${fecha}</p>

            <div class="foto-original">
                <p><strong>Foto original:</strong></p>
                <p class="foto-mensaje">Cargando fotografía...</p>
            </div>

            <p>${mapa}</p>

            <div class="acciones-admin">
                <button type="button" data-accion="revision">
                    Pasar a revisión
                </button>

                <button type="button" data-accion="verificar">
                    Verificar
                </button>

                <button type="button" data-accion="rechazar">
                    Ocultar / rechazar
                </button>
            </div>
        </div>
    `;

    const fotoContenedor = tarjeta.querySelector(".foto-original");
    const fotoMensaje = tarjeta.querySelector(".foto-mensaje");

    const urlFoto = await obtenerFotoOriginal(bandera.foto_url);

    if (urlFoto) {
        const imagen = document.createElement("img");
        imagen.src = urlFoto;
        imagen.alt = `Fotografía original de la bandera ${bandera.id}`;
        imagen.loading = "lazy";
        imagen.style.maxWidth = "100%";
        imagen.style.height = "auto";
        imagen.style.borderRadius = "8px";

        imagen.onerror = () => {
            imagen.remove();
            fotoMensaje.textContent =
                "No se ha podido mostrar la foto original.";
        };

        fotoMensaje.remove();
        fotoContenedor.appendChild(imagen);
    } else {
        fotoMensaje.textContent =
            "No hay una foto original disponible o no tienes permiso para verla.";
    }

    tarjeta.querySelectorAll("[data-accion]").forEach((boton) => {
        boton.addEventListener("click", async () => {
            const accion = boton.dataset.accion;

            if (accion === "revision") {
                await pasarARevision(bandera.id);
            } else if (accion === "verificar") {
                await verificarBandera(bandera.id);
            } else if (accion === "rechazar") {
                await rechazarBandera(bandera.id);
            }
        });
    });

    return tarjeta;
}


function normalizarRutaFoto(valor) {
    if (!valor || typeof valor !== "string") return null;

    let ruta = valor.trim();

    try {
        if (/^https?:\/\//i.test(ruta)) {
            const url = new URL(ruta);

            if (url.origin !== new URL(SUPABASE_URL).origin) {
                return null;
            }

            const prefijosValidos = [
                "/storage/v1/object/sign/",
                "/storage/v1/object/public/",
                "/storage/v1/object/"
            ];

            const prefijo = prefijosValidos.find((p) =>
                url.pathname.startsWith(p)
            );

            if (!prefijo) return null;

            ruta = url.pathname.slice(prefijo.length);

            if (ruta.startsWith(`${BUCKET_ORIGINAL}/`)) {
                ruta = ruta.slice(BUCKET_ORIGINAL.length + 1);
            } else {
                return null;
            }
        } else if (ruta.startsWith(`${BUCKET_ORIGINAL}/`)) {
            ruta = ruta.slice(BUCKET_ORIGINAL.length + 1);
        }

        const segmentos = ruta
            .split("/")
            .map((segmento) => decodeURIComponent(segmento));

        if (
            !segmentos.length ||
            segmentos.some((segmento) =>
                !segmento || segmento === "." || segmento === ".."
            )
        ) {
            return null;
        }

        return segmentos.join("/");
    } catch (error) {
        console.error("Ruta de fotografía no válida:", error);
        return null;
    }
}

    const ruta = normalizarRutaFoto(fotoUrl);
    if (!ruta) return null;

    try {
        const { data, error } = await supabaseClient
            .storage
            .from(BUCKET_ORIGINAL)
            .createSignedUrl(ruta, DURACION_URL_FOTO);

        if (error) {
            console.error("Error obteniendo foto original:", error);
            return null;
        }

        return data?.signedUrl || null;
    } catch (error) {
        console.error("Error generando URL de la foto:", error);
        return null;
    }
}

async function actualizarEstado(id, nuevoEstado, mensaje) {
    if (!usuarioAdministrador) {
        alert("No tienes permisos de administrador.");
        return;
    }

    try {
        const { error } = await supabaseClient
            .from("banderas")
            .update({ estado: nuevoEstado })
            .eq("id", id);

        if (error) throw error;

        alert(mensaje);
        await cargarPendientes();
    } catch (error) {
        console.error("Error actualizando bandera:", error);
        alert(
            "No se ha podido actualizar la bandera. Comprueba las políticas RLS."
        );
    }
}

async function pasarARevision(id) {
    await actualizarEstado(
        id,
        "revision",
        "La bandera se ha pasado a revisión."
    );
}

async function verificarBandera(id) {
    const confirmar = confirm(
        "¿Confirmas que esta bandera cumple los requisitos y debe publicarse en el mapa?"
    );

    if (!confirmar) return;

    await actualizarEstado(
        id,
        "verificado",
        "La bandera se ha verificado."
    );
}

async function rechazarBandera(id) {
    const confirmar = confirm(
        "¿Quieres ocultar esta bandera? No aparecerá en el mapa público."
    );

    if (!confirmar) return;

    await actualizarEstado(
        id,
        "oculta",
        "La bandera se ha ocultado."
    );
}

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, (caracter) => {
        const equivalencias = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return equivalencias[caracter];
    });
}

function formatearFecha(fecha) {
    if (!fecha) return "No indicada";

    const fechaObj = new Date(fecha);

    if (Number.isNaN(fechaObj.getTime())) {
        return "Fecha no válida";
    }

    return fechaObj.toLocaleString("es-ES", {
        dateStyle: "short",
        timeStyle: "short"
    });
}
