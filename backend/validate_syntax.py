#!/usr/bin/env python
"""Validate Python syntax of modified files."""

import py_compile
import sys

files_to_check = [
    'api/views.py',
    'api/serializers.py',
    'api/urls.py',
]

errors = []
for filepath in files_to_check:
    try:
        py_compile.compile(filepath, doraise=True)
        print(f"✓ {filepath} - Syntax OK")
    except py_compile.PyCompileError as e:
        errors.append(f"✗ {filepath} - Syntax Error:\n{e}")
        print(f"✗ {filepath} - Syntax Error")

if errors:
    print("\n" + "="*60)
    print("ERRORS FOUND:")
    print("="*60)
    for error in errors:
        print(error)
    sys.exit(1)
else:
    print("\n" + "="*60)
    print("All files have valid Python syntax!")
    print("="*60)
    sys.exit(0)
