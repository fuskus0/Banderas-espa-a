// ==========================================
// SUPABASE
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

const map = L.map("map");

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
    }
).addTo(map);

map.setView(
    [40.2, -3.7],
    6
);


const markers = [];


// ==========================================
// CARGAR BANDERAS
// ==========================================

async function cargarBanderas() {

    const { data, error } =
        await supabaseClient
            .from("banderas")
            .select("*");

    if (error) {

        console.error(
            "Error cargando banderas:",
            error
        );

        return;
    }


    data.forEach(bandera => {

        let estadoTexto;

        if (
            bandera.estado === "verificada"
        ) {

            estadoTexto =
                "🟢 VERIFICADA";

        } else {

            estadoTexto =
                "🟡 EN REVISIÓN";

        }


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
                    📍 ${escapeHtml(bandera.municipio)}
                </p>

                <p>
                    🗺️ ${escapeHtml(bandera.provincia)}
                </p>

                <p>
                    📅 ${bandera.fecha_vista}
                </p>

                <p>
                    ${estadoTexto}
                </p>

                <hr>

                <p>
                    ${escapeHtml(
                        bandera.descripcion || ""
                    )}
                </p>

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

    });

}


// ==========================================
// ESCAPAR TEXTO
// ==========================================

function escapeHtml(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;

}


// ==========================================
// INICIAR
// ==========================================

cargarBanderas();


// ==========================================
// ABRIR MAPA / NAVEGACIÓN
// ==========================================

function findFlag(lat, lng) {

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


searchInput.addEventListener(
    "input",
    () => {

        const texto =
            searchInput.value
                .toLowerCase()
                .trim();


        if (!texto) {

            return;

        }


        const resultado =
            markers.find(item => {

                return (

                    item.bandera.municipio
                        .toLowerCase()
                        .includes(texto)

                    ||

                    item.bandera.provincia
                        .toLowerCase()
                        .includes(texto)

                );

            });


        if (resultado) {

            map.setView(
                [
                    resultado.bandera.latitud,
                    resultado.bandera.longitud
                ],
                12
            );


            resultado.marker.openPopup();

        }

    }
);


// ==========================================
// MODAL
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

    submitModal.style.display =
        "flex";


    setTimeout(
        () => {

            locationMap.invalidateSize();

        },
        100
    );

}


function cerrarFormulario() {

    submitModal.style.display =
        "none";

}


// ==========================================
// MAPA PARA ELEGIR UBICACIÓN
// ==========================================

const locationMap =
    L.map("locationMap");


L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution:
            "&copy; OpenStreetMap contributors"
    }
).addTo(locationMap);


// España aproximadamente

locationMap.setView(
    [40.2, -3.7],
    6
);


let selectedLat = null;
let selectedLng = null;
let locationMarker = null;


// ==========================================
// SELECCIONAR UBICACIÓN TOCANDO EL MAPA
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
// COLOCAR MARCADOR
// ==========================================

function seleccionarUbicacion(
    lat,
    lng
) {

    selectedLat = lat;
    selectedLng = lng;


    if (locationMarker) {

        locationMarker.setLatLng([
            lat,
            lng
        ]);

    } else {

        locationMarker =
            L.marker(
                [lat, lng],
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


    document.getElementById(
        "locationStatus"
    ).textContent =
        "Ubicación seleccionada ✓";

}


// ==========================================
// USAR UBICACIÓN DEL MÓVIL
// ==========================================

const useLocationButton =
    document.getElementById(
        "useLocationButton"
    );


useLocationButton.addEventListener(
    "click",
    function() {

        if (
            !navigator.geolocation
        ) {

            alert(
                "Tu navegador no permite obtener la ubicación."
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
                    [lat, lng],
                    16
                );


                useLocationButton.disabled =
                    false;


                useLocationButton.textContent =
                    "📍 Usar mi ubicación";

            },

            function(error) {

                console.error(error);


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
);


// ==========================================
// ENVIAR BANDERA
// ==========================================

flagForm.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        formMessage.textContent =
            "Enviando bandera...";


        const municipio =
            document.getElementById(
                "municipio"
            ).value.trim();


        const provincia =
            document.getElementById(
                "provincia"
            ).value.trim();


        const fechaVista =
            document.getElementById(
                "fechaVista"
            ).value;


        const descripcion =
            document.getElementById(
                "descripcion"
            ).value.trim();


        // Comprobar ubicación

        if (
            selectedLat === null ||
            selectedLng === null
        ) {

            formMessage.textContent =
                "❌ Primero señala aproximadamente dónde viste la bandera.";

            return;

        }


        // Comprobar que está aproximadamente dentro de España

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

                    estado:
                        "revision"

                });


        if (error) {

            console.error(
                error
            );


            formMessage.textContent =
                "❌ No se pudo enviar la bandera.";

            return;

        }


        formMessage.textContent =
            "✅ ¡Bandera enviada! Ahora será revisada.";


        flagForm.reset();


        selectedLat = null;
        selectedLng = null;


        if (locationMarker) {

            locationMap.removeLayer(
                locationMarker
            );

            locationMarker = null;

        }


        document.getElementById(
            "locationStatus"
        ).textContent =
            "Toca el mapa para elegirla";


        setTimeout(
            () => {

                cerrarFormulario();

                formMessage.textContent =
                    "";

            },
            1800
        );

    }
);


// ==========================================
// CERRAR MODAL AL PULSAR FUERA
// ==========================================

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
