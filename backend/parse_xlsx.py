#!/usr/bin/env python3
"""
Parse mortality data from XML-formatted Excel file (MUERTOS 2021.xls)
Extracts radicado (incident ID), fecha (date), hora (time), clase, and other fields
Can be used to enrich accident records with fatality information
"""

import xml.etree.ElementTree as ET
from typing import Dict, List, Any, Tuple
from datetime import datetime
import sys
from collections import defaultdict


def parse_mortality_xlsx(file_path: str) -> Dict[str, Dict[str, Any]]:
    """
    Parse XML-formatted Excel file and return mortality data keyed by 'radicado'
    
    Args:
        file_path: Path to MUERTOS 2021.xls file
        
    Returns:
        Dict keyed by 'radicado' with full row data as values
        Example: {
            '123456': {
                'radicado': '123456',
                'fecha': datetime(...),
                'hora': '14:30:00',
                'clase': 'Homicidio',
                ...other fields...
            }
        }
    """
    mortality_data = {}
    
    try:
        # Parse the XML file
        tree = ET.parse(file_path)
        root = tree.getroot()
        
        # Define namespaces for XML parsing
        namespaces = {
            'ss': 'urn:schemas-microsoft-com:office:spreadsheet',
            'o': 'urn:schemas-microsoft-com:office:office',
            'x': 'urn:schemas-microsoft-com:office:excel',
            'html': 'http://www.w3.org/TR/REC-html40'
        }
        
        # Find all worksheets
        worksheets = root.findall('.//ss:Worksheet', namespaces)
        
        if not worksheets:
            print(f"⚠ No worksheets found in {file_path}")
            return mortality_data
        
        # Process first worksheet (main data)
        worksheet = worksheets[0]
        rows = worksheet.findall('.//ss:Row', namespaces)
        
        headers = []
        row_count = 0
        
        for row_idx, row in enumerate(rows):
            cells = row.findall('ss:Cell', namespaces)
            row_data = []
            
            for cell in cells:
                # Get cell data - could be Data element or Value attribute
                data_elem = cell.find('ss:Data', namespaces)
                if data_elem is not None:
                    value = data_elem.text if data_elem.text else ""
                else:
                    value = cell.get('Value', "")
                
                row_data.append(value if value else "")
            
            # First row contains headers
            if row_idx == 0:
                headers = row_data
                continue
            
            # Skip empty rows
            if not any(row_data):
                continue
            
            row_count += 1
            
            # Create dict from header-data pairs
            record = {}
            for col_idx, header in enumerate(headers):
                if col_idx < len(row_data):
                    record[header] = row_data[col_idx]
            
            # Extract and transform key fields
            record = _transform_record(record)
            
            # Use 'radicado' as key if available
            if 'radicado' in record and record['radicado']:
                mortality_data[record['radicado']] = record
        
        # Print statistics
        print_statistics(file_path, len(headers), row_count, mortality_data)
        
        return mortality_data
        
    except ET.ParseError as e:
        print(f"❌ XML Parse Error: {e}", file=sys.stderr)
        return {}
    except FileNotFoundError:
        print(f"❌ File not found: {file_path}", file=sys.stderr)
        return {}
    except Exception as e:
        print(f"❌ Error parsing file: {e}", file=sys.stderr)
        return {}


def _transform_record(record: Dict[str, str]) -> Dict[str, Any]:
    """
    Transform raw record by parsing dates, times, and converting types
    
    Args:
        record: Raw record from XML
        
    Returns:
        Transformed record with parsed datetime objects
    """
    transformed = {}
    
    for key, value in record.items():
        if not value or value.strip() == "":
            transformed[key] = None
            continue
        
        # Parse 'fecha' - millisecond timestamp
        if key.lower() == 'fecha':
            try:
                # Try to convert from millisecond timestamp
                timestamp_ms = float(value)
                transformed[key] = datetime.fromtimestamp(timestamp_ms / 1000.0)
            except (ValueError, OSError):
                # If that fails, try ISO format or other common formats
                try:
                    transformed[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                except:
                    transformed[key] = value  # Keep original if parsing fails
        
        # Parse 'hora' - time format "HH:MM:SS"
        elif key.lower() == 'hora':
            try:
                time_obj = datetime.strptime(value.strip(), "%H:%M:%S").time()
                transformed[key] = time_obj.isoformat()
            except:
                transformed[key] = value  # Keep original if parsing fails
        
        # Parse numeric fields
        elif key.lower() in ['objectid', 'id']:
            try:
                transformed[key] = int(value)
            except:
                transformed[key] = value
        
        else:
            transformed[key] = value
    
    return transformed


def print_statistics(file_path: str, col_count: int, row_count: int, 
                     data: Dict[str, Dict[str, Any]]) -> None:
    """
    Print statistics about the parsed data
    
    Args:
        file_path: Path to the file
        col_count: Number of columns
        row_count: Number of data rows
        data: Parsed mortality data
    """
    print(f"\n📊 Mortality Data Parser Statistics")
    print(f"{'='*50}")
    print(f"  File: {file_path}")
    print(f"  Total Rows: {row_count}")
    print(f"  Total Columns: {col_count}")
    print(f"  Records with radicado: {len(data)}")
    
    # Date range statistics
    dates = []
    incident_types = defaultdict(int)
    
    for record in data.values():
        if 'fecha' in record and isinstance(record['fecha'], datetime):
            dates.append(record['fecha'])
        if 'clase' in record and record['clase']:
            incident_types[record['clase']] += 1
    
    if dates:
        min_date = min(dates)
        max_date = max(dates)
        print(f"  Date Range: {min_date.date()} to {max_date.date()}")
    
    if incident_types:
        print(f"\n  Incident Types:")
        for incident_type, count in sorted(incident_types.items(), key=lambda x: x[1], reverse=True):
            print(f"    - {incident_type}: {count}")
    
    print(f"{'='*50}\n")


def enrich_accident_data(accident: Dict[str, Any], 
                        mortality_data: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    """
    Enrich an accident record with mortality data if radicado matches
    
    Args:
        accident: Accident record to enrich
        mortality_data: Mortality data dict from parse_mortality_xlsx()
        
    Returns:
        Enriched accident record with added mortality fields
    """
    enriched = accident.copy()
    
    # Look for radicado match
    if 'radicado' in accident:
        radicado = accident['radicado']
        if radicado in mortality_data:
            mortality_record = mortality_data[radicado]
            # Mark this accident as fatal
            enriched['is_fatal'] = True
            enriched['fatal_clase'] = mortality_record.get('clase', '')
            enriched['fatal_fecha'] = mortality_record.get('fecha')
            enriched['fatal_hora'] = mortality_record.get('hora')
            # Add other useful mortality fields
            for key in ['periodo', 'dia']:
                if key in mortality_record:
                    enriched[f'fatal_{key}'] = mortality_record[key]
            return enriched
    
    enriched['is_fatal'] = False
    return enriched


if __name__ == "__main__":
    # Example usage
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    else:
        file_path = "data/MUERTOS 2021.xls"
    
    print(f"Parsing mortality data from: {file_path}")
    mortality_data = parse_mortality_xlsx(file_path)
    
    if mortality_data:
        print(f"✓ Successfully parsed {len(mortality_data)} mortality records")
        # Print first record as sample
        first_key = list(mortality_data.keys())[0]
        print(f"\nSample record (radicado={first_key}):")
        for key, value in list(mortality_data[first_key].items())[:5]:
            print(f"  {key}: {value}")
    else:
        print("✗ Failed to parse mortality data")
        sys.exit(1)
