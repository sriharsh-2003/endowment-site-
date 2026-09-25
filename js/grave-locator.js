/**
 * Abdullah Alajlan Endowment - Grave Locator (Leaflet.js map)
 * Shows grave coordinates, column/row grid info, and direction triggers
 */

(function () {
  // Destination Grave Coordinates (Riyadh Cemetery)
  const GRAVE_LAT = 24.6291;
  const GRAVE_LNG = 46.7262;
  const GRAVE_TITLE_AR = 'مرقد عبدالله محمد العجلان رحمه الله (عمود ٢٠، صف ٥٨)';
  const GRAVE_TITLE_EN = 'Grave of Abdullah Mohammed Alajlan (Column 20, Row 58)';

  let mapInstance = null;
  let markerInstance = null;

  document.addEventListener('DOMContentLoaded', () => {
    initMap();
    initDirectionButtons();

    window.addEventListener('languageChanged', (e) => {
      updateMapPopup(e.detail.isArabic);
    });
  });

  function initMap() {
    const mapEl = document.getElementById('grave-map');
    if (!mapEl || typeof L === 'undefined') return;

    // Center map on grave location
    mapInstance = L.map('grave-map', {
      center: [GRAVE_LAT, GRAVE_LNG],
      zoom: 16,
      zoomControl: true,
      scrollWheelZoom: false
    });

    // Use OpenStreetMap as the primary source so the map remains available
    // even when the optional Carto tile service is blocked.
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19
    }).addTo(mapInstance);

    // Custom Gold Pin Marker
    const goldIcon = L.divIcon({
      className: 'custom-grave-pin',
      html: `
        <div style="
          width: 38px;
          height: 38px;
          background: #c9a861;
          border: 3px solid #ffffff;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 14px;
            height: 14px;
            background: #0a1118;
            border-radius: 50%;
            transform: rotate(45deg);
          "></div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 38],
      popupAnchor: [0, -38]
    });

    markerInstance = L.marker([GRAVE_LAT, GRAVE_LNG], { icon: goldIcon }).addTo(mapInstance);

    const isArabic = (window.i18n ? window.i18n.getLang() : 'ar') === 'ar';
    updateMapPopup(isArabic);
    markerInstance.openPopup();
    const fallback = document.getElementById('map-fallback');
    if (fallback) fallback.hidden = true;
    window.setTimeout(() => mapInstance.invalidateSize(), 0);
  }

  function updateMapPopup(isArabic) {
    if (!markerInstance) return;
    const content = `
      <div style="text-align: center; padding: 4px; font-family: inherit;">
        <strong style="color: #c9a861; font-size: 14px; display: block; margin-bottom: 4px;">
          ${isArabic ? GRAVE_TITLE_AR : GRAVE_TITLE_EN}
        </strong>
        <span style="color: #4a5568; font-size: 12px;">
          ${isArabic ? 'المقبرة، القطاع الشرقي' : 'Cemetery, Eastern Sector'}
        </span>
      </div>
    `;
    markerInstance.bindPopup(content);
  }

  function initDirectionButtons() {
    const originInput = document.getElementById('start-location-input');
    const googleBtn = document.getElementById('btn-google-maps');
    const appleBtn = document.getElementById('btn-apple-maps');

    function openMapUrl(url) {
      const mapWindow = window.open(url, '_blank', 'noopener,noreferrer');
      if (!mapWindow) {
        window.location.href = url;
      }
    }

    if (googleBtn) {
      googleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const origin = originInput ? originInput.value.trim() : '';
        let url;
        if (origin) {
          url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${GRAVE_LAT},${GRAVE_LNG}&travelmode=driving`;
        } else {
          url = `https://www.google.com/maps/dir/?api=1&destination=${GRAVE_LAT},${GRAVE_LNG}&travelmode=driving`;
        }
        openMapUrl(url);
      });
    }

    if (appleBtn) {
      appleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const origin = originInput ? originInput.value.trim() : '';
        let url;
        if (origin) {
          url = `https://maps.apple.com/?saddr=${encodeURIComponent(origin)}&daddr=${GRAVE_LAT},${GRAVE_LNG}&dirflg=d`;
        } else {
          url = `https://maps.apple.com/?daddr=${GRAVE_LAT},${GRAVE_LNG}&dirflg=d`;
        }
        openMapUrl(url);
      });
    }
  }
})();
