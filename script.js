alert("SCRIPT LOADED");

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

        houseMarker =
        L.marker([
            gps.lat,
            gps.lon
        ])
        .addTo(map)
        .bindPopup(
            "Perkiraan Rumah"
        );

        for(
            const school
            in distances
        ){

            const lat =
            schools[school][0];

            const lon =
            schools[school][1];

            const circle =
            L.circle(
                [lat,lon],
                {
                    radius:
                    distances[
                        school
                    ],
                    fill:false
                }
            )
            .addTo(map);

            circleLayers
            .push(
                circle
            );
        }

        map.setView(
            [
                gps.lat,
                gps.lon
            ],
            15
        );

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

    alert("RESET DIKLIK");

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
