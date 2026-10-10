
/* ==========================================
   CONFIGURACIÓN SUPABASE
========================================== */

const SUPABASE_URL =
    "https://yljxozttfnvyjrwrvcab.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_V73MAvXSKRKH6cZh_AfDxQ__0rXOxKE";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


/* ==========================================
   MAPA PRINCIPAL
========================================== */

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

map.setView([40.2, -3.7], 6);


/* ==========================================
   VARIABLES
========================================== */

const markers = [];
let todasLasBanderas = [];


/* ==========================================
   CARGAR BANDERAS PÚBLICAS

   revision   = visible, pendiente de confirmar
   verificada = visible, confirmada
   oculta     = nunca visible públicamente
========================================== */

async function cargarBanderas() {
    try {
        console.log("Cargando banderas públicas...");

        const { data, error } = await supabaseClient
            .from("banderas")
            .select("*")
            .in("estado", ["revision", "verificada"])
            .order("creado_en", { ascending: false });

        if (error) {
            console.error(
                "Error cargando las banderas:",
                error
            );
            return;
        }

        todasLasBanderas = data || [];

        console.log(
            "Banderas públicas recibidas:",
            todasLasBanderas.length
        );

        console.log(
            "Estados recibidos:",
            todasLasBanderas.map(b => ({
                id: b.id,
                estado: b.estado
            }))
        );

        // Eliminar los marcadores anteriores.
        markers.forEach(item => {
            map.removeLayer(item.marker);
        });

        markers.length = 0;

        // Crear los marcadores nuevos.
        todasLasBanderas.forEach(crearMarcador);

    } catch (error) {
        console.error(
            "Error inesperado al cargar banderas:",
            error
        );
    }
}


/* ==========================================
   CREAR UN MARCADOR
   IMPORTANTE: esta función solo aparece una vez.
========================================== */


function crearMarcador(bandera) {
    const lat = Number(bandera.latitud);
    const lng = Number(bandera.longitud);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        console.warn("Coordenadas inválidas:", bandera.id);
        return;
    }

    const marker = L.marker([lat, lng]).addTo(map);
    let estadoHTML = "";

    if (bandera.estado === "revision") {
        estadoHTML = `
            <p class="flag-status-review">
                🟡 EN REVISIÓN
            </p>
            <p class="flag-review-info">
                Esta bandera ha sido registrada,
                pero todavía no ha sido confirmada.
            </p>
        `;
    } else if (bandera.estado === "verificada") {
        estadoHTML = `
            <p class="flag-status-verified">
                🟢 VERIFICADA
            </p>
        `;
    }

    const descripcionHTML = bandera.descripcion
        ? `<p>${escapeHtml(bandera.descripcion)}</p>`
        : "";

    marker.bindPopup(`
        <div class="flag-popup">
            <h3>🇪🇸 Bandera #${escapeHtml(bandera.id)}</h3>
            <p>📍 ${escapeHtml(bandera.municipio)}</p>
            <p>🗺️ ${escapeHtml(bandera.provincia)}</p>
            <p>📅 ${formatearFecha(bandera.fecha_vista)}</p>
            ${estadoHTML}
            <hr>
            ${descripcionHTML}
            <button type="button" onclick="findFlag(${lat}, ${lng})">
                🧭 Intentar encontrarla
            </button>
        </div>
    `);

    markers.push({ marker, bandera });
}

    const marker = L.marker([lat, lng]).addTo(map);

    let estadoHTML = "";

    if (bandera.estado === "revision") {
        estadoHTML = `
            <p class="flag-status-review">
                🟡 EN REVISIÓN
            </p>
            <p class="flag-review-info">
                Esta bandera ha sido registrada,
                pero todavía no ha sido confirmada.
            </p>
        `;
    } else if (bandera.estado === "verificada") {
        estadoHTML = `
            <p class="flag-status-verified">
                🟢 VERIFICADA
            </p>
        `;
    }

    const descripcionHTML = bandera.descripcion
        ? `<p>${escapeHtml(bandera.descripcion)}</p>`
        : "";

    marker.bindPopup(`
        <div class="flag-popup">
            <h3>🇪🇸 Bandera #${escapeHtml(bandera.id)}</h3>

            <p>
                📍 ${escapeHtml(bandera.municipio)}
            </p>

            <p>
                🗺️ ${escapeHtml(bandera.provincia)}
            </p>

            <p>
                📅 ${formatearFecha(bandera.fecha_vista)}
            </p>

            ${estadoHTML}

            <hr>

            ${descripcionHTML}

            <button
                type="button"
                onclick="findFlag(${lat}, ${lng})"
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


/* ==========================================
   ESCAPAR TEXTO
========================================== */

function escapeHtml(text) {
    if (text === null || text === undefined) {
        return "";
    }

    const div = document.createElement("div");
    div.textContent = String(text);

    return div.innerHTML;
}


/* ==========================================
   FORMATEAR FECHA
========================================== */

function formatearFecha(fecha) {
    if (!fecha) {
        return "";
    }

    const partes = String(fecha).split("-");

    if (partes.length !== 3) {
        return fecha;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}


/* ==========================================
   NAVEGAR HASTA UNA BANDERA
========================================== */

function findFlag(lat, lng) {
    const url =
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    window.open(url, "_blank", "noopener");
}

// Permitir que el botón del popup llame a esta función.
window.findFlag = findFlag;


/* ==========================================
   BUSCADOR
========================================== */

const searchInput = document.getElementById("searchInput");

if (searchInput) {
    searchInput.addEventListener("input", function () {
        const texto = searchInput.value
            .toLowerCase()
            .trim();

        if (!texto) {
            return;
        }

        const resultados = markers.filter(item => {
            const municipio = (
                item.bandera.municipio || ""
            ).toLowerCase();

            const provincia = (
                item.bandera.provincia || ""
            ).toLowerCase();

            return (
                municipio.includes(texto) ||
                provincia.includes(texto)
            );
        });

        if (resultados.length === 0) {
            return;
        }

        const resultado = resultados[0];

        map.setView(
            [
                Number(resultado.bandera.latitud),
                Number(resultado.bandera.longitud)
            ],
            12
        );

        resultado.marker.openPopup();
    });
}


/* ==========================================
   MODAL DEL FORMULARIO
========================================== */

const submitModal = document.getElementById("submitModal");
const flagForm = document.getElementById("flagForm");
const formMessage = document.getElementById("formMessage");

function abrirFormulario() {
    if (!submitModal) {
        return;
    }

    submitModal.style.display = "flex";

    setTimeout(() => {
        if (locationMap) {
            locationMap.invalidateSize();
        }
    }, 150);
}

function cerrarFormulario() {
    if (!submitModal) {
        return;
    }

    submitModal.style.display = "none";
}

// Permitir que los botones HTML existentes llamen a estas funciones.
window.abrirFormulario = abrirFormulario;
window.cerrarFormulario = cerrarFormulario;


// Cerrar al pulsar fuera del formulario.
if (submitModal) {
    submitModal.addEventListener("click", function (event) {
        if (event.target === submitModal) {
            cerrarFormulario();
        }
    });
}


/* ==========================================
   MAPA DEL FORMULARIO
========================================== */

const locationMap = L.map("locationMap", {
    zoomControl: true
});

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
    }
).addTo(locationMap);

locationMap.setView([40.2, -3.7], 6);


/* ==========================================
   VARIABLES DE UBICACIÓN
========================================== */

let selectedLat = null;
let selectedLng = null;
let locationMarker = null;


/* ==========================================
   ELEGIR UBICACIÓN TOCANDO EL MAPA
========================================== */

locationMap.on("click", function (event) {
    seleccionarUbicacion(
        event.latlng.lat,
        event.latlng.lng
    );
});


function seleccionarUbicacion(lat, lng) {
    selectedLat = Number(lat);
    selectedLng = Number(lng);

    if (locationMarker) {
        locationMarker.setLatLng([
            selectedLat,
            selectedLng
        ]);
    } else {
        locationMarker = L.marker(
            [selectedLat, selectedLng],
            { draggable: true }
        ).addTo(locationMap);

        locationMarker.on("dragend", function (event) {
            const position = event.target.getLatLng();

            seleccionarUbicacion(
                position.lat,
                position.lng
            );
        });
    }

    locationMap.panTo([selectedLat, selectedLng]);

    actualizarEstadoUbicacion();
}


/* ==========================================
   TEXTO DE UBICACIÓN
========================================== */

function actualizarEstadoUbicacion() {
    const locationStatus =
        document.getElementById("locationStatus");

    if (!locationStatus) {
        return;
    }

    if (selectedLat === null || selectedLng === null) {
        locationStatus.textContent =
            "Haz clic o toca el mapa para elegirla";
        return;
    }

    locationStatus.textContent =
        "Ubicación seleccionada ✓";
}


/* ==========================================
   BOTÓN USAR MI UBICACIÓN
========================================== */

const useLocationButton =
    document.getElementById("useLocationButton");

if (useLocationButton) {
    useLocationButton.addEventListener(
        "click",
        obtenerUbicacion
    );
}

function obtenerUbicacion() {
    if (!navigator.geolocation) {
        alert(
            "Tu navegador no permite obtener la ubicación. Puedes señalarla manualmente en el mapa."
        );
        return;
    }

    if (useLocationButton) {
        useLocationButton.disabled = true;
        useLocationButton.textContent =
            "📍 Obteniendo ubicación...";
    }

    navigator.geolocation.getCurrentPosition(
        function (position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            seleccionarUbicacion(lat, lng);

            locationMap.setView([lat, lng], 16);

            if (useLocationButton) {
                useLocationButton.disabled = false;
                useLocationButton.textContent =
                    "📍 Usar mi ubicación";
            }
        },
        function (error) {
            console.error(
                "Error de geolocalización:",
                error
            );

            alert(
                "No hemos podido obtener tu ubicación. Puedes señalarla manualmente en el mapa."
            );

            if (useLocationButton) {
                useLocationButton.disabled = false;
                useLocationButton.textContent =
                    "📍 Usar mi ubicación";
            }
        },
        {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 60000
        }
    );
}


/* ==========================================
   ENVIAR FORMULARIO
========================================== */

if (flagForm) {
    flagForm.addEventListener("submit", enviarBandera);
}

async function enviarBandera(event) {
    event.preventDefault();

    if (!formMessage) {
        console.error(
            "No se encuentra el elemento formMessage."
        );
        return;
    }

    formMessage.textContent = "Enviando bandera...";
    formMessage.style.color = "";

    const municipio =
        document.getElementById("municipio")?.value.trim() || "";

    const provincia =
        document.getElementById("provincia")?.value.trim() || "";

    const fechaVista =
        document.getElementById("fechaVista")?.value || "";

    const descripcion =
        document.getElementById("descripcion")?.value.trim() || "";

    // Comprobar los campos obligatorios.
    if (!municipio || !provincia || !fechaVista) {
        formMessage.textContent =
            "❌ Completa el municipio, la provincia y la fecha.";
        return;
    }

    // Comprobar la ubicación.
    if (selectedLat === null || selectedLng === null) {
        formMessage.textContent =
            "❌ Primero señala aproximadamente dónde viste la bandera.";
        return;
    }

    if (
        !Number.isFinite(selectedLat) ||
        !Number.isFinite(selectedLng)
    ) {
        formMessage.textContent =
            "❌ La ubicación seleccionada no es válida.";
        return;
    }

    // Comprobación aproximada de España.
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
        const { error } = await supabaseClient
            .from("banderas")
            .insert({
                municipio: municipio,
                provincia: provincia,
                latitud: selectedLat,
                longitud: selectedLng,
                fecha_vista: fechaVista,
                descripcion: descripcion,

                // Las nuevas banderas no se publican
                // hasta que un administrador las revise.
                estado: "oculta"
            });

        if (error) {
            console.error("Error Supabase:", error);

            formMessage.textContent =
                "❌ No se pudo enviar la bandera: " +
                error.message;

            return;
        }

        formMessage.textContent =
            "✅ ¡Bandera enviada! Será revisada por un administrador.";

        flagForm.reset();

        selectedLat = null;
        selectedLng = null;

        if (locationMarker) {
            locationMap.removeLayer(locationMarker);
            locationMarker = null;
        }

        actualizarEstadoUbicacion();

        // No aparecerá públicamente porque empieza oculta.
        await cargarBanderas();

        setTimeout(function () {
            cerrarFormulario();
            formMessage.textContent = "";
        }, 1800);

    } catch (error) {
        console.error(
            "Error inesperado al enviar:",
            error
        );

        formMessage.textContent =
            "❌ Ha ocurrido un error al enviar la bandera.";
    }
}


/* ==========================================
   TECLA ESC PARA CERRAR EL MODAL
========================================== */

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        cerrarFormulario();
    }
});


/* ==========================================
   INICIAR
========================================== */

// Cargar banderas una vez inicializado el archivo.
cargarBanderas();

// Ajustar el mapa del formulario cuando se abre.
actualizarEstadoUbicacion();
