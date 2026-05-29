from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Accident',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('lat', models.FloatField()),
                ('lng', models.FloatField()),
                ('intensity', models.IntegerField()),
                ('hour', models.IntegerField()),
                ('date', models.DateField(blank=True, null=True)),
            ],
            options={
                'ordering': ['hour', 'id'],
            },
        ),
        migrations.CreateModel(
            name='Zone',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=120)),
                ('risk_level', models.CharField(choices=[('alta', 'Alta'), ('media', 'Media'), ('baja', 'Baja')], max_length=10)),
                ('geometry', models.TextField(help_text='GeoJSON polygon serializado como texto')),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='WeatherRecord',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('location', models.CharField(default='Medellín, CO', max_length=120)),
                ('condition', models.CharField(max_length=120)),
                ('temperature', models.FloatField()),
                ('is_raining', models.BooleanField(default=False)),
                ('recorded_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['-recorded_at'],
            },
        ),
    ]
