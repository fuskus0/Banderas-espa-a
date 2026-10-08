"use strict";

/* ==================================================
   CONFIGURACIÓN SUPABASE
================================================== */

const SUPABASE_URL =
    "https://yljxozttfnvyjrwrvcab.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_V73MAvXSKRKH6cZh_AfDxQ__0rXOxKE";


/* ==================================================
   CLIENTE SUPABASE
================================================== */

const supabaseClient =
    supabase.createClient(
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
   ELEMENTOS
================================================== */

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


/* ==================================================
   INICIO
================================================== */

iniciarAdmin();


async function iniciarAdmin() {

    mostrarLogin();

    const resultado =
        await supabaseClient.auth.getSession();

    if (resultado.error) {

        console.error(
            "ERROR OBTENIENDO SESIÓN:",
            resultado.error
        );

        return;
    }

    const session =
        resultado.data.session;


    /*
       Si Supabase ya tiene una sesión guardada,
       intentamos entrar directamente al panel.
    */

    if (session) {

        console.log(
            "Sesión encontrada. Comprobando administrador..."
        );

        await comprobarAdministrador();

    } else {

        console.log(
            "No hay sesión guardada."
        );

        mostrarLogin();
    }
}


/* ==================================================
   LOGIN
================================================== */

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
                "Escribe tu correo y contraseña.",
                true
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
                "❌ " + resultado.error.message,
                true
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


/* ==================================================
   COMPROBAR ADMINISTRADOR
================================================== */

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
                "❌ No se pudo obtener el usuario.",
                true
            );

            mostrarLogin();

            return;
        }


        const usuario =
            resultadoUsuario.data.user;


        if (!usuario) {

            mostrarLogin();

            return;
        }


        console.log(
            "USUARIO:",
            usuario.email
        );


        /*
           Comprobamos directamente la tabla
           admin_users.
        */

        const resultadoAdmin =
            await supabaseClient
                .from("admin_users")
                .select("user_id")
                .eq(
                    "user_id",
                    usuario.id
                )
                .maybeSingle();


        if (resultadoAdmin.error) {

            console.error(
                "ERROR ADMIN_USERS:",
                resultadoAdmin.error
            );


            mostrarMensaje(
                "❌ No se ha podido comprobar el administrador.\n\n" +
                resultadoAdmin.error.message,
                true
            );

            mostrarLogin();

            return;
        }


        if (!resultadoAdmin.data) {

            mostrarMensaje(
                "❌ Este usuario no es administrador.",
                true
            );


            await supabaseClient.auth.signOut();

            mostrarLogin();

            return;
        }


        console.log(
            "✅ ADMINISTRADOR CONFIRMADO"
        );


        mostrarPanel();


        await cargarPendientes();

    } catch (error) {

        console.error(
            "ERROR GENERAL:",
            error
        );


        mostrarMensaje(
            "❌ Error inesperado.",
            true
        );

        mostrarLogin();
    }
}


/* ==================================================
   CAMBIO DE SESIÓN
================================================== */

supabaseClient.auth.onAuthStateChange(
    async function (event, session) {

        console.log(
            "CAMBIO DE AUTENTICACIÓN:",
            event
        );


        if (
            event === "SIGNED_IN" &&
            session
        ) {

            await comprobarAdministrador();

        }


        if (
            event === "SIGNED_OUT"
        ) {

            mostrarLogin();
        }
    }
);


/* ==================================================
   MOSTRAR LOGIN
================================================== */

function mostrarLogin() {

    loginSection.style.display =
        "block";

    adminPanel.style.display =
        "none";
}


/* ==================================================
   MOSTRAR PANEL
================================================== */

function mostrarPanel() {

    loginSection.style.display =
        "none";

    adminPanel.style.display =
        "block";
}


/* ==================================================
   MENSAJES
================================================== */

function mostrarMensaje(
    texto,
    error = false
) {

    loginMessage.textContent =
        texto;

    loginMessage.classList.toggle(
        "admin-error",
        error
    );
}


/* ==================================================
   CARGAR BANDERAS
================================================== */

async function cargarPendientes() {

    pendingList.innerHTML =
        `
        <div class="admin-empty">
            <div class="icon">⏳</div>
            <h2>Cargando banderas...</h2>
            <p>Estamos buscando las banderas pendientes.</p>
        </div>
        `;


    /*
       IMPORTANTE:

       El administrador puede ver TODAS las banderas
       gracias a la política RLS.

       Después filtramos únicamente:
       - oculta
       - revision

       Las verificadas no aparecen como pendientes.
    */

    const resultado =
        await supabaseClient
            .from("banderas")
            .select("*")
            .in(
                "estado",
                [
                    "oculta",
                    "revision"
                ]
            )
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


        pendingCount.textContent =
            "0";


        pendingList.innerHTML =
            `
            <div class="admin-empty admin-error">
                <div class="icon">❌</div>
                <h2>Error cargando las banderas</h2>
                <p>
                    ${escaparHTML(
                        resultado.error.message
                    )}
                </p>
            </div>
            `;

        return;
    }


    const banderas =
        resultado.data || [];


    /*
       Contamos únicamente las que requieren
       atención del administrador.
    */

    pendingCount.textContent =
        banderas.length;


    if (banderas.length === 0) {

        pendingList.innerHTML =
            `
            <div class="admin-empty">
                <div class="icon">🎉</div>

                <h2>No hay banderas pendientes</h2>

                <p>
                    No hay ninguna bandera oculta
                    o en revisión actualmente.
                </p>
            </div>
            `;

        return;
    }


    /*
       Separar por estado
    */

    const ocultas =
        banderas.filter(
            bandera =>
                bandera.estado === "oculta"
        );


    const revision =
        banderas.filter(
            bandera =>
                bandera.estado === "revision"
        );


    pendingList.innerHTML =
        "";


    /*
       SECCIÓN OCULTAS
    */

    if (ocultas.length > 0) {

        const titulo =
            document.createElement("div");

        titulo.className =
            "admin-section-title";

        titulo.innerHTML = `
            <div>
                <span class="admin-section-icon">
                    🔴
                </span>

                <div>
                    <h2>Banderas nuevas</h2>
                    <p>
                        Todavía no han sido revisadas.
                    </p>
                </div>
            </div>

            <strong>
                ${ocultas.length}
            </strong>
        `;

        pendingList.appendChild(titulo);


        ocultas.forEach(
            function (bandera) {

                pendingList.appendChild(
                    crearTarjetaBandera(
                        bandera
                    )
                );
            }
        );
    }


    /*
       SECCIÓN EN REVISIÓN
    */

    if (revision.length > 0) {

        const titulo =
            document.createElement("div");

        titulo.className =
            "admin-section-title";

        titulo.innerHTML = `
            <div>
                <span class="admin-section-icon">
                    🟡
                </span>

                <div>
                    <h2>En revisión</h2>
                    <p>
                        Parecen legítimas, pero todavía
                        no están confirmadas al 100%.
                    </p>
                </div>
            </div>

            <strong>
                ${revision.length}
            </strong>
        `;

        pendingList.appendChild(titulo);


        revision.forEach(
            function (bandera) {

                pendingList.appendChild(
                    crearTarjetaBandera(
                        bandera
                    )
                );
            }
        );
    }
}


/* ==================================================
   CREAR TARJETA
================================================== */

function crearTarjetaBandera(
    bandera
) {

    const tarjeta =
        document.createElement("article");


    tarjeta.className =
        "admin-card";


    const esOculta =
        bandera.estado === "oculta";


    const estadoHTML =
        esOculta

            ? `
                <span class="admin-status hidden">
                    🔴 OCULTA
                </span>
            `

            : `
                <span class="admin-status review">
                    🟡 EN REVISIÓN
                </span>
            `;


    let botones = "";


    if (esOculta) {

        botones = `
            <button
                class="admin-button secondary"
                onclick="
                    pasarARevision(${bandera.id})
                "
            >
                🟡 Pasar a revisión
            </button>

            <button
                class="admin-button success"
                onclick="
                    verificarBandera(${bandera.id})
                "
            >
                🟢 Verificar
            </button>

            <button
                class="admin-button danger"
                onclick="
                    rechazarBandera(${bandera.id})
                "
            >
                ❌ Rechazar
            </button>
        `;

    } else {

        botones = `
            <button
                class="admin-button success"
                onclick="
                    verificarBandera(${bandera.id})
                "
            >
                🟢 Verificar
            </button>

            <button
                class="admin-button danger"
                onclick="
                    rechazarBandera(${bandera.id})
                "
            >
                ❌ Rechazar
            </button>
        `;
    }


    tarjeta.innerHTML = `

        <div class="admin-info">

            <div class="admin-card-header">

                <h3>
                    🇪🇸 Bandera #${bandera.id}
                </h3>

                ${estadoHTML}

            </div>


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


            <p>
                📌
                <strong>Coordenadas:</strong>
                ${escaparHTML(
                    String(bandera.latitud)
                )},
                ${escaparHTML(
                    String(bandera.longitud)
                )}
            </p>


            <a
                class="admin-location-link"
                href="
                    https://www.openstreetmap.org/
                    ?mlat=${encodeURIComponent(
                        bandera.latitud
                    )}
                    &mlon=${encodeURIComponent(
                        bandera.longitud
                    )}
                    #map=18/${encodeURIComponent(
                        bandera.latitud
                    )}/${encodeURIComponent(
                        bandera.longitud
                    )}
                "
                target="_blank"
                rel="noopener noreferrer"
            >
                🧭 Abrir ubicación en el mapa
            </a>

        </div>


        <div class="admin-actions">

            ${botones}

        </div>

    `;


    return tarjeta;
}


/* ==================================================
   PASAR A REVISIÓN
================================================== */

async function pasarARevision(
    id
) {

    const confirmar =
        confirm(
            "¿Quieres pasar esta bandera a revisión?\n\n" +
            "Seguirá oculta del mapa público."
        );


    if (!confirmar) {
        return;
    }


    const resultado =
        await supabaseClient
            .from("banderas")
            .update({
                estado: "revision"
            })
            .eq(
                "id",
                id
            );


    if (resultado.error) {

        console.error(
            "ERROR PASANDO A REVISIÓN:",
            resultado.error
        );


        alert(
            "❌ No se pudo cambiar el estado.\n\n" +
            resultado.error.message
        );


        return;
    }


    await cargarPendientes();
}


/* ==================================================
   VERIFICAR
================================================== */

async function verificarBandera(
    id
) {

    const confirmar =
        confirm(
            "¿Quieres verificar esta bandera?\n\n" +
            "Pasará a estar visible públicamente en el mapa."
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


    await cargarPendientes();
}


/* ==================================================
   RECHAZAR
================================================== */

async function rechazarBandera(
    id
) {

    const confirmar =
        confirm(
            "¿Seguro que quieres rechazar esta bandera?\n\n" +
            "Se eliminará permanentemente del registro."
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


    await cargarPendientes();
}


/* ==================================================
   CERRAR SESIÓN
================================================== */

logoutButton.addEventListener(
    "click",
    async function () {

        const resultado =
            await supabaseClient.auth.signOut();


        if (resultado.error) {

            console.error(
                "ERROR CERRANDO SESIÓN:",
                resultado.error
            );

            alert(
                "❌ No se pudo cerrar la sesión."
            );

            return;
        }


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


/* ==================================================
   ESCAPAR HTML
================================================== */

function escaparHTML(
    texto
) {

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


/* ==================================================
   FECHA
================================================== */

function formatearFecha(
    fecha
) {

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
