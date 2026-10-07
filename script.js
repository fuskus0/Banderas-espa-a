// ==========================================
// BANDERAS DE ESPAÑA
// V1 - DATOS DEMO
// ==========================================


// ------------------------------------------
// DATOS DE PRUEBA
// ------------------------------------------

const banderas = [

    {
        id: "DEMO-0001",
        municipio: "Valencia",
        provincia: "Valencia",
        lat: 39.4699,
        lng: -0.3763,
        fecha: "07/10/2026",
        estado: "verificada",
        descripcion: "Registro ficticio para probar el mapa."
    },

    {
        id: "DEMO-0002",
        municipio: "Madrid",
        provincia: "Madrid",
        lat: 40.4168,
        lng: -3.7038,
        fecha: "07/10/2026",
        estado: "revision",
        descripcion: "Este registro es completamente ficticio."
    },

    {
        id: "DEMO-0003",
        municipio: "Barcelona",
        provincia: "Barcelona",
        lat: 41.3874,
        lng: 2.1686,
        fecha: "06/10/2026",
        estado: "verificada",
        descripcion: "Ubicación DEMO para probar el sistema."
    },

    {
        id: "DEMO-0004",
        municipio: "Sevilla",
        provincia: "Sevilla",
        lat: 37.3891,
        lng: -5.9845,
        fecha: "05/10/2026",
        estado: "revision",
        descripcion: "Bandera ficticia de demostración."
    }

];


// ------------------------------------------
// CREAR MAPA
// ------------------------------------------

const map = L.map("map");


// Mapa de OpenStreetMap

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }
).addTo(map);


// Vista inicial de España

map.setView(
    [40.2, -3.7],
    6
);


// ------------------------------------------
// CREAR MARCADORES
// ------------------------------------------

const markers = [];

banderas.forEach(bandera => {

    const marker = L.marker([
        bandera.lat,
        bandera.lng
    ]).addTo(map);


    // Estado

    let estadoTexto;
    let estadoClase;

    if (bandera.estado === "verificada") {

        estadoTexto = "🟢 VERIFICADA";
        estadoClase = "verified";

    } else {

        estadoTexto = "🟡 EN REVISIÓN";
        estadoClase = "review";

    }


    // Ventana del marcador

    marker.bindPopup(`

        <div class="popup">

            <h3>🇪🇸 Bandera ${bandera.id}</h3>

            <p>
                📍 <strong>${bandera.municipio}</strong>,
                ${bandera.provincia}
            </p>

            <p>
                📅 Vista: ${bandera.fecha}
            </p>

            <p class="${estadoClase}">
                ${estadoTexto}
            </p>

            <hr>

            <p>
                ${bandera.descripcion}
            </p>

            <p class="demo-text">
                ⚠️ REGISTRO DEMO
            </p>

            <button
                class="find-button"
                onclick="findFlag(${bandera.lat}, ${bandera.lng})"
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


// ------------------------------------------
// BOTÓN "INTENTAR ENCONTRARLA"
// ------------------------------------------

function findFlag(lat, lng) {

    const url =
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    window.open(url, "_blank");

}


// ------------------------------------------
// BUSCADOR
// ------------------------------------------

const searchInput =
    document.getElementById("searchInput");


searchInput.addEventListener("input", () => {

    const texto =
        searchInput.value
            .toLowerCase()
            .trim();


    if (!texto) {

        map.setView(
            [40.2, -3.7],
            6
        );

        return;
    }


    const resultados =
        markers.filter(item => {

            const bandera = item.bandera;

            return (

                bandera.municipio
                    .toLowerCase()
                    .includes(texto)

                ||

                bandera.provincia
                    .toLowerCase()
                    .includes(texto)

            );

        });


    if (resultados.length > 0) {

        const resultado =
            resultados[0];


        map.setView(
            [
                resultado.bandera.lat,
                resultado.bandera.lng
            ],
            12
        );


        resultado.marker.openPopup();

    }

});


// ------------------------------------------
// BOTÓN DE ENVIAR BANDERA
// ------------------------------------------

function showDemoMessage() {

    alert(
        "🚧 Esta función todavía está en desarrollo.\n\n" +
        "En una próxima versión podrás enviar " +
        "fotografías y registrar nuevas banderas."
    );

}