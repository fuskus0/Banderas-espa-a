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
// CARGAR BANDERAS DESDE SUPABASE
// ==========================================

async function cargarBanderas() {

    try {

        const { data, error } =
            await supabaseClient
                .from("banderas")
                .select("*")
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

    let estadoTexto;
    let estadoClase;


    if (
        bandera.estado ===
        "verificada"
    ) {

        estadoTexto =
            "🟢 VERIFICADA";

        estadoClase =
            "verified";

    } else {

        estadoTexto =
            "🟡 EN REVISIÓN";

        estadoClase =
            "review";

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
                ${estadoTexto}
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

    
