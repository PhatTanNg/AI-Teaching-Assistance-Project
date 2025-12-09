"""
Test script for the Python keyword analysis backend
"""

import requests
import json

# Configuration
API_URL = "http://localhost:5002"

def test_health():
    """Test health check endpoint"""
    print("🔍 Testing health endpoint...")
    try:
        response = requests.get(f"{API_URL}/api/health")
        print(f"✅ Status: {response.status_code}")
        print(f"📊 Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_analysis():
    """Test transcript analysis endpoint"""
    print("\n🔍 Testing analysis endpoint...")
    
    test_transcript = """
    Today we will discuss machine learning and artificial intelligence.
    Neural networks are computational models inspired by biological neurons.
    Deep learning uses multiple layers to extract features from data.
    Algorithms like gradient descent optimize the model parameters.
    """
    
    try:
        response = requests.post(
            f"{API_URL}/api/analyze",
            json={"transcript": test_transcript},
            headers={"Content-Type": "application/json"}
        )
        
        print(f"✅ Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n📝 Transcript length: {len(data['transcript'])} characters")
            print(f"🔑 Keywords found: {len(data['keywords'])}")
            print("\n📚 Extracted Keywords:")
            for i, kw in enumerate(data['keywords'], 1):
                print(f"\n{i}. {kw['word']}")
                print(f"   Definition: {kw['definition'][:100]}...")
        else:
            print(f"❌ Error: {response.text}")
        
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_empty_transcript():
    """Test with empty transcript"""
    print("\n🔍 Testing with empty transcript...")
    
    try:
        response = requests.post(
            f"{API_URL}/api/analyze",
            json={"transcript": ""},
            headers={"Content-Type": "application/json"}
        )
        
        print(f"✅ Status: {response.status_code}")
        data = response.json()
        print(f"📊 Response: {json.dumps(data, indent=2)}")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("=" * 50)
    print("Python Backend Test Suite")
    print("=" * 50)
    
    # Test 1: Health check
    health_ok = test_health()
    
    if not health_ok:
        print("\n⚠️  Backend is not running or not accessible")
        print("Make sure to run: python app.py")
        return
    
    # Test 2: Analysis with real transcript
    analysis_ok = test_analysis()
    
    # Test 3: Empty transcript handling
    empty_ok = test_empty_transcript()
    
    # Summary
    print("\n" + "=" * 50)
    print("Test Summary")
    print("=" * 50)
    print(f"Health Check: {'✅ PASS' if health_ok else '❌ FAIL'}")
    print(f"Analysis Test: {'✅ PASS' if analysis_ok else '❌ FAIL'}")
    print(f"Empty Transcript: {'✅ PASS' if empty_ok else '❌ FAIL'}")
    
    if health_ok and analysis_ok and empty_ok:
        print("\n🎉 All tests passed!")
    else:
        print("\n⚠️  Some tests failed")

if __name__ == "__main__":
    main()
