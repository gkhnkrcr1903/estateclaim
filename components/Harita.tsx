"use client";

import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import { useEffect } from "react";
import type { Arsa } from "../lib/arsa";

function Odakla({ arsalar }: { arsalar: Arsa[] }) {
  const map = useMap();
  useEffect(() => {
    // Kapsayıcının boyutu sayfa düzeni oturduktan sonra değişebilir; haritayı yeniden ölçtür.
    map.invalidateSize();
    if (!arsalar.length) return;
    map.fitBounds(arsalar.map((a) => [a.lat, a.lng] as [number, number]), { padding: [30, 30], maxZoom: 13 });
  }, [arsalar, map]);
  useEffect(() => {
    const g = new ResizeObserver(() => map.invalidateSize());
    g.observe(map.getContainer());
    return () => g.disconnect();
  }, [map]);
  return null;
}

const renk = (p: number) => (p >= 65 ? "#16a34a" : p >= 40 ? "#d97706" : "#dc2626");

export default function Harita({
  arsalar,
  puanlar,
  seciliId,
  sec,
}: {
  arsalar: Arsa[];
  puanlar: Record<string, number>;
  seciliId?: string;
  sec: (id: string) => void;
}) {
  return (
    <MapContainer center={[39, 35]} zoom={6} className="harita" scrollWheelZoom>
      <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Odakla arsalar={arsalar} />
      {arsalar.map((a) => (
        <CircleMarker
          key={a.id}
          center={[a.lat, a.lng]}
          radius={a.id === seciliId ? 11 : 7}
          pathOptions={{ color: a.id === seciliId ? "#2f6fed" : "#fff", weight: 2, fillColor: renk(puanlar[a.id]), fillOpacity: 0.9 }}
          eventHandlers={{ click: () => sec(a.id) }}
        >
          <Tooltip>
            {a.ilce} — Ada {a.ada} / Parsel {a.parsel}
            <br />
            {a.imar} · Puan {puanlar[a.id]}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
