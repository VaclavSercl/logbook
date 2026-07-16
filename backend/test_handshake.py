import socket
import struct

def handshake():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect(("localhost", 7687))
    
    # Send Bolt handshake magic prefix (0x6060B017)
    s.sendall(struct.pack(">I", 0x6060B017))
    
    # Send 4 supported versions (e.g. 5.0, 4.4, 4.2, 3.0)
    # Each version is 4 bytes. We can send typical versions
    s.sendall(struct.pack(">IIII", 0x00000204, 0x00000104, 0x00000004, 0x00000003))
    
    # Read 4-byte response representing the negotiated version
    res = s.recv(4)
    if len(res) == 4:
        version = struct.unpack(">I", res)[0]
        print(f"Negotiated Bolt version: {version:08X} ({version})")
        # decode version: major = version & 0xFF, minor = (version >> 8) & 0xFF
        major = version & 0xFF
        minor = (version >> 8) & 0xFF
        print(f"Decoded: Bolt v{major}.{minor}")
    else:
        print("Empty handshake response")
    s.close()

if __name__ == "__main__":
    handshake()
