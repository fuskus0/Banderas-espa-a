
"use strict";

/* ==========================================
   CONFIGURACIÓN SUPABASE
========================================== */

const SUPABASE_URL =
    "https://yljxozttfnvyjrwrvcab.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_V73MAvXSKRKH6cZh_AfDxQ__0rXOxKE";

if (!window.supabase) {
    throw new Error("No se ha cargado Supabase.");
}

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const BUCKET_PUBLICO = "banderas-fotos-publicas";
const MAX_FOTO_BYTES = 8 * 1024 * 1024;


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

const markers = [];
let todasLasBanderas = [];


/* ==========================================
   CARGAR BANDERAS PÚBLICAS
========================================== */

async function cargarBanderas() {
    try {
        const { data, error } = await supabaseClient
            .from("banderas")
            .select("*")
            .in("estado", ["revision", "verificada"])
            .order("creado_en", { ascending: false });

        if (error) {
            console.error("Error cargando banderas:", error);
            return;
        }

        todasLasBanderas = data || [];

        markers.forEach(item => map.removeLayer(item.marker));
        markers.length = 0;

        todasLasBanderas.forEach(crearMarcador);

    } catch (error) {
        console.error("Error inesperado:", error);
    }
}


/* ==========================================
   FOTOGRAFÍA PÚBLICA
========================================== */

function obtenerUrlPublica(bandera) {
    if (!bandera.foto_publica_path) {
        return null;
    }

    const { data } = supabaseClient.storage
        .from(BUCKET_PUBLICO)
        .getPublicUrl(bandera.foto_publica_path);

    return data?.publicUrl || null;
}


/* ==========================================
   CREAR MARCADOR
========================================== */

function crearMarcador(bandera) {
    const lat = Number(bandera.latitud);
    const lng = Number(bandera.longitud);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
    }

    const marker = L.marker([lat, lng]).addTo(map);

    const verificada = bandera.estado === "verificada";
    const urlFoto = obtenerUrlPublica(bandera);

    const estadoHTML = verificada
        ? `<p class="flag-status-verified">🟢 VERIFICADA</p>`
        : `
            <p class="flag-status-review">🟡 EN REVISIÓN</p>
            <p class="flag-review-info">
                Esta bandera todavía no ha sido confirmada.
            </p>
        `;

    const fotoHTML = urlFoto
        ? `
            <div class="flag-photo-container">
                <img
                    class="flag-photo ${verificada ? "" : "flag-photo-blurred"}"
                    src="${escapeHtml(urlFoto)}"
                    alt="${verificada
                        ? "Fotografía de la bandera verificada"
                        : "Fotografía borrosa de una bandera en revisión"}"
                    loading="lazy"
                    referrerpolicy="no-referrer"
                >
                ${
                    verificada
                        ? ""
                        : `<p class="flag-review-info">
                            Imagen borrosa hasta su verificación.
                           </p>`
                }
            </div>
        `
        : `
            <p class="flag-review-info">
                📷 No hay fotografía pública disponible.
            </p>
        `;

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
            ${fotoHTML}

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

    markers.push({ marker, bandera });
}


/* ==========================================
   ESCAPAR HTML
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
   FECHAS
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

            return municipio.includes(texto) ||
                provincia.includes(texto);
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
        if (locationMap) locationMap.invalidateSize();
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
    submitModal.addEventListener("click", event => {
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

let selectedLat = null;
let selectedLng = null;
let locationMarker = null;

locationMap.on("click", event => {
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

        locationMarker.on("dragend", event => {
            const position = event.target.getLatLng();
            seleccionarUbicacion(position.lat, position.lng);
        });
    }

    actualizarEstadoUbicacion();
}

function actualizarEstadoUbicacion() {
    const status = document.getElementById("locationStatus");

    if (!status) return;

    status.textContent =
        selectedLat === null
            ? "Haz clic o toca el mapa para elegirla"
            : "Ubicación seleccionada ✓";
}


/* ==========================================
   GEOLOCALIZACIÓN
========================================== */

const useLocationButton =
    document.getElementById("useLocationButton");

if (useLocationButton) {
    useLocationButton.addEventListener("click", obtenerUbicacion);
}

function obtenerUbicacion() {
    if (!navigator.geolocation) {
        alert("Selecciona la ubicación manualmente en el mapa.");
        return;
    }

    useLocationButton.disabled = true;
    useLocationButton.textContent = "📍 Obteniendo ubicación...";

    navigator.geolocation.getCurrentPosition(
        position => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            seleccionarUbicacion(lat, lng);
            locationMap.setView([lat, lng], 16);

            useLocationButton.disabled = false;
            useLocationButton.textContent = "📍 Usar mi ubicación";
        },
        error => {
            console.error("Error de geolocalización:", error);

            alert("No se ha podido obtener la ubicación. Puedes marcarla manualmente.");

            useLocationButton.disabled = false;
            useLocationButton.textContent = "📍 Usar mi ubicación";
        },
        {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 60000
        }
    );
}


/* ==========================================
   ENVIAR BANDERA Y FOTO PRIVADA
========================================== */

if (flagForm) {
    flagForm.addEventListener("submit", enviarBandera);
}

async function enviarBandera(event) {
    event.preventDefault();

    if (!formMessage) return;

    const municipio =
        document.getElementById("municipio").value.trim();

    const provincia =
        document.getElementById("provincia").value.trim();

    const fechaVista =
        document.getElementById("fechaVista").value;

    const descripcion =
        document.getElementById("descripcion").value.trim();

    const fotoInput = document.getElementById("foto");
    const foto = fotoInput?.files?.[0];

    if (!municipio || !provincia || !fechaVista) {
        formMessage.textContent =
            "❌ Completa el municipio, la provincia y la fecha.";
        return;
    }

    if (!foto) {
        formMessage.textContent =
            "❌ Selecciona una fotografía.";
        return;
    }

    const tiposPermitidos = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!tiposPermitidos.includes(foto.type)) {
        formMessage.textContent =
            "❌ Usa una imagen JPG, PNG o WebP.";
        return;
    }

    if (foto.size > MAX_FOTO_BYTES) {
        formMessage.textContent =
            "❌ La imagen supera el límite de 8 MB.";
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

    const submitButton = flagForm.querySelector(
        'button[type="submit"]'
    );

    if (submitButton) submitButton.disabled = true;

    let rutaFoto = null;
    let registroCreado = false;

    try {
        formMessage.textContent = "📤 Subiendo fotografía privada...";

        const extension = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp"
        }[foto.type];

        const nombreUnico =
            `banderas/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabaseClient.storage
            .from("banderas-fotos")
            .upload(nombreUnico, foto, {
                contentType: foto.type,
                cacheControl: "3600",
                upsert: false
            });

        if (uploadError) throw uploadError;

        rutaFoto = nombreUnico;

        formMessage.textContent = "📝 Guardando registro...";

        const { error: insertError } = await supabaseClient
            .from("banderas")
            .insert({
                municipio,
                provincia,
                latitud: selectedLat,
                longitud: selectedLng,
                fecha_vista: fechaVista,
                descripcion,
                estado: "oculta",
                foto_url: rutaFoto
            });

        if (insertError) throw insertError;

        registroCreado = true;

        formMessage.textContent =
            "✅ Bandera enviada. Un administrador revisará la foto.";

        flagForm.reset();

        selectedLat = null;
        selectedLng = null;

        if (locationMarker) {
            locationMap.removeLayer(locationMarker);
            locationMarker = null;
        }

        actualizarEstadoUbicacion();
        await cargarBanderas();

        setTimeout(() => {
            cerrarFormulario();
            formMessage.textContent = "";
        }, 2200);

    } catch (error) {
        console.error("Error al enviar bandera:", error);

        /*
         * Si falla la inserción, intentamos eliminar el archivo
         * que acabamos de subir para no dejarlo abandonado.
         */
        if (rutaFoto && !registroCreado) {
            const { error: cleanupError } = await supabaseClient.storage
                .from("banderas-fotos")
                .remove([rutaFoto]);

            if (cleanupError) {
                console.error(
                    "No se pudo limpiar la foto:",
                    cleanupError
                );
            }
        }

        formMessage.textContent =
            "❌ No se pudo enviar: " +
            (error.message || "error inesperado.");

    } finally {
        if (submitButton) submitButton.disabled = false;
    }
}


/* ==========================================
   ESCAPE E INICIO
========================================== */

document.addEventListener("keydown", event => {
    if (event.key === "Escape") cerrarFormulario();
});

actualizarEstadoUbicacion();
cargarBanderas();
