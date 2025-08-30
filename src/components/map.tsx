
"use client"

import * as React from 'react';
import { Map, type MapRef, Source, Layer, type LayerProps } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { collection, onSnapshot, query, Firestore, getFirestore } from "firebase/firestore";
import { app } from '@/lib/firebase';
import { LngLatBounds } from 'mapbox-gl';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

const capitalLayerConfig: { [key: string]: { style: LayerProps, collectionName: string } } = {
  Natural: {
    collectionName: 'natural',
    style: {
      id: 'natural-capital-layer', type: 'fill',
      paint: { 'fill-color': '#22c55e', 'fill-opacity': 0.4, 'fill-outline-color': '#16a34a' }
    }
  },
  Human: {
    collectionName: 'human',
    style: {
      id: 'human-capital-layer', type: 'circle',
      paint: { 'circle-radius': 5, 'circle-color': '#3b82f6', 'circle-stroke-width': 1, 'circle-stroke-color': '#2563eb' }
    }
  },
  Social: {
    collectionName: 'social',
    style: {
      id: 'social-capital-layer', type: 'circle',
      paint: { 'circle-radius': 5, 'circle-color': '#eab308', 'circle-stroke-width': 1, 'circle-stroke-color': '#ca8a04' }
    }
  },
  Manufactured: {
    collectionName: 'manufactured',
    style: {
      id: 'manufactured-capital-layer', type: 'fill',
      paint: { 'fill-color': '#ef4444', 'fill-opacity': 0.4, 'fill-outline-color': '#dc2626' }
    }
  },
  Financial: {
    collectionName: 'financial',
    style: {
      id: 'financial-capital-layer', type: 'circle',
      paint: { 'circle-radius': 5, 'circle-color': '#a855f7', 'circle-stroke-width': 1, 'circle-stroke-color': '#9333ea' }
    }
  }
};


type MapComponentProps = {
  mapRef: React.RefObject<MapRef>;
  selectedPlaceId?: string;
  visibleLayers: { [key: string]: boolean };
}

export default function MapComponent({ mapRef, selectedPlaceId, visibleLayers }: MapComponentProps) {
  const [geoJsonData, setGeoJsonData] = React.useState<{[key: string]: GeoJSON.FeatureCollection} | null>(null);

  React.useEffect(() => {
    if (!selectedPlaceId) {
      setGeoJsonData(null);
      return;
    };

    const db = getFirestore(app);
    const allCapitalData: {[key: string]: GeoJSON.FeatureCollection} = {};
    const unsubscribes: (() => void)[] = [];
    let allFeatures: GeoJSON.Feature[] = [];

    Object.keys(capitalLayerConfig).forEach(capitalKey => {
        const config = capitalLayerConfig[capitalKey];
        const capitalCollectionRef = collection(db, "places", selectedPlaceId, config.collectionName);
        
        const unsubscribe = onSnapshot(capitalCollectionRef, (querySnapshot) => {
            const features: GeoJSON.Feature[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.geoJSON) {
                    try {
                        const parsedGeoJson = JSON.parse(data.geoJSON);
                        if (parsedGeoJson && parsedGeoJson.features) {
                           features.push(...parsedGeoJson.features);
                        }
                    } catch (e) {
                        console.error(`Error parsing geoJSON for doc ${doc.id} in ${config.collectionName}:`, e);
                    }
                }
            });
            allCapitalData[capitalKey] = { type: 'FeatureCollection', features };
            
            // Re-aggregate all features from all capitals to fit map bounds
            allFeatures = Object.values(allCapitalData).flatMap(fc => fc.features);
            
            setGeoJsonData({...allCapitalData});

            if (allFeatures.length > 0 && mapRef.current) {
                const bounds = new LngLatBounds();
                allFeatures.forEach(feature => {
                    if (feature?.geometry?.type === 'Point') {
                        bounds.extend(feature.geometry.coordinates as [number, number]);
                    }
                });
                if (!bounds.isEmpty()) {
                    mapRef.current.fitBounds(bounds, { padding: 80, duration: 1000 });
                }
            }

        }, (error) => {
            console.error(`Could not fetch data for ${config.collectionName}:`, error);
        });
        unsubscribes.push(unsubscribe);
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [selectedPlaceId, mapRef]);
  
  return (
      <Map
        ref={mapRef}
        initialViewState={{ longitude: -98, latitude: 38, zoom: 3 }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        {geoJsonData && Object.entries(geoJsonData).map(([capitalKey, data]) => {
          const config = capitalLayerConfig[capitalKey];
          return (
            visibleLayers[capitalKey] && data?.features.length > 0 && config ? (
              <Source key={capitalKey} type="geojson" data={data}>
                <Layer {...config.style} />
              </Source>
            ) : null
          )
        })}
      </Map>
  )
}
