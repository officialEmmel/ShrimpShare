import { WebSocket, WebSocketServer } from "ws";

type Registration = {
  id: string;
  name: string;
  token: string;
};

type PublicClient = {
  id: string;
  name: string;
}

class ShrimpServer {
  wss: WebSocketServer;
  clientManager: ClientManager;
  roomManager: RoomManager;
  constructor() {
    this.clientManager = new ClientManager();
    this.roomManager = new RoomManager();
    this.wss = new WebSocketServer({ port: 8080 });
    this.wss.on("connection", (socket) => this._onConnection(socket));
  }

  _onConnection(ws: WebSocket) {
    console.log("New connection");
    ws.on("message", (data) => this._onMessage(ws, data));
  }

  _onMessage(ws: WebSocket, data: any) {
    try {
      const message = JSON.parse(data);
      switch (message.type) {
        case "register":
          console.log("Registering client...")
          this._onRegister(ws, message);
          break;
        case "pong":
          this.clientManager.getClient(message.id) 
        default:
          console.log(message);
          break;
      }
    } catch (e) {
      // TODO handle error
    }
  }

  _onRegister(ws: WebSocket, reg: Registration) {
    var client = this.clientManager.addClient(new Client(reg.id, reg.name, reg.token, ws));
    if(client) {
      this.roomManager.joinDefaultRoom(client);
    }
    ws.send(JSON.stringify({type:"registered", id: reg.id}));
    ws.send(JSON.stringify({type:"clients", clients: this.clientManager.getClients()}));
    console.log("client registered!")
  }
}

class RoomManager {
  ROOMS: Map<string, Room>;
  DEFAULT_ROOM: Room;
  constructor() {
    this.ROOMS = new Map();
    this.DEFAULT_ROOM = new Room("default");
    this.addRoom(this.DEFAULT_ROOM);
  }

  addRoom(room: Room) {
    this.ROOMS.set(room.id, room);
  }

  joinDefaultRoom(client: Client) {
    this.DEFAULT_ROOM.join(client);
  }

}

class Room  {
  MEMBERS: Map<string, Client>;
  id: string;
  constructor(id=Utils.generateRoomId()) {
    this.id = id
    this.MEMBERS = new Map();
  }

  join(client: Client) {
    if(this.MEMBERS.has(client.id)) {return}
    this.MEMBERS.set(client.id, client);
  }
  leave(client: Client) {
    this.MEMBERS.delete(client.id);
  }
}

class ClientManager {
  CLIENTS: Map<string, Client>;
  constructor() {
    this.CLIENTS = new Map();
    setInterval(() => {
      this.CLIENTS.forEach((client) => {
        var id = Utils.generateRoomId()
        client.ping(id);
        
      })

    }, 1000)
  }

  addClient(client: Client) {
    if (this.CLIENTS.has(client.id)) {
      if (client.token == this.CLIENTS.get(client.id)?.token) {
        this.CLIENTS.set(client.id, client);
      } else {
        // TODO handle error
        return null
      }
    } else {
      this.CLIENTS.set(client.id, client);
    }
    return this.CLIENTS.get(client.id);
  }

  _onClientOffline(client: Client) {
    this.CLIENTS.delete(client.id);
  }

  getClient(id: string) {
    return this.CLIENTS.get(id);
  }

  getClients() {
    let clients: PublicClient[] = []
    this.CLIENTS.forEach((client) => {
      clients.push({id: client.id, name: client.name})
    })
    return clients;
  }
}

class Client {
  id: string;
  name: string;
  token: string;
  socket: WebSocket;
  missedPings: number;
  online: boolean;

  constructor(id: string, name: string, token: string, socket: WebSocket) {
    this.id = id;
    this.name = name;
    this.token = token;
    this.socket = socket;
    this.missedPings = 0;
    this.online = true;
  }

  ping(id:string) {
    this.socket.send(JSON.stringify({type: "ping", id: id}));
  }
}

class Utils {
 static generateRoomId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}



}

let server = new ShrimpServer();
console.log("Server started");
