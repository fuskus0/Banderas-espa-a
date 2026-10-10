
/* ==========================================
   CONFIGURACIÓN SUPABASE
========================================== */

const SUPABASE_URL = "https://yljxozttfnvyjrwrvcab.supabase.co";
const SUPABASE_KEY = "sb_publishable_V73MAvXSKRKH6cZh_AfDxQ__0rXOxKE";

if (!window.supabase) {
    throw new Error("No se ha cargado la librería de Supabase.");
}

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


/* ==========================================
   MAPA PRINCIPAL
========================================== */

const map = L.map("map", {
    zoomControl: true
});

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

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
   oculta     = no visible públicamente
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
            console.error("Error cargando las banderas:", error);
            return;
        }

        todasLasBanderas = data || [];

        console.log("Banderas públicas recibidas:", todasLasBanderas.length);
        console.log(
            "Estados recibidos:",
            todasLasBanderas.map(b => ({
                id: b.id,
                estado: b.estado
            }))
        );

        markers.forEach(item => map.removeLayer(item.marker));
        markers.length = 0;

        todasLasBanderas.forEach(crearMarcador);

    } catch (error) {
        console.error("Error inesperado al cargar banderas:", error);
    }
}


/* ==========================================
   CREAR MARCADOR
   Esta función debe existir una sola vez.
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
            <p class="flag-status-review">🟡 EN REVISIÓN</p>
            <p class="flag-review-info">
                Esta bandera ha sido registrada,
                pero todavía no ha sido confirmada.
            </p>
        `;
    } else if (bandera.estado === "verificada") {
        estadoHTML = `
            <p class="flag-status-verified">🟢 VERIFICADA</p>
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


/* ==========================================
   ESCAPAR TEXTO
========================================== */

function escapeHtml(value) {
    if (value === null || value === undefined) {
        return "";
    }

    const div = document.createElement("div");
    div.textContent = String(value);
    return div.innerHTML;
}


/* ==========================================
   FORMATEAR FECHA
========================================== */

function formatearFecha(fecha) {
    if (!fecha) return "";

    const partes = String(fecha).split("-");

    if (partes.length !== 3) {
        return String(fecha);
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

window.findFlag = findFlag;


/* ==========================================
   BUSCADOR
========================================== */

const searchInput = document.getElementById("searchInput");

if (searchInput) {
    searchInput.addEventListener("input", function () {
        const texto = searchInput.value.toLowerCase().trim();

        if (!texto) return;

        const resultados = markers.filter(item => {
            const municipio =
                String(item.bandera.municipio || "").toLowerCase();

            const provincia =
                String(item.bandera.provincia || "").toLowerCase();

            return municipio.includes(texto) || provincia.includes(texto);
        });

        if (resultados.length === 0) return;

        const resultado = resultados[0];

        map.setView([
            Number(resultado.bandera.latitud),
            Number(resultado.bandera.longitud)
        ], 12);

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
    if (!submitModal) return;

    submitModal.style.display = "flex";
    submitModal.setAttribute("aria-hidden", "false");

    setTimeout(() => {
        if (locationMap) {
            locationMap.invalidateSize();
        }
    }, 150);
}

function cerrarFormulario() {
    if (!submitModal) return;

    submitModal.style.display = "none";
    submitModal.setAttribute("aria-hidden", "true");
}

window.abrirFormulario = abrirFormulario;
window.cerrarFormulario = cerrarFormulario;

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

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
}).addTo(locationMap);

locationMap.setView([40.2, -3.7], 6);


/* ==========================================
   SELECCIÓN DE UBICACIÓN
========================================== */

let selectedLat = null;
let selectedLng = null;
let locationMarker = null;

locationMap.on("click", function (event) {
    seleccionarUbicacion(event.latlng.lat, event.latlng.lng);
});

function seleccionarUbicacion(lat, lng) {
    selectedLat = Number(lat);
    selectedLng = Number(lng);

    if (locationMarker) {
        locationMarker.setLatLng([selectedLat, selectedLng]);
    } else {
        locationMarker = L.marker(
            [selectedLat, selectedLng],
            { draggable: true }
        ).addTo(locationMap);

        locationMarker.on("dragend", function (event) {
            const position = event.target.getLatLng();

            seleccionarUbicacion(position.lat, position.lng);
        });
    }

    actualizarEstadoUbicacion();
}

function actualizarEstadoUbicacion() {
    const locationStatus = document.getElementById("locationStatus");

    if (!locationStatus) return;

    locationStatus.textContent =
        selectedLat === null || selectedLng === null
            ? "Haz clic o toca el mapa para elegirla"
            : "Ubicación seleccionada ✓";
}


/* ==========================================
   USAR MI UBICACIÓN
========================================== */

const useLocationButton =
    document.getElementById("useLocationButton");

if (useLocationButton) {
    useLocationButton.addEventListener("click", obtenerUbicacion);
}

function obtenerUbicacion() {
    if (!navigator.geolocation) {
        alert("No se puede obtener la ubicación. Selecciónala manualmente en el mapa.");
        return;
    }

    if (useLocationButton) {
        useLocationButton.disabled = true;
        useLocationButton.textContent = "📍 Obteniendo ubicación...";
    }

    navigator.geolocation.getCurrentPosition(
        function (position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            seleccionarUbicacion(lat, lng);
            locationMap.setView([lat, lng], 16);

            if (useLocationButton) {
                useLocationButton.disabled = false;
                useLocationButton.textContent = "📍 Usar mi ubicación";
            }
        },
        function (error) {
            console.error("Error de geolocalización:", error);

            alert("No se ha podido obtener tu ubicación. Puedes marcarla manualmente.");

            if (useLocationButton) {
                useLocationButton.disabled = false;
                useLocationButton.textContent = "📍 Usar mi ubicación";
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

    if (!formMessage) return;

    formMessage.textContent = "Enviando bandera...";

    const municipio =
        document.getElementById("municipio").value.trim();

    const provincia =
        document.getElementById("provincia").value.trim();

    const fechaVista =
        document.getElementById("fechaVista").value;

    const descripcion =
        document.getElementById("descripcion").value.trim();

    if (!municipio || !provincia || !fechaVista) {
        formMessage.textContent =
            "❌ Completa el municipio, la provincia y la fecha.";
        return;
    }

    if (selectedLat === null || selectedLng === null) {
        formMessage.textContent =
            "❌ Selecciona primero la ubicación en el mapa.";
        return;
    }

    if (
        !Number.isFinite(selectedLat) ||
        !Number.isFinite(selectedLng) ||
        selectedLat < 35 ||
        selectedLat > 44 ||
        selectedLng < -10 ||
        selectedLng > 5
    ) {
        formMessage.textContent =
            "❌ La ubicación no parece estar dentro de España.";
        return;
    }

    try {
        const { error } = await supabaseClient
            .from("banderas")
            .insert({
                municipio,
                provincia,
                latitud: selectedLat,
                longitud: selectedLng,
                fecha_vista: fechaVista,
                descripcion,
                estado: "oculta"
            });

        if (error) {
            console.error("Error Supabase:", error);
            formMessage.textContent =
                "❌ No se pudo enviar la bandera: " + error.message;
            return;
        }

        formMessage.textContent =
            "✅ ¡Bandera enviada! Un administrador revisará el registro.";

        flagForm.reset();

        selectedLat = null;
        selectedLng = null;

        if (locationMarker) {
            locationMap.removeLayer(locationMarker);
            locationMarker = null;
        }

        actualizarEstadoUbicacion();

        // Los registros ocultos no aparecen en el mapa público.
        await cargarBanderas();

        setTimeout(() => {
            cerrarFormulario();
            formMessage.textContent = "";
        }, 1800);

    } catch (error) {
        console.error("Error inesperado al enviar:", error);
        formMessage.textContent =
            "❌ Ha ocurrido un error al enviar la bandera.";
    }
}


/* ==========================================
   CERRAR CON ESCAPE
========================================== */

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        cerrarFormulario();
    }
});


/* ==========================================
   INICIAR
========================================== */

actualizarEstadoUbicacion();
cargarBanderas();
