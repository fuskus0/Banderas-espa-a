"use strict";


// ==================================================
// CONFIGURACIÓN SUPABASE
// ==================================================

const SUPABASE_URL =
    "https://yljxozttfnvyjrwrvcab.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_V73MAvXSKRKH6cZh_AfDxQ__0rXOxKE";


// ==================================================
// CREAR CLIENTE
// ==================================================

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// ==================================================
// ELEMENTOS
// ==================================================

const loginSection =
    document.getElementById("loginSection");

const adminPanel =
    document.getElementById("adminPanel");

const loginForm =
    document.getElementById("loginForm");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const loginMessage =
    document.getElementById("loginMessage");

const logoutButton =
    document.getElementById("logoutButton");

const pendingList =
    document.getElementById("pendingList");

const pendingCount =
    document.getElementById("pendingCount");


// ==================================================
// ESTADO INICIAL
// ==================================================

mostrarLogin();


// ==================================================
// LOGIN
// ==================================================

loginForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        const email =
            emailInput.value.trim();

        const password =
            passwordInput.value;


        if (!email || !password) {

            mostrarMensaje(
                "Escribe tu correo y contraseña."
            );

            return;
        }


        mostrarMensaje(
            "⏳ Iniciando sesión..."
        );


        const resultado =
            await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });


        if (resultado.error) {

            console.error(
                "ERROR LOGIN:",
                resultado.error
            );


            mostrarMensaje(
                "❌ " +
                resultado.error.message
            );


            return;
        }


        console.log(
            "LOGIN CORRECTO",
            resultado.data.user
        );


        mostrarMensaje(
            "⏳ Comprobando administrador..."
        );


        await comprobarAdministrador();
    }
);


// ==================================================
// COMPROBAR ADMINISTRADOR
// ==================================================

async function comprobarAdministrador() {

    try {

        const resultadoUsuario =
            await supabaseClient.auth.getUser();


        if (resultadoUsuario.error) {

            console.error(
                "ERROR OBTENIENDO USUARIO:",
                resultadoUsuario.error
            );


            mostrarMensaje(
                "❌ No se pudo obtener el usuario."
            );


            return;
        }


        const usuario =
            resultadoUsuario.data.user;


        if (!usuario) {

            mostrarMensaje(
                "❌ No hay una sesión iniciada."
            );


            return;
        }


        console.log(
            "USUARIO:",
            usuario.email
        );


        const resultadoAdmin =
            await supabaseClient
                .from("admin_users")
                .select("user_id")
                .eq("user_id", usuario.id)
                .maybeSingle();


        if (resultadoAdmin.error) {

            console.error(
                "ERROR ADMIN_USERS:",
                resultadoAdmin.error
            );


            mostrarMensaje(
                "❌ No se ha podido comprobar el administrador."
            );


            return;
        }


        if (!resultadoAdmin.data) {

            mostrarMensaje(
                "❌ Este usuario no es administrador."
            );


            await supabaseClient.auth.signOut();


            return;
        }


        console.log(
            "ADMINISTRADOR CONFIRMADO"
        );


        mostrarPanel();


        await cargarPendientes();

    } catch (error) {

        console.error(
            "ERROR GENERAL:",
            error
        );


        mostrarMensaje(
            "❌ Error inesperado."
        );
    }
}


// ==================================================
// MOSTRAR LOGIN
// ==================================================

function mostrarLogin() {

    loginSection.style.display =
        "block";

    adminPanel.style.display =
        "none";
}


// ==================================================
// MOSTRAR PANEL
// ==================================================

function mostrarPanel() {

    loginSection.style.display =
        "none";

    adminPanel.style.display =
        "block";
}


// ==================================================
// MENSAJES
// ==================================================

function mostrarMensaje(texto) {

    loginMessage.textContent =
        texto;
}


// ==================================================
// CARGAR BANDERAS
// ==================================================

async function cargarPendientes() {

    pendingList.innerHTML =
        "<p>⏳ Cargando banderas...</p>";


    const resultado =
        await supabaseClient
            .from("banderas")
            .select("*")
            .eq("estado", "revision")
            .order(
                "creado_en",
                {
                    ascending: false
                }
            );


    if (resultado.error) {

        console.error(
            "ERROR BANDERAS:",
            resultado.error
        );


        pendingList.innerHTML =
            `<p>
                ❌ Error cargando banderas.<br><br>
                ${escaparHTML(
                    resultado.error.message
                )}
            </p>`;


        pendingCount.textContent =
            "0";


        return;
    }


    const banderas =
        resultado.data || [];


    pendingCount.textContent =
        banderas.length;


    if (banderas.length === 0) {

        pendingList.innerHTML =
            `<p>
                🎉 No hay banderas pendientes.
            </p>`;


        return;
    }


    pendingList.innerHTML =
        "";


    banderas.forEach(
        function (bandera) {

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
                        📍
                        <strong>Municipio:</strong>
                        ${escaparHTML(
                            bandera.municipio
                        )}
                    </p>

                    <p>
                        🗺️
                        <strong>Provincia:</strong>
                        ${escaparHTML(
                            bandera.provincia
                        )}
                    </p>

                    <p>
                        📅
                        <strong>Vista:</strong>
                        ${formatearFecha(
                            bandera.fecha_vista
                        )}
                    </p>

                    <p>
                        📝
                        <strong>Descripción:</strong><br>
                        ${escaparHTML(
                            bandera.descripcion ||
                            "Sin descripción."
                        )}
                    </p>

                </div>


                <div class="pending-actions">

                    <button
                        class="location-button"
                        onclick="
                            verUbicacion(
                                ${bandera.latitud},
                                ${bandera.longitud}
                            )
                        "
                    >
                        🧭 Ver ubicación
                    </button>


                    <button
                        class="verify-button"
                        onclick="
                            verificarBandera(
                                ${bandera.id}
                            )
                        "
                    >
                        🟢 Verificar
                    </button>


                    <button
                        class="reject-button"
                        onclick="
                            rechazarBandera(
                                ${bandera.id}
                            )
                        "
                    >
                        ❌ Rechazar
                    </button>

                </div>

            `;


            pendingList.appendChild(
                tarjeta
            );
        }
    );
}


// ==================================================
// VER UBICACIÓN
// ==================================================

function verUbicacion(
    latitud,
    longitud
) {

    const url =
        "https://www.openstreetmap.org/" +
        "?mlat=" + latitud +
        "&mlon=" + longitud +
        "#map=18/" +
        latitud +
        "/" +
        longitud;


    window.open(
        url,
        "_blank",
        "noopener,noreferrer"
    );
}


// ==================================================
// VERIFICAR
// ==================================================

async function verificarBandera(id) {

    const confirmar =
        confirm(
            "¿Quieres verificar esta bandera?"
        );


    if (!confirmar) {
        return;
    }


    const resultado =
        await supabaseClient
            .from("banderas")
            .update({
                estado: "verificada"
            })
            .eq(
                "id",
                id
            );


    if (resultado.error) {

        console.error(
            "ERROR VERIFICANDO:",
            resultado.error
        );


        alert(
            "❌ No se pudo verificar.\n\n" +
            resultado.error.message
        );


        return;
    }


    alert(
        "🟢 Bandera verificada correctamente."
    );


    await cargarPendientes();
}


// ==================================================
// RECHAZAR
// ==================================================

async function rechazarBandera(id) {

    const confirmar =
        confirm(
            "¿Seguro que quieres rechazar esta bandera?\n\n" +
            "Se eliminará del registro."
        );


    if (!confirmar) {
        return;
    }


    const resultado =
        await supabaseClient
            .from("banderas")
            .delete()
            .eq(
                "id",
                id
            );


    if (resultado.error) {

        console.error(
            "ERROR RECHAZANDO:",
            resultado.error
        );


        alert(
            "❌ No se pudo rechazar.\n\n" +
            resultado.error.message
        );


        return;
    }


    alert(
        "❌ Bandera rechazada."
    );


    await cargarPendientes();
}


// ==================================================
// CERRAR SESIÓN
// ==================================================

logoutButton.addEventListener(
    "click",
    async function () {

        await supabaseClient.auth.signOut();


        emailInput.value =
            "";

        passwordInput.value =
            "";


        mostrarMensaje(
            ""
        );


        mostrarLogin();
    }
);


// ==================================================
// ESCAPAR HTML
// ==================================================

function escaparHTML(texto) {

    return String(texto)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


// ==================================================
// FECHA
// ==================================================

function formatearFecha(fecha) {

    if (!fecha) {
        return "Sin fecha";
    }


    const partes =
        fecha.split("-");


    if (partes.length !== 3) {
        return fecha;
    }


    return (
        partes[2] +
        "/" +
        partes[1] +
        "/" +
        partes[0]
    );
}
