"use client"

import * as React from 'react';
import { Map, type MapRef, Source, Layer, type LayerProps } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { LngLatBounds, Map as MapboxMap } from 'mapbox-gl';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

const capitalLayerStyles: { [key: string]: LayerProps } = {
  'Natural': { id: 'natural-capital-layer', type: 'fill', paint: { 'fill-color': '#22c55e', 'fill-opacity': 0.4, 'fill-outline-color': '#16a34a' } },
  'Human': { id: 'human-capital-layer', type: 'circle', paint: { 'circle-radius': 6, 'circle-color': '#3b82f6', 'circle-stroke-width': 1, 'circle-stroke-color': '#2563eb' } },
  'Social': { id: 'social-capital-layer', type: 'circle', paint: { 'circle-radius': 6, 'circle-color': '#eab308', 'circle-stroke-width': 1, 'circle-stroke-color': '#ca8a04' } },
  'Manufactured': { id: 'manufactured-capital-layer', type: 'fill', paint: { 'fill-color': '#ef4444', 'fill-opacity': 0.4, 'fill-outline-color': '#dc2626' } },
  'Financial': { id: 'financial-capital-layer', type: 'circle', paint: { 'circle-radius': 6, 'circle-color': '#a855f7', 'circle-stroke-width': 1, 'circle-stroke-color': '#9333ea' } }
};

type MapComponentProps = {
  mapRef: React.RefObject<MapRef>;
  mapData?: { geoJSON: string[] } | null;
  visibleLayers: { [key: string]: boolean };
}

function parseAllGeoJson(geoJsonStrings: string[]): GeoJSON.FeatureCollection[] {
  return geoJsonStrings.map(str => {
    try {
      return JSON.parse(str);
    } catch (e) {
      console.error("Failed to parse GeoJSON string:", e);
      return { type: "FeatureCollection", features: [] };
    }
  }).filter(Boolean);
}

export default function MapComponent({ mapRef, mapData, visibleLayers }: MapComponentProps) {
  const [allGeoJson, setAllGeoJson] = React.useState<GeoJSON.FeatureCollection | null>(null);

  React.useEffect(() => {
    if (mapData?.geoJSON && mapData.geoJSON.length > 0) {
      const parsedCollections = parseAllGeoJson(mapData.geoJSON);
      const allFeatures = parsedCollections.flatMap(fc => fc.features);
      setAllGeoJson({
        type: 'FeatureCollection',
        features: allFeatures,
      });

      if (allFeatures.length > 0 && mapRef.current) {
        const map = mapRef.current.getMap();
        const bounds = new LngLatBounds();
        allFeatures.forEach((feature: GeoJSON.Feature) => {
          if (feature?.geometry?.type === 'Point') {
            bounds.extend(feature.geometry.coordinates as [number, number]);
          }
        });
        if (!bounds.isEmpty()) {
            map.fitBounds(bounds, { padding: 120, duration: 1000 });
        }
      }
    } else {
      setAllGeoJson(null);
    }
  }, [mapData, mapRef]);
  
  return (
      <Map
        ref={mapRef}
        initialViewState={{ longitude: -98, latitude: 38, zoom: 3 }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        {allGeoJson && Object.entries(capitalLayerStyles).map(([capitalKey, style]) => (
          visibleLayers[capitalKey] && (
             <Source key={capitalKey} type="geojson" data={allGeoJson}>
                <Layer {...style} filter={['==', ['get', 'capital'], capitalKey]} />
              </Source>
          )
        ))}
      </Map>
  )
}
