"""Test wind barb calculation logic."""
import sys
import os
sys.path.append("/home/wwwenda/workspace/logbook/backend")

from app.services.wind_barb import calculate_wind_barb

def test_wind_barbs():
    # Test calm
    calm = calculate_wind_barb(1.5, 180)
    assert calm["is_calm"] is True
    print("Calm test passed:", calm["text_description"])

    # Test 15 knots (1 full barb, 1 half barb)
    w15 = calculate_wind_barb(15, 45)
    assert w15["pennants"] == 0
    assert w15["full_barbs"] == 1
    assert w15["half_barbs"] == 1
    assert w15["cardinal"] == "NE"
    print("15kn test passed:", w15["text_description"])

    # Test 65 knots (1 pennant, 1 full barb, 1 half barb)
    w65 = calculate_wind_barb(67, 270)
    assert w65["pennants"] == 1
    assert w65["full_barbs"] == 1
    assert w65["half_barbs"] == 1
    assert w65["cardinal"] == "W"
    print("65kn test passed:", w65["text_description"])

if __name__ == "__main__":
    test_wind_barbs()
    print("All wind barb tests PASSED!")
