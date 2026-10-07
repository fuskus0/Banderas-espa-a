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

const map =
    L.map("map");


L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution:
            "&copy; OpenStreetMap contributors"
    }
).addTo(map);


map.setView(
    [40.2, -3.7],
    6
);


const markers = [];


// ==========================================
// CARGAR SOLO VERIFICADAS
// ==========================================

async function cargarBanderas() {

    const { data, error } = await supabaseClient
    .from("banderas")
    .select("*")
    .order("creado_en", { ascending: false });


    if (error) {

        console.error(
            "Error cargando banderas:",
            error
        );

        return;

    }


    data.forEach(
        bandera => {

            const marker =
                L.marker(
                    [
                        bandera.latitud,
                        bandera.longitud
                    ]
                ).addTo(map);


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
                        📅 ${bandera.fecha_vista}
                    </p>

                    <p>
                        🟢 VERIFICADA
                    </p>

                    <hr>

                    <p>
                        ${escapeHtml(
                            bandera.descripcion || ""
                        )}
                    </p>

                    ${
                        bandera.foto_url
                        ?
                        `
                        <img
                            src="${bandera.foto_url}"
                            class="popup-photo"
                            alt="Foto de la bandera"
                        >
                        `
                        :
                        ""
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

                marker,
                bandera

            });

        }
    );

}


// ==========================================
// SEGURIDAD HTML
// ==========================================

function escapeHtml(text) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        text;

    return div.innerHTML;

}


cargarBanderas();


// ==========================================
// GOOGLE MAPS
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
            markers.find(
                item => {

                    return (

                        item.bandera.municipio
                            .toLowerCase()
                            .includes(texto)

                        ||

                        item.bandera.provincia
                            .toLowerCase()
                            .includes(texto)

                    );

                }
            );


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
        250
    );

}


function cerrarFormulario() {

    submitModal.style.display =
        "none";

}


// ==========================================
// MAPA DE UBICACIÓN
// ==========================================

const locationMap =
    L.map(
        "locationMap"
    );


L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution:
            "&copy; OpenStreetMap contributors"
    }
).addTo(locationMap);


locationMap.setView(
    [40.2, -3.7],
    6
);


let selectedLat = null;
let selectedLng = null;
let locationMarker = null;


// ==========================================
// CLICK EN MAPA
// ==========================================

locationMap.on(
    "click",
    event => {

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

    selectedLat =
        lat;

    selectedLng =
        lng;


    if (locationMarker) {

        locationMarker.setLatLng(
            [
                lat,
                lng
            ]
        );

    } else {

        locationMarker =
            L.marker(
                [
                    lat,
                    lng
                ],
                {
                    draggable: true
                }
            ).addTo(
                locationMap
            );


        locationMarker.on(
            "dragend",
            event => {

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
// GEOLOCALIZACIÓN
// ==========================================

const useLocationButton =
    document.getElementById(
        "useLocationButton"
    );


useLocationButton.addEventListener(
    "click",
    () => {

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
            "📍 Obteniendo...";


        navigator.geolocation.getCurrentPosition(

            position => {

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


            error => {

                console.error(
                    error
                );


                alert(
                    "No se ha podido obtener tu ubicación. Puedes seleccionar el punto manualmente."
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
// FOTO
// ==========================================

const fotoInput =
    document.getElementById(
        "foto"
    );


const photoPreview =
    document.getElementById(
        "photoPreview"
    );


fotoInput.addEventListener(
    "change",
    () => {

        photoPreview.innerHTML =
            "";


        const file =
            fotoInput.files[0];


        if (!file) {
            return;
        }


        const image =
            document.createElement(
                "img"
            );


        image.src =
            URL.createObjectURL(
                file
            );


        image.alt =
            "Vista previa de la bandera";


        photoPreview.appendChild(
            image
        );

    }
);


// ==========================================
// ENVIAR BANDERA
// ==========================================

flagForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        formMessage.textContent =
            "Preparando envío...";


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


        const foto =
            fotoInput.files[0];


        // UBICACIÓN

        if (
            selectedLat === null ||
            selectedLng === null
        ) {

            formMessage.textContent =
                "❌ Selecciona dónde viste la bandera.";

            return;

        }


        // FOTO

        if (!foto) {

            formMessage.textContent =
                "❌ Necesitamos una foto de la bandera.";

            return;

        }


        // TAMAÑO

        if (
            foto.size >
            10 * 1024 * 1024
        ) {

            formMessage.textContent =
                "❌ La foto no puede superar los 10 MB.";

            return;

        }


        // TIPO

        if (
            !foto.type.startsWith(
                "image/"
            )
        ) {

            formMessage.textContent =
                "❌ El archivo debe ser una imagen.";

            return;

        }


        // ESPAÑA

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


        try {


            // ==================================
            // SUBIR FOTO
            // ==================================

            formMessage.textContent =
                "📸 Subiendo fotografía...";


            const extension =
                foto.name
                    .split(".")
                    .pop()
                    .toLowerCase();


            const nombreArchivo =
                `${crypto.randomUUID()}.${extension}`;


            const ruta =
                `pendientes/${nombreArchivo}`;


            const {
                error: uploadError
            } =
                await supabaseClient
                    .storage
                    .from(
                        "banderas-fotos"
                    )
                    .upload(
                        ruta,
                        foto,
                        {
                            cacheControl:
                                "3600",
                            upsert:
                                false,
                            contentType:
                                foto.type
                        }
                    );


            if (
                uploadError
            ) {

                console.error(
                    uploadError
                );

                throw uploadError;

            }


            // ==================================
            // URL DE FOTO
            // ==================================

            const {
                data: publicData
            } =
                supabaseClient
                    .storage
                    .from(
                        "banderas-fotos"
                    )
                    .getPublicUrl(
                        ruta
                    );


            const fotoUrl =
                publicData.publicUrl;


            // ==================================
            // GUARDAR BANDERA
            // ==================================

            formMessage.textContent =
                "📍 Guardando registro...";


            const {
                error
            } =
                await supabaseClient
                    .from(
                        "banderas"
                    )
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

                        foto_url:
                            fotoUrl,

                        estado:
                            "oculto"

                    });


            if (error) {

                console.error(
                    error
                );

                throw error;

            }


            // ==================================
            // ÉXITO
            // ==================================

            formMessage.textContent =
                "✅ ¡Enviado! Revisaremos la foto y la ubicación.";


            flagForm.reset();


            selectedLat =
                null;

            selectedLng =
                null;


            if (
                locationMarker
            ) {

                locationMap.removeLayer(
                    locationMarker
                );

                locationMarker =
                    null;

            }


            document.getElementById(
                "locationStatus"
            ).textContent =
                "Selecciona un punto del mapa";


            photoPreview.innerHTML =
                "";


            setTimeout(
                () => {

                    cerrarFormulario();

                    formMessage.textContent =
                        "";

                },
                2200
            );


        } catch (error) {

            console.error(
                error
            );


            formMessage.textContent =
                "❌ No se pudo enviar la bandera. Inténtalo de nuevo.";

        }

    }
);


// ==========================================
// CERRAR AL PULSAR FUERA
// ==========================================

submitModal.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            submitModal
        ) {

            cerrarFormulario();

        }

    }
);


// ==========================================
// SOLUCIONAR TAMAÑO DEL MAPA
// EN PC Y MÓVIL
// ==========================================

window.addEventListener(
    "resize",
    () => {

        map.invalidateSize();

        locationMap.invalidateSize();

    }
);
