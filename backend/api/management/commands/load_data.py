from django.core.management.base import BaseCommand

from load_data import load_sample_data


class Command(BaseCommand):
    help = 'Carga datos semilla de accidentes y zonas para Medellín Movilidata OS.'

    def handle(self, *args, **options):
        accidents, zones, users = load_sample_data()
        self.stdout.write(self.style.SUCCESS(f'Datos cargados: {accidents} accidentes, {zones} zonas, {users} usuarios demo.'))
