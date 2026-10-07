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
// MAPA
// ====================================

const map = L.map("map");

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
    }
).addTo(map);

map.setView([40.2, -3.7], 6);


// ====================================
// MARCADORES
// ====================================

const markers = [];


// ====================================
// CARGAR BANDERAS
// ====================================

async function cargarBanderas() {

    const { data, error } =
        await supabaseClient
            .from("banderas")
            .select("*");


    if (error) {

        console.error(error);
        return;
    }


    data.forEach(bandera => {

        let estadoTexto;

        if (
            bandera.estado ===
            "verificada"
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

            <div>

                <h3>
                    🇪🇸 Bandera #${bandera.id}
                </h3>

                <p>
                    📍 ${bandera.municipio}
                </p>

                <p>
                    📅 ${bandera.fecha_vista}
                </p>

                <p>
                    ${estadoTexto}
                </p>

                <hr>

                <p>
                    ${bandera.descripcion || ""}
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

cargarBanderas();


// ====================================
// GOOGLE MAPS
// ====================================

function findFlag(lat, lng) {

    const url =
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    window.open(url, "_blank");

}


// ====================================
// BUSCADOR
// ====================================

const searchInput =
    document.getElementById(
        "searchInput"
    );

searchInput.addEventListener(
    "input",
    () => {

        const texto =
            searchInput.value
                .toLowerCase();

        const resultado =
            markers.find(item => {

                return (

                    item.bandera
                        .municipio
                        .toLowerCase()
                        .includes(texto)

                    ||

                    item.bandera
                        .provincia
                        .toLowerCase()
                        .includes(texto)

                );

            });

        if (resultado) {

            map.setView(
                [
                    resultado.bandera
                        .latitud,

                    resultado.bandera
                        .longitud
                ],
                12
            );

            resultado.marker
                .openPopup();

        }

    }
);


// ====================================
// BOTÓN DEMO
// ====================================

function showDemoMessage() {

    alert(
        "Próximamente podrás enviar banderas."
    );

}

// ====================================
// FORMULARIO DE BANDERAS
// ====================================

const submitModal =
    document.getElementById("submitModal");

const flagForm =
    document.getElementById("flagForm");

const formMessage =
    document.getElementById("formMessage");


// ====================================
// ABRIR FORMULARIO
// ====================================

function abrirFormulario() {

    submitModal.style.display =
        "flex";

}


// ====================================
// CERRAR FORMULARIO
// ====================================

function cerrarFormulario() {

    submitModal.style.display =
        "none";

}


// ====================================
// ENVIAR BANDERA
// ====================================

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

        const latitud =
            Number(
                document.getElementById(
                    "latitud"
                ).value
            );

        const longitud =
            Number(
                document.getElementById(
                    "longitud"
                ).value
            );

        const fechaVista =
            document.getElementById(
                "fechaVista"
            ).value;

        const descripcion =
            document.getElementById(
                "descripcion"
            ).value.trim();


        // Comprobar coordenadas

        if (
            !Number.isFinite(latitud) ||
            !Number.isFinite(longitud)
        ) {

            formMessage.textContent =
                "❌ La ubicación no es válida.";

            return;

        }


        // Comprobar España

        if (
            latitud < 35 ||
            latitud > 44 ||
            longitud < -10 ||
            longitud > 5
        ) {

            formMessage.textContent =
                "❌ La ubicación parece estar fuera de España.";

            return;

        }


        const {
            error
        } = await supabaseClient
            .from("banderas")
            .insert({
                municipio: municipio,
                provincia: provincia,
                latitud: latitud,
                longitud: longitud,
                fecha_vista: fechaVista,
                descripcion: descripcion,
                estado: "revision"
            });


        if (error) {

            console.error(error);

            formMessage.textContent =
                "❌ No se pudo enviar la bandera.";

            return;

        }


        formMessage.textContent =
            "✅ ¡Bandera enviada! Ahora será revisada.";

        flagForm.reset();

    }
);
