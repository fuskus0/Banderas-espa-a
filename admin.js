const SUPABASE_URL =
    "https://yljxozttfnvyjrwrvcab.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_V73MAvXSKRKH6cZh_AfDxQ__0rOxKE";

const supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


// ======================================================
// ELEMENTOS
// ======================================================

const loginSection =
    document.getElementById("loginSection");

const adminSection =
    document.getElementById("adminSection");

const loginForm =
    document.getElementById("loginForm");

const loginMessage =
    document.getElementById("loginMessage");

const adminMessage =
    document.getElementById("adminMessage");

const flagsContainer =
    document.getElementById("flagsContainer");


// ======================================================
// COMPROBAR SESIÓN
// ======================================================

async function comprobarSesion() {

    const {
        data: {
            session
        }
    } =
        await supabaseClient
            .auth
            .getSession();


    if (session) {

        await comprobarAdmin(
            session.user
        );

    } else {

        mostrarLogin();
    }
}


comprobarSesion();


// ======================================================
// LOGIN
// ======================================================

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const email =
                document.getElementById(
                    "email"
                ).value.trim();


            const password =
                document.getElementById(
                    "password"
                ).value;


            loginMessage.textContent =
                "Iniciando sesión...";


            const {
                data,
                error
            } =
                await supabaseClient
                    .auth
                    .signInWithPassword({
                        email,
                        password
                    });


            if (error) {

                console.error(
                    "Error de login:",
                    error
                );

                loginMessage.textContent =
                    "❌ " + error.message;

                return;
            }


            await comprobarAdmin(
                data.user
            );
        }
    );
}


// ======================================================
// COMPROBAR SI ES ADMIN
// ======================================================

async function comprobarAdmin(user) {

    if (!user) {

        mostrarLogin();

        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("admin_users")
            .select("user_id")
            .eq("user_id", user.id)
            .maybeSingle();


    if (error) {

        console.error(
            "Error comprobando administrador:",
            error
        );

        mostrarLogin();

        if (loginMessage) {

            loginMessage.textContent =
                "❌ No se ha podido comprobar el administrador.";
        }

        return;
    }


    if (!data) {

        await supabaseClient.auth.signOut();

        mostrarLogin();

        if (loginMessage) {

            loginMessage.textContent =
                "❌ Esta cuenta no tiene permisos de administrador.";
        }

        return;
    }


    mostrarAdmin();

    cargarBanderas();
}


// ======================================================
// MOSTRAR LOGIN
// ======================================================

function mostrarLogin() {

    if (loginSection) {

        loginSection.style.display =
            "block";
    }


    if (adminSection) {

        adminSection.style.display =
            "none";
    }
}


// ======================================================
// MOSTRAR PANEL
// ======================================================

function mostrarAdmin() {

    if (loginSection) {

        loginSection.style.display =
            "none";
    }


    if (adminSection) {

        adminSection.style.display =
            "block";
    }
}


// ======================================================
// CARGAR TODAS LAS BANDERAS
// ======================================================

async function cargarBanderas() {

    if (!flagsContainer) {
        return;
    }


    flagsContainer.innerHTML =
        "<p>⏳ Cargando banderas...</p>";


    const {
        data,
        error
    } =
        await supabaseClient
            .from("banderas")
            .select("*")
            .order(
                "creado_en",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Error cargando banderas:",
            error
        );


        flagsContainer.innerHTML =
            `
            <div class="admin-error">
                ❌ No se pudieron cargar las banderas.
                <br>
                ${escapeHtml(error.message)}
            </div>
            `;

        return;
    }


    if (!data || data.length === 0) {

        flagsContainer.innerHTML =
            `
            <div class="empty-admin">
                🇪🇸 Todavía no hay banderas registradas.
            </div>
            `;

        return;
    }


    flagsContainer.innerHTML = "";


    data.forEach(bandera => {

        const card =
            crearTarjetaBandera(
                bandera
            );

        flagsContainer.appendChild(
            card
        );
    });
}


// ======================================================
// CREAR TARJETA
// ======================================================

function crearTarjetaBandera(bandera) {

    const card =
        document.createElement("article");

    card.className =
        "admin-flag-card";


    const estado =
        bandera.estado ||
        "oculto";


    let estadoTexto =
        "🔴 OCULTO";


    if (estado === "no_confirmada") {

        estadoTexto =
            "🟡 NO CONFIRMADA";

    }


    if (estado === "verificada") {

        estadoTexto =
            "🟢 VERIFICADA";
    }


    card.innerHTML = `

        <div class="admin-flag-header">

            <div>

                <h3>
                    🇪🇸 Bandera #${Number(bandera.id)}
                </h3>

                <span class="admin-status status-${escapeAttribute(estado)}">
                    ${estadoTexto}
                </span>

            </div>

        </div>


        <div class="admin-flag-body">

            ${
                bandera.foto_url
                ?
                `
                <div class="admin-photo-container">

                    <img
                        src="${escapeAttribute(bandera.foto_url)}"
                        class="admin-flag-photo"
                        alt="Foto de la bandera #${Number(bandera.id)}"
                        loading="lazy"
                    >

                </div>
                `
                :
                `
                <div class="no-photo">
                    📷 No hay fotografía
                </div>
                `
            }


            <div class="admin-flag-info">

                <p>
                    <strong>📍 Municipio:</strong>
                    ${escapeHtml(bandera.municipio)}
                </p>

                <p>
                    <strong>🗺️ Provincia:</strong>
                    ${escapeHtml(bandera.provincia)}
                </p>

                <p>
                    <strong>📅 Fecha:</strong>
                    ${escapeHtml(bandera.fecha_vista)}
                </p>

                <p>
                    <strong>📍 Coordenadas:</strong>
                    ${Number(bandera.latitud).toFixed(6)},
                    ${Number(bandera.longitud).toFixed(6)}
                </p>

                ${
                    bandera.descripcion
                    ?
                    `
                    <p>
                        <strong>💬 Comentario:</strong>
                        ${escapeHtml(bandera.descripcion)}
                    </p>
                    `
                    :
                    ""
                }

                <p>
                    <strong>🕐 Registrada:</strong>
                    ${formatearFecha(
                        bandera.creado_en
                    )}
                </p>

            </div>

        </div>


        <div class="admin-actions">

            <button
                class="admin-button hidden-button"
                onclick="cambiarEstado(
                    ${Number(bandera.id)},
                    'oculto'
                )"
            >
                🔴 Oculto
            </button>


            <button
                class="admin-button pending-button"
                onclick="cambiarEstado(
                    ${Number(bandera.id)},
                    'no_confirmada'
                )"
            >
                🟡 No confirmada
            </button>


            <button
                class="admin-button verified-button"
                onclick="cambiarEstado(
                    ${Number(bandera.id)},
                    'verificada'
                )"
            >
                🟢 Verificar
            </button>


            <button
                class="admin-button delete-button"
                onclick="eliminarBandera(
                    ${Number(bandera.id)}
                )"
            >
                🗑️ Eliminar
            </button>

        </div>

    `;


    return card;
}


// ======================================================
// CAMBIAR ESTADO
// ======================================================

async function cambiarEstado(
    id,
    nuevoEstado
) {

    const nombres = {

        oculto:
            "oculto",

        no_confirmada:
            "no confirmada",

        verificada:
            "verificada"
    };


    const confirmado =
        confirm(
            `¿Quieres marcar la bandera #${id} como ${nombres[nuevoEstado]}?`
        );


    if (!confirmado) {
        return;
    }


    adminMessage.textContent =
        "⏳ Guardando cambios...";


    const {
        error
    } =
        await supabaseClient
            .from("banderas")
            .update({
                estado: nuevoEstado
            })
            .eq("id", id);


    if (error) {

        console.error(
            "Error cambiando estado:",
            error
        );


        adminMessage.textContent =
            "❌ " + error.message;

        return;
    }


    adminMessage.textContent =
        `✅ Bandera #${id} actualizada.`;


    await cargarBanderas();
}


// ======================================================
// ELIMINAR BANDERA
// ======================================================

async function eliminarBandera(id) {

    const confirmado =
        confirm(
            `¿Seguro que quieres eliminar la bandera #${id}? Esta acción no se puede deshacer.`
        );


    if (!confirmado) {
        return;
    }


    adminMessage.textContent =
        "⏳ Eliminando bandera...";


    const {
        error
    } =
        await supabaseClient
            .from("banderas")
            .delete()
            .eq("id", id);


    if (error) {

        console.error(
            "Error eliminando bandera:",
            error
        );


        adminMessage.textContent =
            "❌ " + error.message;

        return;
    }


    adminMessage.textContent =
        `🗑️ Bandera #${id} eliminada.`;


    await cargarBanderas();
}


// ======================================================
// FORMATEAR FECHA
// ======================================================

function formatearFecha(fecha) {

    if (!fecha) {
        return "—";
    }


    const date =
        new Date(fecha);


    if (Number.isNaN(
        date.getTime()
    )) {

        return fecha;
    }


    return date.toLocaleString(
        "es-ES",
        {
            dateStyle: "short",
            timeStyle: "short"
        }
    );
}


// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHtml(text) {

    const div =
        document.createElement("div");

    div.textContent =
        text ?? "";

    return div.innerHTML;
}


function escapeAttribute(text) {

    return String(text ?? "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}


// ======================================================
// CERRAR SESIÓN
// ======================================================

async function cerrarSesion() {

    await supabaseClient
        .auth
        .signOut();

    window.location.reload();
}


// ======================================================
// CAMBIOS DE SESIÓN
// ======================================================

supabaseClient.auth.onAuthStateChange(
    async (event, session) => {

        if (event === "SIGNED_OUT") {

            mostrarLogin();

            return;
        }


        if (
            event === "SIGNED_IN" &&
            session
        ) {

            await comprobarAdmin(
                session.user
            );
        }
    }
);
