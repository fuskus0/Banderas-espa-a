const SUPABASE_URL =
    "https://yljxozttfnvyjrwrvcab.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_V73MAvXSKRKH6cZh_AfDxQ__0rXOxKE";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// ========================================
// ELEMENTOS
// ========================================

const loginSection = document.getElementById("loginSection");
const adminPanel = document.getElementById("adminPanel");

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const loginMessage = document.getElementById("loginMessage");

const pendingList = document.getElementById("pendingList");
const pendingCount = document.getElementById("pendingCount");

const logoutButton = document.getElementById("logoutButton");


// ========================================
// AL CARGAR
// ========================================

mostrarLogin();


// ========================================
// LOGIN
// ========================================

loginForm.addEventListener("submit", async function (e) {

    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        loginMessage.textContent =
            "⚠️ Escribe el correo y la contraseña.";
        return;
    }

    loginMessage.textContent =
        "⏳ Iniciando sesión...";

    const { data, error } =
        await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

    if (error) {

        console.error(error);

        loginMessage.textContent =
            "❌ " + error.message;

        return;
    }

    console.log("Login correcto:", data.user);

    loginMessage.textContent =
        "⏳ Comprobando administrador...";

    await comprobarAdministrador();
});


// ========================================
// COMPROBAR ADMINISTRADOR
// ========================================

async function comprobarAdministrador() {

    const {
        data: { user },
        error: userError
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {

        console.error(
            "No se pudo obtener el usuario:",
            userError
        );

        loginMessage.textContent =
            "❌ No se pudo obtener la sesión.";

        return;
    }

    console.log(
        "Usuario conectado:",
        user.email
    );


    // ----------------------------------------
    // Comprobar directamente admin_users
    // ----------------------------------------

    const {
        data,
        error
    } = await supabaseClient
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();


    if (error) {

        console.error(
            "Error comprobando administrador:",
            error
        );

        loginMessage.textContent =
            "❌ No se ha podido comprobar el administrador.";

        return;
    }


    if (!data) {

        console.warn(
            "El usuario no está en admin_users:",
            user.email
        );

        loginMessage.textContent =
            "❌ Este usuario no es administrador.";

        await supabaseClient.auth.signOut();

        return;
    }


    // ----------------------------------------
    // ADMIN CONFIRMADO
    // ----------------------------------------

    console.log(
        "Administrador confirmado:",
        user.email
    );

    mostrarPanel();

    await cargarPendientes();
}


// ========================================
// MOSTRAR LOGIN
// ========================================

function mostrarLogin() {

    loginSection.style.display = "block";
    adminPanel.style.display = "none";
}


// ========================================
// MOSTRAR PANEL
// ========================================

function mostrarPanel() {

    loginSection.style.display = "none";
    adminPanel.style.display = "block";
}


// ========================================
// CARGAR PENDIENTES
// ========================================

async function cargarPendientes() {

    pendingList.innerHTML =
        "<p>⏳ Cargando banderas...</p>";

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
            `<p>❌ Error cargando banderas:<br>
            ${escaparHTML(error.message)}
            </p>`;

        pendingCount.textContent = "0";

        return;
    }


    pendingCount.textContent = data.length;


    if (data.length === 0) {

        pendingList.innerHTML =
            "<p>🎉 No hay banderas pendientes.</p>";

        return;
    }


    pendingList.innerHTML = "";


    data.forEach(bandera => {

        const tarjeta =
            document.createElement("article");

        tarjeta.className =
            "pending-card";

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
                    )">
                    🧭 Ver ubicación
                </button>


                <button
                    class="verify-button"
                    onclick="verificarBandera(${bandera.id})">
                    🟢 Verificar
                </button>


                <button
                    class="reject-button"
                    onclick="rechazarBandera(${bandera.id})">
                    ❌ Rechazar
                </button>

            </div>
        `;


        pendingList.appendChild(tarjeta);
    });
}


// ========================================
// VER UBICACIÓN
// ========================================

function verUbicacion(lat, lon) {

    const url =
        `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}`;

    window.open(
        url,
        "_blank",
        "noopener,noreferrer"
    );
}


// ========================================
// VERIFICAR
// ========================================

async function verificarBandera(id) {

    if (!confirm(
        "¿Quieres verificar esta bandera?"
    )) {
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

        console.error(error);

        alert(
            "❌ No se pudo verificar:\n\n" +
            error.message
        );

        return;
    }


    alert(
        "🟢 Bandera verificada correctamente."
    );

    await cargarPendientes();
}


// ========================================
// RECHAZAR
// ========================================

async function rechazarBandera(id) {

    if (!confirm(
        "¿Seguro que quieres rechazar esta bandera?\n\n" +
        "Se eliminará del registro."
    )) {
        return;
    }


    const {
        error
    } = await supabaseClient
        .from("banderas")
        .delete()
        .eq("id", id);


    if (error) {

        console.error(error);

        alert(
            "❌ No se pudo rechazar:\n\n" +
            error.message
        );

        return;
    }


    alert(
        "❌ Bandera rechazada."
    );

    await cargarPendientes();
}


// ========================================
// CERRAR SESIÓN
// ========================================

logoutButton.addEventListener(
    "click",
    async function () {

        await supabaseClient.auth.signOut();

        mostrarLogin();

        emailInput.value = "";
        passwordInput.value = "";

        loginMessage.textContent = "";
    }
);


// ========================================
// UTILIDADES
// ========================================

function escaparHTML(texto) {

    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


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
