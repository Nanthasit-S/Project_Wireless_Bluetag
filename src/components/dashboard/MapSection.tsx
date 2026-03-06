import { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

type MapMarkerItem = {
  tagId: string;
  name: string;
  latitude: number;
  longitude: number;
  rssi: number;
  battery: number | null;
  lastSeen: string;
  source: string;
};

type MapSectionProps = {
  mapLat: number;
  mapLng: number;
  selectedTagId: string;
  selectedTagLabel: string;
  mapMarkers: MapMarkerItem[];
  mapSummary: string;
  showLocalhostWarning: boolean;
};

export function MapSection({
  mapLat,
  mapLng,
  selectedTagId,
  selectedTagLabel,
  mapMarkers,
  mapSummary,
  showLocalhostWarning,
}: MapSectionProps) {
  const markerPalette = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

  const markersWithColor = useMemo(
    () =>
      mapMarkers.map((marker) => ({
        ...marker,
        color: markerPalette[Math.abs(marker.tagId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)) % markerPalette.length],
      })),
    [mapMarkers],
  );

  const mapHtml = useMemo(() => {
    const payload = JSON.stringify({
      lat: mapLat,
      lng: mapLng,
      selectedTagId,
      markers: markersWithColor,
    }).replace(/</g, '\\u003c');

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
    <style>
      html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #f8fafc; }
      .maplibregl-popup-content { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
    <script>
      (function () {
        const data = ${payload};
        const markers = Array.isArray(data.markers) && data.markers.length ? data.markers : [
          { tagId: "BTAG-000001", name: "BlueTag", latitude: data.lat, longitude: data.lng, rssi: -120, battery: null, lastSeen: "-", source: "fallback", color: "#ef4444" }
        ];
        const trackedMarker = markers.find((m) => m.tagId === data.selectedTagId) || null;
        const centerLat = trackedMarker ? trackedMarker.latitude : data.lat;
        const centerLng = trackedMarker ? trackedMarker.longitude : data.lng;
        const map = new maplibregl.Map({
          container: "map",
          style: {
            version: 8,
            sources: {
              osm: {
                type: "raster",
                tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                tileSize: 256,
                attribution: "© OpenStreetMap contributors"
              }
            },
            layers: [{ id: "osm", type: "raster", source: "osm" }]
          },
          center: [centerLng, centerLat],
          zoom: 16
        });

        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

        markers.forEach((m, idx) => {
          const isTracked = m.tagId === data.selectedTagId;
          const logo = document.createElement("div");
          logo.style.width = isTracked ? "30px" : "26px";
          logo.style.height = isTracked ? "30px" : "26px";
          logo.style.borderRadius = "9999px";
          logo.style.border = isTracked ? "3px solid #111827" : "2px solid #ffffff";
          logo.style.background = m.color || "#ef4444";
          logo.style.boxShadow = isTracked ? "0 2px 10px rgba(0,0,0,0.45)" : "0 1px 6px rgba(0,0,0,0.3)";
          logo.style.display = "flex";
          logo.style.alignItems = "center";
          logo.style.justifyContent = "center";
          logo.style.color = "#ffffff";
          logo.style.fontSize = "11px";
          logo.style.fontWeight = "700";
          logo.style.fontFamily = "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
          logo.textContent = String(idx + 1);

          const popupText = [m.name, m.tagId, "RSSI " + m.rssi + " dBm", "Battery " + (m.battery == null ? "n/a" : m.battery + "%"), m.source]
            .filter(Boolean)
            .join("\\n");

          new maplibregl.Marker({ element: logo })
            .setLngLat([m.longitude, m.latitude])
            .setPopup(new maplibregl.Popup({ offset: 20 }).setText(popupText))
            .addTo(map);
        });
      })();
    </script>
  </body>
</html>`;
  }, [mapLat, mapLng, markersWithColor, selectedTagId]);

  return (
    <View className="rounded-2xl bg-material-card border border-material-line p-3 gap-2.5">
      <Text className="text-material-text text-[17px] font-bold">3) Tag Location Map</Text>
      <Text className="text-material-muted text-xs">Show position from backend or phone location while scanning tag.</Text>
      <View className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
        <Text className="text-blue-900 text-xs font-semibold">Tracking Tag</Text>
        <Text className="text-blue-700 text-sm font-bold">{selectedTagLabel}</Text>
      </View>
      {Platform.OS === 'web' ? (
        <View style={styles.placeholder}>
          <Text className="text-slate-600 text-xs text-center">MapLibre map is available on Android/iOS build.</Text>
        </View>
      ) : (
        <WebView
          style={styles.map}
          originWhitelist={['*']}
          source={{ html: mapHtml }}
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
        />
      )}
      <Text className="text-slate-600 text-xs">{mapSummary}</Text>
      <View className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 gap-1.5">
        <Text className="text-slate-700 text-xs font-medium">Tag Location Details</Text>
        {markersWithColor.length === 0 ? (
          <Text className="text-slate-500 text-xs">No tag location details yet.</Text>
        ) : (
          markersWithColor.map((marker, index) => (
            <View key={marker.tagId} className="rounded-md border border-slate-200 bg-white px-2 py-2">
              <Text className="text-slate-800 text-xs font-semibold">
                #{index + 1} {marker.name} ({marker.tagId})
              </Text>
              <Text className="text-slate-600 text-[11px]">
                {marker.latitude.toFixed(6)}, {marker.longitude.toFixed(6)} | RSSI {marker.rssi} dBm | Battery{' '}
                {marker.battery == null ? 'n/a' : `${marker.battery}%`}
              </Text>
              <Text className="text-slate-500 text-[11px]">
                source: {marker.source} | last seen: {marker.lastSeen}
              </Text>
            </View>
          ))
        )}
      </View>
      <View className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
        <Text className="text-slate-700 text-xs font-medium">Current Pin</Text>
        <Text className="text-slate-600 text-xs">
          {mapLat.toFixed(6)}, {mapLng.toFixed(6)}
        </Text>
      </View>
      {showLocalhostWarning ? (
        <Text className="text-amber-700 text-xs">
          On iPhone, 127.0.0.1 points to the phone itself. Use your backend LAN IP instead.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: 260,
    borderRadius: 12,
  },
  placeholder: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },
});
