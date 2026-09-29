import React, { useState, useEffect, useRef, useCallback } from "react";
import { RouteOption, UserPreferences, WorldwideLocation } from "../types";
import {
  Compass,
  ArrowRight,
  ArrowUpDown,
  Navigation,
  Clock,
  Zap,
  AlertTriangle,
  Car,
  Mic,
  Plus,
  Globe,
  Loader2,
  MapPin,
  Layers,
  TreePine,
  Building,
  ExternalLink,
  X,
  GripVertical,
  RotateCcw,
  Route,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { DataBadge } from "./DataBadge";
import { worldRoutingService } from "../services/worldRoutingService";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Waypoint {
  id: string;
  label: string;
  resolvedLoc: WorldwideLocation | null;
  searchResults: WorldwideLocation[];
  isSearching: boolean;
  isFocused: boolean;
}

const makeWaypoint = (label = ""): Waypoint => ({
  id: `wp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  label,
  resolvedLoc: null,
  searchResults: [],
  isSearching: false,
  isFocused: false,
});

interface RoutePlannerViewProps {
  routes: RouteOption[];
  selectedRouteId: string;
  onSelectRoute: (id: string) => void;
  userPreferences: UserPreferences;
  showDataBadges: boolean;
  onStartNavigation: () => void;
  isNavigating: boolean;
  onOpenVoiceCommand?: () => void;
  onOpenManualBuilder?: () => void;
  onAddWorldwideRoute?: (newRoute: RouteOption) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export const RoutePlannerView: React.FC<RoutePlannerViewProps> = ({
  routes,
  selectedRouteId,
  onSelectRoute,
  userPreferences,
  showDataBadges,
  onStartNavigation,
  isNavigating,
  onOpenVoiceCommand,
  onOpenManualBuilder,
  onAddWorldwideRoute,
}) => {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([
    makeWaypoint("Gandhipuram Central"),
    makeWaypoint("Saravanampatti Tech Zone"),
  ]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const updateWaypoint = useCallback((id: string, patch: Partial<Waypoint>) => {
    setWaypoints((prev) => prev.map((wp) => (wp.id === id ? { ...wp, ...patch } : wp)));
  }, []);

  const handleLabelChange = (id: string, value: string) => {
    updateWaypoint(id, { label: value, resolvedLoc: null, searchResults: [] });
    if (debounceTimers.current[id]) clearTimeout(debounceTimers.current[id]);
    if (!value || value.length < 3) return;
    debounceTimers.current[id] = setTimeout(async () => {
      updateWaypoint(id, { isSearching: true });
      const results = await worldRoutingService.searchWorldwideLocations(value);
      updateWaypoint(id, { isSearching: false, searchResults: results });
    }, 360);
  };

  const handleSelectResult = (id: string, loc: WorldwideLocation) => {
    updateWaypoint(id, {
      label: loc.shortName || loc.displayName.slice(0, 50),
      resolvedLoc: loc,
      searchResults: [],
      isFocused: false,
    });
  };

  const addStop = () => {
    setWaypoints((prev) => {
      const next = [...prev];
      next.splice(next.length - 1, 0, makeWaypoint(""));
      return next;
    });
  };

  const removeStop = (id: string) => {
    setWaypoints((prev) => {
      if (prev.length <= 2) return prev;
      return prev.filter((wp) => wp.id !== id);
    });
  };

  const swapOriginDest = () => {
    setWaypoints((prev) => {
      const next = [...prev];
      const first = next[0];
      const last = next[next.length - 1];
      next[0] = { ...last, id: first.id };
      next[next.length - 1] = { ...first, id: last.id };
      return next;
    });
  };

  const reverseAll = () => {
    setWaypoints((prev) => [...prev].reverse().map((wp, i) => ({ ...wp, id: prev[i].id })));
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };
  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    setWaypoints((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const applyPreset = (stops: string[]) => {
    setWaypoints(stops.map((s) => makeWaypoint(s)));
    setCalcError(null);
  };

  /**
   * Resolves a waypoint to a WorldwideLocation.
   * Tries the full label first, then progressively shorter fallback queries
   * (e.g. "Saravanampatti Tech Zone" → "Saravanampatti" → first word).
   */
  const resolveWaypoint = async (wp: Waypoint): Promise<WorldwideLocation | null> => {
    if (wp.resolvedLoc) return wp.resolvedLoc;
    const raw = wp.label.trim();
    if (!raw) return null;

    // Build a list of progressively simpler query variants to try
    const words = raw.split(/\s+/);
    const queries: string[] = [
      raw,                                          // full label
      words.slice(0, 3).join(" "),                  // first 3 words
      words.slice(0, 2).join(" "),                  // first 2 words
      words[0],                                     // first word only
    ].filter((q, i, arr) => q.length >= 2 && arr.indexOf(q) === i); // dedupe & min length

    for (const q of queries) {
      const results = await worldRoutingService.searchWorldwideLocations(q);
      if (results.length > 0) return results[0];
    }
    return null;
  };

  const handleCalculate = async () => {
    const validWps = waypoints.filter((wp) => wp.label.trim().length > 0);
    if (validWps.length < 2) {
      setCalcError("Please enter at least an origin and a destination.");
      return;
    }
    setIsCalculating(true);
    setCalcError(null);
    try {
      const resolvedStops = await Promise.all(validWps.map(resolveWaypoint));

      // Find any stop that failed geocoding and report it specifically
      const failedIndex = resolvedStops.findIndex((loc) => loc === null);
      if (failedIndex !== -1) {
        const failedLabel = validWps[failedIndex].label;
        const role =
          failedIndex === 0
            ? "origin"
            : failedIndex === validWps.length - 1
            ? "destination"
            : `stop ${failedIndex}`;
        setCalcError(
          `Couldn't find "${failedLabel}" on the map (${role}). Try a city name or landmark instead.`
        );
        return;
      }

      const stops = (resolvedStops as WorldwideLocation[]).map((loc, i) => ({
        name: loc.shortName || validWps[i].label,
        lat: loc.lat,
        lng: loc.lng,
      }));

      if (stops.length < 2) {
        setCalcError("Need at least 2 valid locations to calculate a route.");
        return;
      }

      const newRoute = await worldRoutingService.fetchMultiStopRoute(stops);
      if (newRoute && onAddWorldwideRoute) {
        onAddWorldwideRoute(newRoute);
        onSelectRoute(newRoute.id);
      } else {
        setCalcError("Route calculation failed. Please try different locations.");
      }
    } catch (err) {
      console.error("Multi-stop route error:", err);
      setCalcError("An error occurred. Please check your internet connection.");
    } finally {
      setIsCalculating(false);
    }
  };

  const activeRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];

  const buildGoogleMapsUrl = () => {
    const validWps = waypoints.filter((wp) => wp.label.trim());
    if (validWps.length < 2) {
      return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(activeRoute.origin || "Gandhipuram Central")}&destination=${encodeURIComponent(activeRoute.destination || "Saravanampatti Tech Zone")}&travelmode=driving`;
    }
    const origin = encodeURIComponent(validWps[0].label);
    const destination = encodeURIComponent(validWps[validWps.length - 1].label);
    const waypts = validWps.slice(1, -1).map((w) => encodeURIComponent(w.label)).join("|");
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    if (waypts) url += `&waypoints=${waypts}`;
    return url;
  };

  return (
    <div className="space-y-6 pb-12">

      {/* ── MULTI-STOP PLANNER HEADER ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-visible">

        {/* Title bar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Route className="w-5 h-5 text-blue-600" />
              Multi-Stop Route Planner
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Add destinations, drag to reorder stops — just like Google Maps navigation.
            </p>
          </div>
          {showDataBadges && (
            <DataBadge
              metadata={{
                sourceType: "live",
                provider: "OpenStreetMap · OSRM",
                lastUpdated: "Real-time",
                confidence: 94,
                isLive: true,
              }}
            />
          )}
        </div>

        {/* ── WAYPOINT LIST ──────────────────────────────────────────────── */}
        <div className="px-6 py-4 space-y-2">
          {waypoints.map((wp, index) => {
            const isOrigin = index === 0;
            const isDest = index === waypoints.length - 1;
            const isDraggingOver = dragOverIndex === index;

            const dotColor = isOrigin
              ? "bg-blue-600"
              : isDest
              ? "bg-red-500"
              : "bg-amber-500";

            return (
              <div key={wp.id} className="relative group">
                {/* Vertical connector */}
                {!isDest && (
                  <div
                    className="absolute left-[28px] top-full w-0 border-l-2 border-dashed border-slate-200 pointer-events-none"
                    style={{ height: "10px", zIndex: 0 }}
                  />
                )}

                <div
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                  className={`flex items-center gap-2.5 rounded-xl transition-all duration-150 ${
                    isDraggingOver
                      ? "ring-2 ring-blue-400 bg-blue-50/50 scale-[1.01]"
                      : dragIndex === index
                      ? "opacity-40"
                      : ""
                  }`}
                >
                  {/* Drag handle */}
                  <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 p-1 shrink-0 transition-colors">
                    <GripVertical className="w-4 h-4" />
                  </div>

                  {/* Dot */}
                  <div className={`w-3 h-3 rounded-full shrink-0 border-2 border-white shadow ${dotColor}`} />

                  {/* Input container */}
                  <div className="flex-1 relative min-w-0">
                    <div
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border bg-slate-50 transition-all ${
                        wp.isFocused
                          ? "border-blue-500 bg-white ring-2 ring-blue-100"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider w-10 shrink-0">
                        {isOrigin ? "From" : isDest ? "To" : `Stop ${index}`}
                      </span>
                      <div className="w-px h-3.5 bg-slate-200 shrink-0" />
                      <input
                        type="text"
                        value={wp.label}
                        onChange={(e) => handleLabelChange(wp.id, e.target.value)}
                        onFocus={() => updateWaypoint(wp.id, { isFocused: true })}
                        onBlur={() =>
                          setTimeout(
                            () => updateWaypoint(wp.id, { isFocused: false, searchResults: [] }),
                            200
                          )
                        }
                        placeholder={
                          isOrigin
                            ? "Enter starting point…"
                            : isDest
                            ? "Enter final destination…"
                            : "Add a stop…"
                        }
                        className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
                      />
                      {wp.isSearching && (
                        <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin shrink-0" />
                      )}
                      {wp.label && !wp.isSearching && (
                        <button
                          onMouseDown={() =>
                            updateWaypoint(wp.id, { label: "", resolvedLoc: null, searchResults: [] })
                          }
                          className="p-0.5 rounded text-slate-300 hover:text-slate-600 shrink-0 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Autocomplete dropdown */}
                    {wp.isFocused && wp.searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
                        {wp.searchResults.map((loc, li) => (
                          <button
                            key={`${loc.placeId}_${li}`}
                            onMouseDown={() => handleSelectResult(wp.id, loc)}
                            className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-blue-50 transition-colors text-left border-b border-slate-50 last:border-0"
                          >
                            <MapPin className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-slate-800 truncate">
                                {loc.shortName}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate leading-tight">
                                {loc.displayName}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Remove button */}
                  {waypoints.length > 2 && (
                    <button
                      onClick={() => removeStop(wp.id)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                      title="Remove stop"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add Stop / Swap / Reverse controls */}
          <div className="flex items-center gap-2 pt-1 pl-10">
            <button
              onClick={addStop}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Stop
            </button>
            <button
              onClick={swapOriginDest}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-all"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              Swap
            </button>
            {waypoints.length > 2 && (
              <button
                onClick={reverseAll}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reverse All
              </button>
            )}
          </div>
        </div>

        {/* ── ACTION BAR ─────────────────────────────────────────────────── */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCalculate}
                disabled={isCalculating}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isCalculating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Calculating Route…
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4" />
                    Get Directions
                  </>
                )}
              </button>

              {onOpenManualBuilder && (
                <button
                  onClick={onOpenManualBuilder}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  Custom Manual Route
                </button>
              )}
            </div>

            {/* Quick presets */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Presets:</span>
              {[
                { name: "2-Stop: Gandhi → Sara", stops: ["Gandhipuram Central", "Saravanampatti Tech Zone"] },
                { name: "3-Stop: Airport → Mall → City", stops: ["Coimbatore Airport CJB", "Prozone Mall Coimbatore", "Gandhipuram Central"] },
                { name: "4-Stop Loop", stops: ["Peelamedu Tech Zone", "TIDEL Park Coimbatore", "Saravanampatti IT Corridor", "Gandhipuram Central"] },
              ].map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => applyPreset(preset.stops)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200 transition-colors"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {calcError && (
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {calcError}
            </div>
          )}
        </div>
      </div>

      {/* ── ROUTE COMPARISON CARDS ────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            Available Routes
            <span className="text-xs font-normal text-slate-400">({routes.length} options)</span>
          </h3>
          <span className="text-xs text-slate-500">
            Active: <strong className="text-blue-600">{activeRoute.title}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {routes.map((route) => {
            const isSelected = route.id === selectedRouteId;
            const isExpanded = expandedRouteId === route.id;
            return (
              <div
                key={route.id}
                onClick={() => onSelectRoute(route.id)}
                className={`rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? "bg-blue-50/70 border-blue-500 shadow-md ring-2 ring-blue-500/30"
                    : "bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full inline-block mb-1.5 ${
                          route.type === "fastest"
                            ? "bg-blue-600 text-white"
                            : route.type === "alternative"
                            ? "bg-emerald-600 text-white"
                            : route.type === "low_toll"
                            ? "bg-amber-600 text-white"
                            : route.type === "worldwide"
                            ? "bg-cyan-600 text-white"
                            : "bg-purple-600 text-white"
                        }`}
                      >
                        {route.badge}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 truncate">{route.title}</h4>
                      {route.origin && route.destination && (
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{route.origin} → {route.destination}</span>
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-black text-slate-900 leading-tight">
                        {route.durationMin} <span className="text-xs font-semibold text-slate-500">min</span>
                      </div>
                      <span className="text-xs text-slate-500">{route.distanceKm} km</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mb-3 line-clamp-2">{route.description}</p>

                  {/* Stats grid */}
                  <div className="grid grid-cols-4 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Traffic</span>
                      <span className={`font-bold capitalize ${
                        route.congestionLevel === "low" ? "text-emerald-600"
                        : route.congestionLevel === "moderate" ? "text-amber-600"
                        : "text-red-600"
                      }`}>{route.congestionLevel}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Tolls</span>
                      <span className="font-bold text-slate-800">
                        {route.tollCostInr > 0 ? `₹${route.tollCostInr}` : "₹0 Free"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Signals</span>
                      <span className="font-bold text-slate-800">{route.trafficSignalsCount}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Rain+</span>
                      <span className="font-bold text-blue-600">+{route.weatherImpactMin}m</span>
                    </div>
                  </div>

                  {/* Expandable via areas & streets */}
                  {((route.villagesEnRoute && route.villagesEnRoute.length > 0) ||
                    (route.streetsEnRoute && route.streetsEnRoute.length > 0)) && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedRouteId(isExpanded ? null : route.id);
                        }}
                        className="text-[11px] font-bold text-slate-400 hover:text-slate-700 flex items-center gap-1 mb-2"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {isExpanded ? "Hide" : "Show"} route details
                      </button>

                      {isExpanded && (
                        <div className="space-y-1.5">
                          {route.villagesEnRoute && route.villagesEnRoute.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 shrink-0">
                                <TreePine className="w-3 h-3 text-emerald-600" /> Areas:
                              </span>
                              {route.villagesEnRoute.map((v, i) => (
                                <span key={i} className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200/60">
                                  🏡 {v}
                                </span>
                              ))}
                            </div>
                          )}
                          {route.streetsEnRoute && route.streetsEnRoute.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 shrink-0">
                                <Building className="w-3 h-3 text-indigo-600" /> Streets:
                              </span>
                              {route.streetsEnRoute.slice(0, 5).map((st, i) => (
                                <span key={i} className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 font-semibold border border-indigo-200/60">
                                  🛣️ {st}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Confidence: <strong className="text-slate-700">{route.confidence}%</strong></span>
                    <span className="font-semibold text-blue-600">
                      {isSelected ? "✓ Active Route" : "Select Route →"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── NAVIGATION ACTION BAR ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-900 text-white p-6 rounded-2xl shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-300">Selected for Navigation</span>
            <h3 className="text-lg font-bold text-white mt-0.5 truncate">{activeRoute.title}</h3>

            {/* Stop breadcrumbs */}
            {waypoints.filter((w) => w.label).length > 1 && (
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {waypoints.filter((w) => w.label).map((wp, i, arr) => (
                  <React.Fragment key={wp.id}>
                    <span className="text-[11px] font-semibold text-blue-200 bg-blue-800/50 px-2 py-0.5 rounded-full border border-blue-700/50 truncate max-w-[120px]">
                      {i === 0 ? "🔵" : i === arr.length - 1 ? "🔴" : "🟡"} {wp.label.split(",")[0]}
                    </span>
                    {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-blue-400 shrink-0" />}
                  </React.Fragment>
                ))}
              </div>
            )}

            <p className="text-xs text-slate-300 mt-2">
              {activeRoute.durationMin} min · {activeRoute.distanceKm} km · +{activeRoute.weatherImpactMin} min rain ·{" "}
              <span className="capitalize font-semibold text-amber-300">{activeRoute.congestionLevel}</span>
              {" "}traffic · Tolls ₹{activeRoute.tollCostInr}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={buildGoogleMapsUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-3.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2 transition-all shadow-md"
              title="Open route in Google Maps with all stops"
            >
              <ExternalLink className="w-4 h-4" />
              Open in Google Maps
            </a>

            {onOpenVoiceCommand && (
              <button
                onClick={onOpenVoiceCommand}
                className="px-4 py-3.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/20 border border-white/20 text-cyan-300 flex items-center gap-2 transition-all group"
              >
                <Mic className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline">Voice</span>
              </button>
            )}

            <button
              onClick={onStartNavigation}
              className={`px-6 py-3.5 rounded-xl font-extrabold text-sm shadow-xl flex items-center gap-2.5 transition-all shrink-0 ${
                isNavigating
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30"
              }`}
            >
              <Car className="w-5 h-5" />
              {isNavigating ? "Stop Navigation" : "Start Navigation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
