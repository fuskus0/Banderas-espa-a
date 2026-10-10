"use strict";

/* ==================================================
   SUPABASE
================================================== */

const SUPABASE_URL =
    "https://yljxozttfnvyjrwrvcab.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_V73MAvXSKRKH6cZh_AfDxQ__0rXOxKE";

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

document.addEventListener(
    "DOMContentLoaded",
    iniciarAdmin
);


async function iniciarAdmin() {

    console.log(
        "🇪🇸 INICIANDO PANEL ADMIN"
    );


    mostrarLogin();


    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth.getSession();


        if (error) {

            console.error(
                "ERROR GET SESSION:",
                error
            );

            mostrarMensaje(
                "❌ Error obteniendo la sesión.",
                true
            );

            return;
        }


        console.log(
            "SESIÓN:",
            data.session
        );


        if (data.session) {

            console.log(
                "✅ SESIÓN ENCONTRADA"
            );

            await comprobarAdministrador();

        } else {

            console.log(
                "ℹ️ NO HAY SESIÓN"
            );

            mostrarLogin();
        }

    } catch (error) {

        console.error(
            "ERROR INICIANDO ADMIN:",
            error
        );

        mostrarMensaje(
            "❌ Error iniciando el panel.",
            true
        );
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


        console.log(
            "INTENTANDO LOGIN:",
            email
        );


        const {
            data,
            error
        } =
            await supabaseClient.auth.signInWithPassword({
                email,
                password
            });


        if (error) {

            console.error(
                "ERROR LOGIN:",
                error
            );


            mostrarMensaje(
                "❌ " + error.message,
                true
            );

            return;
        }


        console.log(
            "✅ LOGIN CORRECTO:",
            data.user
        );


        mostrarMensaje(
            "⏳ Comprobando administrador..."
        );


        await comprobarAdministrador();
    }
);


/* ==================================================
   COMPROBAR ADMIN
================================================== */

async function comprobarAdministrador() {

    try {

        mostrarMensaje(
            "⏳ Comprobando permisos..."
        );


        /*
           Primero comprobamos que exista una sesión.
        */

        const {
            data: sessionData,
            error: sessionError
        } =
            await supabaseClient.auth.getSession();


        if (sessionError) {

            console.error(
                "ERROR SESIÓN:",
                sessionError
            );

            mostrarMensaje(
                "❌ Error comprobando la sesión.",
                true
            );

            return;
        }


        if (!sessionData.session) {

            console.log(
                "❌ NO HAY SESIÓN"
            );

            mostrarLogin();

            return;
        }


        console.log(
            "USUARIO LOGUEADO:",
            sessionData.session.user.email
        );


        /*
           AHORA usamos nuestra función es_admin().
        */

        console.log(
            "COMPROBANDO es_admin()..."
        );


        const {
            data: esAdmin,
            error: adminError
        } =
            await supabaseClient.rpc(
                "es_admin"
            );


        if (adminError) {

            console.error(
                "ERROR es_admin():",
                adminError
            );


            mostrarMensaje(
                "❌ Error comprobando el administrador: " +
                adminError.message,
                true
            );

            return;
        }


        console.log(
            "RESULTADO es_admin():",
            esAdmin
        );


        if (esAdmin !== true) {

            console.log(
                "❌ EL USUARIO NO ES ADMIN"
            );


            mostrarMensaje(
                "❌ Este usuario no es administrador.",
                true
            );


            await supabaseClient.auth.signOut();

            return;
        }


        console.log(
            "✅ ADMIN CONFIRMADO"
        );


        mostrarPanel();


        await cargarPendientes();

    } catch (error) {

        console.error(
            "ERROR COMPROBANDO ADMIN:",
            error
        );


        mostrarMensaje(
            "❌ Error inesperado.",
            true
        );
    }
}


/* ==================================================
   SESIÓN
================================================== */

supabaseClient.auth.onAuthStateChange(
    function (event, session) {

        console.log(
            "AUTH EVENT:",
            event
        );


        if (event === "SIGNED_OUT") {

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
   MENSAJE
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


```javascript
/* ==================================================
   CARGAR PENDIENTES
================================================== */

async function cargarPendientes() {
    console.log("📥 CARGANDO BANDERAS...");

    pendingList.innerHTML = `
        <div class="admin-empty">
            <div class="icon">⏳</div>
            <h2>Cargando banderas...</h2>
            <p>Consultando Supabase.</p>
        </div>
    `;

    const { data, error } = await supabaseClient
        .from("banderas")
        .select("*")
        .in("estado", ["oculta", "revision"])
        .order("creado_en", { ascending: false });

    if (error) {
        console.error("ERROR CONSULTANDO BANDERAS:", error);

        pendingList.innerHTML = `
            <div class="admin-empty admin-error">
                <div class="icon">❌</div>
                <h2>Error cargando las banderas</h2>
                <p>${escaparHTML(error.message)}</p>
            </div>
        `;

        pendingCount.textContent = "0";
        return;
    }

    const banderas = data || [];

    pendingCount.textContent = banderas.length;
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

    // Banderas nuevas
    if (ocultas.length > 0) {
        const titulo = document.createElement("div");
        titulo.className = "admin-section-title";

        titulo.innerHTML = `
            <div>
                <span class="admin-section-icon">🔴</span>
                <div>
                    <h2>Banderas nuevas</h2>
                    <p>Todavía no han sido revisadas.</p>
                </div>
            </div>
            <strong>${ocultas.length}</strong>
        `;

        pendingList.appendChild(titulo);

        for (const bandera of ocultas) {
            const tarjeta = await crearTarjeta(bandera);
            pendingList.appendChild(tarjeta);
        }
    }

    // Banderas en revisión
    if (revision.length > 0) {
        const titulo = document.createElement("div");
        titulo.className = "admin-section-title";

        titulo.innerHTML = `
            <div>
                <span class="admin-section-icon">🟡</span>
                <div>
                    <h2>En revisión</h2>
                    <p>Pendientes de confirmación definitiva.</p>
                </div>
            </div>
            <strong>${revision.length}</strong>
        `;

        pendingList.appendChild(titulo);

        for (const bandera of revision) {
            const tarjeta = await crearTarjeta(bandera);
            pendingList.appendChild(tarjeta);
        }
    }
}


/* ==================================================
   CREAR TARJETA CON FOTO ORIGINAL
================================================== */

async function crearTarjeta(bandera) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "admin-card";

    const esOculta = bandera.estado === "oculta";

    const estado = esOculta
        ? `<span class="admin-status hidden">🔴 OCULTA</span>`
        : `<span class="admin-status review">🟡 EN REVISIÓN</span>`;

    let fotoHTML = `
        <div class="admin-photo-message">
            📷 Esta bandera no tiene una foto adjunta.
        </div>
    `;

    // foto_url debe contener la ruta dentro del bucket privado,
    // por ejemplo: banderas/abc123.jpg
    if (
        typeof bandera.foto_url === "string" &&
        bandera.foto_url.trim() !== ""
    ) {
        const rutaFoto = bandera.foto_url.trim();

        try {
            // Genera una URL temporal para el administrador.
            // La foto original sigue en el bucket privado.
            const { data: fotoFirmada, error: fotoError } =
                await supabaseClient
                    .storage
                    .from("banderas-fotos")
                    .createSignedUrl(rutaFoto, 600);

            if (fotoError) {
                console.error(
                    "No se pudo cargar la foto de la bandera:",
                    bandera.id,
                    fotoError
                );

                fotoHTML = `
                    <div class="admin-photo-message admin-error">
                        ❌ No se pudo cargar la foto.
                        <br>
                        <small>${escaparHTML(fotoError.message)}</small>
                    </div>
                `;
            } else if (fotoFirmada && fotoFirmada.signedUrl) {
                const urlFoto = escaparHTML(fotoFirmada.signedUrl);

                fotoHTML = `
                    <div class="admin-photo-container">
                        <p class="admin-photo-title">
                            📸 Foto original aportada
                        </p>

                        <a
                            href="${urlFoto}"
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir foto original en otra pestaña"
                        >
                            <img
                                class="admin-flag-photo"
                                src="${urlFoto}"
                                alt="Foto original de la bandera ${escaparHTML(
                                    String(bandera.id)
                                )}"
                                loading="lazy"
                                style="
                                    display: block;
                                    width: 100%;
                                    max-width: 520px;
                                    max-height: 480px;
                                    object-fit: contain;
                                    object-position: left center;
                                    border-radius: 10px;
                                    border: 1px solid #ccc;
                                    background: #f5f5f5;
                                    cursor: zoom-in;
                                "
                            >
                        </a>

                        <small>
                            Pulsa la imagen para abrirla en tamaño completo.
                        </small>
                    </div>
                `;
            }
        } catch (error) {
            console.error("Error preparando la foto:", error);

            fotoHTML = `
                <div class="admin-photo-message admin-error">
                    ❌ Error inesperado al cargar la foto.
                </div>
            `;
        }
    }

    let botones = "";

    if (esOculta) {
        botones = `
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
        botones = `
            <button class="admin-button success" data-action="verificar">
                🟢 Verificar
            </button>

            <button class="admin-button danger" data-action="rechazar">
                ❌ Rechazar
            </button>
        `;
    }

    tarjeta.innerHTML = `
        <div class="admin-info">
            <div class="admin-card-header">
                <h3>🇪🇸 Bandera #${escaparHTML(String(bandera.id))}</h3>
                ${estado}
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
                ${escaparHTML(String(bandera.latitud ?? "Sin dato"))},
                ${escaparHTML(String(bandera.longitud ?? "Sin dato"))}
            </p>

            <div class="admin-location-buttons">
                <a
                    class="admin-location-link"
                    href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${bandera.latitud},${bandera.longitud}`
                    )}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    📍 Ver en Google Maps
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
                    🗺️ Ver en OpenStreetMap
                </a>
            </div>
        </div>

        <div class="admin-actions">
            ${botones}
        </div>
    `;

    // Conectamos los botones sin insertar el ID en código ejecutable.
    tarjeta.querySelector('[data-action="revision"]')
        ?.addEventListener("click", () => pasarARevision(bandera.id));

    tarjeta.querySelector('[data-action="verificar"]')
        ?.addEventListener("click", () => verificarBandera(bandera.id));

    tarjeta.querySelector('[data-action="rechazar"]')
        ?.addEventListener("click", () => rechazarBandera(bandera.id));

    return tarjeta;
}

    /* ==============================================
       OCULTAS
    ============================================== */

    if (ocultas.length > 0) {

        const titulo =
            document.createElement(
                "div"
            );


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


        pendingList.appendChild(
            titulo
        );


        ocultas.forEach(
            bandera => {

                pendingList.appendChild(
                    crearTarjeta(
                        bandera
                    )
                );

            }
        );
    }


    /* ==============================================
       REVISION
    ============================================== */

    if (revision.length > 0) {

        const titulo =
            document.createElement(
                "div"
            );


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
                        Pendientes de confirmación definitiva.
                    </p>
                </div>
            </div>

            <strong>
                ${revision.length}
            </strong>
        `;


        pendingList.appendChild(
            titulo
        );


        revision.forEach(
            bandera => {

                pendingList.appendChild(
                    crearTarjeta(
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

function crearTarjeta(
    bandera
) {

    const tarjeta =
        document.createElement(
            "article"
        );


    tarjeta.className =
        "admin-card";


    const esOculta =
        bandera.estado === "oculta";


    const estado =
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
                    pasarARevision(
                        ${bandera.id}
                    )
                "
            >
                🟡 Pasar a revisión
            </button>

            <button
                class="admin-button success"
                onclick="
                    verificarBandera(
                        ${bandera.id}
                    )
                "
            >
                🟢 Verificar
            </button>

            <button
                class="admin-button danger"
                onclick="
                    rechazarBandera(
                        ${bandera.id}
                    )
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
                    verificarBandera(
                        ${bandera.id}
                    )
                "
            >
                🟢 Verificar
            </button>

            <button
                class="admin-button danger"
                onclick="
                    rechazarBandera(
                        ${bandera.id}
                    )
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

                ${estado}

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
                    String(
                        bandera.latitud
                    )
                )},
                ${escaparHTML(
                    String(
                        bandera.longitud
                    )
                )}
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
        📍 Ver en Google Maps
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
        🗺️ Ver en OpenStreetMap
    </a>

</div>

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

    if (
        !confirm(
            "¿Pasar esta bandera a revisión?\n\n" +
            "Seguirá oculta del mapa público."
        )
    ) {
        return;
    }


    const {
        error
    } =
        await supabaseClient
            .from("banderas")
            .update({
                estado: "revision"
            })
            .eq(
                "id",
                id
            );


    if (error) {

        console.error(
            "ERROR PASANDO A REVISIÓN:",
            error
        );


        alert(
            "❌ No se pudo cambiar el estado.\n\n" +
            error.message
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

    if (
        !confirm(
            "¿Verificar esta bandera?\n\n" +
            "Será visible en el mapa público."
        )
    ) {
        return;
    }


    const {
        error
    } =
        await supabaseClient
            .from("banderas")
            .update({
                estado: "verificada"
            })
            .eq(
                "id",
                id
            );


    if (error) {

        console.error(
            "ERROR VERIFICANDO:",
            error
        );


        alert(
            "❌ No se pudo verificar.\n\n" +
            error.message
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

    if (
        !confirm(
            "¿Rechazar esta bandera?\n\n" +
            "Se eliminará del registro."
        )
    ) {
        return;
    }


    const {
        error
    } =
        await supabaseClient
            .from("banderas")
            .delete()
            .eq(
                "id",
                id
            );


    if (error) {

        console.error(
            "ERROR RECHAZANDO:",
            error
        );


        alert(
            "❌ No se pudo rechazar.\n\n" +
            error.message
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
