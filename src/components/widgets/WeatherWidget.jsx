import React, { useEffect, useState } from 'react';
import { Cloud, CloudRain, CloudSnow, Sun, CloudSun, Droplets, Wind, MapPin } from 'lucide-react';

const DEFAULT = { lat: 37.5665, lon: 126.978, name: 'Seoul' };

function weatherIcon(code) {
  if (code === 0) return Sun;
  if (code >= 1 && code <= 3) return CloudSun;
  if (code >= 51 && code <= 67) return CloudRain;
  if (code >= 71 && code <= 77) return CloudSnow;
  return Cloud;
}

function weatherLabel(code) {
  if (code === 0) return '맑음';
  if (code >= 1 && code <= 3) return '일부 흐림';
  if (code >= 45 && code <= 48) return '안개';
  if (code >= 51 && code <= 67) return '비';
  if (code >= 71 && code <= 77) return '눈';
  if (code >= 80 && code <= 82) return '소나기';
  if (code >= 95) return '뇌우';
  return '흐림';
}

export default function WeatherWidget() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async (lat, lon, name) => {
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m` +
          `&timezone=auto`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('weather fetch failed');
        const json = await res.json();
        if (cancelled) return;
        setData({
          name,
          temp: Math.round(json.current.temperature_2m),
          code: json.current.weather_code,
          humidity: json.current.relative_humidity_2m,
          wind: Math.round(json.current.wind_speed_10m),
        });
      } catch {
        if (!cancelled) setError('날씨를 불러오지 못했습니다.');
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => load(pos.coords.latitude, pos.coords.longitude, 'Here'),
        () => load(DEFAULT.lat, DEFAULT.lon, DEFAULT.name),
        { timeout: 5000 },
      );
    } else {
      load(DEFAULT.lat, DEFAULT.lon, DEFAULT.name);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const Icon = data ? weatherIcon(data.code) : Cloud;

  return (
    <div className="ui-card flex flex-wrap items-center gap-3 px-4 py-3">
      {error ? (
        <p className="text-meta text-muted">{error}</p>
      ) : !data ? (
        <p className="text-meta text-muted">날씨 불러오는 중...</p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Icon size={18} className="text-ink" />
            <span className="text-lg font-bold tabular-nums">{data.temp}°</span>
            <span className="text-meta text-muted">{weatherLabel(data.code)}</span>
          </div>
          <div className="hidden h-4 w-px bg-line-soft sm:block" />
          <div className="flex items-center gap-1.5 text-meta text-muted">
            <Droplets size={14} />
            <span className="tabular-nums">{data.humidity}%</span>
          </div>
          <div className="flex items-center gap-1.5 text-meta text-muted">
            <Wind size={14} />
            <span className="tabular-nums">{data.wind} km/h</span>
          </div>
          <div className="flex items-center gap-1.5 text-meta text-muted">
            <MapPin size={14} />
            <span className="truncate">{data.name}</span>
          </div>
        </>
      )}
    </div>
  );
}