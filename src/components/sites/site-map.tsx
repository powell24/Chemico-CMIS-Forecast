"use client";

import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import type { SiteStatus, SiteSummary } from "@/lib/queries/sites";

const STATUS_COLOR: Record<SiteStatus, string> = {
  risk: "var(--chart-5)",
  nearing: "var(--chart-3)",
  healthy: "var(--chart-4)",
  unknown: "var(--muted-foreground)",
};

const US_CENTER: LatLngTuple = [37.5, -96];

function MapFocus({
  activeSite,
  reducedMotion,
}: {
  activeSite: SiteSummary | null;
  reducedMotion: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (!activeSite) return;
    const target: LatLngTuple = [activeSite.lat, activeSite.lng];
    if (reducedMotion) {
      map.setView(target, 7);
    } else {
      map.flyTo(target, 7, { duration: 0.8 });
    }
  }, [activeSite, map, reducedMotion]);
  return null;
}

export function SiteMap({
  summaries,
  activeSiteId,
  onSelect,
  dimmedIds,
}: {
  summaries: SiteSummary[];
  activeSiteId: string | null;
  onSelect: (id: string) => void;
  dimmedIds: Set<string>;
}) {
  const activeSite =
    summaries.find((s) => s.id === activeSiteId) ?? null;

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <MapContainer
      center={US_CENTER}
      zoom={4}
      scrollWheelZoom={false}
      className="size-full rounded-lg border bg-muted"
      style={{ background: "var(--muted)" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {summaries.map((s) => {
        const color = STATUS_COLOR[s.worstStatus];
        const isActive = s.id === activeSiteId;
        const isDimmed = dimmedIds.size > 0 && !dimmedIds.has(s.id);
        return (
          <CircleMarker
            key={s.id}
            center={[s.lat, s.lng]}
            radius={isActive ? 10 : 7}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: isDimmed ? 0.15 : 0.75,
              weight: isActive ? 3 : 1.5,
              opacity: isDimmed ? 0.3 : 1,
            }}
            eventHandlers={{
              click: () => onSelect(s.id),
            }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={1}>
              <div className="text-xs">
                <div className="font-medium">{s.name}</div>
                <div className="text-muted-foreground">
                  {s.city}, {s.state}
                </div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
      <MapFocus activeSite={activeSite} reducedMotion={reducedMotion} />
    </MapContainer>
  );
}
