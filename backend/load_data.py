import json
import os
import random
from datetime import date, timedelta

import django
from django.contrib.auth import get_user_model


MEDELLIN_POINTS = [
    (6.2518, -75.5636),
    (6.2442, -75.5812),
    (6.2304, -75.5698),
    (6.2472, -75.5903),
    (6.2653, -75.5711),
    (6.2791, -75.5639),
    (6.2165, -75.5886),
    (6.1983, -75.5774),
    (6.2388, -75.5482),
    (6.2494, -75.6012),
]

ZONES = [
    {
        'name': 'Centro',
        'risk_level': 'alta',
        'geometry': {
            'type': 'Polygon',
            'coordinates': [[
                [-75.5745, 6.2488],
                [-75.5608, 6.2488],
                [-75.5608, 6.2598],
                [-75.5745, 6.2598],
                [-75.5745, 6.2488],
            ]],
        },
    },
    {
        'name': 'Laureles',
        'risk_level': 'media',
        'geometry': {
            'type': 'Polygon',
            'coordinates': [[
                [-75.5988, 6.2394],
                [-75.5844, 6.2394],
                [-75.5844, 6.2506],
                [-75.5988, 6.2506],
                [-75.5988, 6.2394],
            ]],
        },
    },
    {
        'name': 'El Poblado',
        'risk_level': 'baja',
        'geometry': {
            'type': 'Polygon',
            'coordinates': [[
                [-75.5818, 6.1847],
                [-75.5558, 6.1847],
                [-75.5558, 6.2089],
                [-75.5818, 6.2089],
                [-75.5818, 6.1847],
            ]],
        },
    },
]


def _generate_accidents(total=120):
    rng = random.Random(20260529)
    start_date = date(2026, 5, 1)
    accidents = []

    for index in range(total):
        base_lat, base_lng = MEDELLIN_POINTS[index % len(MEDELLIN_POINTS)]
        rush_hour_bias = [6, 7, 8, 12, 17, 18, 19, 20]
        hour = rush_hour_bias[index % len(rush_hour_bias)] if index % 3 else rng.randint(0, 23)
        intensity = rng.randint(4, 10) if hour in rush_hour_bias else rng.randint(1, 7)

        accidents.append({
            'lat': round(base_lat + rng.uniform(-0.0065, 0.0065), 6),
            'lng': round(base_lng + rng.uniform(-0.0065, 0.0065), 6),
            'intensity': intensity,
            'hour': hour,
            'date': start_date + timedelta(days=index % 28),
        })

    return accidents


def load_sample_data():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'movilidata.settings')
    django.setup()

    from api.models import Accident, Zone
    User = get_user_model()

    Accident.objects.all().delete()
    Zone.objects.all().delete()

    accident_objects = [
        Accident(
            lat=item['lat'],
            lng=item['lng'],
            intensity=item['intensity'],
            hour=item['hour'],
            date=item['date'],
        )
        for item in _generate_accidents()
    ]
    Accident.objects.bulk_create(accident_objects)

    zone_objects = [
        Zone(
            name=item['name'],
            risk_level=item['risk_level'],
            geometry=json.dumps(item['geometry']),
        )
        for item in ZONES
    ]
    Zone.objects.bulk_create(zone_objects)

    demo_users = [
        {
            'username': 'admin',
            'email': 'admin@urbanlytics.local',
            'password': 'Admin123!',
            'first_name': 'Admin',
            'last_name': 'Urbanlytics',
            'is_staff': True,
            'is_superuser': True,
        },
        {
            'username': 'usuario',
            'email': 'usuario@urbanlytics.local',
            'password': 'Usuario123!',
            'first_name': 'Usuario',
            'last_name': 'Urbanlytics',
            'is_staff': False,
            'is_superuser': False,
        },
    ]

    for user_data in demo_users:
        user, _ = User.objects.get_or_create(username=user_data['username'])
        user.email = user_data['email']
        user.first_name = user_data['first_name']
        user.last_name = user_data['last_name']
        user.is_staff = user_data['is_staff']
        user.is_superuser = user_data['is_superuser']
        user.set_password(user_data['password'])
        user.save()

    return len(accident_objects), len(zone_objects), len(demo_users)


if __name__ == '__main__':
    accidents, zones, users = load_sample_data()
    print(f'Loaded {accidents} accidents, {zones} zones and {users} demo users.')
