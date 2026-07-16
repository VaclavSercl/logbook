from py2neo import Graph

def test_connection():
    # py2neo Graph uses bolt protocol
    print("Connecting to SparrowDB Bolt via py2neo...")
    graph = Graph("bolt://localhost:7687")
    
    # Run a simple cypher query
    result = graph.run("MATCH (p:Port) RETURN p.name as name, p.country as country")
    print("Connected to SparrowDB Bolt!")
    print("Ports found in Graph Database:")
    for record in result:
        print(f"- {record['name']} ({record['country']})")

if __name__ == "__main__":
    try:
        test_connection()
    except Exception as e:
        print(f"Failed: {e}")
