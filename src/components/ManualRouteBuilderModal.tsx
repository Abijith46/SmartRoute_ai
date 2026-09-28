import React, { useState } from "react";
import { RouteOption, RouteSegment, CongestionLevel, ManualWaypoint } from "../types";
import {
  Plus,
  Trash2,
  MapPin,
  Compass,
  CheckCircle2,
  X,
  Layers,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Navigation,
  Route,
  Building,
  TreePine
} from "lucide-react";
import { coimbatoreKeyPlaces } from "../data/mockData";

interface ManualRouteBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRoute: (newRoute: RouteOption) => void;
}

export const ManualRouteBuilderModal: React.FC<ManualRouteBuilderModalProps> = ({
  isOpen,
  onClose,
  onSaveRoute,
}) => {
  const [routeName, setRouteName] = useState("Custom Village & Street Route");
  const [routeDescription, setRouteDescription] = useState(
    "User-created custom shortcut passing through local village roads and residential street corridors."
  );

  const [waypoints, setWaypoints] = useState<ManualWaypoint[]>([
    {
      id: "wp_1",
      name: "Gandhipuram Terminal",
      villageName: "Gandhipuram Central",
      streetName: "Cross Cut 7th Street",
      lat: 11.0183,
      lng: 76.9725,
      x: 200,
      y: 380,
      speedLimitKmh: 40,
      congestion: "moderate",
      roadCondition: "good",
    },
    {
      id: "wp_2",
      name: "Ganapathy Village Junction",
      villageName: "Ganapathy Village",
      streetName: "Ganapathy Main Road",
      lat: 11.0340,
      lng: 76.9810,
      x: 320,
      y: 290,
      speedLimitKmh: 50,
      congestion: "heavy",
      roadCondition: "moderate",
    },
    {
      id: "wp_3",
      name: "Sivanandapuram Lake Pass",
      villageName: "Sivanandapuram",
      streetName: "Lake Link Road",
      lat: 11.0650,
      lng: 76.9910,
      x: 460,
      y: 200,
      speedLimitKmh: 60,
      congestion: "low",
      roadCondition: "good",
    },
    {
      id: "wp_4",
      name: "Saravanampatti Tech SEZ",
      villageName: "Saravanampatti North",
      streetName: "CHIL SEZ IT Corridor",
      lat: 11.0829,
      lng: 77.0019,
      x: 580,
      y: 140,
      speedLimitKmh: 40,
      congestion: "low",
      roadCondition: "good",
    },
  ]);

  // Form input state for adding new waypoint
  const [newWpName, setNewWpName] = useState("");
  const [newVillageName, setNewVillageName] = useState("");
  const [newStreetName, setNewStreetName] = useState("");
  const [newSpeedLimit, setNewSpeedLimit] = useState<number>(45);
  const [newCongestion, setNewCongestion] = useState<CongestionLevel>("low");

  if (!isOpen) return null;

  const handleAddWaypoint = () => {
    if (!newWpName.trim()) return;

    // Estimate coordinates based on waypoint count
    const lastWp = waypoints[waypoints.length - 1];
    const newX = lastWp ? Math.min(720, lastWp.x + 80) : 300;
    const newY = lastWp ? Math.max(80, lastWp.y - 60) : 300;

    const newWp: ManualWaypoint = {
      id: `manual_wp_${Date.now()}_${Math.random().toString().slice(2, 5)}`,
      name: newWpName.trim(),
      villageName: newVillageName.trim() || "Local Village",
      streetName: newStreetName.trim() || "Main Street",
      lat: lastWp ? lastWp.lat + 0.01 : 11.0400,
      lng: lastWp ? lastWp.lng + 0.008 : 76.9850,
      x: newX,
      y: newY,
      speedLimitKmh: newSpeedLimit,
      congestion: newCongestion,
      roadCondition: "good",
    };

    setWaypoints([...waypoints, newWp]);
    setNewWpName("");
    setNewVillageName("");
    setNewStreetName("");
  };

  const handleAddPresetPlace = (placeId: string) => {
    const place = coimbatoreKeyPlaces.find((p) => p.id === placeId);
    if (!place) return;

    const newWp: ManualWaypoint = {
      id: `manual_preset_${Date.now()}_${place.id}`,
      name: place.shortName,
      villageName: place.area || "Coimbatore Sector",
      streetName: place.name,
      lat: place.lat,
      lng: place.lng,
      x: place.x,
      y: place.y,
      speedLimitKmh: 50,
      congestion: "low",
      roadCondition: "good",
    };

    setWaypoints([...waypoints, newWp]);
  };

  const handleRemoveWaypoint = (id: string) => {
    if (waypoints.length <= 2) return; // keep at least 2 waypoints
    setWaypoints(waypoints.filter((w) => w.id !== id));
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const list = [...waypoints];
    const temp = list[index];
    list[index] = list[index - 1];
    list[index - 1] = temp;
    setWaypoints(list);
  };

  const handleMoveDown = (index: number) => {
    if (index >= waypoints.length - 1) return;
    const list = [...waypoints];
    const temp = list[index];
    list[index] = list[index + 1];
    list[index + 1] = temp;
    setWaypoints(list);
  };

  const handleSave = () => {
    if (waypoints.length < 2) return;

    // Build segments
    const segments: RouteSegment[] = [];
    let totalDistKm = 0;
    let totalDurationMin = 0;
    const villageList: string[] = [];
    const streetList: string[] = [];

    for (let i = 0; i < waypoints.length - 1; i++) {
      const w1 = waypoints[i];
      const w2 = waypoints[i + 1];

      // Approximate dist between points
      const dx = w2.x - w1.x;
      const dy = w2.y - w1.y;
      const distPx = Math.sqrt(dx * dx + dy * dy);
      const segDistKm = Math.round((distPx / 35) * 10) / 10 || 1.8;

      const avgSpeed = (w1.speedLimitKmh + w2.speedLimitKmh) / 2 || 40;
      const segDurationMin = Math.max(1, Math.round((segDistKm / avgSpeed) * 60));

      totalDistKm += segDistKm;
      totalDurationMin += segDurationMin;

      if (w1.villageName && !villageList.includes(w1.villageName)) villageList.push(w1.villageName);
      if (w2.villageName && !villageList.includes(w2.villageName)) villageList.push(w2.villageName);

      if (w1.streetName && !streetList.includes(w1.streetName)) streetList.push(w1.streetName);
      if (w2.streetName && !streetList.includes(w2.streetName)) streetList.push(w2.streetName);

      segments.push({
        id: `manual_seg_${i}_${Date.now()}`,
        name: `${w1.name} → ${w2.name}`,
        villageName: w1.villageName,
        streetName: w1.streetName,
        distanceKm: segDistKm,
        durationMin: segDurationMin,
        congestion: w1.congestion,
        speedLimitKmh: w1.speedLimitKmh,
        roadCondition: w1.roadCondition,
        coordinates: [
          [w1.x, w1.y],
          [Math.round((w1.x + w2.x) / 2), Math.round((w1.y + w2.y) / 2)],
          [w2.x, w2.y],
        ],
        geoCoordinates: [
          [w1.lat, w1.lng],
          [(w1.lat + w2.lat) / 2, (w1.lng + w2.lng) / 2],
          [w2.lat, w2.lng],
        ],
        elevationM: Math.round(410 + i * 8),
      });
    }

    totalDistKm = Math.round(totalDistKm * 10) / 10;

    const newRoute: RouteOption = {
      id: `custom_manual_route_${Date.now()}`,
      title: routeName.trim() || "Custom User Route",
      origin: waypoints[0]?.name || "Custom Start",
      destination: waypoints[waypoints.length - 1]?.name || "Custom End",
      type: "custom_manual",
      summary: `Custom user-defined route passing through ${villageList.length} villages and ${streetList.length} named streets.`,
      distanceKm: totalDistKm,
      durationMin: totalDurationMin,
      typicalDurationMin: Math.round(totalDurationMin * 0.95),
      delayMin: Math.max(0, totalDurationMin - Math.round(totalDurationMin * 0.95)),
      congestionLevel: "low",
      tollCount: 0,
      tollCostInr: 0,
      trafficSignalsCount: Math.max(2, waypoints.length - 1),
      weatherImpactMin: 1,
      weatherImpactReason: "Custom route tuned for local village weather safety",
      confidence: 95,
      badge: "🛠️ Custom Manual Route",
      isAiRecommended: false,
      isManualRoute: true,
      authorName: "Abijith (You)",
      villagesEnRoute: villageList,
      streetsEnRoute: streetList,
      segments,
      description: routeDescription,
      dataQuality: {
        sourceType: "demo",
        provider: "User Created Custom Route Engine",
        lastUpdated: "Just now",
        confidence: 95,
        isLive: true,
      },
    };

    onSaveRoute(newRoute);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <Route className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                Manual Route Creator & Village / Street Builder
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h3>
              <p className="text-xs text-blue-200">
                Design custom routes, name village pass-throughs, define street corridors, and set speed limits.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Route Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                Custom Route Title
              </label>
              <input
                type="text"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                placeholder="e.g. Sivanandapuram Village Shortcut"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                Description / Notes
              </label>
              <input
                type="text"
                value={routeDescription}
                onChange={(e) => setRouteDescription(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                placeholder="e.g. Avoids main highway junction"
              />
            </div>
          </div>

          {/* Preset Villages & Landmarks quick add */}
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-2 flex items-center gap-1.5">
              <TreePine className="w-4 h-4 text-emerald-600" />
              Quick-Add Key Villages & Landmarks:
            </label>
            <div className="flex flex-wrap gap-2">
              {coimbatoreKeyPlaces.slice(0, 8).map((place) => (
                <button
                  key={place.id}
                  onClick={() => handleAddPresetPlace(place.id)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 text-xs font-medium text-slate-700 flex items-center gap-1 transition-all"
                >
                  <Plus className="w-3 h-3 text-blue-600" />
                  {place.shortName} ({place.area})
                </button>
              ))}
            </div>
          </div>

          {/* Current Waypoint List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-600" />
                Route Sequence Waypoints ({waypoints.length} Nodes)
              </h4>
              <span className="text-xs text-slate-500 font-medium">
                {waypoints.length >= 2 ? "✅ Valid Route Sequence" : "⚠️ Add at least 2 waypoints"}
              </span>
            </div>

            <div className="space-y-2.5">
              {waypoints.map((wp, idx) => (
                <div
                  key={wp.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:border-blue-200 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        {wp.name}
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          🏡 {wp.villageName}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-400" />
                          Street: <strong>{wp.streetName}</strong>
                        </span>
                        <span>• Speed Limit: <strong>{wp.speedLimitKmh} km/h</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end md:self-auto">
                    <button
                      onClick={() => handleMoveUp(idx)}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-30"
                      title="Move Up"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveDown(idx)}
                      disabled={idx === waypoints.length - 1}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-30"
                      title="Move Down"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemoveWaypoint(wp.id)}
                      disabled={waypoints.length <= 2}
                      className="p-1.5 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 disabled:opacity-30"
                      title="Remove Waypoint"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Custom Waypoint Form */}
          <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 space-y-3">
            <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-blue-600" />
              Add Custom Waypoint with Village & Street Name
            </h5>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  Waypoint / Junction Name
                </label>
                <input
                  type="text"
                  value={newWpName}
                  onChange={(e) => setNewWpName(e.target.value)}
                  placeholder="e.g. Kalapatti Cross Road"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  Village / Suburb Name
                </label>
                <input
                  type="text"
                  value={newVillageName}
                  onChange={(e) => setNewVillageName(e.target.value)}
                  placeholder="e.g. Kalapatti Village"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  Street / Road Name
                </label>
                <input
                  type="text"
                  value={newStreetName}
                  onChange={(e) => setNewStreetName(e.target.value)}
                  placeholder="e.g. IT Link Expressway"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
                <label className="flex items-center gap-1.5">
                  Speed Limit:
                  <input
                    type="number"
                    value={newSpeedLimit}
                    onChange={(e) => setNewSpeedLimit(Number(e.target.value))}
                    className="w-16 px-2 py-1 rounded border border-slate-300 text-xs text-center font-bold"
                  />
                  km/h
                </label>
              </div>

              <button
                onClick={handleAddWaypoint}
                disabled={!newWpName.trim()}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Node to Route
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Waypoints: <strong className="text-slate-900">{waypoints.length}</strong> • Villages:{" "}
            <strong className="text-slate-900">
              {new Set(waypoints.map((w) => w.villageName)).size}
            </strong>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={waypoints.length < 2}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-500/20 disabled:opacity-40 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              Save & Activate Manual Route
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
