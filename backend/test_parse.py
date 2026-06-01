#!/usr/bin/env python3
"""Quick test of parse_geojson functionality."""

import sys
import json
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from parse_geojson import parse_geojson, parse_hora, map_gravedad, parse_fecha

# Test individual functions
print("=" * 60)
print("Testing individual parsing functions:")
print("=" * 60)

# Test hora parsing
test_horas = ["02:00 PM", "14:00:00", "20:38:00", "11:10 AM", "12:00 PM", "12:00 AM"]
print("\nHora parsing tests:")
for h in test_horas:
    parsed = parse_hora(h)
    print(f"  '{h}' → {parsed:02d}:00")

# Test gravedad mapping
test_gravedades = ["MUERTO", "GRAVE", "HERIDO", "SOLO DAÑOS", None]
print("\nGravedad mapping tests:")
for g in test_gravedades:
    intensity = map_gravedad(g)
    print(f"  '{g}' → intensity {intensity}")

# Test fecha parsing
print("\nFecha parsing test:")
test_fecha = 1493942400000  # From first record
parsed_date = parse_fecha(test_fecha)
print(f"  {test_fecha} → {parsed_date}")

# Now test the full parsing
print("\n" + "=" * 60)
print("Testing full GeoJSON parsing:")
print("=" * 60 + "\n")

geojson_path = Path(__file__).parent / 'data' / 'total_incidentes_transito.geojson'

if not geojson_path.exists():
    print(f"❌ GeoJSON file not found: {geojson_path}")
    sys.exit(1)

try:
    incidents = parse_geojson(str(geojson_path), sample_size=300)
    
    print(f"\n✅ Successfully parsed {len(incidents)} incidents\n")
    
    # Show sample incident
    if incidents:
        print("Sample incident:")
        sample = incidents[0]
        for key, value in sample.items():
            print(f"  {key:15s}: {value}")
    
    print("\n✨ All tests passed!")
    sys.exit(0)
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
