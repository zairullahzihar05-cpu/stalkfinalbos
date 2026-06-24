// =====================================================
// DATA SMA
// =====================================================

const schools = {
  "SMAN 1": [-3.316851, 114.582700],
  "SMAN 2": [-3.317361, 114.583359],
  "SMAN 3": [-3.318849, 114.615706],
  "SMAN 4": [-3.333860, 114.580435],
  "SMAN 5": [-3.306336, 114.602299],
  "SMAN 6": [-3.302645, 114.578213],
  "SMAN 7": [-3.339772, 114.620596],
  "SMAN 8": [-3.275298, 114.570444],
  "SMAN 9": [-3.3622183, 114.5929833],
  "SMAN 10": [-3.3532967, 114.5861033],
  "SMAN 11": [-3.291324, 114.614596],
  "SMAN 12": [-3.270964, 114.572396],
  "SMAN 13": [-3.361242, 114.620787]
};

// =====================================================
// INPUT OTOMATIS
// =====================================================

const schoolInputs =
document.getElementById("schoolInputs");

for (const school in schools) {

    const div =
    document.createElement("div");

    div.className = "school-group";

    div.innerHTML = `
        <label>${school}</label>
        <input
            type="number"
            step="0.01"
            id="${school}"
            placeholder="Masukkan jarak (meter)"
        >
    `;

    schoolInputs.appendChild(div);
}

// =====================================================
// PETA LEAFLET
// =====================================================

const map = L.map("map").setView(
    [-3.32, 114.59],
    12
);

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution:
        "&copy; OpenStreetMap contributors"
    }
).addTo(map);

// =====================================================
// MARKER SMA
// =====================================================

let schoolMarkers = [];
let circleLayers = [];
let houseMarker = null;

for (const school in schools) {

    const [lat, lon] = schools[school];

    const marker =
    L.marker([lat, lon])
    .addTo(map)
    .bindPopup(school);

    schoolMarkers.push(marker);
}

// =====================================================
// KONVERSI KOORDINAT
// =====================================================

function latlonToXY(
    lat,
    lon,
    refLat,
    refLon
){

    const R = 6371000;

    let x =
    (lon - refLon) *
    Math.PI / 180;

    x =
    x *
    R *
    Math.cos(
        refLat * Math.PI / 180
    );

    let y =
    (lat - refLat) *
    Math.PI / 180;

    y =
    y * R;

    return {x,y};
}

function xyToLatLon(
    x,
    y,
    refLat,
    refLon
){

    const R = 6371000;

    const lat =
    refLat +
    (
        y / R
    ) *
    180 / Math.PI;

    const lon =
    refLon +
    (
        x /
        (
            R *
            Math.cos(
                refLat *
                Math.PI /
                180
            )
        )
    ) *
    180 /
    Math.PI;

    return {
        lat,
        lon
    };
}

// =====================================================
// MEMBERSIHKAN PETA
// =====================================================

function clearMap(){

    circleLayers.forEach(
        layer =>
        map.removeLayer(layer)
    );

    circleLayers = [];

    if(houseMarker){

        map.removeLayer(
            houseMarker
        );

        houseMarker = null;
    }
}
