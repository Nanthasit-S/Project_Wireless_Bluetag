import { useEffect, useMemo } from 'react';
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
  onSelectTag?: (tagId: string) => void;
  isLoading?: boolean;
};

function MapSkeleton() {
  return (
    <View className="gap-3">
      <View className="h-[320px] rounded-[22px] border border-slate-200 bg-slate-100" />
      <View className="h-4 w-56 rounded-full bg-slate-200" />
      <View className="h-24 rounded-[20px] border border-slate-200 bg-slate-100" />
    </View>
  );
}

export function MapSection({
  mapLat,
  mapLng,
  selectedTagId,
  mapMarkers,
  showLocalhostWarning,
  onSelectTag,
  isLoading = false,
}: MapSectionProps) {
  const markerPalette = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

  useEffect(() => {
    if (Platform.OS !== 'web' || !onSelectTag) return undefined;

    function handleMessage(event: MessageEvent) {
      const rawData = typeof event.data === 'string' ? event.data : '';
      if (!rawData) return;

      try {
        const payload = JSON.parse(rawData) as { type?: string; tagId?: string };
        if (payload.type === 'select-tag' && payload.tagId) {
          onSelectTag?.(payload.tagId);
        }
      } catch {
        // Ignore unrelated postMessage payloads.
      }
    }

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onSelectTag]);

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

          logo.addEventListener("click", function (event) {
            event.stopPropagation();
            try {
              const message = JSON.stringify({ type: "select-tag", tagId: m.tagId });
              if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === "function") {
                window.ReactNativeWebView.postMessage(message);
              }
              if (window.parent && window.parent !== window && typeof window.parent.postMessage === "function") {
                window.parent.postMessage(message, "*");
              }
            } catch (error) {}
          });

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
    <View className="rounded-[30px] border border-slate-200 bg-white/95 p-4 gap-4">
      <View className="gap-1">
        <Text className="text-[26px] font-bold text-slate-950" style={styles.heading}>
          แผนที่หลัก
        </Text>
        <Text className="text-sm text-slate-500" style={styles.body}>
          เลือก BlueTag จากฝั่งขวา แล้วแผนที่จะโฟกัสตามให้เอง
        </Text>
      </View>

      {isLoading ? (
        <MapSkeleton />
      ) : Platform.OS === 'web' ? (
        <View style={styles.webMapWrap}>
          <iframe title="bluetag-web-map" srcDoc={mapHtml} style={styles.webMapFrame as never} />
        </View>
      ) : (
        <WebView
          style={styles.map}
          originWhitelist={['*']}
          source={{ html: mapHtml }}
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          onMessage={(event) => {
            try {
              const payload = JSON.parse(event.nativeEvent.data) as { type?: string; tagId?: string };
              if (payload.type === 'select-tag' && payload.tagId) {
                onSelectTag?.(payload.tagId);
              }
            } catch {
              // Ignore malformed payloads from the embedded map.
            }
          }}
        />
      )}

      {showLocalhostWarning ? (
        <Text className="text-xs text-amber-700" style={styles.caption}>
          ถ้าเปิดจากมือถือแล้ว backend เป็น `localhost` หรือ `127.0.0.1` เครื่องมือถือจะหาไม่เจอ ต้องเปลี่ยนเป็น LAN IP ของเครื่องคอมแทน
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontFamily: 'Sarabun_700Bold',
  },
  body: {
    fontFamily: 'Sarabun_400Regular',
  },
  caption: {
    fontFamily: 'Sarabun_400Regular',
  },
  map: {
    width: '100%',
    height: 320,
    borderRadius: 16,
  },
  webMapWrap: {
    width: '100%',
    height: 320,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  webMapFrame: {
    width: '100%',
    height: '100%',
    borderWidth: 0,
  },
});
