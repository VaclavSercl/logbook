"""SparrowDB Graph Database API Router."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

# Apply our legendary monkey-patch for SparrowDB-bolt byte-order compatibility
import neo4j.io._socket
original_handshake = neo4j.io._socket.BoltSocket._handshake

def patched_handshake(cls, s, address, deadline):
    socket_obj, agreed_version, handshake, response = original_handshake(s, address, deadline)
    if agreed_version == (0, 4):
        agreed_version = (4, 0)
    return socket_obj, agreed_version, handshake, response

neo4j.io._socket.BoltSocket._handshake = classmethod(patched_handshake)

from neo4j import GraphDatabase

router = APIRouter()

class QueryRequest(BaseModel):
    query: str

class QueryResponse(BaseModel):
    columns: List[str]
    rows: List[List[Any]]

class RoutePort(BaseModel):
    name: str
    country: str = "Greece"
    lat: float
    lng: float

class RouteConnection(BaseModel):
    start_port: str
    end_port: str
    distance_nm: float
    heading: float

class RouteCreateRequest(BaseModel):
    ports: List[RoutePort]
    connections: List[RouteConnection]


def _execute_cypher(query: str) -> QueryResponse:
    """Execute Cypher query against local SparrowDB Bolt service."""
    uri = "bolt://localhost:7687"
    try:
        driver = GraphDatabase.driver(uri, auth=None)
        with driver.session() as session:
            result = session.run(query)
            columns = list(result.keys())
            rows = []
            for record in result:
                row_values = [record.get(col) for col in columns]
                rows.append(row_values)
        driver.close()
        return QueryResponse(columns=columns, rows=rows)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SparrowDB Error: {str(e)}")


@router.post("/query", response_model=QueryResponse)
async def execute_query(data: QueryRequest):
    """Execute raw Cypher query against SparrowDB."""
    return _execute_cypher(data.query)


@router.get("/stats")
async def get_stats():
    """Get node and relationship counts from SparrowDB."""
    res_nodes = _execute_cypher("MATCH (n) RETURN count(n) as node_count")
    res_edges = _execute_cypher("MATCH ()-[r]->() RETURN count(r) as edge_count")
    
    node_count = res_nodes.rows[0][0] if res_nodes.rows else 0
    edge_count = res_edges.rows[0][0] if res_edges.rows else 0
    
    return {
        "status": "connected",
        "provider": "SparrowDB (Bolt)",
        "node_count": node_count,
        "edge_count": edge_count
    }


@router.post("/route", status_code=201)
async def create_route(data: RouteCreateRequest):
    """Add a complete voyage route (ports and connections) to SparrowDB."""
    cypher_parts = ["CREATE"]
    elements = []
    
    # 1. Create Ports
    for idx, port in enumerate(data.ports):
        p_var = f"p{idx}"
        elements.append(
            f"({p_var}:Port {{name: '{port.name}', country: '{port.country}', lat: {port.lat}, lng: {port.lng}}})"
        )
        
    # 2. Link Connections
    for conn in data.connections:
        # find matching port indices
        start_idx = next((i for i, p in enumerate(data.ports) if p.name == conn.start_port), None)
        end_idx = next((i for i, p in enumerate(data.ports) if p.name == conn.end_port), None)
        
        if start_idx is not None and end_idx is not None:
            elements.append(
                f"(p{start_idx})-[:ROUTE {{distance_nm: {conn.distance_nm}, heading: {conn.heading}}}]->(p{end_idx})"
            )
            
    cypher_parts.append(",\n  ".join(elements))
    query = "\n".join(cypher_parts)
    
    _execute_cypher(query)
    return {"status": "created", "ports_added": len(data.ports), "connections_added": len(data.connections)}
