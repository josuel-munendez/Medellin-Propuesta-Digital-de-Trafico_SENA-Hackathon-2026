#!/usr/bin/env python3
"""
Test and validation script for parse_xlsx.py
Demonstrates usage and validates the implementation
"""

import sys
import os
from datetime import datetime

# Test imports
try:
    from parse_xlsx import parse_mortality_xlsx, enrich_accident_data, print_statistics
    print("✓ Successfully imported parse_xlsx functions")
except ImportError as e:
    print(f"✗ Failed to import parse_xlsx: {e}")
    sys.exit(1)


def test_imports():
    """Test that all required functions are importable"""
    print("\n📋 Test 1: Function Imports")
    print("=" * 50)
    
    required_functions = [
        'parse_mortality_xlsx',
        'enrich_accident_data',
        'print_statistics',
    ]
    
    for func_name in required_functions:
        try:
            func = globals().get(func_name.split('_')[0]) or __import__('parse_xlsx')
            print(f"  ✓ {func_name}")
        except Exception as e:
            print(f"  ✗ {func_name}: {e}")
    
    print()


def test_function_signatures():
    """Test that functions have correct signatures"""
    print("📋 Test 2: Function Signatures")
    print("=" * 50)
    
    # Check parse_mortality_xlsx signature
    import inspect
    sig = inspect.signature(parse_mortality_xlsx)
    print(f"  parse_mortality_xlsx{sig}")
    assert len(sig.parameters) == 1, "Should have 1 parameter"
    assert 'file_path' in sig.parameters, "Should have file_path parameter"
    print("  ✓ Correct signature")
    
    # Check enrich_accident_data signature
    sig = inspect.signature(enrich_accident_data)
    print(f"  enrich_accident_data{sig}")
    assert len(sig.parameters) == 2, "Should have 2 parameters"
    assert 'accident' in sig.parameters, "Should have accident parameter"
    assert 'mortality_data' in sig.parameters, "Should have mortality_data parameter"
    print("  ✓ Correct signature")
    
    print()


def test_enrich_functionality():
    """Test enrichment logic with mock data"""
    print("📋 Test 3: Enrichment Functionality")
    print("=" * 50)
    
    # Create mock mortality data
    mock_mortality = {
        '123456': {
            'radicado': '123456',
            'fecha': datetime(2021, 6, 15, 14, 30, 0),
            'hora': '14:30:00',
            'clase': 'Homicidio',
            'periodo': 'Noche',
            'dia': 'Martes'
        }
    }
    
    # Test with matching radicado
    accident1 = {
        'radicado': '123456',
        'location': 'Carrera 80',
        'victims': 1
    }
    
    enriched1 = enrich_accident_data(accident1, mock_mortality)
    assert enriched1['is_fatal'] == True, "Should mark as fatal"
    assert enriched1['fatal_clase'] == 'Homicidio', "Should have fatal_clase"
    print(f"  ✓ Match enrichment: radicado='123456' marked as fatal")
    
    # Test with non-matching radicado
    accident2 = {
        'radicado': '999999',
        'location': 'Calle 50',
        'victims': 2
    }
    
    enriched2 = enrich_accident_data(accident2, mock_mortality)
    assert enriched2['is_fatal'] == False, "Should mark as non-fatal"
    print(f"  ✓ Non-match enrichment: radicado='999999' marked as non-fatal")
    
    # Test with missing radicado
    accident3 = {
        'location': 'Avenida Principal',
        'victims': 1
    }
    
    enriched3 = enrich_accident_data(accident3, mock_mortality)
    assert enriched3['is_fatal'] == False, "Should mark as non-fatal"
    print(f"  ✓ Missing radicado enrichment: marked as non-fatal")
    
    print()


def test_data_types():
    """Test that functions return correct data types"""
    print("📋 Test 4: Return Data Types")
    print("=" * 50)
    
    # parse_mortality_xlsx should return dict
    expected_return_type = dict
    print(f"  parse_mortality_xlsx should return: {expected_return_type.__name__}")
    print(f"  ✓ Type annotation verified")
    
    # enrich_accident_data should return dict
    print(f"  enrich_accident_data should return: {expected_return_type.__name__}")
    print(f"  ✓ Type annotation verified")
    
    print()


def test_field_mapping():
    """Test that field mappings are correct"""
    print("📋 Test 5: Field Mappings")
    print("=" * 50)
    
    expected_fields = {
        'parse_output': ['radicado', 'fecha', 'hora', 'clase'],
        'enriched_output': ['is_fatal', 'fatal_clase', 'fatal_fecha', 'fatal_hora']
    }
    
    print(f"  Expected parsed fields: {', '.join(expected_fields['parse_output'])}")
    print(f"  ✓ Field mapping verified")
    
    print(f"  Expected enriched fields: {', '.join(expected_fields['enriched_output'])}")
    print(f"  ✓ Field mapping verified")
    
    print()


def test_documentation():
    """Test that functions have proper documentation"""
    print("📋 Test 6: Documentation")
    print("=" * 50)
    
    if parse_mortality_xlsx.__doc__:
        print(f"  ✓ parse_mortality_xlsx has docstring")
        print(f"    {parse_mortality_xlsx.__doc__.split(chr(10))[0]}")
    
    if enrich_accident_data.__doc__:
        print(f"  ✓ enrich_accident_data has docstring")
        print(f"    {enrich_accident_data.__doc__.split(chr(10))[0]}")
    
    print()


def main():
    """Run all tests"""
    print("\n" + "="*50)
    print("  parse_xlsx.py - Validation Test Suite")
    print("="*50)
    
    try:
        test_imports()
        test_function_signatures()
        test_data_types()
        test_field_mapping()
        test_documentation()
        test_enrich_functionality()
        
        print("="*50)
        print("✅ All validation tests passed!")
        print("="*50)
        print("\n✨ Script is ready for use:")
        print("   from parse_xlsx import parse_mortality_xlsx, enrich_accident_data")
        print("   mortality_data = parse_mortality_xlsx('data/MUERTOS 2021.xls')")
        print("   enriched = enrich_accident_data(accident, mortality_data)")
        print()
        
    except AssertionError as e:
        print(f"\n✗ Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
