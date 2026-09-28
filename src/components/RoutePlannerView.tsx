import React, { useState, useEffect } from "react";
import { RouteOption, UserPreferences, WorldwideLocation } from "../types";
import {
  Compass,
  ArrowRight,
  ArrowUpDown,
  Navigation,
  Clock,
  Zap,
  CreditCard,
  CloudRain,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Car,
  Volume2,
  Mic,
  Plus,
  Globe,
  Search,
  Loader2,
  MapPin,
  Sparkles,
  Layers,
  TreePine,
  Building,
  ExternalLink
} from "lucide-react";
import { DataBadge } from "./DataBadge";
import { worldRoutingService } from "../services/worldRoutingService";

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
  const [origin, setOrigin] = useState("Gandhipuram Central");
  const [destination, setDestination] = useState("Saravanampatti Tech Zone");

  // Worldwide Geocoding search states
  const [originSearchResults, setOriginSearchResults] = useState<WorldwideLocation[]>([]);
  const [destSearchResults, setDestSearchResults] = useState<WorldwideLocation[]>([]);
  const [selectedOriginLoc, setSelectedOriginLoc] = useState<WorldwideLocation | null>(null);
  const [selectedDestLoc, setSelectedDestLoc] = useState<WorldwideLocation | null>(null);
  const [isSearchingWorldwide, setIsSearchingWorldwide] = useState(false);
  const [activeSearchField, setActiveSearchField] = useState<"origin" | "dest" | null>(null);

  // Debounced geocoding search for origin
  useEffect(() => {
    if (activeSearchField !== "origin" || !origin || origin.length < 3) {
      setOriginSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await worldRoutingService.searchWorldwideLocations(origin);
      setOriginSearchResults(results);
    }, 350);
    return () => clearTimeout(timer);
  }, [origin, activeSearchField]);

  // Debounced geocoding search for destination
  useEffect(() => {
    if (activeSearchField !== "dest" || !destination || destination.length < 3) {
      setDestSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await worldRoutingService.searchWorldwideLocations(destination);
      setDestSearchResults(results);
    }, 350);
    return () => clearTimeout(timer);
  }, [destination, activeSearchField]);

  const handleCalculateWorldwide = async () => {
    if (!origin.trim() || !destination.trim()) return;
    setIsSearchingWorldwide(true);

    try {
      // Find locations if not already selected
      let originLoc = selectedOriginLoc;
      let destLoc = selectedDestLoc;

      if (!originLoc) {
        const oResults = await worldRoutingService.searchWorldwideLocations(origin);
        if (oResults.length > 0) originLoc = oResults[0];
      }

      if (!destLoc) {
        const dResults = await worldRoutingService.searchWorldwideLocations(destination);
        if (dResults.length > 0) destLoc = dResults[0];
      }

      if (originLoc && destLoc && onAddWorldwideRoute) {
        const newRoute = await worldRoutingService.fetchWorldwideRoute(
          { name: originLoc.shortName || originLoc.street || origin, lat: originLoc.lat, lng: originLoc.lng },
          { name: destLoc.shortName || destLoc.street || destination, lat: destLoc.lat, lng: destLoc.lng }
        );
        if (newRoute) {
          onAddWorldwideRoute(newRoute);
          onSelectRoute(newRoute.id);
        }
      }
    } catch (e) {
      console.warn("Failed to calculate worldwide route:", e);
    } finally {
      setIsSearchingWorldwide(false);
      setActiveSearchField(null);
    }
  };

  const handleSwap = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const activeRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER & CORRIDOR SEARCH */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Compass className="w-5 h-5 text-blue-600" />
              Smart Route Optimizer
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Compare fastest, alternative, low-toll, and balanced corridors calculated with live & predicted data.
            </p>
          </div>

          {showDataBadges && (
            <DataBadge
              metadata={{
                sourceType: "demo",
                provider: "SmartRoute Multi-Factor Cost Engine",
                lastUpdated: "Real-time",
                confidence: 92,
                isLive: false,
              }}
            />
          )}
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
          <div className="md:col-span-5 relative">
            <label className="text-[11px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">
              Starting Location
            </label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none"
                placeholder="Enter starting location"
              />
            </div>
          </div>

          <div className="md:col-span-1 flex justify-center">
            <button
              onClick={handleSwap}
              className="p-2 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-600 transition-all"
              title="Swap Start & Destination"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>

          <div className="md:col-span-5 relative">
            <label className="text-[11px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">
              Destination
            </label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0" />
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none"
                placeholder="Enter destination"
              />
            </div>
          </div>
        </div>

        {/* Action bar for Worldwide Route calculation and Manual Route creation */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCalculateWorldwide}
              disabled={isSearchingWorldwide}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
              {isSearchingWorldwide ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Calculating Global Route...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  Calculate Worldwide OpenStreetMap Route
                </>
              )}
            </button>

            {onOpenManualBuilder && (
              <button
                onClick={onOpenManualBuilder}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                Create Custom Manual Route
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Quick presets:</span>
            {[
              { name: "Gandhipuram → Saravanampatti", o: "Gandhipuram Central", d: "Saravanampatti IT Corridor" },
              { name: "Airport → City Center", o: "Coimbatore Airport (CJB)", d: "Gandhipuram Central" },
              { name: "Peelamedu → Railway Station", o: "Peelamedu Tech Zone", d: "Coimbatore Junction Railway" },
            ].map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setOrigin(preset.o);
                  setDestination(preset.d);
                }}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-colors"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ROUTE COMPARISON CARDS (Section 6) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            Available Routes ({routes.length} options evaluated)
          </h3>
          <span className="text-xs text-slate-500">
            Selected: <strong className="text-blue-600">{activeRoute.title}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {routes.map((route) => {
            const isSelected = route.id === selectedRouteId;
            return (
              <div
                key={route.id}
                onClick={() => onSelectRoute(route.id)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer relative ${
                  isSelected
                    ? "bg-blue-50/70 border-blue-500 shadow-md ring-2 ring-blue-500/30"
                    : "bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                {/* Header badge & title */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full inline-block mb-1.5 ${
                        route.type === "fastest"
                          ? "bg-blue-600 text-white"
                          : route.type === "alternative"
                          ? "bg-emerald-600 text-white"
                          : route.type === "low_toll"
                          ? "bg-amber-600 text-white"
                          : "bg-purple-600 text-white"
                      }`}
                    >
                      {route.badge}
                    </span>
                    <h4 className="text-lg font-bold text-slate-900">{route.title}</h4>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-black text-slate-900 leading-tight">
                      {route.durationMin} <span className="text-xs font-semibold text-slate-500">min</span>
                    </div>
                    <span className="text-xs text-slate-500">{route.distanceKm} km</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mb-4">{route.description}</p>

                {/* Factors grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Traffic:</span>
                    <span
                      className={`font-bold capitalize ${
                        route.congestionLevel === "low"
                          ? "text-emerald-600"
                          : route.congestionLevel === "moderate"
                          ? "text-amber-600"
                          : "text-red-600"
                      }`}
                    >
                      {route.congestionLevel}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">Tolls:</span>
                    <span className="font-bold text-slate-800">
                      {route.tollCostInr > 0 ? `₹${route.tollCostInr}` : "₹0 Free"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">Signals:</span>
                    <span className="font-bold text-slate-800">{route.trafficSignalsCount} lights</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">Rain Impact:</span>
                    <span className="font-bold text-blue-600">+{route.weatherImpactMin} min</span>
                  </div>
                </div>

                {/* Villages & Streets En Route */}
                {((route.villagesEnRoute && route.villagesEnRoute.length > 0) || (route.streetsEnRoute && route.streetsEnRoute.length > 0)) && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                    {route.villagesEnRoute && route.villagesEnRoute.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 shrink-0">
                          <TreePine className="w-3 h-3 text-emerald-600" />
                          Villages:
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
                          <Building className="w-3 h-3 text-indigo-600" />
                          Streets:
                        </span>
                        {route.streetsEnRoute.slice(0, 4).map((st, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 font-semibold border border-indigo-200/60">
                            🛣️ {st}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Segments speed limit preview */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Speed Limits:{" "}
                    <strong className="text-slate-700">
                      {route.segments.some((s) => s.speedLimitUnavailable)
                        ? "50-60 km/h (1 link unposted)"
                        : "50-60 km/h"}
                    </strong>
                  </span>

                  <span className="font-semibold text-blue-600">
                    {isSelected ? "✓ Active Route" : "Select Route →"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SELECTED ROUTE ACTION BAR */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
            Selected for Navigation
          </span>
          <h3 className="text-xl font-bold text-white mt-0.5">
            {activeRoute.title} – {activeRoute.durationMin} min ({activeRoute.distanceKm} km)
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            Weather delay: +{activeRoute.weatherImpactMin} min • Tolls: ₹{activeRoute.tollCostInr} • Congestion:{" "}
            <span className="capitalize font-semibold text-amber-300">{activeRoute.congestionLevel}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(activeRoute.origin || "Gandhipuram Central")}&destination=${encodeURIComponent(activeRoute.destination || "Saravanampatti Tech Zone")}&travelmode=driving`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-3.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2 transition-all shadow-md shrink-0"
            title="Open turn-by-turn navigation in official Google Maps app"
          >
            <ExternalLink className="w-4 h-4 text-white" />
            <span>Open in Google Maps</span>
          </a>

          {onOpenVoiceCommand && (
            <button
              onClick={onOpenVoiceCommand}
              className="px-4 py-3.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/20 border border-white/20 text-cyan-300 flex items-center gap-2 transition-all shadow-md group"
              title="Voice Control: Say 'Start navigation to work'"
            >
              <Mic className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Voice</span>
            </button>
          )}

          <button
            onClick={onStartNavigation}
            className={`px-6 py-3.5 rounded-xl font-bold text-sm shadow-xl flex items-center gap-2.5 transition-all shrink-0 ${
              isNavigating
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold shadow-emerald-500/30"
            }`}
          >
            <Car className="w-5 h-5" />
            {isNavigating ? "Stop Live Simulation" : "Start Live Navigation"}
          </button>
        </div>
      </div>
    </div>
  );
};
