var previewLayer = "";

// *********************************************************************
// convert the Leaflet specific Polyline Format to a simple nested array
// (resulting format: [[x1,y1],[y2,x2],[y3,x3]] )
// *********************************************************************
function leafletarrayToArray(inlist){
  var outarray = []
  for (var i = 0; i < inlist.length; i++) {
    outarray.push([inlist[i].lng,inlist[i].lat]);
  }
  return(outarray);
}

// *****************************************************************
// Function to create the Kurve-Chart from a WFS response in GeoJSON
// *****************************************************************
function createChart(geoJsonData) {
  var ctx = document.getElementById('kurve').getContext('2d');
  ctx.height = 200;
  var distance_sum = 0;
  var kurveData = [];
  var yMinVal = 999999;
  var yMaxVal = 0;
  for (var i=0;i<geoJsonData.totalFeatures;i++) {
    //for each returned dtapoint build the graph-data-array
    //and also find the min and max value, while we're at it
    var current_point = geoJsonData.features[i].properties;
    distance_sum += current_point.distance;
    kurveData.push({x: distance_sum, y: current_point['z']});
    if (yMinVal > current_point['z']) { yMinVal = current_point['z'] };
    if (yMaxVal < current_point['z']) { yMaxVal = current_point['z'] };
  }
  var kurveOptions = {responsive: true,
                      title: {optional: "Höhenprofil"},
                      maintainAspectRatio: false,
                      scales: { yAxes : [{ticks: { suggestedMin: yMinVal, suggestedMax: yMaxVal}}],
                                xAxes : [{type: 'linear', display: true, scaleLabel: { display: true, labelString: 'Distanz in Meter' } }]
                              }
                     };
  console.log(kurveData);
  console.log(kurveOptions);

  var kurveChart = new Chart(ctx,{
    type: 'line',
    data: { datasets: [{label: "Höhenprofil",
                        data: kurveData,
                       }
                      ]
          },
    fill: true,
    lineTension:0.1,
    options : kurveOptions
  });
};

// ********************************************************
// Function to receive height data from a nested array
// ********************************************************
function getCurve(coordArray) {
  console.log(coordArray);
  // lets build the parameter for the line
  vparams = "HP_DETAIL:"+ $("#detail").val() +";HP_SRID:4326;HP_LINE:";
  for (var i=0; i<coordArray.length;i++){
    // for each coordinate pair in the array ...
    if (i>0) {
      // add the string 'bs' always but in the beginning
      vparams += "bs ";
    }
    vparams += coordArray[i][0] + " " + coordArray[i][1];
  }

  console.log(vparams);
  $.ajax({
    url: 'http://localhost:8088/geoserver/ows',
    type: "GET",
    data: { service: "wfs",
            version: "1.0.0",
            request: "GetFeature",
            typeName: "hoehenprofil_50_backup",
            srsName: "EPSG:4326",
            outputFormat: "application/json",
            viewparams: vparams
          },
    success: function(data) {
      console.log(data);
      if (map.hasLayer(previewLayer)) {
        map.removeLayer(previewLayer);
      };
      // add points to the map
      previewLayer = L.geoJSON(data).addTo(map);

      // draw the curve
      createChart(data);
    }
  })
}

var map = L.map('meineKarte').setView([47.188, 11.22],13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  'attribution':  'Kartendaten &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> Mitwirkende',
  'useCache': true
}).addTo(map);

// FeatureGroup is to store editable layers
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

var drawControl = new L.Control.Draw({
  edit: {
      featureGroup: drawnItems
  }
});
map.addControl(drawControl);

// **********************************
// Remove unwanted icons from Leaflet
// **********************************
$( ".leaflet-draw-draw-polygon" ).remove();
$( ".leaflet-draw-draw-rectangle" ).remove();
$( ".leaflet-draw-draw-circle" ).remove();
$( ".leaflet-draw-draw-marker" ).remove();
$( ".leaflet-draw-draw-circlemarker" ).remove();

// ********************************************************
// Event triggered when an element on the map is clicked on
// ********************************************************
map.on('draw:created', function (e) {
  console.log("drawfinished");
  var type = e.layerType;
  var layer = e.layer;
  getCurve(leafletarrayToArray(layer.getLatLngs()));
});

