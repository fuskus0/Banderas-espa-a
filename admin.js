// ====================================
// SUPABASE
// ====================================

const SUPABASE_URL =
    "https://yljxozttfnvyjrwrvcab.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_V73MAvXSKRKH6cZh_AfDxQ__0rXOxKE";

const supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


// ====================================
// ELEMENTOS
// ====================================

const loginSection =
    document.getElementById("loginSection");

const adminPanel =
    document.getElementById("adminPanel");

const loginForm =
    document.getElementById("loginForm");

const loginMessage =
    document.getElementById("loginMessage");

const welcomeMessage =
    document.getElementById("welcomeMessage");

const logoutButton =
    document.getElementById("logoutButton");

const pendingFlags =
    document.getElementById("pendingFlags");

const pendingCount =
    document.getElementById("pendingCount");


// ====================================
// COMPROBAR SESIÓN
// ====================================

async function comprobarSesion() {

    const {
        data: {
            session
        }
    } = await supabaseClient
        .auth
        .getSession();


    if (session) {

        mostrarPanel(
            session.user
        );

    } else {

        mostrarLogin();

    }

}


// ====================================
// MOSTRAR LOGIN
// ====================================

function mostrarLogin() {

    loginSection.style.display =
        "block";

    adminPanel.style.display =
        "none";

}


// ====================================
// MOSTRAR PANEL
// ====================================

function mostrarPanel(usuario) {

    loginSection.style.display =
        "none";

    adminPanel.style.display =
        "block";

    welcomeMessage.textContent =
        "Sesión iniciada como: " +
        usuario.email;

    cargarPendientes();

}


// ====================================
// CARGAR BANDERAS EN REVISIÓN
// ====================================

async function cargarPendientes() {

    pendingFlags.innerHTML =
        "<p>Cargando banderas...</p>";


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

        console.error(error);

        pendingFlags.innerHTML =
            "<p>❌ No se pudieron cargar las banderas.</p>";

        return;

    }


    pendingCount.textContent =
        data.length;


    if (data.length === 0) {

        pendingFlags.innerHTML = `
            <div class="empty-pending">
                <div>🎉</div>
                <h3>No hay banderas pendientes</h3>
                <p>
                    Todas las banderas han sido revisadas.
                </p>
            </div>
        `;

        return;

    }


    pendingFlags.innerHTML = "";


    data.forEach(
        bandera => {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "pending-card";


            card.innerHTML = `

                <div class="pending-card-header">

                    <h3>
                        🇪🇸 Bandera #${bandera.id}
                    </h3>

                    <span class="review-badge">
                        🟡 EN REVISIÓN
                    </span>

                </div>


                <div class="pending-info">

                    <p>
                        📍
                        <strong>
                            ${bandera.municipio}
                        </strong>,
                        ${bandera.provincia}
                    </p>

                    <p>
                        📅 Vista:
                        ${bandera.fecha_vista}
                    </p>

                    <p>
                        🗺️ Coordenadas:
                        ${bandera.latitud},
                        ${bandera.longitud}
                    </p>

                    <p>
                        📝
                        ${
                            bandera.descripcion ||
                            "Sin descripción."
                        }
                    </p>

                </div>


                <div class="pending-actions">

                    <button
                        class="view-map-button"
                        onclick="
                            verEnMapa(
                                ${bandera.latitud},
                                ${bandera.longitud}
                            )
                        "
                    >
                        🗺️ Ver ubicación
                    </button>

                </div>

            `;


            pendingFlags.appendChild(
                card
            );

        }
    );

}


// ====================================
// VER UBICACIÓN
// ====================================

function verEnMapa(lat, lng) {

    const url =
        `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    window.open(
        url,
        "_blank"
    );

}


// ====================================
// LOGIN
// ====================================

loginForm.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        const email =
            document.getElementById(
                "email"
            ).value;

        const password =
            document.getElementById(
                "password"
            ).value;


        loginMessage.textContent =
            "Iniciando sesión...";


        const {
            data,
            error
        } = await supabaseClient
            .auth
            .signInWithPassword({
                email,
                password
            });


        if (error) {

            console.error(error);

            loginMessage.textContent =
                "❌ Correo o contraseña incorrectos.";

            return;

        }


        loginMessage.textContent =
            "";

        mostrarPanel(
            data.user
        );

    }
);


// ====================================
// CERRAR SESIÓN
// ====================================

logoutButton.addEventListener(
    "click",
    async function() {

        await supabaseClient
            .auth
            .signOut();

        mostrarLogin();

    }
);


// ====================================
// ARRANCAR
// ====================================

comprobarSesion();
