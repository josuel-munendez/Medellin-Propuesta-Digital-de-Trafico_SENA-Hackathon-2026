"""
Parse GeoJSON file with traffic incident data from Medellin.
Extracts incident data and intelligently samples to ~300 representative records.
"""

import json
from datetime import datetime
from typing import List, Dict, Optional
from pathlib import Path


def parse_hora(hora_str: str) -> int:
    """
    Parse hora string in various formats and return hour (0-23).
    
    Formats:
    - "02:00 PM" (12-hour with AM/PM)
    - "14:00:00" (24-hour)
    - "20:38:00" (24-hour with seconds)
    """
    if not hora_str:
        return 0
    
    hora_str = hora_str.strip()
    
    try:
        # Try parsing with AM/PM format first
        if 'AM' in hora_str.upper() or 'PM' in hora_str.upper():
            # Remove extra spaces
            parts = hora_str.split()
            time_part = parts[0]
            meridiem = parts[1].upper() if len(parts) > 1 else ""
            
            hour, minute = map(int, time_part.split(':'))
            
            # Convert 12-hour to 24-hour
            if meridiem == 'PM' and hour != 12:
                hour += 12
            elif meridiem == 'AM' and hour == 12:
                hour = 0
            
            return hour % 24
        else:
            # Try parsing as 24-hour format
            time_parts = hora_str.split(':')
            hour = int(time_parts[0])
            return hour % 24
    except (ValueError, IndexError):
        return 0


def parse_fecha(fecha_ms: int) -> str:
    """Convert millisecond timestamp to ISO date string (YYYY-MM-DD)."""
    try:
        fecha_s = fecha_ms / 1000
        dt = datetime.fromtimestamp(fecha_s)
        return dt.strftime('%Y-%m-%d')
    except (ValueError, OSError):
        return ""


def map_gravedad(gravedad: str) -> int:
    """
    Map gravedad (severity) to intensity level.
    - "MUERTO" → 10
    - "GRAVE" → 8
    - "HERIDO" → 5
    - else → 3
    """
    if not gravedad:
        return 3
    
    gravedad_upper = gravedad.upper().strip()
    
    if gravedad_upper == "MUERTO":
        return 10
    elif gravedad_upper == "GRAVE":
        return 8
    elif gravedad_upper == "HERIDO":
        return 5
    else:
        return 3


def parse_geojson(file_path: str, sample_size: int = 300) -> List[Dict]:
    """
    Parse GeoJSON file with traffic incidents and sample intelligently.
    
    Args:
        file_path: Path to the GeoJSON file
        sample_size: Target number of samples (will sample every Nth feature to achieve this)
    
    Returns:
        List of incident dictionaries with extracted data
    """
    file_path = Path(file_path)
    
    if not file_path.exists():
        raise FileNotFoundError(f"GeoJSON file not found: {file_path}")
    
    # Load GeoJSON
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    features = data.get('features', [])
    total_features = len(features)
    
    print(f"📊 Total features loaded: {total_features}")
    
    # Calculate sampling interval
    sample_interval = max(1, total_features // sample_size)
    
    # Collect statistics
    hours = {}
    lats = []
    lons = []
    gravedades = {}
    barrios = set()
    
    incidents = []
    
    for idx, feature in enumerate(features):
        props = feature.get('properties', {})
        geometry = feature.get('geometry', {})
        coords = geometry.get('coordinates', [None, None])
        
        # Sample intelligently
        if idx % sample_interval != 0:
            continue
        
        # Extract coordinates from properties (latitud, longitud already in WGS84)
        lat = props.get('latitud')
        lon = props.get('longitud')
        
        if lat is None or lon is None:
            continue
        
        # Parse time components
        hora = parse_hora(props.get('hora', ''))
        fecha = parse_fecha(props.get('fecha', 0))
        intensity = map_gravedad(props.get('gravedad', ''))
        
        # Track statistics
        hours[hora] = hours.get(hora, 0) + 1
        if lat is not None:
            lats.append(lat)
        if lon is not None:
            lons.append(lon)
        
        gravedad_raw = props.get('gravedad', 'UNKNOWN')
        gravedades[gravedad_raw] = gravedades.get(gravedad_raw, 0) + 1
        
        barrio = props.get('barrio', '')
        if barrio:
            barrios.add(barrio)
        
        # Build incident record
        incident = {
            'lat': lat,
            'lon': lon,
            'hour': hora,
            'intensity': intensity,
            'date': fecha,
            'barrio': props.get('barrio', ''),
            'comuna': props.get('comuna', ''),
            'clase': props.get('clase', ''),
            'radicado': props.get('radicado', ''),
            'direccion': props.get('direccion', ''),
        }
        
        incidents.append(incident)
    
    # Print statistics
    print(f"\n📈 Sampling Statistics:")
    print(f"  Sample interval: every {sample_interval}th feature")
    print(f"  Sampled incidents: {len(incidents)}")
    print(f"\n🗺️  Geographic Range:")
    if lats:
        print(f"  Latitude: {min(lats):.6f} to {max(lats):.6f}")
    if lons:
        print(f"  Longitude: {min(lons):.6f} to {max(lons):.6f}")
    
    print(f"\n🕐 Hour Distribution (top 5):")
    for hour in sorted(hours.keys()):
        count = hours[hour]
        print(f"  {hour:02d}:00 - {count} incidents")
    
    print(f"\n⚠️  Severity Distribution:")
    for gravedad, count in sorted(gravedades.items()):
        intensity = map_gravedad(gravedad)
        print(f"  {gravedad:15s} → intensity {intensity}: {count} incidents")
    
    print(f"\n🏘️  Barrios: {len(barrios)} unique neighborhoods")
    
    return incidents


def save_incidents_json(incidents: List[Dict], output_path: str) -> None:
    """Save incidents to JSON file."""
    output_path = Path(output_path)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(incidents, f, indent=2, ensure_ascii=False)
    print(f"\n✅ Saved {len(incidents)} incidents to {output_path}")


if __name__ == '__main__':
    # Example usage
    import sys
    
    geojson_path = Path(__file__).parent / 'data' / 'total_incidentes_transito.geojson'
    
    if not geojson_path.exists():
        print(f"Error: GeoJSON file not found at {geojson_path}")
        sys.exit(1)
    
    # Parse with default sample size
    incidents = parse_geojson(str(geojson_path), sample_size=300)
    
    # Save to JSON
    output_path = Path(__file__).parent / 'data' / 'incidents_sampled.json'
    save_incidents_json(incidents, str(output_path))
    
    print("\n✨ Done!")
