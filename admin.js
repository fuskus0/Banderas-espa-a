const SUPABASE_URL =
    "https://yljxozttfnvyjrwrvcab.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_V73MAvXSKRKH6cZh_AfDxQ__0rXOxKE";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// ================================
// ELEMENTOS
// ================================

const loginForm = document.getElementById("loginForm");
const loginSection = document.getElementById("loginSection");
const adminPanel = document.getElementById("adminPanel");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const loginMessage = document.getElementById("loginMessage");

const pendingList = document.getElementById("pendingList");
const pendingCount = document.getElementById("pendingCount");

const logoutButton = document.getElementById("logoutButton");


// ================================
// COMPROBAR SESIÓN AL ABRIR
// ================================

comprobarSesion();

async function comprobarSesion() {

    const {
        data: { session }
    } = await supabaseClient.auth.getSession();

    if (session) {
        mostrarPanel();
    } else {
        mostrarLogin();
    }
}


// ================================
// LOGIN
// ================================

loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        mostrarLoginMensaje(
            "⚠️ Escribe tu correo y contraseña."
        );
        return;
    }

    mostrarLoginMensaje("⏳ Iniciando sesión...");

    const {
        data,
        error
    } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {

        console.error("Error de login:", error);

        mostrarLoginMensaje(
            "❌ " + error.message
        );

        return;
    }

    console.log("Sesión iniciada:", data);

    mostrarLoginMensaje("");

    mostrarPanel();
});


// ================================
// MOSTRAR LOGIN
// ================================

function mostrarLogin() {

    loginSection.style.display = "block";
    adminPanel.style.display = "none";
}


// ================================
// MOSTRAR PANEL
// ================================

async function mostrarPanel() {

    loginSection.style.display = "none";
    adminPanel.style.display = "block";

    await cargarPendientes();
}


// ================================
// CARGAR BANDERAS PENDIENTES
// ================================

async function cargarPendientes() {

    pendingList.innerHTML =
        '<p class="loading">⏳ Cargando banderas...</p>';

    const {
        data,
        error
    } = await supabaseClient
        .from("banderas")
        .select("*")
        .eq("estado", "revision")
        .order("creado_en", {
            ascending: false
        });

    if (error) {

        console.error(
            "Error cargando banderas:",
            error
        );

        pendingList.innerHTML =
            `<p class="error">
                ❌ No se pudieron cargar las banderas.<br>
                ${escaparHTML(error.message)}
            </p>`;

        pendingCount.textContent = "0";

        return;
    }

    pendingCount.textContent = data.length;

    if (data.length === 0) {

        pendingList.innerHTML =
            `<p class="empty">
                🎉 No hay banderas pendientes de revisión.
            </p>`;

        return;
    }

    pendingList.innerHTML = "";

    data.forEach(bandera => {

        const tarjeta =
            document.createElement("article");

        tarjeta.className = "pending-card";

        tarjeta.innerHTML = `
            <div class="pending-card-header">
                <h3>
                    🇪🇸 Bandera #${bandera.id}
                </h3>

                <span class="status-review">
                    🟡 EN REVISIÓN
                </span>
            </div>

            <div class="pending-info">

                <p>
                    📍 <strong>Municipio:</strong>
                    ${escaparHTML(bandera.municipio)}
                </p>

                <p>
                    🗺️ <strong>Provincia:</strong>
                    ${escaparHTML(bandera.provincia)}
                </p>

                <p>
                    📅 <strong>Vista:</strong>
                    ${formatearFecha(bandera.fecha_vista)}
                </p>

                <p>
                    📝 <strong>Descripción:</strong><br>
                    ${escaparHTML(
                        bandera.descripcion ||
                        "Sin descripción."
                    )}
                </p>

            </div>

            <div class="pending-actions">

                <button
                    class="location-button"
                    onclick="verUbicacion(
                        ${bandera.latitud},
                        ${bandera.longitud}
                    )"
                >
                    🧭 Ver ubicación
                </button>

                <button
                    class="verify-button"
                    onclick="verificarBandera(${bandera.id})"
                >
                    🟢 Verificar
                </button>

                <button
                    class="reject-button"
                    onclick="rechazarBandera(${bandera.id})"
                >
                    ❌ Rechazar
                </button>

            </div>
        `;

        pendingList.appendChild(tarjeta);
    });
}


// ================================
// VER UBICACIÓN
// ================================

function verUbicacion(latitud, longitud) {

    const url =
        `https://www.openstreetmap.org/?mlat=${latitud}&mlon=${longitud}#map=18/${latitud}/${longitud}`;

    window.open(
        url,
        "_blank",
        "noopener,noreferrer"
    );
}


// ================================
// VERIFICAR
// ================================

async function verificarBandera(id) {

    const confirmar = confirm(
        "¿Quieres verificar esta bandera?"
    );

    if (!confirmar) {
        return;
    }

    const {
        error
    } = await supabaseClient
        .from("banderas")
        .update({
            estado: "verificada"
        })
        .eq("id", id);

    if (error) {

        console.error(
            "Error verificando bandera:",
            error
        );

        alert(
            "❌ No se pudo verificar la bandera.\n\n" +
            error.message
        );

        return;
    }

    alert(
        "🟢 Bandera verificada correctamente."
    );

    await cargarPendientes();
}


// ================================
// RECHAZAR
// ================================

async function rechazarBandera(id) {

    const confirmar = confirm(
        "¿Seguro que quieres rechazar esta bandera?\n\n" +
        "Se eliminará del registro."
    );

    if (!confirmar) {
        return;
    }

    const {
        error
    } = await supabaseClient
        .from("banderas")
        .delete()
        .eq("id", id);

    if (error) {

        console.error(
            "Error rechazando bandera:",
            error
        );

        alert(
            "❌ No se pudo rechazar la bandera.\n\n" +
            error.message
        );

        return;
    }

    alert(
        "❌ Bandera rechazada."
    );

    await cargarPendientes();
}


// ================================
// CERRAR SESIÓN
// ================================

logoutButton.addEventListener(
    "click",
    async function () {

        await supabaseClient.auth.signOut();

        mostrarLogin();

        emailInput.value = "";
        passwordInput.value = "";

        mostrarLoginMensaje(
            "Has cerrado sesión."
        );
    }
);


// ================================
// MENSAJE DE LOGIN
// ================================

function mostrarLoginMensaje(mensaje) {

    if (!loginMessage) {
        return;
    }

    loginMessage.textContent = mensaje;
}


// ================================
// ESCAPAR HTML
// ================================

function escaparHTML(texto) {

    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ================================
// FECHA
// ================================

function formatearFecha(fecha) {

    if (!fecha) {
        return "Sin fecha";
    }

    const partes = fecha.split("-");

    if (partes.length !== 3) {
        return fecha;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}


// ================================
// DETECTAR CAMBIOS DE SESIÓN
// ================================

supabaseClient.auth.onAuthStateChange(
    function (event, session) {

        console.log(
            "Cambio de sesión:",
            event
        );

        if (session) {
            mostrarPanel();
        } else {
            mostrarLogin();
        }
    }
);
