import json
import os
from pathlib import Path

import django

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / 'data'


def _load_json(path):
    with path.open('r', encoding='utf-8') as handle:
        return json.load(handle)


def load_sample_data():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'movilidata.settings')
    django.setup()

    from api.models import Accident, Zone

    accidents_path = DATA_DIR / 'accidents.json'
    zones_path = DATA_DIR / 'zones.json'

    accidents_data = _load_json(accidents_path)
    zones_data = _load_json(zones_path)

    Accident.objects.all().delete()
    Zone.objects.all().delete()

    accident_objects = [
        Accident(
            lat=item['lat'],
            lng=item['lng'],
            intensity=item['intensity'],
            hour=item['hour'],
            date=item.get('date') or None,
        )
        for item in accidents_data
    ]
    Accident.objects.bulk_create(accident_objects)

    zone_objects = [
        Zone(
            name=item['name'],
            risk_level=item['risk_level'],
            geometry=item['geometry'],
        )
        for item in zones_data
    ]
    Zone.objects.bulk_create(zone_objects)

    return len(accident_objects), len(zone_objects)


if __name__ == '__main__':
    accidents, zones = load_sample_data()
    print(f'Loaded {accidents} accidents and {zones} zones.')
