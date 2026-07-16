from neo4j import GraphDatabase

def test_connection():
    # SparrowDB Bolt runs on port 7687, no auth required
    uri = "bolt://localhost:7687"
    driver = GraphDatabase.driver(uri, auth=None)
    
    with driver.session() as session:
        result = session.run("MATCH (p:Port) RETURN p.name as name, p.country as country")
        print("Connected to SparrowDB Bolt!")
        print("Ports found in Graph Database:")
        for record in result:
            print(f"- {record['name']} ({record['country']})")
            
    driver.close()

if __name__ == "__main__":
    test_connection()
