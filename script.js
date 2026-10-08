// ==========================================
// CONFIGURACIÓN SUPABASE
// ==========================================

const SUPABASE_URL =
    "https://yljxozttfnvyjrwrvcab.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_V73MAvXSKRKH6cZh_AfDxQ__0rXOxKE";

const supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


// ==========================================
// MAPA PRINCIPAL
// ==========================================

const map = L.map("map", {
    zoomControl: true
});

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
    }
).addTo(map);


// Vista inicial de España
map.setView(
    [40.2, -3.7],
    6
);


// ==========================================
// VARIABLES
// ==========================================

const markers = [];

let todasLasBanderas = [];


// ==========================================
// CARGAR SOLO BANDERAS VERIFICADAS
// ==========================================

async function cargarBanderas() {

    try {

        const { data, error } =
            await supabaseClient
                .from("banderas")
                .select("*")
                .eq("estado", "verificada")
                .order("creado_en", {
                    ascending: false
                });


        if (error) {

            console.error(
                "Error cargando las banderas:",
                error
            );

            return;

        }


        todasLasBanderas = data || [];


        // Limpiar marcadores anteriores
        markers.forEach(item => {

            map.removeLayer(
                item.marker
            );

        });

        markers.length = 0;


        // Crear nuevos marcadores
        todasLasBanderas.forEach(
            crearMarcador
        );

    } catch (error) {

        console.error(
            "Error inesperado:",
            error
        );

    }

}


// ==========================================
// CREAR MARCADOR
// ==========================================

function crearMarcador(bandera) {

    const marker =
        L.marker([
            bandera.latitud,
            bandera.longitud
        ]).addTo(map);


    marker.bindPopup(`

        <div class="flag-popup">

            <h3>
                🇪🇸 Bandera #${bandera.id}
            </h3>

            <p>
                📍 ${escapeHtml(
                    bandera.municipio
                )}
            </p>

            <p>
                🗺️ ${escapeHtml(
                    bandera.provincia
                )}
            </p>

            <p>
                📅 ${formatearFecha(
                    bandera.fecha_vista
                )}
            </p>

            <p>
                🟢 VERIFICADA
            </p>

            <hr>

            ${
                bandera.descripcion
                    ? `
                        <p>
                            ${escapeHtml(
                                bandera.descripcion
                            )}
                        </p>
                    `
                    : ""
            }

            <button
                onclick="
                    findFlag(
                        ${bandera.latitud},
                        ${bandera.longitud}
                    )
                "
            >
                🧭 Intentar encontrarla
            </button>

        </div>

    `);


    markers.push({
        marker: marker,
        bandera: bandera
    });

}


// ==========================================
// ESCAPAR TEXTO
// ==========================================

function escapeHtml(text) {

    if (
        text === null ||
        text === undefined
    ) {

        return "";

    }


    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        String(text);


    return div.innerHTML;

}


// ==========================================
// FORMATEAR FECHA
// ==========================================

function formatearFecha(fecha) {

    if (!fecha) {

        return "";

    }


    const partes =
        fecha.split("-");


    if (partes.length !== 3) {

        return fecha;

    }


    return `${partes[2]}/${partes[1]}/${partes[0]}`;

}


// ==========================================
// INICIAR CARGA
// ==========================================

cargarBanderas();


// ==========================================
// NAVEGACIÓN HACIA UNA BANDERA
// ==========================================

function findFlag(
    lat,
    lng
) {

    const url =
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;


    window.open(
        url,
        "_blank"
    );

}


// ==========================================
// BUSCADOR
// ==========================================

const searchInput =
    document.getElementById(
        "searchInput"
    );


if (searchInput) {

    searchInput.addEventListener(
        "input",
        function() {

            const texto =
                searchInput.value
                    .toLowerCase()
                    .trim();


            if (!texto) {

                return;

            }


            const resultados =
                markers.filter(
                    item => {

                        const municipio =
                            (
                                item.bandera.municipio ||
                                ""
                            )
                                .toLowerCase();


                        const provincia =
                            (
                                item.bandera.provincia ||
                                ""
                            )
                                .toLowerCase();


                        return (
                            municipio.includes(
                                texto
                            )
                            ||
                            provincia.includes(
                                texto
                            )
                        );

                    }
                );


            if (
                resultados.length === 0
            ) {

                return;

            }


            const resultado =
                resultados[0];


            map.setView(
                [
                    resultado.bandera.latitud,
                    resultado.bandera.longitud
                ],
                12
            );


            resultado.marker.openPopup();

        }
    );

}


// ==========================================
// MODAL DEL FORMULARIO
// ==========================================

const submitModal =
    document.getElementById(
        "submitModal"
    );


const flagForm =
    document.getElementById(
        "flagForm"
    );


const formMessage =
    document.getElementById(
        "formMessage"
    );


function abrirFormulario() {

    if (!submitModal) {

        return;

    }


    submitModal.style.display =
        "flex";


    setTimeout(
        function() {

            if (
                locationMap
            ) {

                locationMap.invalidateSize();

            }

        },
        150
    );

}


function cerrarFormulario() {

    if (!submitModal) {

        return;

    }


    submitModal.style.display =
        "none";

}


// ==========================================
// CERRAR AL PULSAR FUERA
// ==========================================

if (submitModal) {

    submitModal.addEventListener(
        "click",
        function(event) {

            if (
                event.target ===
                submitModal
            ) {

                cerrarFormulario();

            }

        }
    );

}


// ==========================================
// MAPA DEL FORMULARIO
// ==========================================

const locationMap =
    L.map(
        "locationMap",
        {
            zoomControl: true
        }
    );


L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution:
            "&copy; OpenStreetMap contributors"
    }
).addTo(locationMap);


// Vista inicial
locationMap.setView(
    [40.2, -3.7],
    6
);


// ==========================================
// VARIABLES DE UBICACIÓN
// ==========================================

let selectedLat = null;
let selectedLng = null;

let locationMarker = null;


// ==========================================
// CLICK / TOQUE EN EL MAPA
// ==========================================

locationMap.on(
    "click",
    function(event) {

        seleccionarUbicacion(
            event.latlng.lat,
            event.latlng.lng
        );

    }
);


// ==========================================
// SELECCIONAR UBICACIÓN
// ==========================================

function seleccionarUbicacion(
    lat,
    lng
) {

    selectedLat = Number(lat);
    selectedLng = Number(lng);


    if (locationMarker) {

        locationMarker.setLatLng([
            selectedLat,
            selectedLng
        ]);

    } else {

        locationMarker =
            L.marker(
                [
                    selectedLat,
                    selectedLng
                ],
                {
                    draggable: true
                }
            ).addTo(
                locationMap
            );


        locationMarker.on(
            "dragend",
            function(event) {

                const position =
                    event.target.getLatLng();


                seleccionarUbicacion(
                    position.lat,
                    position.lng
                );

            }
        );

    }


    locationMap.panTo(
        [
            selectedLat,
            selectedLng
        ]
    );


    actualizarEstadoUbicacion();

}


// ==========================================
// TEXTO DE UBICACIÓN
// ==========================================

function actualizarEstadoUbicacion() {

    const locationStatus =
        document.getElementById(
            "locationStatus"
        );


    if (!locationStatus) {

        return;

    }


    if (
        selectedLat === null ||
        selectedLng === null
    ) {

        locationStatus.textContent =
            "Haz clic o toca el mapa para elegirla";

        return;

    }


    locationStatus.textContent =
        "Ubicación seleccionada ✓";

}


// ==========================================
// BOTÓN "USAR MI UBICACIÓN"
// ==========================================

const useLocationButton =
    document.getElementById(
        "useLocationButton"
    );


if (useLocationButton) {

    useLocationButton.addEventListener(
        "click",
        obtenerUbicacion
    );

}


function obtenerUbicacion() {

    if (
        !navigator.geolocation
    ) {

        alert(
            "Tu navegador no permite obtener la ubicación. Puedes señalarla manualmente en el mapa."
        );

        return;

    }


    useLocationButton.disabled =
        true;


    useLocationButton.textContent =
        "📍 Obteniendo ubicación...";


    navigator.geolocation.getCurrentPosition(

        function(position) {

            const lat =
                position.coords.latitude;

            const lng =
                position.coords.longitude;


            seleccionarUbicacion(
                lat,
                lng
            );


            locationMap.setView(
                [
                    lat,
                    lng
                ],
                16
            );


            useLocationButton.disabled =
                false;


            useLocationButton.textContent =
                "📍 Usar mi ubicación";

        },


        function(error) {

            console.error(
                "Error de geolocalización:",
                error
            );


            alert(
                "No hemos podido obtener tu ubicación. Puedes señalarla manualmente en el mapa."
            );


            useLocationButton.disabled =
                false;


            useLocationButton.textContent =
                "📍 Usar mi ubicación";

        },


        {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 60000
        }

    );

}


// ==========================================
// ENVIAR FORMULARIO
// ==========================================

if (flagForm) {

    flagForm.addEventListener(
        "submit",
        enviarBandera
    );

}


async function enviarBandera(
    event
) {

    event.preventDefault();


    formMessage.textContent =
        "Enviando bandera...";


    formMessage.style.color =
        "";


    // ======================================
    // DATOS DEL FORMULARIO
    // ======================================

    const municipio =
        document
            .getElementById(
                "municipio"
            )
            .value
            .trim();


    const provincia =
        document
            .getElementById(
                "provincia"
            )
            .value
            .trim();


    const fechaVista =
        document
            .getElementById(
                "fechaVista"
            )
            .value;


    const descripcion =
        document
            .getElementById(
                "descripcion"
            )
            .value
            .trim();


    // ======================================
    // COMPROBAR UBICACIÓN
    // ======================================

    if (
        selectedLat === null ||
        selectedLng === null
    ) {

        formMessage.textContent =
            "❌ Primero señala aproximadamente dónde viste la bandera.";

        return;

    }


    if (
        !Number.isFinite(
            selectedLat
        )
        ||
        !Number.isFinite(
            selectedLng
        )
    ) {

        formMessage.textContent =
            "❌ La ubicación seleccionada no es válida.";

        return;

    }


    // ======================================
    // COMPROBAR ESPAÑA
    // ======================================

    if (

        selectedLat < 35 ||
        selectedLat > 44 ||
        selectedLng < -10 ||
        selectedLng > 5

    ) {

        formMessage.textContent =
            "❌ La ubicación parece estar fuera de España.";

        return;

    }


    // ======================================
    // ENVIAR A SUPABASE
    // ======================================

    try {

        const { error } =
            await supabaseClient
                .from("banderas")
                .insert({

                    municipio:
                        municipio,

                    provincia:
                        provincia,

                    latitud:
                        selectedLat,

                    longitud:
                        selectedLng,

                    fecha_vista:
                        fechaVista,

                    descripcion:
                        descripcion,

                    // NUEVO SISTEMA:
                    // Toda bandera nueva empieza oculta.
                    estado:
                        "oculta"

                });


        if (error) {

            console.error(
                "Error Supabase:",
                error
            );


            formMessage.textContent =
                "❌ No se pudo enviar la bandera.";

            return;

        }


        // ==================================
        // ÉXITO
        // ==================================

        formMessage.textContent =
            "✅ ¡Bandera enviada! Será revisada por un administrador.";


        // Limpiar formulario
        flagForm.reset();


        // Limpiar ubicación
        selectedLat = null;
        selectedLng = null;


        if (locationMarker) {

            locationMap.removeLayer(
                locationMarker
            );

            locationMarker = null;

        }


        actualizarEstadoUbicacion();


        // Actualizar el mapa principal.
        // La nueva bandera es "oculta",
        // así que no aparecerá hasta estar verificada.
        await cargarBanderas();


        // Cerrar después de un momento
        setTimeout(
            function() {

                cerrarFormulario();

                formMessage.textContent =
                    "";

            },
            1800
        );


    } catch (error) {

        console.error(
            "Error inesperado:",
            error
        );


        formMessage.textContent =
            "❌ Ha ocurrido un error al enviar la bandera.";

    }

}


// ==========================================
// EVITAR SCROLL ACCIDENTAL
// EN EL MAPA DEL FORMULARIO
// ==========================================

locationMap.on(
    "mousedown",
    function() {

        locationMap.dragging.enable();

    }
);


// ==========================================
// TECLA ESC PARA CERRAR MODAL
// ==========================================

document.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key === "Escape"
        ) {

            cerrarFormulario();

        }

    }
);
