import neo4j.io._socket
from neo4j import GraphDatabase

# Store the original _handshake method
original_handshake = neo4j.io._socket.BoltSocket._handshake

def patched_handshake(cls, s, address, deadline):
    # Call the original handshake method
    socket_obj, agreed_version, handshake, response = original_handshake(s, address, deadline)
    
    print(f"Intercepted handshake negotiated version: {agreed_version}")
    
    # If the negotiated version is (0, 4) due to the Rust byte-order mismatch, coerce it to (4, 0)
    if agreed_version == (0, 4):
        print("Coercing (0, 4) to (4, 0) for SparrowDB compatibility!")
        agreed_version = (4, 0)
        
    return socket_obj, agreed_version, handshake, response

# Apply the monkey-patch
neo4j.io._socket.BoltSocket._handshake = classmethod(patched_handshake)

def test_connection():
    uri = "bolt://localhost:7687"
    driver = GraphDatabase.driver(uri, auth=None)
    
    with driver.session() as session:
        result = session.run("MATCH (p:Port) RETURN p.name as name, p.country as country")
        print("\nConnected to SparrowDB Bolt!")
        print("Ports found in Graph Database:")
        for record in result:
            print(f"- {record['name']} ({record['country']})")
            
    driver.close()

if __name__ == "__main__":
    try:
        test_connection()
    except Exception as e:
        print(f"Failed: {e}")
        import traceback
        traceback.print_exc()
