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

// =====================================================
// RIWAYAT
// =====================================================

function loadHistory(){

    const historyList =
    document.getElementById(
        "historyList"
    );

    const history =
    JSON.parse(
        localStorage.getItem(
            "trilaterasiHistory"
        )
    ) || [];

    if(history.length === 0){

        historyList.innerHTML =
        "Belum ada riwayat";

        return;
    }

    historyList.innerHTML = "";

    history
    .slice()
    .reverse()
    .forEach(item => {

        const div =
        document.createElement(
            "div"
        );

        div.className =
        "history-item";

        div.innerHTML = `
            <b>${item.time}</b><br>
            Lat:
            ${item.lat}<br>

            Lon:
            ${item.lon}<br>

            Error:
            ${item.error} m<br>

            <a href="
            https://maps.google.com/?q=${item.lat},${item.lon}
            " target="_blank">

            📍 Buka Maps

            </a>
        `;

        historyList
        .appendChild(div);

    });
}

// =====================================================
// HITUNG ERROR
// =====================================================

function calculateError(
    x,
    y,
    points
){

    let total = 0;

    for(const p of points){

        const dx = x - p.x;
        const dy = y - p.y;

        const predicted =
        Math.sqrt(
            dx * dx +
            dy * dy
        );

        total +=
        Math.abs(
            predicted - p.distance
        );
    }

    return total / points.length;
}

// =====================================================
// LEAST SQUARES OPTIMIZER
// =====================================================

function trilaterate(points){

    let x = 0;
    let y = 0;

    for(const p of points){

        x += p.x;
        y += p.y;
    }

    x /= points.length;
    y /= points.length;

    const learningRate = 0.05;

    for(let iter=0; iter<5000; iter++){

        let gradX = 0;
        let gradY = 0;

        for(const p of points){

            const dx = x - p.x;
            const dy = y - p.y;

            const dist =
            Math.sqrt(
                dx*dx +
                dy*dy
            );

            if(dist < 1){
                continue;
            }

            const error =
            dist - p.distance;

            gradX +=
            error *
            dx /
            dist;

            gradY +=
            error *
            dy /
            dist;
        }

        x -=
        learningRate *
        gradX /
        points.length;

        y -=
        learningRate *
        gradY /
        points.length;
    }

    return {x,y};
}

// =====================================================
// TOMBOL HITUNG
// =====================================================

document
.getElementById(
    "calculateBtn"
)
.addEventListener(
    "click",
    function(){

        clearMap();

        const distances = {};

        const usedSchools = [];

        for(const school in schools){

            const value =
            document
            .getElementById(
                school
            )
            .value;

            if(
                value !== ""
            ){

                distances[school] =
                parseFloat(
                    value
                );

                usedSchools
                .push(
                    school
                );
            }
        }

        if(
            usedSchools.length < 3
        ){

            alert(
                "Minimal 3 sekolah."
            );

            return;
        }

        const refSchool =
        Object.keys(
            schools
        )[0];

        const refLat =
        schools[
            refSchool
        ][0];

        const refLon =
        schools[
            refSchool
        ][1];

        const points = [];

        for(
            const school
            in distances
        ){

            const lat =
            schools[school][0];

            const lon =
            schools[school][1];

            const xy =
            latlonToXY(
                lat,
                lon,
                refLat,
                refLon
            );

            points.push({

                x: xy.x,

                y: xy.y,

                distance:
                distances[
                    school
                ]

            });
        }

        const result =
        trilaterate(
            points
        );

        const gps =
        xyToLatLon(

            result.x,
            result.y,

            refLat,
            refLon

        );

        const error =
        calculateError(
            result.x,
            result.y,
            points
        );

let houseRadius;

if(error < 20){

    houseRadius = 25;

}
else if(error < 50){

    houseRadius = 50;

}
else{

    houseRadius = 100;

}
      
        document
        .getElementById(
            "latResult"
        )
        .textContent =
        gps.lat.toFixed(8);

        document
        .getElementById(
            "lonResult"
        )
        .textContent =
        gps.lon.toFixed(8);

        document
        .getElementById(
            "errorResult"
        )
        .textContent =
        error.toFixed(2)
        + " meter";
      
        const badge =
        document.getElementById(
            "accuracyBadge"
        );

        badge.className = "";

        if(error < 20){

            badge.textContent =
            "🟢 Sangat Akurat";

            badge.classList.add(
                "accuracy-good"
            );
        
        }
        else if(error < 50){

            badge.textContent =
            "🟡 Cukup Akurat";

            badge.classList.add(
                "accuracy-medium"
            );

        }
        else{

            badge.textContent =
            "🔴 Perlu Dicek";

            badge.classList.add(
                "accuracy-bad"
            );

        }

      const confidence =
document.getElementById(
    "confidenceResult"
);

if(error < 20){

    confidence.textContent =
    "Tinggi";

}
else if(error < 50){

    confidence.textContent =
    "Sedang";

}
else{

    confidence.textContent =
    "Rendah";

}
      
        const ul =
        document
        .getElementById(
            "usedSchools"
        );

        ul.innerHTML = "";

        usedSchools
        .forEach(
            school => {

                const li =
                document
                .createElement(
                    "li"
                );

                li.textContent =
                school;

                ul.appendChild(
                    li
                );

            }
        );

const houseIcon = new L.Icon({

    iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",

    shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",

    iconSize:[25,41],
    iconAnchor:[12,41],
    popupAnchor:[1,-34]

});
      
        houseMarker =
L.marker(
    [
        gps.lat,
        gps.lon
    ],
    {
        icon:
        houseIcon
    }
)
.addTo(map)
.bindPopup(
    "Perkiraan Rumah"
);

          const houseArea =
L.circle(
    [gps.lat, gps.lon],
    {
        radius:
        houseRadius,

        color:
        "#f97316",

        fillColor:
        "#f97316",

        fillOpacity:
        0.15
    }
)
.addTo(map);

circleLayers.push(
    houseArea
);

 const colors = [
    "#2563eb",
    "#16a34a",
    "#9333ea",
    "#dc2626",
    "#ea580c",
    "#0891b2",
    "#be123c"
];

let colorIndex = 0;

for(const school in distances){

    const lat =
    schools[school][0];

    const lon =
    schools[school][1];

    const color =
    colors[
        colorIndex %
        colors.length
    ];

    colorIndex++;

    const circle =
    L.circle(
        [lat, lon],
        {
            radius:
            distances[school],

            color:
            color,

            fill:false
        }
    )
    .addTo(map);

    circleLayers.push(
        circle
    );
}

       const bounds = [];

bounds.push([
    gps.lat,
    gps.lon
]);

for(const school in distances){

    bounds.push(
        schools[school]
    );
}

map.fitBounds(
    bounds,
    {
        padding:[50,50]
    }
);

      const history =
JSON.parse(
    localStorage.getItem(
        "trilaterasiHistory"
    )
) || [];

history.push({

    lat:
    gps.lat.toFixed(8),

    lon:
    gps.lon.toFixed(8),

    error:
    error.toFixed(2),

    time:
    new Date()
    .toLocaleString()

});

localStorage.setItem(
    "trilaterasiHistory",
    JSON.stringify(history)
);

loadHistory();
      
        const mapsUrl =
        `https://maps.google.com/?q=${gps.lat},${gps.lon}`;

        document
        .getElementById(
            "mapsLink"
        )
        .href =
        mapsUrl;
    }
);

// =====================================================
// RESET
// =====================================================

document
.getElementById("resetBtn")
.addEventListener("click", () => {

    for(const school in schools){

        const input =
        document.getElementById(school);

        if(input){
            input.value = "";
        }
    }

    clearMap();

    document.getElementById("latResult").textContent = "-";
    document.getElementById("lonResult").textContent = "-";
    document.getElementById("errorResult").textContent = "-";

    const badge =
    document.getElementById("accuracyBadge");

    if(badge){
        badge.textContent = "-";
        badge.className = "";
    }

    document.getElementById("usedSchools").innerHTML = "";

});

// =====================================================
// COPY KOORDINAT
// =====================================================

document
.getElementById(
    "copyBtn"
)
.addEventListener(
    "click",
    function(){

        const lat =
        document
        .getElementById(
            "latResult"
        )
        .textContent;

        const lon =
        document
        .getElementById(
            "lonResult"
        )
        .textContent;

        if(
            lat === "-"
        ){
            alert(
                "Belum ada hasil."
            );
            return;
        }

        navigator
        .clipboard
        .writeText(
            lat +
            "," +
            lon
        );

        alert(
            "Koordinat berhasil disalin!"
        );

    }
);

loadHistory();

// =====================================================
// HAPUS RIWAYAT
// =====================================================

document
.getElementById(
    "clearHistoryBtn"
)
.addEventListener(
    "click",
    () => {

        const confirmDelete =
        confirm(
            "Hapus semua riwayat?"
        );

        if(
            !confirmDelete
        ){
            return;
        }

        localStorage.removeItem(
            "trilaterasiHistory"
        );

        loadHistory();

    }
);

// =====================================================
// DOWNLOAD PDF
// =====================================================

document
.getElementById(
    "downloadPdfBtn"
)
.addEventListener(
    "click",
    () => {

        const {
            jsPDF
        } =
        window.jspdf;

        const pdf =
        new jsPDF();

        const lat =
        document
        .getElementById(
            "latResult"
        )
        .textContent;

        const lon =
        document
        .getElementById(
            "lonResult"
        )
        .textContent;

        const error =
        document
        .getElementById(
            "errorResult"
        )
        .textContent;

        const confidence =
        document
        .getElementById(
            "confidenceResult"
        )
        .textContent;

        pdf.setFontSize(18);

        pdf.text(
            "HASIL TRILATERASI SPMB",
            20,
            20
        );

        pdf.setFontSize(12);

        pdf.text(
            "Latitude: " + lat,
            20,
            40
        );

        pdf.text(
            "Longitude: " + lon,
            20,
            50
        );

        pdf.text(
            "Error: " + error,
            20,
            60
        );

        pdf.text(
            "Kepercayaan: " + confidence,
            20,
            70
        );

        pdf.text(
            "Tanggal: " +
            new Date()
            .toLocaleString(),
            20,
            80
        );

        pdf.save(
            "hasil_trilaterasi.pdf"
        );

    }
);
